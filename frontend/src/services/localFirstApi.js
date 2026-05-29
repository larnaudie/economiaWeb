import {
  createLocalId,
  deleteLocalItem,
  enqueueSyncOperation,
  getLocalItem,
  getLocalItems,
  getSyncQueue,
  putLocalItem,
  removeSyncOperation,
  removeSyncOperationsForItem,
  setLocalMeta,
} from "./localDb";

const RESOURCE_CONFIGS = [
  { endpoint: "/bancos", store: "bancos", prefix: "banco" },
  { endpoint: "/usuarios/me/bancos", store: "bancos", prefix: "banco", readOnlyAlias: true },
  { endpoint: "/cuentas", store: "cuentas", prefix: "cuenta" },
  { endpoint: "/usuarios/me/cuentas", store: "cuentas", prefix: "cuenta", readOnlyAlias: true },
  { endpoint: "/categorias", store: "categorias", prefix: "categoria" },
  {
    endpoint: "/usuarios/me/categorias",
    store: "categorias",
    prefix: "categoria",
    readOnlyAlias: true,
  },
  { endpoint: "/categorias-grupo", store: "categoriasGrupo", prefix: "categoriaGrupo" },
  { endpoint: "/gastos", store: "gastos", prefix: "gasto" },
  { endpoint: "/usuarios/me/gastos", store: "gastos", prefix: "gasto", readOnlyAlias: true },
  { endpoint: "/deudas", store: "deudas", prefix: "deuda" },
  { endpoint: "/tarjetas-credito", store: "tarjetasCredito", prefix: "tarjeta" },
];

const SYNC_ORDER = [
  "bancos",
  "categoriasGrupo",
  "cuentas",
  "categorias",
  "tarjetasCredito",
  "gastos",
  "deudas",
];

const PULL_ENDPOINTS = [
  { endpoint: "/bancos", store: "bancos" },
  { endpoint: "/categorias-grupo", store: "categoriasGrupo" },
  { endpoint: "/cuentas", store: "cuentas" },
  { endpoint: "/categorias", store: "categorias" },
  { endpoint: "/gastos", store: "gastos" },
  { endpoint: "/deudas", store: "deudas" },
  { endpoint: "/tarjetas-credito", store: "tarjetasCredito" },
];

function success(data, message = "Datos locales") {
  return { success: true, message, data };
}

function stripQuery(endpoint) {
  return endpoint.split("?")[0];
}

function parseEndpoint(endpoint) {
  const [path, query = ""] = endpoint.split("?");
  const params = new URLSearchParams(query);

  const directConfig = RESOURCE_CONFIGS.find((config) => config.endpoint === path);
  if (directConfig) return { ...directConfig, id: "", params, collectionPath: path };

  const config = RESOURCE_CONFIGS.find((item) => path.startsWith(`${item.endpoint}/`));
  if (!config) return null;

  const suffix = path.slice(config.endpoint.length + 1);
  if (!suffix || suffix.includes("/")) return null;

  return { ...config, id: suffix, params, collectionPath: config.endpoint };
}

export function shouldUseLocalFirst(endpoint, options = {}) {
  const method = options.method || "GET";
  if (options.localFirst === false) return false;
  if (endpoint === "/gastos/orden-cuenta" && method === "PATCH") return true;
  if (/^\/deudas\/[^/]+\/pagar-cuota$/.test(endpoint) && method === "POST") return true;
  if (/^\/tarjetas-credito\/[^/]+\/movimientos$/.test(stripQuery(endpoint))) return true;
  if (/^\/tarjetas-credito\/[^/]+\/resumenes$/.test(stripQuery(endpoint))) return true;
  if (/^\/tarjetas-credito\/[^/]+\/movimientos\/crear-gastos$/.test(endpoint) && method === "POST") return true;
  if (/^\/tarjetas-credito\/[^/]+\/movimientos\/[^/]+\/crear-gasto$/.test(endpoint) && method === "POST") return true;
  if (/^\/tarjetas-credito\/[^/]+\/movimientos\/[^/]+$/.test(endpoint) && method === "DELETE") return true;
  if (/^\/tarjetas-credito\/[^/]+\/resumenes\/[^/]+$/.test(endpoint) && method === "DELETE") return true;
  if (method === "POST" && endpoint.includes("/factura")) return false;
  if (endpoint.includes("/bulk")) return false;
  if (endpoint.includes("/orden-cuenta")) return false;
  if (endpoint.includes("/importar-excel")) return false;
  if (endpoint.includes("/movimientos")) return false;
  if (endpoint.includes("/resumenes")) return false;
  if (endpoint.includes("/pagar-cuota")) return false;
  return Boolean(parseEndpoint(endpoint));
}

