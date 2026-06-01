import { localFirstRequest, shouldUseLocalFirst } from "./localFirstApi";
import {
  createLocalId,
  enqueueSyncOperation,
  getLocalItem,
  getSyncQueue,
  putLocalItem,
} from "./localDb";
import { parseCreditCardExcelFile } from "../utils/creditCardExcelParser";

const API_URL = import.meta.env.VITE_API_URL || "/v1";

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function saveAuth(data, user) {
  if (data?.token) {
    localStorage.setItem("token", data.token);
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      id: user?._id || user?.id || data?.id || null,
      username: user?.username || data?.username || "",
      email: user?.email || "",
      fotoPerfilUrl:
        user?.fotoPerfilUrl || "/imagenes/imagenes-web/perfil/default-avatar.png",
      rol: user?.rol || data?.rol || "user",
    }),
  );
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getApiData(response) {
  return response?.data ?? response;
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

let sessionExpiredNotified = false;

function handleSessionExpired(status) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (sessionExpiredNotified) return;
  sessionExpiredNotified = true;

  window.dispatchEvent(
    new CustomEvent("session-expired", {
      detail: { status },
    }),
  );

  window.setTimeout(() => {
    sessionExpiredNotified = false;
  }, 2500);
}

export async function remoteApiRequest(endpoint, options = {}) {
  const { method = "GET", body, token = getToken() } = options;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con la API. Verifica que el backend este corriendo.",
    );
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 || response.status === 403) {
    handleSessionExpired(response.status);
    throw httpError("Sesion expirada o invalida", response.status);
  }

  if (!response.ok) {
    throw httpError(data?.message || `Error HTTP ${response.status}`, response.status);
  }

  return data;
}

export async function apiRequest(endpoint, options = {}) {
  if (shouldUseLocalFirst(endpoint, options)) {
    return localFirstRequest(endpoint, options);
  }

  return remoteApiRequest(endpoint, options);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function saveLocalCardImport(endpoint, file) {
  const match = endpoint.match(/^\/tarjetas-credito\/([^/]+)\/importar-excel$/);
  if (!match) return null;

  const tarjetaId = match[1];
  const tarjeta = await getLocalItem("tarjetasCredito", tarjetaId);
  if (!tarjeta) return null;

  const parsed = await parseCreditCardExcelFile(file);
  const resumenLocalId = createLocalId("resumenTarjeta");
  const resumen = await putLocalItem("resumenesTarjeta", {
    ...parsed.resumen,
    _id: resumenLocalId,
    localId: resumenLocalId,
    syncStatus: "pending_upload",
    tarjeta: tarjetaId,
  });

  let movimientosCreados = 0;
  let movimientosDuplicados = 0;
  const importedItems = [
    { itemLocalId: resumen.localId, resource: "resumenesTarjeta" },
  ];
  const existing = await localFirstRequest(`/tarjetas-credito/${tarjetaId}/movimientos`);
  const existingHashes = new Set((existing.data || []).map((movimiento) => movimiento.hashImportacion));

  for (const movimiento of parsed.movimientos) {
    if (existingHashes.has(movimiento.hashImportacion)) {
      movimientosDuplicados++;
      continue;
    }

    const movimientoLocalId = createLocalId("movimientoTarjeta");
    const createdMovement = await putLocalItem("movimientosTarjeta", {
      ...movimiento,
      _id: movimientoLocalId,
      localId: movimientoLocalId,
      resumen: resumen.localId,
      syncStatus: "pending_upload",
      tarjeta: tarjetaId,
    });
    importedItems.push({
      itemLocalId: createdMovement.localId,
      resource: "movimientosTarjeta",
    });
    movimientosCreados++;
  }

  const fileData = await readFileAsDataUrl(file);
  await enqueueSyncOperation({
    endpoint,
    fileData,
    fileName: file.name,
    fileType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fieldName: "excel",
    importedItems,
    method: "UPLOAD_CARD_EXCEL",
    resource: "tarjetaImportaciones",
  });

  return {
    success: true,
    message: "Resumen importado localmente",
    data: {
      movimientosCreados,
      movimientosDetectados: parsed.movimientos.length,
      movimientosDuplicados,
      resumen,
    },
  };
}

export async function remoteUploadApiFile(endpoint, fieldName, file, options = {}) {
  const { token = getToken() } = options;
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append(fieldName, file);

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con la API. Verifica que el backend este corriendo.",
    );
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 || response.status === 403) {
    handleSessionExpired(response.status);
    throw httpError("Sesion expirada o invalida", response.status);
  }

  if (!response.ok) {
    throw httpError(data?.message || `Error HTTP ${response.status}`, response.status);
  }

  return data;
}

export async function uploadApiFile(endpoint, fieldName, file, options = {}) {
  if (options.localFirst !== false) {
    const localCardImport = await saveLocalCardImport(endpoint, file);
    if (localCardImport) return localCardImport;
  }

  const localFacturaMatch = endpoint.match(/^\/gastos\/([^/]+)\/factura$/);

  if (localFacturaMatch?.[1]) {
    const gasto = await getLocalItem("gastos", localFacturaMatch[1]);
    if (gasto) {
      const facturaUrl = await readFileAsDataUrl(file);

      const updated = await putLocalItem("gastos", {
        ...gasto,
        facturaLocalName: file.name,
        facturaUrl,
        syncStatus: "pending_upload",
      });
      const queue = await getSyncQueue();
      const hasPendingCreate = queue.some(
        (operation) =>
          operation.resource === "gastos" &&
          operation.itemLocalId === updated.localId &&
          operation.method === "POST",
      );

      if (!hasPendingCreate) {
        await enqueueSyncOperation({
          endpoint: "/gastos",
          itemLocalId: updated.localId,
          method: "PATCH",
          previousItem: gasto,
          resource: "gastos",
        });
      }

      return {
        success: true,
        message: "Factura guardada localmente",
        data: updated,
      };
    }
  }

  return remoteUploadApiFile(endpoint, fieldName, file, options);
}
