const DB_NAME = "economia-web-local";
const DB_VERSION = 1;

const STORES = [
  "bancos",
  "cuentas",
  "categorias",
  "categoriasGrupo",
  "gastos",
  "deudas",
  "tarjetasCredito",
  "resumenesTarjeta",
  "movimientosTarjeta",
  "syncQueue",
  "meta",
];

let dbPromise = null;

function emitLocalSyncChange() {
  window.dispatchEvent(new CustomEvent("local-sync-change"));
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openLocalDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB no esta disponible en este navegador."));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "localId" });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function resetLocalDatabase() {
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB no esta disponible en este navegador.");
  }

  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }

  await new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("No se pudo borrar IndexedDB porque esta en uso. Cierra otras pestanas de la app e intenta de nuevo."));
  });

  emitLocalSyncChange();
  return true;
}

export async function ensureLocalDatabase() {
  await openLocalDatabase();
  await setLocalMeta("localDbReady", true);
  return true;
}

export async function getLocalMeta(key) {
  const db = await openLocalDatabase();
  const transaction = db.transaction("meta", "readonly");
  const result = await requestToPromise(transaction.objectStore("meta").get(key));
  return result?.value ?? null;
}

export async function setLocalMeta(key, value) {
  const db = await openLocalDatabase();
  const transaction = db.transaction("meta", "readwrite");
  await requestToPromise(
    transaction.objectStore("meta").put({
      localId: key,
      updatedAt: new Date().toISOString(),
      value,
    }),
  );
}