function parseNestedCardEndpoint(endpoint) {
  const [path, query = ""] = endpoint.split("?");
  const params = new URLSearchParams(query);
  const movementCollection = path.match(/^\/tarjetas-credito\/([^/]+)\/movimientos$/);
  if (movementCollection) {
    return { cardId: movementCollection[1], params, type: "cardMovements" };
  }

  const summaryCollection = path.match(/^\/tarjetas-credito\/([^/]+)\/resumenes$/);
  if (summaryCollection) {
    return { cardId: summaryCollection[1], params, type: "cardSummaries" };
  }

  const bulkCreate = path.match(/^\/tarjetas-credito\/([^/]+)\/movimientos\/crear-gastos$/);
  if (bulkCreate) {
    return { cardId: bulkCreate[1], params, type: "cardMovementsCreateBulk" };
  }

  const createExpense = path.match(/^\/tarjetas-credito\/([^/]+)\/movimientos\/([^/]+)\/crear-gasto$/);
  if (createExpense) {
    return {
      cardId: createExpense[1],
      movementId: createExpense[2],
      params,
      type: "cardMovementCreateExpense",
    };
  }

  const deleteMovement = path.match(/^\/tarjetas-credito\/([^/]+)\/movimientos\/([^/]+)$/);
  if (deleteMovement) {
    return {
      cardId: deleteMovement[1],
      movementId: deleteMovement[2],
      params,
      type: "cardMovementDelete",
    };
  }

  const deleteSummary = path.match(/^\/tarjetas-credito\/([^/]+)\/resumenes\/([^/]+)$/);
  if (deleteSummary) {
    return {
      cardId: deleteSummary[1],
      params,
      summaryId: deleteSummary[2],
      type: "cardSummaryDelete",
    };
  }

  return null;
}

function idOf(value) {
  if (!value) return "";
  if (typeof value === "object") return value._id || value.localId || "";
  return value;
}

async function populateLocalItem(store, item) {
  if (!item || item._deleted) return item;

  if (store === "cuentas") {
    const banco = await getLocalItem("bancos", idOf(item.banco));
    return { ...item, banco: banco || item.banco };
  }

  if (store === "categorias") {
    const categoriaGrupo = await getLocalItem("categoriasGrupo", idOf(item.categoriaGrupo));
    return { ...item, categoriaGrupo: categoriaGrupo || item.categoriaGrupo };
  }

  if (store === "gastos") {
    const [cuenta, categoria] = await Promise.all([
      getLocalItem("cuentas", idOf(item.cuenta)),
      getLocalItem("categorias", idOf(item.categoria)),
    ]);
    const categoriaGrupo = categoria
      ? await getLocalItem("categoriasGrupo", idOf(categoria.categoriaGrupo))
      : null;

    return {
      ...item,
      cuenta: cuenta || item.cuenta,
      categoria: categoria
        ? { ...categoria, categoriaGrupo: categoriaGrupo || categoria.categoriaGrupo }
        : item.categoria,
    };
  }

  if (store === "tarjetasCredito") {
    const [banco, cuentaTarjeta, cuentaPagoDefault, resumenes] = await Promise.all([
      getLocalItem("bancos", idOf(item.banco)),
      getLocalItem("cuentas", idOf(item.cuentaTarjeta)),
      getLocalItem("cuentas", idOf(item.cuentaPagoDefault)),
      getCardSummaries(item.localId || item._id),
    ]);

    return {
      ...item,
      banco: banco || item.banco,
      cuentaPagoDefault: cuentaPagoDefault || item.cuentaPagoDefault,
      cuentaTarjeta: cuentaTarjeta || item.cuentaTarjeta,
      resumenes,
      ultimoResumen: resumenes[0] || null,
    };
  }

  return item;
}

