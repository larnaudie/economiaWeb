import * as XLSX from "xlsx";

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function parseNumberUY(value) {
  const text = cleanText(value)
    .replace(/\$/g, "")
    .replace(/U\$S/g, "")
    .replace(/\s/g, "");

  if (!text || text === "-" || text === "None") return 0;

  const normalized = text.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isNaN(number) ? 0 : number;
}

function parseDateUY(value) {
  const text = cleanText(value);
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function getCell(rows, rowIndex, colIndex) {
  return rows[rowIndex]?.[colIndex] ?? "";
}

function findColumnIndex(row, predicate) {
  return row.findIndex((cell) => predicate(cleanText(cell)));
}

function findRowIndex(rows, predicate) {
  return rows.findIndex((row) => row.some((cell) => predicate(cleanText(cell))));
}

function classifyMovement({ detalle, amount, isSaldoAnterior }) {
  if (isSaldoAnterior) return "saldo_anterior";
  if (amount > 0) return "compra";
  if (amount < 0 && /pago/i.test(detalle)) return "pago";
  if (amount < 0) return "credito";
  return "ajuste";
}

function calculateAmounts({ tipoMovimiento, amount }) {
  if (tipoMovimiento === "compra") {
    return {
      montoReal: -Math.abs(amount),
      montoBancario: 0,
    };
  }

  if (tipoMovimiento === "credito") {
    return {
      montoReal: Math.abs(amount),
      montoBancario: 0,
    };
  }

  return {
    montoReal: 0,
    montoBancario: 0,
  };
}

function buildMovementHash({
  fecha,
  tarjetaEnmascarada,
  detalle,
  moneda,
  amount,
  periodo,
}) {
  const dateKey = fecha ? fecha.toISOString().slice(0, 10) : "sin-fecha";
  return [
    "tarjeta",
    dateKey,
    tarjetaEnmascarada,
    cleanText(detalle).toLowerCase(),
    moneda,
    Number(amount || 0).toFixed(2),
    cleanText(periodo).toLowerCase(),
  ].join("|");
}

function createMovement({
  fecha,
  tarjetaEnmascarada,
  detalle,
  moneda,
  amount,
  periodo,
  fechaCierre,
  fechaVencimiento,
  isSaldoAnterior = false,
}) {
  const tipoMovimiento = classifyMovement({ detalle, amount, isSaldoAnterior });
  const amounts = calculateAmounts({ tipoMovimiento, amount });

  return {
    fecha: fecha || fechaCierre || new Date(),
    tarjetaEnmascarada,
    detalle,
    tipoMovimiento,
    moneda,
    montoOriginalExcel: amount,
    ...amounts,
    periodoResumen: periodo,
    fechaCierre,
    fechaVencimiento,
    hashImportacion: buildMovementHash({
      fecha: fecha || fechaCierre,
      tarjetaEnmascarada,
      detalle,
      moneda,
      amount,
      periodo,
    }),
  };
}

export function parseCreditCardExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  });

  const accountRowIndex = findRowIndex(rows, (cell) => cell === "Cuenta");
  const paymentHeaderIndex = findRowIndex(rows, (cell) => cell === "Pagos");
  const paymentRowIndex = findRowIndex(rows, (cell) => cell === "Pago Contado");
  const minimumPaymentRowIndex = findRowIndex(rows, (cell) => cell === "Pago Mínimo" || cell === "Pago Minimo");
  const movementsHeaderIndex = findRowIndex(rows, (cell) => cell === "Fecha");

  if (accountRowIndex < 0 || movementsHeaderIndex < 0) {
    const error = new Error("El Excel no tiene el formato esperado de tarjeta.");
    error.status = 400;
    throw error;
  }

  const accountHeader = rows[accountRowIndex] || [];
  const accountValues = rows[accountRowIndex + 1] || [];
  const limitUSDIndex = findColumnIndex(accountHeader, (cell) => /l.mite.*us/i.test(cell));
  const limitUYUIndex = findColumnIndex(accountHeader, (cell) => /l.mite.*\(\$\)/i.test(cell));
  const closingIndex = findColumnIndex(accountHeader, (cell) => /fecha de cierre/i.test(cell));
  const dueIndex = findColumnIndex(accountHeader, (cell) => /vencimiento/i.test(cell));
  const periodIndex = findColumnIndex(accountHeader, (cell) => /per.odo consultado/i.test(cell));

  const paymentHeader = rows[paymentHeaderIndex] || [];
  const pesosIndex = findColumnIndex(paymentHeader, (cell) => cell === "Pesos");
  const dolaresIndex = findColumnIndex(paymentHeader, (cell) => cell === "Dólares" || cell === "Dolares");

  const movementHeader = rows[movementsHeaderIndex] || [];
  const fechaIndex = findColumnIndex(movementHeader, (cell) => cell === "Fecha");
  const tarjetaIndex = findColumnIndex(movementHeader, (cell) => cell === "Tarjeta");
  const detalleIndex = findColumnIndex(movementHeader, (cell) => cell === "Detalle");
  const amountUYUIndex = findColumnIndex(movementHeader, (cell) => cell === "Importe $");
  const amountUSDIndex = findColumnIndex(movementHeader, (cell) => /importe u.?s/i.test(cell));
  const markerIndex = amountUYUIndex - 2;

  const periodo = cleanText(accountValues[periodIndex]);
  const fechaCierre = parseDateUY(accountValues[closingIndex]);
  const fechaVencimiento = parseDateUY(accountValues[dueIndex]);
  const limiteUSD = parseNumberUY(accountValues[limitUSDIndex]);
  const limiteUYU = parseNumberUY(accountValues[limitUYUIndex]);
  const pagoContadoUYU = parseNumberUY(getCell(rows, paymentRowIndex, pesosIndex));
  const pagoContadoUSD = parseNumberUY(getCell(rows, paymentRowIndex, dolaresIndex));
  const pagoMinimoUYU = parseNumberUY(getCell(rows, minimumPaymentRowIndex, pesosIndex));
  const pagoMinimoUSD = parseNumberUY(getCell(rows, minimumPaymentRowIndex, dolaresIndex));

  const movements = [];
  let saldoAnteriorUYU = 0;
  let saldoAnteriorUSD = 0;
  let cargosMesUYU = 0;
  let cargosMesUSD = 0;

  for (let index = movementsHeaderIndex + 1; index < rows.length; index++) {
    const row = rows[index];
    const marker = cleanText(row[markerIndex]);

    if (/saldo final/i.test(marker)) break;

    const isSaldoAnterior = /saldo anterior/i.test(marker);
    const fecha = parseDateUY(row[fechaIndex]);
    const tarjetaEnmascarada = cleanText(row[tarjetaIndex]);
    const detalle = isSaldoAnterior ? "Saldo Anterior" : cleanText(row[detalleIndex]);
    const amountUYU = parseNumberUY(row[amountUYUIndex]);
    const amountUSD = parseNumberUY(row[amountUSDIndex]);

    if (!isSaldoAnterior && !fecha && !detalle) continue;

    if (isSaldoAnterior) {
      saldoAnteriorUYU = amountUYU;
      saldoAnteriorUSD = amountUSD;
    }

    if (!isSaldoAnterior && amountUYU > 0) cargosMesUYU += amountUYU;
    if (!isSaldoAnterior && amountUSD > 0) cargosMesUSD += amountUSD;

    if (amountUYU !== 0) {
      movements.push(
        createMovement({
          fecha,
          tarjetaEnmascarada,
          detalle,
          moneda: "UYU",
          amount: amountUYU,
          periodo,
          fechaCierre,
          fechaVencimiento,
          isSaldoAnterior,
        }),
      );
    }

    if (amountUSD !== 0) {
      movements.push(
        createMovement({
          fecha,
          tarjetaEnmascarada,
          detalle,
          moneda: "USD",
          amount: amountUSD,
          periodo,
          fechaCierre,
          fechaVencimiento,
          isSaldoAnterior,
        }),
      );
    }
  }

  const resumen = {
    periodo,
    fechaCierre,
    fechaVencimiento,
    limiteUYU,
    limiteUSD,
    creditoDisponibleUYU: null,
    creditoDisponibleUSD: null,
    saldoAnteriorUYU,
    saldoAnteriorUSD,
    cargosMesUYU: Number(cargosMesUYU.toFixed(2)),
    cargosMesUSD: Number(cargosMesUSD.toFixed(2)),
    pagoContadoUYU,
    pagoContadoUSD,
    pagoMinimoUYU,
    pagoMinimoUSD,
    hashImportacion: [
      "resumen",
      cleanText(periodo).toLowerCase(),
      fechaCierre ? fechaCierre.toISOString().slice(0, 10) : "",
      fechaVencimiento ? fechaVencimiento.toISOString().slice(0, 10) : "",
    ].join("|"),
  };

  return {
    resumen,
    movimientos: movements,
  };
}