export function createLocalId(prefix = "local") {
  if (window.crypto?.randomUUID) {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export async function getLocalItem(storeName, localId) {
  const db = await openLocalDatabase();
  const transaction = db.transaction(storeName, "readonly");
  return requestToPromise(transaction.objectStore(storeName).get(localId));
}

export async function getLocalItems(storeName, options = {}) {
  const db = await openLocalDatabase();
  const transaction = db.transaction(storeName, "readonly");
  const items = await requestToPromise(transaction.objectStore(storeName).getAll());
  if (options.includeDeleted) return items;
  return items.filter((item) => !item._deleted);
}

export async function putLocalItem(storeName, item) {
  const db = await openLocalDatabase();
  const transaction = db.transaction(storeName, "readwrite");
  const localId = item.localId || item._id || createLocalId(storeName);
  const now = new Date().toISOString();
  const nextItem = {
    ...item,
    _id: item._id || localId,
    localId,
    syncStatus: item.syncStatus || "local",
    updatedAt: item.updatedAt || now,
  };

  await requestToPromise(transaction.objectStore(storeName).put(nextItem));
  return nextItem;
}

export async function deleteLocalItem(storeName, localId) {
  const db = await openLocalDatabase();
  const transaction = db.transaction(storeName, "readwrite");
  await requestToPromise(transaction.objectStore(storeName).delete(localId));
}

function normalizeDuplicateText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeDuplicateDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toISOString().slice(0, 10);
}

function normalizeDuplicateAmount(value) {
  return String(Math.round(Number(value || 0) * 100));
}

function expenseDuplicateKey(expense) {
  return [
    expense.usuario || "",
    expense.cuenta?._id || expense.cuenta || "",
    normalizeDuplicateDate(expense.fecha),
    normalizeDuplicateText(expense.descripcion),
    normalizeDuplicateAmount(expense.flujoBancario),
  ].join("|");
}

function chooseExpenseToKeep(group) {
  return [...group].sort((a, b) => {
    const syncedA = a.syncStatus === "synced" || Boolean(a.cloudId);
    const syncedB = b.syncStatus === "synced" || Boolean(b.cloudId);
    if (syncedA !== syncedB) return syncedA ? -1 : 1;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  })[0];
}

function idOf(value) {
  if (!value) return "";
  if (typeof value === "object") return value._id || value.localId || "";
  return value;
}

function endpointForStore(storeName) {
  return {
    bancos: "/bancos",
    categorias: "/categorias",
    categoriasGrupo: "/categorias-grupo",
    cuentas: "/cuentas",
    tarjetasCredito: "/tarjetas-credito",
  }[storeName] || `/${storeName}`;
}

function namedRecordDuplicateKey(storeName, record) {
  const base = [normalizeDuplicateText(record.nombre)];

  if (storeName === "cuentas") {
    base.push(idOf(record.banco), record.tipo || "");
  }

  return [
    ...base,
  ].join("|");
}

function chooseNamedRecordToKeep(group) {
  return [...group].sort((a, b) => {
    const syncedA = a.syncStatus === "synced" || Boolean(a.cloudId);
    const syncedB = b.syncStatus === "synced" || Boolean(b.cloudId);
    if (syncedA !== syncedB) return syncedA ? -1 : 1;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  })[0];
}

async function markRelatedRecordChanged(storeName, item, previousItem) {
  const nextItem = await putLocalItem(storeName, {
    ...item,
    syncStatus: "pending_upload",
  });

  if (nextItem.cloudId) {
    await enqueueSyncOperation({
      endpoint: endpointForStore(storeName),
      itemLocalId: nextItem.localId,
      method: "PATCH",
      previousItem,
      resource: storeName,
    });
  }
}

async function reassignReferencesForDuplicate(storeName, duplicate, keep) {
  const duplicateId = duplicate.localId || duplicate._id;
  const keepId = keep.localId || keep._id;

  if (storeName === "categoriasGrupo") {
    const categorias = await getLocalItems("categorias", { includeDeleted: true });
    for (const categoria of categorias) {
      if (idOf(categoria.categoriaGrupo) !== duplicateId) continue;
      await markRelatedRecordChanged(
        "categorias",
        { ...categoria, categoriaGrupo: keepId },
        categoria,
      );
    }
  }

  if (storeName === "categorias") {
    const gastos = await getLocalItems("gastos", { includeDeleted: true });
    for (const gasto of gastos) {
      if (idOf(gasto.categoria) !== duplicateId) continue;
      await markRelatedRecordChanged("gastos", { ...gasto, categoria: keepId }, gasto);
    }
  }

  if (storeName === "bancos") {
    const cuentas = await getLocalItems("cuentas", { includeDeleted: true });
    for (const cuenta of cuentas) {
      if (idOf(cuenta.banco) !== duplicateId) continue;
      await markRelatedRecordChanged("cuentas", { ...cuenta, banco: keepId }, cuenta);
    }
  }

  if (storeName === "cuentas") {
    const [gastos, tarjetas] = await Promise.all([
      getLocalItems("gastos", { includeDeleted: true }),
      getLocalItems("tarjetasCredito", { includeDeleted: true }),
    ]);

    for (const gasto of gastos) {
      if (idOf(gasto.cuenta) !== duplicateId) continue;
      await markRelatedRecordChanged("gastos", { ...gasto, cuenta: keepId }, gasto);
    }

    for (const tarjeta of tarjetas) {
      const nextTarjeta = { ...tarjeta };
      let changed = false;
      if (idOf(tarjeta.cuentaTarjeta) === duplicateId) {
        nextTarjeta.cuentaTarjeta = keepId;
        changed = true;
      }
      if (idOf(tarjeta.cuentaPagoDefault) === duplicateId) {
        nextTarjeta.cuentaPagoDefault = keepId;
        changed = true;
      }
      if (changed) {
        await markRelatedRecordChanged("tarjetasCredito", nextTarjeta, tarjeta);
      }
    }
  }
}

export async function cleanupDuplicateLocalNamedRecords() {
  const stores = ["bancos", "cuentas", "categoriasGrupo", "categorias"];
  let groups = 0;
  let removed = 0;

  for (const storeName of stores) {
    const records = await getLocalItems(storeName, { includeDeleted: true });
    const activeRecords = records.filter((record) => !record._deleted);
    const byKey = new Map();

    activeRecords.forEach((record) => {
      const key = namedRecordDuplicateKey(storeName, record);
      if (!key.endsWith("|")) {
        const group = byKey.get(key) || [];
        group.push(record);
        byKey.set(key, group);
      }
    });

    for (const group of byKey.values()) {
      if (group.length < 2) continue;
      groups++;
      const keep = chooseNamedRecordToKeep(group);

      for (const duplicate of group.filter((record) => record.localId !== keep.localId)) {
        await reassignReferencesForDuplicate(storeName, duplicate, keep);
        await removeSyncOperationsForItem(storeName, duplicate.localId);

        const duplicateCloudId = duplicate.cloudId || duplicate._id;
        const keepCloudId = keep.cloudId || keep._id;
        const isSameCloudRecord = duplicateCloudId && duplicateCloudId === keepCloudId;

        if (duplicate.cloudId && !isSameCloudRecord) {
          await putLocalItem(storeName, {
            ...duplicate,
            _deleted: true,
            syncStatus: "pending_upload",
          });
          await enqueueSyncOperation({
            endpoint: endpointForStore(storeName),
            itemLocalId: duplicate.localId,
            method: "DELETE",
            previousItem: duplicate,
            resource: storeName,
          });
        } else {
          await deleteLocalItem(storeName, duplicate.localId);
        }
        removed++;
      }
    }
  }

  if (removed) emitLocalSyncChange();

  return { groups, removed };
}

export async function findDuplicateLocalExpenses() {
  const expenses = await getLocalItems("gastos", { includeDeleted: true });
  const activeExpenses = expenses.filter((expense) => !expense._deleted);
  const groups = new Map();

  activeExpenses.forEach((expense) => {
    const key = expenseDuplicateKey(expense);
    const group = groups.get(key) || [];
    group.push(expense);
    groups.set(key, group);
  });

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const keep = chooseExpenseToKeep(group);
      return {
        keep,
        remove: group.filter((expense) => expense.localId !== keep.localId),
      };
    });
}