async function populateLocalItems(store, items) {
  return Promise.all(items.map((item) => populateLocalItem(store, item)));
}

function normalizeComparableDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function applyGastosFilters(items, params) {
  const fechaDesde = params.get("fechaDesde") || "";
  const fechaHasta = params.get("fechaHasta") || "";
  const categoria = params.get("categoria") || "";
  const cuenta = params.get("cuenta") || "";
  const estado = params.get("estado") || "";
  const busqueda = (params.get("busqueda") || "").trim().toLowerCase();

  return items.filter((item) => {
    const fecha = normalizeComparableDate(item.fecha);
    if (fechaDesde && fecha < fechaDesde) return false;
    if (fechaHasta && fecha > fechaHasta) return false;
    if (categoria && idOf(item.categoria) !== categoria) return false;
    if (cuenta && idOf(item.cuenta) !== cuenta) return false;
    if (estado && item.estado !== estado) return false;
    if (busqueda && !String(item.descripcion || "").toLowerCase().includes(busqueda)) {
      return false;
    }
    return true;
  });
}

function sortItems(store, items) {
  if (store === "gastos") {
    return [...items].sort((a, b) => {
      const orderA = Number(a.ordenCuenta ?? Number.MAX_SAFE_INTEGER);
      const orderB = Number(b.ordenCuenta ?? Number.MAX_SAFE_INTEGER);
      if (orderA !== orderB) return orderA - orderB;
      return String(b.fecha || "").localeCompare(String(a.fecha || ""));
    });
  }

  return [...items].sort((a, b) =>
    String(a.nombre || a.descripcion || "").localeCompare(String(b.nombre || b.descripcion || "")),
  );
}

function paginate(items, params) {
  const page = Math.max(1, Number(params.get("pagina") || 1));
  const limit = Math.min(100, Math.max(5, Number(params.get("limite") || 20)));
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    limite: limit,
    pagina: page,
    total: items.length,
    totalPaginas: Math.max(1, Math.ceil(items.length / limit)),
  };
}

async function handleLocalGet(parsed) {
  const rawItems = await getLocalItems(parsed.store);
  const filtered =
    parsed.store === "gastos" ? applyGastosFilters(rawItems, parsed.params) : rawItems;
  const sorted = sortItems(parsed.store, filtered);

  if (parsed.id) {
    const item = sorted.find((current) => current.localId === parsed.id || current._id === parsed.id);
    return success(await populateLocalItem(parsed.store, item || null));
  }

  if (parsed.store === "gastos" && parsed.params.get("meta")) {
    const paginated = paginate(sorted, parsed.params);
    return success({
      ...paginated,
      items: await populateLocalItems(parsed.store, paginated.items),
    });
  }

  return success(await populateLocalItems(parsed.store, sorted));
}

function buildLocalItem(parsed, body = {}) {
  const localId = body.localId || body._id || createLocalId(parsed.prefix);
  const now = new Date().toISOString();
  return {
    ...body,
    _id: localId,
    cloudId: body.cloudId || "",
    createdAt: body.createdAt || now,
    localId,
    syncStatus: "pending_upload",
    updatedAt: now,
  };
}

async function handleLocalPost(parsed, body) {
  const item = await putLocalItem(parsed.store, buildLocalItem(parsed, body));
  await enqueueSyncOperation({
    endpoint: parsed.collectionPath,
    itemLocalId: item.localId,
    method: "POST",
    resource: parsed.store,
  });
  return success(await populateLocalItem(parsed.store, item), "Guardado localmente");
}

