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

function httpError(message, status, details = null) {
  const error = new Error(message);
  error.details = details;
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

export async function apiRequest(endpoint, options = {}) {
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
    throw httpError("Sesion expirada o invalida", response.status, data?.details || data || null);
  }

  if (!response.ok) {
    throw httpError(
      data?.message || `Error HTTP ${response.status}`,
      response.status,
      data?.details || data || null,
    );
  }

  return data;
}

export const remoteApiRequest = apiRequest;

export async function uploadApiFile(endpoint, fieldName, file, options = {}) {
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
      method: options.method || "POST",
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
    throw httpError("Sesion expirada o invalida", response.status, data?.details || data || null);
  }

  if (!response.ok) {
    throw httpError(
      data?.message || `Error HTTP ${response.status}`,
      response.status,
      data?.details || data || null,
    );
  }

  return data;
}

export const remoteUploadApiFile = uploadApiFile;