export async function cleanupDuplicateLocalExpenses() {
  const duplicateGroups = await findDuplicateLocalExpenses();
  let removed = 0;

  for (const group of duplicateGroups) {
    for (const expense of group.remove) {
      await removeSyncOperationsForItem("gastos", expense.localId);
      await deleteLocalItem("gastos", expense.localId);
      removed++;
    }
  }

  if (removed) emitLocalSyncChange();

  return {
    groups: duplicateGroups.length,
    removed,
  };
}

export async function enqueueSyncOperation(operation) {
  const db = await openLocalDatabase();
  const transaction = db.transaction("syncQueue", "readwrite");
  const store = transaction.objectStore("syncQueue");
  const existing = await requestToPromise(store.getAll());
  const duplicated = existing.find(
    (item) =>
      item.method === operation.method &&
      item.resource === operation.resource &&
      item.itemLocalId === operation.itemLocalId &&
      item.endpoint === operation.endpoint,
  );

  if (duplicated) return duplicated;

  const queued = {
    ...operation,
    createdAt: new Date().toISOString(),
    localId: operation.localId || createLocalId("sync"),
  };

  await requestToPromise(store.put(queued));
  emitLocalSyncChange();
  return queued;
}

export async function getSyncQueue() {
  const db = await openLocalDatabase();
  const transaction = db.transaction("syncQueue", "readonly");
  return requestToPromise(transaction.objectStore("syncQueue").getAll());
}

export async function removeSyncOperation(localId) {
  const db = await openLocalDatabase();
  const transaction = db.transaction("syncQueue", "readwrite");
  await requestToPromise(transaction.objectStore("syncQueue").delete(localId));
  emitLocalSyncChange();
}