async function handleLocalPatch(parsed, body) {
  const current = await getLocalItem(parsed.store, parsed.id);
  if (!current) throw new Error("Registro local no encontrado");

  const item = await putLocalItem(parsed.store, {
    ...current,
    ...body,
    localId: current.localId,
    syncStatus: "pending_upload",
    updatedAt: new Date().toISOString(),
  });
  await enqueueSyncOperation({
    endpoint: parsed.collectionPath,
    itemLocalId: item.localId,
    method: "PATCH",
    resource: parsed.store,
  });
  return success(await populateLocalItem(parsed.store, item), "Actualizado localmente");
}

async function handleLocalDelete(parsed) {
  const current = await getLocalItem(parsed.store, parsed.id);
  if (!current) return success(null, "Registro local eliminado");
  if (current._deleted) return success(current, "Eliminacion local ya pendiente");

  await removeSyncOperationsForItem(parsed.store, current.localId, ["POST", "PATCH"]);

  if (current.cloudId) {
    await putLocalItem(parsed.store, {
      ...current,
      _deleted: true,
      syncStatus: "pending_upload",
      updatedAt: new Date().toISOString(),
    });
    await enqueueSyncOperation({
      endpoint: parsed.collectionPath,
      itemLocalId: current.localId,
      method: "DELETE",
      resource: parsed.store,
    });
  } else {
    await deleteLocalItem(parsed.store, current.localId);
  }

  return success(current, "Eliminado localmente");
}

async function getCardMovements(cardId) {
  const movimientos = await getLocalItems("movimientosTarjeta");
  return sortItems(
    "gastos",
    movimientos.filter((movimiento) => idOf(movimiento.tarjeta) === cardId),
  );
}

async function getCardSummaries(cardId) {
  const resumenes = await getLocalItems("resumenesTarjeta");
  return resumenes
    .filter((resumen) => idOf(resumen.tarjeta) === cardId)
    .sort((a, b) =>
      String(b.fechaCierre || b.createdAt || "").localeCompare(
        String(a.fechaCierre || a.createdAt || ""),
      ),
    );
}

async function createExpenseFromCardMovement({ cardId, cuentaPago, movementId }) {
  const movimiento = await getLocalItem("movimientosTarjeta", movementId);
  const tarjeta = await getLocalItem("tarjetasCredito", cardId);
  if (!movimiento || !tarjeta) throw new Error("Movimiento o tarjeta local no encontrado");

  const cuentaTarjeta = idOf(tarjeta.cuentaTarjeta);
  const isCompra = movimiento.tipoMovimiento === "compra";
  const isPago = movimiento.tipoMovimiento === "pago";
  const isSaldoAnterior = movimiento.tipoMovimiento === "saldo_anterior";
  const cuenta = isPago ? cuentaTarjeta : cuentaTarjeta;
  const descripcionPrefix = isPago
    ? "Pago tarjeta"
    : isSaldoAnterior
      ? "Saldo anterior tarjeta"
      : "Compra tarjeta";
  const monto = Number(movimiento.montoOriginalExcel || 0);

  const gasto = await putLocalItem("gastos", {
    _id: createLocalId("gasto"),
    categoria: null,
    cuenta,
    descripcion: `${descripcionPrefix}: ${movimiento.detalle}`,
    economiaReal: isCompra ? -Math.abs(monto) : 0,
    estado: isCompra ? "pendiente" : "creado",
    fecha: movimiento.fecha,
    flujoBancario: isPago ? Math.abs(monto) : isCompra ? -Math.abs(monto) : monto,
    incluirEnGastoBancario: true,
    incluirEnGastoReal: isCompra,
    movimientoTarjeta: movimiento.localId || movimiento._id,
    origen: "tarjeta_credito",
    porcentajeEconomiaReal: isCompra ? 100 : 0,
    tarjetaCredito: cardId,
  });

  await enqueueSyncOperation({
    endpoint: "/gastos",
    itemLocalId: gasto.localId,
    method: "POST",
    resource: "gastos",
  });

  await putLocalItem("movimientosTarjeta", {
    ...movimiento,
    cuentaPago: cuentaPago || null,
    gastoGenerado: gasto.localId,
    syncStatus: "pending_upload",
  });

  return gasto;
}

