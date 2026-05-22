const DEFAULT_RATES = {
  usd: 40,
  ui: 6.5,
};

function normalizeRate(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function pickRate(item) {
  return normalizeRate(item?.venta) ?? normalizeRate(item?.compra);
}

function findQuote(items, matcher) {
  return items.find((item) => matcher({
    moneda: String(item?.moneda || "").toUpperCase(),
    nombre: String(item?.nombre || "").toUpperCase(),
  }));
}

export const obtenerCotizacionesService = async () => {
  const sourceUrl =
    process.env.COTIZACIONES_URL || "https://uy.dolarapi.com/v1/cotizaciones";

  try {
    const response = await fetch(sourceUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Proveedor respondio ${response.status}`);
    }

    const quotes = await response.json();

    if (!Array.isArray(quotes)) {
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

    return {
      usdUyu: pickRate(usdQuote) ?? DEFAULT_RATES.usd,
      uiUyu: pickRate(uiQuote) ?? DEFAULT_RATES.ui,
      fechaActualizacion:
        usdQuote?.fechaActualizacion ||
        uiQuote?.fechaActualizacion ||
        new Date().toISOString(),
      fuente: "DolarApi Uruguay",
      fallback: !usdQuote || !uiQuote,
    };
  } catch {
    return {
      usdUyu: DEFAULT_RATES.usd,
      uiUyu: DEFAULT_RATES.ui,
      fechaActualizacion: new Date().toISOString(),
      fuente: "Valores por defecto",
      fallback: true,
    };
  }
};
