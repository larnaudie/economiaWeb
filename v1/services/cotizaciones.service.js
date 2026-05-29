const DEFAULT_RATES = {
  usdCompra: 40,
  usdVenta: 40,
  ui: 6.5,
};

const CACHE_TTL_MS = 15 * 60 * 1000;
let ratesCache = null;

function normalizeRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function pickRate(item) {
  return normalizeRate(item?.venta) ?? normalizeRate(item?.compra);
}

function pickBuyRate(item) {
  return normalizeRate(item?.compra) ?? pickRate(item);
}

function pickSellRate(item) {
  return normalizeRate(item?.venta) ?? pickRate(item);
}

function findQuote(items, matcher) {
  return items.find((item) => matcher({
    moneda: String(item?.moneda || "").toUpperCase(),
    nombre: String(item?.nombre || "").toUpperCase(),
  }));
}

function normalizeProviderResponse(quotes) {
  if (Array.isArray(quotes)) return quotes;
  if (Array.isArray(quotes?.data)) return quotes.data;
  if (Array.isArray(quotes?.cotizaciones)) return quotes.cotizaciones;
  return [];
}

function buildFallbackResponse(reason = "Proveedor no disponible") {
  return {
    aviso: "Cotizaciones por defecto. Verifica antes de tomar decisiones financieras.",
    bancos: [],
    fallback: true,
    fechaActualizacion: new Date().toISOString(),
    fuente: "Valores por defecto",
    proveedores: [{ estado: "fallback", nombre: "Fallback local", razon: reason }],
    uiUyu: DEFAULT_RATES.ui,
    uiValor: DEFAULT_RATES.ui,
    usdCompra: DEFAULT_RATES.usdCompra,
    usdPromedio: (DEFAULT_RATES.usdCompra + DEFAULT_RATES.usdVenta) / 2,
    usdUyu: DEFAULT_RATES.usdVenta,
    usdVenta: DEFAULT_RATES.usdVenta,
  };
}

async function fetchWithTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchDolarApiRates() {
  const sourceUrl =
    process.env.COTIZACIONES_URL || "https://uy.dolarapi.com/v1/cotizaciones";

  const response = await fetchWithTimeout(sourceUrl);

  if (!response.ok) {
    throw new Error(`Proveedor respondio ${response.status}`);
  }

  const quotes = normalizeProviderResponse(await response.json());

  if (!quotes.length) {
    throw new Error("Formato de cotizaciones invalido");
  }

  const usdQuote = findQuote(
    quotes,
    ({ moneda, nombre }) => moneda === "USD" || nombre.includes("DOLAR"),
  );
  const uiQuote = findQuote(
    quotes,
    ({ moneda, nombre }) =>
      moneda === "UI" || nombre.includes("UNIDAD INDEXADA"),
  );

  const usdCompra = pickBuyRate(usdQuote) ?? DEFAULT_RATES.usdCompra;
  const usdVenta = pickSellRate(usdQuote) ?? DEFAULT_RATES.usdVenta;
  const uiValor = pickRate(uiQuote) ?? DEFAULT_RATES.ui;
  const fallback = !usdQuote || !uiQuote;

  return {
    aviso: fallback
      ? "Alguna cotizacion vino incompleta; se completaron valores por defecto."
      : "Cotizaciones informativas. Para operar, verifica con tu banco.",
    bancos: [],
    fallback,
    fechaActualizacion:
      usdQuote?.fechaActualizacion ||
      uiQuote?.fechaActualizacion ||
      new Date().toISOString(),
    fuente: "BCU via DolarApi Uruguay",
    proveedores: [
      {
        estado: fallback ? "parcial" : "ok",
        nombre: "DolarApi Uruguay",
        url: sourceUrl,
      },
    ],
    uiUyu: uiValor,
    uiValor,
    usdCompra,
    usdPromedio: Number(((usdCompra + usdVenta) / 2).toFixed(4)),
    usdUyu: usdVenta,
    usdVenta,
  };
}

export const obtenerCotizacionesService = async () => {
  const now = Date.now();
  if (ratesCache && now - ratesCache.cachedAt < CACHE_TTL_MS) {
    return {
      ...ratesCache.data,
      cache: true,
      cacheTtlSegundos: Math.ceil((CACHE_TTL_MS - (now - ratesCache.cachedAt)) / 1000),
    };
  }

  try {
    const data = await fetchDolarApiRates();
    ratesCache = { cachedAt: now, data };
    return { ...data, cache: false, cacheTtlSegundos: CACHE_TTL_MS / 1000 };
  } catch (error) {
    const fallback = buildFallbackResponse(error.message);
    ratesCache = { cachedAt: now, data: fallback };
    return { ...fallback, cache: false, cacheTtlSegundos: CACHE_TTL_MS / 1000 };
  }
};