async function handleNestedCardRequest(parsed, options) {
  const method = options.method || "GET";

  if (parsed.type === "cardMovements" && method === "GET") {
    return success(await getCardMovements(parsed.cardId));
  }

  if (parsed.type === "cardSummaries" && method === "GET") {
    return success(await getCardSummaries(parsed.cardId));
  }

  if (parsed.type === "cardMovementCreateExpense" && method === "POST") {
    const gasto = await createExpenseFromCardMovement({
      cardId: parsed.cardId,
      cuentaPago: options.body?.cuentaPago || null,
      movementId: parsed.movementId,
    });
    return success({ creado: true, gasto }, "Gasto creado localmente desde tarjeta");
  }

  if (parsed.type === "cardMovementsCreateBulk" && method === "POST") {
    const ids = Array.isArray(options.body?.movimientoIds) ? options.body.movimientoIds : [];
    let creados = 0;
    let errores = 0;
    let omitidos = 0;

    for (const movementId of ids) {
      const movimiento = await getLocalItem("movimientosTarjeta", movementId);
      if (!movimiento || movimiento.gastoGenerado) {
        omitidos++;
        continue;
      }

      try {
        await createExpenseFromCardMovement({
          cardId: parsed.cardId,
          cuentaPago: options.body?.cuentaPago || null,
          movementId,
        });
        creados++;
      } catch {
        errores++;
      }
    }

    return success({ creados, errores, omitidos }, "Movimientos generados localmente");
  }

  if (parsed.type === "cardMovementDelete" && method === "DELETE") {
    const movimiento = await getLocalItem("movimientosTarjeta", parsed.movementId);
    if (movimiento?.gastoGenerado && options.body?.eliminarGastoGenerado) {
      await deleteLocalItem("gastos", movimiento.gastoGenerado);
    }
    if (movimiento) await deleteLocalItem("movimientosTarjeta", movimiento.localId);
    return success(movimiento || null, "Movimiento eliminado localmente");
  }

  if (parsed.type === "cardSummaryDelete" && method === "DELETE") {
    const movimientos = await getCardMovements(parsed.cardId);
    let movimientosEliminados = 0;
    let gastosEliminados = 0;
    for (const movimiento of movimientos.filter((item) => idOf(item.resumen) === parsed.summaryId)) {
      if (movimiento.gastoGenerado && options.body?.eliminarGastosGenerados) {
        await deleteLocalItem("gastos", movimiento.gastoGenerado);
        gastosEliminados++;
      }
      await deleteLocalItem("movimientosTarjeta", movimiento.localId);
      movimientosEliminados++;
    }
    await deleteLocalItem("resumenesTarjeta", parsed.summaryId);
    return success({ gastosEliminados, movimientosEliminados }, "Resumen eliminado localmente");
  }

  throw new Error("Operacion local de tarjeta no soportada todavia.");
}

