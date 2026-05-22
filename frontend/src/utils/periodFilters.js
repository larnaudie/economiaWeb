export const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function currentMonthPeriod() {
  const now = new Date();
  return {
    mode: "month",
    month: "",
    year: String(now.getFullYear()),
    dateFrom: "",
    dateTo: "",
  };
}

export function buildDateRange(filters) {
  if (filters.mode === "month") {
    if (!filters.month) {
      return {
        fechaDesde: `${filters.year}-01-01`,
        fechaHasta: `${filters.year}-12-31`,
      };
    }

    const month = Number(filters.month);
    const year = Number(filters.year);
    const lastDay = new Date(year, month, 0).getDate();

    return {
      fechaDesde: `${year}-${String(month).padStart(2, "0")}-01`,
      fechaHasta: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    };
  }

  if (filters.mode === "year") {
    return {
      fechaDesde: `${filters.year}-01-01`,
      fechaHasta: `${filters.year}-12-31`,
    };
  }

  return {
    fechaDesde: filters.dateFrom,
    fechaHasta: filters.dateTo,
  };
}
