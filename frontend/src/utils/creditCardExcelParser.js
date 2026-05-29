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

function throwFormatError(message) {
  throw new Error(message);
}

function requireRow(index, label) {
  if (index < 0) {
    throwFormatError(`El Excel no tiene el formato esperado: falta la seccion ${label}.`);
  }
}

function requireColumn(index, label) {
  if (index < 0) {
    throwFormatError(`El Excel no tiene el formato esperado: falta la columna ${label}.`);
  }
}

function classifyMovement({ amount, detalle, isSaldoAnterior }) {
  if (isSaldoAnterior) return "saldo_anterior";
  if (amount > 0) return "compra";
  if (amount < 0 && /pago/i.test(detalle)) return "pago";
  if (amount < 0) return "credito";
  return "ajuste";
}

function calculateAmounts({ amount, tipoMovimiento }) {
  if (tipoMovimiento === "compra") {
    return { montoBancario: 0, montoReal: -Math.abs(amount) };
  }

  if (tipoMovimiento === "credito") {
    return { montoBancario: 0, montoReal: Math.abs(amount) };
  }

  return { montoBancario: 0, montoReal: 0 };
}

function buildMovementHash({
  amount,
  detalle,
  fecha,
  moneda,
  periodo,
  tarjetaEnmascarada,
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
  amount,
  detalle,
  fecha,
  fechaCierre,
  fechaVencimiento,
  isSaldoAnterior = false,
  moneda,
  periodo,
  tarjetaEnmascarada,
}) {
  const tipoMovimiento = classifyMovement({ amount, detalle, isSaldoAnterior });
  const amounts = calculateAmounts({ amount, tipoMovimiento });

  return {
    ...amounts,
    detalle,
    fecha: fecha || fechaCierre || new Date(),
    fechaCierre,
    fechaVencimiento,
    hashImportacion: buildMovementHash({
      amount,
      detalle,
      fecha: fecha || fechaCierre,
      moneda,
      periodo,
      tarjetaEnmascarada,
    }),
    moneda,
    montoOriginalExcel: amount,
    periodoResumen: periodo,
    tarjetaEnmascarada,
    tipoMovimiento,
  };
}

export async function parseCreditCardExcelFile(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: false, type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    blankrows: false,
    defval: "",
    header: 1,
    raw: false,
  });

  const accountRowIndex = findRowIndex(rows, (cell) => cell === "Cuenta");
  const paymentHeaderIndex = findRowIndex(rows, (cell) => cell === "Pagos");
  const paymentRowIndex = findRowIndex(rows, (cell) => cell === "Pago Contado");
  const minimumPaymentRowIndex = findRowIndex(
    rows,
    (cell) => cell === "Pago Minimo" || cell === "Pago Mínimo",
  );
  const movementsHeaderIndex = findRowIndex(rows, (cell) => cell === "Fecha");

  requireRow(accountRowIndex, "Cuenta");
  requireRow(paymentHeaderIndex, "Pagos");
  requireRow(paymentRowIndex, "Pago Contado");
  requireRow(minimumPaymentRowIndex, "Pago Minimo");
  requireRow(movementsHeaderIndex, "Movimientos");

  const accountHeader = rows[accountRowIndex] || [];
  const accountValues = rows[accountRowIndex + 1] || [];
  const limitUSDIndex = findColumnIndex(accountHeader, (cell) => /l.mite.*us/i.test(cell));
  const limitUYUIndex = findColumnIndex(accountHeader, (cell) => /l.mite.*\(\$\)/i.test(cell));
  const closingIndex = findColumnIndex(accountHeader, (cell) => /fecha de cierre/i.test(cell));
  const dueIndex = findColumnIndex(accountHeader, (cell) => /vencimiento/i.test(cell));
  const periodIndex = findColumnIndex(accountHeader, (cell) => /per.odo consultado/i.test(cell));
  requireColumn(closingIndex, "Fecha de cierre");
  requireColumn(dueIndex, "Vencimiento");
  requireColumn(periodIndex, "Periodo consultado");

  const paymentHeader = rows[paymentHeaderIndex] || [];
  const pesosIndex = findColumnIndex(paymentHeader, (cell) => cell === "Pesos");
  const dolaresIndex = findColumnIndex(
    paymentHeader,
    (cell) => cell === "Dolares" || cell === "Dólares",
  );
  requireColumn(pesosIndex, "Pesos");
  requireColumn(dolaresIndex, "Dolares");

  const movementHeader = rows[movementsHeaderIndex] || [];
  const fechaIndex = findColumnIndex(movementHeader, (cell) => cell === "Fecha");
  const tarjetaIndex = findColumnIndex(movementHeader, (cell) => cell === "Tarjeta");
  const detalleIndex = findColumnIndex(movementHeader, (cell) => cell === "Detalle");
  const amountUYUIndex = findColumnIndex(movementHeader, (cell) => cell === "Importe $");
  const amountUSDIndex = findColumnIndex(movementHeader, (cell) => /importe u.?s/i.test(cell));
  requireColumn(fechaIndex, "Fecha");
  requireColumn(tarjetaIndex, "Tarjeta");
  requireColumn(detalleIndex, "Detalle");
  requireColumn(amountUYUIndex, "Importe $");
  requireColumn(amountUSDIndex, "Importe U$S");
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

  const movimientos = [];
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
      movimientos.push(
        createMovement({
          amount: amountUYU,
          detalle,
          fecha,
          fechaCierre,
          fechaVencimiento,
          isSaldoAnterior,
          moneda: "UYU",
          periodo,
          tarjetaEnmascarada,
        }),
      );
    }

    if (amountUSD !== 0) {
      movimientos.push(
        createMovement({
          amount: amountUSD,
          detalle,
          fecha,
          fechaCierre,
          fechaVencimiento,
          isSaldoAnterior,
          moneda: "USD",
          periodo,
          tarjetaEnmascarada,
        }),
      );
    }
  }

  if (!movimientos.length) {
    throwFormatError("El Excel no tiene movimientos de tarjeta para importar.");
  }

  return {
    movimientos,
    resumen: {
      cargosMesUSD: Number(cargosMesUSD.toFixed(2)),
      cargosMesUYU: Number(cargosMesUYU.toFixed(2)),
      creditoDisponibleUSD: null,
      creditoDisponibleUYU: null,
      fechaCierre,
      fechaVencimiento,
      hashImportacion: [
        "resumen",
        cleanText(periodo).toLowerCase(),
        fechaCierre ? fechaCierre.toISOString().slice(0, 10) : "",
        fechaVencimiento ? fechaVencimiento.toISOString().slice(0, 10) : "",
      ].join("|"),
      limiteUSD,
      limiteUYU,
      pagoContadoUSD,
      pagoContadoUYU,
      pagoMinimoUSD,
      pagoMinimoUYU,
      periodo,
      saldoAnteriorUSD,
      saldoAnteriorUYU,
    },
  };
}