async function handleDebtPayment(endpoint, body) {
  const match = endpoint.match(/^\/deudas\/([^/]+)\/pagar-cuota$/);
  const deuda = await getLocalItem("deudas", match?.[1]);
  if (!deuda) throw new Error("Deuda local no encontrada");
  if (!deuda.activa) throw new Error("La deuda ya esta finalizada");

  const montoOrigen = body.montoMonedaOrigen ?? deuda.montoCuota;
  const montoDebitado = body.montoDebitadoUYU ?? montoOrigen * (body.cotizacion || 1);
  const cuotaNumero = Number(deuda.cuotaActual || 0) + 1;
  const cuenta = body.cuenta || idOf(deuda.cuentaPagoDefault);
  const categoria = body.categoria || idOf(deuda.categoriaDefault);

  const gasto = await putLocalItem("gastos", {
    _id: createLocalId("gasto"),
    categoria,
    cuenta,
    descripcion: `Cuota ${cuotaNumero}/${deuda.cuotasTotales}: ${deuda.descripcion}`,
    economiaReal: -Math.abs(montoDebitado),
    estado: "creado",
    fecha: body.fecha || new Date().toISOString(),
    flujoBancario: -Math.abs(montoDebitado),
    incluirEnGastoBancario: true,
    incluirEnGastoReal: true,
    origen: "deuda",
    porcentajeEconomiaReal: 100,
  });

  await enqueueSyncOperation({
    endpoint: "/gastos",
    itemLocalId: gasto.localId,
    method: "POST",
    resource: "gastos",
  });

  const historialPagos = Array.isArray(deuda.historialPagos) ? deuda.historialPagos : [];
  const nextDeuda = await putLocalItem("deudas", {
    ...deuda,
    activa: cuotaNumero < Number(deuda.cuotasTotales || 0),
    cuotaActual: cuotaNumero,
    historialPagos: [
      ...historialPagos,
      {
        categoria,
        cotizacion: body.cotizacion ?? null,
        cuenta,
        cuotaNumero,
        fecha: body.fecha || new Date().toISOString(),
        gasto: gasto.localId,
        monedaOrigen: deuda.moneda,
        montoDebitadoUYU: montoDebitado,
        montoMonedaOrigen: montoOrigen,
      },
    ],
    saldoPendiente: Math.max(
      0,
      Number(deuda.saldoPendiente ?? deuda.montoTotal) - Number(montoOrigen || 0),
    ),
    syncStatus: "pending_upload",
  });

  await enqueueSyncOperation({
    endpoint: "/deudas",
    itemLocalId: nextDeuda.localId,
    method: "PATCH",
    resource: "deudas",
  });

  return success({ deuda: nextDeuda, gasto }, "Cuota pagada localmente");
}

export async function localFirstRequest(endpoint, options = {}) {
  if (endpoint === "/gastos/orden-cuenta" && (options.method || "GET") === "PATCH") {
    const gastos = Array.isArray(options.body?.gastos) ? options.body.gastos : [];
    for (const gasto of gastos) {
      const current = await getLocalItem("gastos", gasto.id);
      if (current) {
        await putLocalItem("gastos", {
          ...current,
          ordenCuenta: gasto.ordenCuenta,
          syncStatus: "pending_upload",
        });
        await enqueueSyncOperation({
          endpoint: "/gastos",
          itemLocalId: current.localId,
          method: "PATCH",
          resource: "gastos",
        });
      }
    }

    return success({ actualizados: gastos.length }, "Orden actualizado localmente");
  }

  const nestedCard = parseNestedCardEndpoint(endpoint);
  if (nestedCard) return handleNestedCardRequest(nestedCard, options);

  if (/^\/deudas\/[^/]+\/pagar-cuota$/.test(endpoint) && (options.method || "GET") === "POST") {
    return handleDebtPayment(endpoint, options.body || {});
  }

  const parsed = parseEndpoint(endpoint);
  if (!parsed) throw new Error("Endpoint local no soportado");

  const method = options.method || "GET";
  if (method === "GET") return handleLocalGet(parsed);
  if (method === "POST" && !parsed.id && !parsed.readOnlyAlias) {
    return handleLocalPost(parsed, options.body || {});
  }
  if (method === "PATCH" && parsed.id) return handleLocalPatch(parsed, options.body || {});
  if (method === "DELETE" && parsed.id) return handleLocalDelete(parsed);

  throw new Error("Operacion local no soportada todavia.");
}

function plainItem(item) {
  const {
    _deleted,
    cloudId,
    createdAt,
    localId,
    syncStatus,
    updatedAt,
    ...payload
  } = item;
  return payload;
}

