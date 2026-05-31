import { excelDateToISO, parseMoneyValue } from "./formatters";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeHeader(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildBankFlow(gValue, iValue) {
  const g = parseMoneyValue(gValue);
  const i = parseMoneyValue(iValue);
  if (g != null && i != null) return g + i;
  if (g != null) return g;
  if (i != null) return i;
  return null;
}

function resolveFlags(categoryName, flow, real) {
  const name = normalizeText(categoryName);
  const flujo = Number(flow) || 0;
  const realValue = Number(real) || 0;

  if (
    name.includes("transf") ||
    name.includes("traspaso") ||
    name.includes("balance mes anterior")
  ) {
    return { incluirEnGastoBancario: false, incluirEnGastoReal: false };
  }

  if (name.includes("balance split")) {
    return { incluirEnGastoBancario: false, incluirEnGastoReal: realValue < 0 };
  }

  return {
    incluirEnGastoBancario: flujo !== 0,
    incluirEnGastoReal: realValue !== 0,
  };
}

function isDateHeader(value) {
  return /fecha|date/.test(normalizeHeader(value));
}

function isDescriptionHeader(value) {
  return /descripcion|detalle|concepto|comercio/.test(normalizeHeader(value));
}

function isAmountHeader(value) {
  return /flujo\s*bancario|importe|monto|debito|credito|egreso|ingreso/.test(
    normalizeHeader(value),
  );
}

function findBankHeaderBlocks(headers) {
  const blocks = [];

  headers.forEach((header, index) => {
    if (!isDateHeader(header)) return;

    const descriptionIndex = headers.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > index &&
        candidateIndex <= index + 4 &&
        isDescriptionHeader(candidate),
    );
    const amountIndex = headers.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex > index &&
        candidateIndex <= index + 6 &&
        isAmountHeader(candidate),
    );

    if (descriptionIndex !== -1 && amountIndex !== -1) {
      blocks.push({ amountIndex, dateIndex: index, descriptionIndex });
    }
  });

  return blocks;
}

function buildParsedRow({ blockIndex = 0, descripcion, fecha, flujoBancario, index }) {
  const flags = resolveFlags(descripcion, flujoBancario, flujoBancario);

  return {
    localId: `row-${Date.now()}-${blockIndex}-${index}`,
    fecha,
    descripcion,
    flujoBancario: Number(flujoBancario || 0),
    porcentajeEconomiaReal: 100,
    economiaReal: Number(flujoBancario || 0),
    categoria: "",
    categoriaNombreOriginal: "",
    cuenta: "",
    selected: true,
    created: false,
    ...flags,
  };
}

function parseBankSheetByHeaders(sheet, XLSX) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  const headerRowIndex = rawRows.findIndex((row) => {
    const blocks = findBankHeaderBlocks(row);
    return blocks.length > 0;
  });

  if (headerRowIndex === -1) return [];

  const headers = rawRows[headerRowIndex] || [];
  const blocks = findBankHeaderBlocks(headers);

  if (!blocks.length) return [];

  return rawRows
    .slice(headerRowIndex + 1)
    .flatMap((row, index) =>
      blocks.map((block, blockIndex) => {
        const fecha = excelDateToISO(row[block.dateIndex], XLSX);
        const descripcion = String(row[block.descriptionIndex] || "").trim();
        const flujoBancario = parseMoneyValue(row[block.amountIndex]);

        if (!fecha || !descripcion || flujoBancario == null || flujoBancario === 0) {
          return null;
        }

        return buildParsedRow({
          blockIndex,
          descripcion,
          fecha,
          flujoBancario,
          index,
        });
      }),
    )
    .filter(Boolean);
}

export function parseBankSheet(sheet, XLSX) {
  if (!sheet["!ref"]) return [];

  const headerRows = parseBankSheetByHeaders(sheet, XLSX);
  if (headerRows.length) return headerRows;

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const parsedRows = [];

  for (let rowIndex = 15; rowIndex <= range.e.r; rowIndex++) {
    const excelRowNumber = rowIndex + 1;
    const fecha = excelDateToISO(sheet[`B${excelRowNumber}`]?.v ?? "", XLSX);
    const descripcion = String(sheet[`D${excelRowNumber}`]?.v ?? "").trim();
    const flujoBancario = buildBankFlow(
      sheet[`G${excelRowNumber}`]?.v ?? "",
      sheet[`I${excelRowNumber}`]?.v ?? "",
    );

    if (!fecha || !descripcion || flujoBancario == null || flujoBancario === 0) {
      continue;
    }

    parsedRows.push(
      buildParsedRow({
        descripcion,
        fecha,
        flujoBancario,
        index: rowIndex,
      }),
    );
  }

  return parsedRows;
}
