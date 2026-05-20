export function formatCurrency(value) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

export function parseMoneyValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;

  let normalized = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[^0-9,.\-+]/g, "");

  if (!normalized) return null;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    normalized = normalized.replace(",", ".");
  }

  const number = Number(normalized);
  return Number.isNaN(number) ? null : number;
}

export function excelDateToISO(value, xlsx) {
  if (value == null || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && xlsx?.SSF) {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (!parsed) return "";
    return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      return `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  return "";
}