async function saveCardSummariesFromCloud(cardLocalId, summaries = []) {
  const localSummaries = await getLocalItems("resumenesTarjeta", { includeDeleted: true });
  const localByRemoteId = new Map(
    localSummaries
      .filter((summary) => idOf(summary.tarjeta) === cardLocalId)
      .map((summary) => [summary.cloudId || summary._id, summary])
      .filter(([remoteId]) => Boolean(remoteId)),
  );
  const cloudIds = new Set(summaries.map((summary) => summary._id).filter(Boolean));
  let changed = 0;

  for (const summary of summaries) {
    const current = localByRemoteId.get(summary._id);
    const hasPendingLocalDelete =
      current?._deleted && current?.syncStatus === "pending_upload";

    if (hasPendingLocalDelete) {
      continue;
    }

    const localId = summary.localId || summary._id;
    const nextSummary = {
      ...summary,
      cloudId: summary.cloudId || summary._id,
      localId,
      syncStatus: "synced",
      tarjeta: cardLocalId,
    };

    if (JSON.stringify(plainItem(current || {})) !== JSON.stringify(plainItem(nextSummary))) {
      changed++;
    }

    await putLocalItem("resumenesTarjeta", nextSummary);
  }

  for (const localSummary of localSummaries) {
    if (idOf(localSummary.tarjeta) !== cardLocalId) continue;
    if (localSummary.syncStatus === "pending_upload") continue;

    const remoteId = localSummary.cloudId || localSummary._id;
    if (remoteId && !cloudIds.has(remoteId)) {
      await deleteLocalItem("resumenesTarjeta", localSummary.localId);
      changed++;
    }
  }

  return changed;
}

async function saveCloudCollection(store, items) {
  const localItems = await getLocalItems(store, { includeDeleted: true });
  const localByRemoteId = new Map(
    localItems
      .map((item) => [item.cloudId || item._id, item])
      .filter(([remoteId]) => Boolean(remoteId)),
  );
  const cloudIds = new Set(items.map((item) => item._id).filter(Boolean));
  let changed = 0;

  for (const item of items) {
    const localId = item.localId || item._id;
    const current = localByRemoteId.get(item._id);
    const hasPendingLocalDelete =
      current?._deleted && current?.syncStatus === "pending_upload";

    if (hasPendingLocalDelete) {
      continue;
    }

    if (JSON.stringify(plainItem(current || {})) !== JSON.stringify(item)) {
      changed++;
    }

    await putLocalItem(store, {
      ...item,
      cloudId: item.cloudId || item._id,
      localId,
      syncStatus: "synced",
    });

    if (store === "tarjetasCredito") {
      changed += await saveCardSummariesFromCloud(localId, item.resumenes || []);
    }
  }

  for (const localItem of localItems) {
    const hasPendingLocalChanges = localItem.syncStatus === "pending_upload";
    const remoteId = localItem.cloudId || localItem._id;

    if (hasPendingLocalChanges || !remoteId) continue;

    if (!cloudIds.has(remoteId)) {
      await deleteLocalItem(store, localItem.localId);
      changed++;
    }
  }

  return { changed, downloaded: items.length };
}

export async function pullCloudDataToLocal(remoteRequest) {
  let changed = 0;
  let downloaded = 0;

  for (const config of PULL_ENDPOINTS) {
    try {
      const response = await remoteRequest(config.endpoint, { localFirst: false });
      const data = response?.data || response;
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const result = await saveCloudCollection(config.store, items);
      changed += result.changed;
      downloaded += result.downloaded;
    } catch (error) {
      if (error?.status === 429 || /demasiad|too many/i.test(error?.message || "")) {
        throw error;
      }
      // Some collections can fail independently without blocking local work.
    }
  }

  return { changed, downloaded };
}

async function resolveRef(store, value) {
  const id = idOf(value);
  if (!id) return null;
  const item = await getLocalItem(store, id);
  return item?.cloudId || item?._id || id;
}

async function buildCloudPayload(resource, item) {
  const payload = plainItem(item);

  delete payload._id;
  delete payload.usuario;

  if (resource === "cuentas") {
    payload.banco = await resolveRef("bancos", payload.banco);
  }

  if (resource === "categorias") {
    payload.categoriaGrupo = await resolveRef("categoriasGrupo", payload.categoriaGrupo);
  }

  if (resource === "gastos") {
    payload.cuenta = await resolveRef("cuentas", payload.cuenta);
    payload.categoria = await resolveRef("categorias", payload.categoria);
  }

  if (resource === "tarjetasCredito") {
    payload.banco = await resolveRef("bancos", payload.banco);
    payload.cuentaTarjeta = await resolveRef("cuentas", payload.cuentaTarjeta);
    payload.cuentaPagoDefault = await resolveRef("cuentas", payload.cuentaPagoDefault);
  }

  return payload;
}