export async function removeSyncOperationsForItem(resource, itemLocalId, methods = []) {
  const db = await openLocalDatabase();
  const transaction = db.transaction("syncQueue", "readwrite");
  const store = transaction.objectStore("syncQueue");
  const operations = await requestToPromise(store.getAll());
  const methodSet = new Set(methods);
  const matches = operations.filter(
    (operation) =>
      operation.resource === resource &&
      operation.itemLocalId === itemLocalId &&
      (!methodSet.size || methodSet.has(operation.method)),
  );

  await Promise.all(matches.map((operation) => requestToPromise(store.delete(operation.localId))));

  if (matches.length) {
    emitLocalSyncChange();
  }

  return matches.length;
}

export async function undoSyncOperation(operationLocalId) {
  const operation = (await getSyncQueue()).find((item) => item.localId === operationLocalId);
  if (!operation) {
    return { undone: false, message: "Operacion local no encontrada." };
  }

  if (operation.method === "POST") {
    if (operation.resource && operation.itemLocalId) {
      const item = await getLocalItem(operation.resource, operation.itemLocalId);
      if (operation.resource === "gastos" && item?.movimientoTarjeta) {
        const movimiento = await getLocalItem("movimientosTarjeta", item.movimientoTarjeta);
        if (movimiento) {
          await putLocalItem("movimientosTarjeta", {
            ...movimiento,
            gastoGenerado: null,
            syncStatus: movimiento.syncStatus || "pending_upload",
          });
        }
      }
      await deleteLocalItem(operation.resource, operation.itemLocalId);
    }
    await removeSyncOperation(operation.localId);
    return { undone: true, message: "Creacion local deshecha." };
  }

  if (operation.method === "PATCH" || operation.method === "PUT") {
    if (!operation.previousItem || !operation.resource) {
      return {
        undone: false,
        message: "Esta edicion no tiene una copia anterior para restaurar.",
      };
    }

    await putLocalItem(operation.resource, {
      ...operation.previousItem,
      syncStatus: operation.previousItem.syncStatus || "synced",
    });
    await removeSyncOperation(operation.localId);
    return { undone: true, message: "Edicion local deshecha." };
  }

  if (operation.method === "DELETE") {
    if (!operation.resource || !operation.itemLocalId) {
      return { undone: false, message: "No se pudo identificar el registro eliminado." };
    }

    const current = await getLocalItem(operation.resource, operation.itemLocalId);
    const restored = operation.previousItem || current;
    if (!restored) {
      return { undone: false, message: "El registro local ya no existe para restaurarlo." };
    }

    await putLocalItem(operation.resource, {
      ...restored,
      _deleted: false,
      syncStatus: restored.syncStatus === "pending_upload" ? "synced" : restored.syncStatus,
    });
    await removeSyncOperation(operation.localId);
    return { undone: true, message: "Eliminacion local deshecha." };
  }

  if (operation.method === "UPLOAD_CARD_EXCEL") {
    const importedItems = Array.isArray(operation.importedItems) ? operation.importedItems : [];
    if (!importedItems.length) {
      return {
        undone: false,
        message: "Esta importacion no tiene detalle local para deshacer.",
      };
    }

    await Promise.all(
      importedItems.map((item) => deleteLocalItem(item.resource, item.itemLocalId)),
    );
    await removeSyncOperation(operation.localId);
    return { undone: true, message: "Importacion local deshecha." };
  }

  return { undone: false, message: "Esta operacion todavia no soporta deshacer." };
}

export async function getLocalSyncSummary() {
  const db = await openLocalDatabase();
  const transaction = db.transaction(["syncQueue", "meta"], "readonly");
  const pending = await requestToPromise(transaction.objectStore("syncQueue").getAll());
  const lastSync = await requestToPromise(transaction.objectStore("meta").get("lastSyncAt"));
  const localDbReady = await requestToPromise(
    transaction.objectStore("meta").get("localDbReady"),
  );

  return {
    lastSyncAt: lastSync?.value || null,
    localDbReady: Boolean(localDbReady?.value),
    pendingCount: pending.length,
  };
}