function getRemoteId(item) {
  return item.cloudId || "";
}

function sortQueue(queue) {
  return [...queue].sort((a, b) => {
    const orderA =
      SYNC_ORDER.indexOf(a.resource) === -1
        ? SYNC_ORDER.length
        : SYNC_ORDER.indexOf(a.resource);
    const orderB =
      SYNC_ORDER.indexOf(b.resource) === -1
        ? SYNC_ORDER.length
        : SYNC_ORDER.indexOf(b.resource);
    if (orderA !== orderB) return orderA - orderB;
    return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
  });
}

function dataUrlToFile(dataUrl, fileName, fileType) {
  const [header, data] = dataUrl.split(",");
  const mime = fileType || header.match(/data:(.*?);/)?.[1] || "application/octet-stream";
  const binary = window.atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName || "archivo", { type: mime });
}

export async function syncLocalChangesToCloud(remoteRequest, remoteUpload) {
  const queue = sortQueue(await getSyncQueue());
  let synced = 0;
  let failed = 0;
  let cleaned = 0;

  for (const operation of queue) {
    if (operation.method === "UPLOAD_CARD_EXCEL") {
      try {
        if (!remoteUpload) throw new Error("No hay uploader remoto disponible");
        const file = dataUrlToFile(operation.fileData, operation.fileName, operation.fileType);
        await remoteUpload(operation.endpoint, operation.fieldName || "excel", file, {
          localFirst: false,
        });
        await removeSyncOperation(operation.localId);
        synced++;
      } catch {
        failed++;
      }
      continue;
    }

    try {
      const item = await getLocalItem(operation.resource, operation.itemLocalId);

      if (!item && operation.method === "DELETE") {
        await removeSyncOperation(operation.localId);
        cleaned++;
        continue;
      }

      if (!item && operation.method !== "DELETE") {
        await removeSyncOperation(operation.localId);
        continue;
      }

      if (item?.syncStatus === "synced" && operation.method !== "DELETE") {
        await removeSyncOperation(operation.localId);
        synced++;
        continue;
      }

      if (operation.method === "POST") {
        const payload = await buildCloudPayload(operation.resource, item);
        const response = await remoteRequest(operation.endpoint, {
          body: payload,
          localFirst: false,
          method: "POST",
        });
        const cloudItem = response?.data || response;
        await putLocalItem(operation.resource, {
          ...item,
          cloudId: cloudItem?._id || item.cloudId,
          syncStatus: "synced",
        });
      }

      if (operation.method === "PATCH") {
        const remoteId = getRemoteId(item);
        if (!remoteId) {
          const payload = await buildCloudPayload(operation.resource, item);
          const response = await remoteRequest(operation.endpoint, {
            body: payload,
            localFirst: false,
            method: "POST",
          });
          const cloudItem = response?.data || response;
          await putLocalItem(operation.resource, {
            ...item,
            cloudId: cloudItem?._id || item.cloudId,
            syncStatus: "synced",
          });
        } else {
          const payload = await buildCloudPayload(operation.resource, item);
          await remoteRequest(`${operation.endpoint}/${remoteId}`, {
            body: payload,
            localFirst: false,
            method: "PATCH",
          });
          await putLocalItem(operation.resource, { ...item, syncStatus: "synced" });
        }
      }

      if (operation.method === "DELETE") {
        const remoteId = getRemoteId(item);
        if (remoteId) {
          try {
            await remoteRequest(`${operation.endpoint}/${remoteId}`, {
              localFirst: false,
              method: "DELETE",
            });
          } catch (error) {
            if (![404, 409, 500].includes(Number(error?.status))) {
              throw error;
            }
            cleaned++;
          }
        }
        await deleteLocalItem(operation.resource, item.localId);
      }

      await removeSyncOperation(operation.localId);
      synced++;
    } catch {
      failed++;
    }
  }

  const pullResult = await pullCloudDataToLocal(remoteRequest);
  await setLocalMeta("lastSyncAt", new Date().toISOString());
  return { cleaned, downloaded: pullResult.downloaded, failed, synced };
}
