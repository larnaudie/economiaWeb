import Banco from "../models/banco.model.js";
import Cuenta from "../models/cuenta.model.js";
import Gasto from "../models/gasto.model.js";
import mongoose from "mongoose";
import TarjetaCredito from "../models/tarjetaCredito.model.js";
import MovimientoTarjeta from "../models/movimientoTarjeta.model.js";
import ResumenTarjeta from "../models/resumenTarjeta.model.js";
import { parseCreditCardExcel } from "../utils/tarjetaExcelParser.js";
import { crearGastoService } from "./gasto.service.js";

function normalizarObjectIdOpcional(value) {
  return value === "" ? null : value;
}

async function validarRelaciones({ usuarioId, banco, cuentaPagoDefault, cuentaTarjeta }) {
  if (banco) {
    const bancoEncontrado = await Banco.findOne({ _id: banco, usuario: usuarioId });

    if (!bancoEncontrado) {
      throw new Error("Banco no encontrado");
    }
  }

  if (cuentaTarjeta) {
    const cuentaEncontrada = await Cuenta.findOne({
      _id: cuentaTarjeta,
      usuario: usuarioId,
    });

    if (!cuentaEncontrada) {
      throw new Error("Cuenta de tarjeta no encontrada");
    }

    if (cuentaEncontrada.tipo !== "tarjeta_credito") {
      throw new Error("La cuenta de tarjeta debe ser de tipo Tarjeta de credito");
    }
  }

  if (cuentaPagoDefault) {
    const cuentaEncontrada = await Cuenta.findOne({
      _id: cuentaPagoDefault,
      usuario: usuarioId,
    });

    if (!cuentaEncontrada) {
      throw new Error("Cuenta de pago no encontrada");
    }
  }
}

function normalizarTarjetaPayload(data) {
  return {
    ...data,
    banco: normalizarObjectIdOpcional(data.banco),
    cuentaTarjeta: normalizarObjectIdOpcional(data.cuentaTarjeta),
    cuentaPagoDefault: normalizarObjectIdOpcional(data.cuentaPagoDefault),
    limiteUYU: data.limiteUYU === "" ? null : data.limiteUYU,
    limiteUSD: data.limiteUSD === "" ? null : data.limiteUSD,
    diaCierre: data.diaCierre === "" ? null : data.diaCierre,
    diaVencimiento: data.diaVencimiento === "" ? null : data.diaVencimiento,
  };
}

function emptyCurrencyTotals() {
  return { uyu: 0, usd: 0 };
}

function addCurrencyAmount(target, moneda, amount) {
  if (moneda === "USD") {
    target.usd += amount;
  } else {
    target.uyu += amount;
  }
}

function buildMovementBalance(movimientos) {
  const totals = {
    compras: emptyCurrencyTotals(),
    pagos: emptyCurrencyTotals(),
    creditos: emptyCurrencyTotals(),
    ajustes: emptyCurrencyTotals(),
    saldoAnterior: emptyCurrencyTotals(),
  };

  movimientos.forEach((movimiento) => {
    const amount = Number(movimiento.montoOriginalExcel || 0);

    if (movimiento.tipoMovimiento === "compra") {
      addCurrencyAmount(totals.compras, movimiento.moneda, Math.abs(amount));
    } else if (movimiento.tipoMovimiento === "pago") {
      addCurrencyAmount(totals.pagos, movimiento.moneda, Math.abs(amount));
    } else if (movimiento.tipoMovimiento === "credito") {
      addCurrencyAmount(totals.creditos, movimiento.moneda, Math.abs(amount));
    } else if (movimiento.tipoMovimiento === "saldo_anterior") {
      addCurrencyAmount(totals.saldoAnterior, movimiento.moneda, amount);
    } else {
      addCurrencyAmount(totals.ajustes, movimiento.moneda, amount);
    }
  });

  const saldoPendiente = {
    uyu:
      totals.saldoAnterior.uyu +
      totals.compras.uyu -
      totals.pagos.uyu -
      totals.creditos.uyu +
      totals.ajustes.uyu,
    usd:
      totals.saldoAnterior.usd +
      totals.compras.usd -
      totals.pagos.usd -
      totals.creditos.usd +
      totals.ajustes.usd,
  };

  const pagosDetectados = totals.pagos.uyu > 0 || totals.pagos.usd > 0;
  const estaPago = Math.abs(saldoPendiente.uyu) < 0.01 && Math.abs(saldoPendiente.usd) < 0.01;
  const saldoAFavor = saldoPendiente.uyu < -0.01 || saldoPendiente.usd < -0.01;

  return {
    ...totals,
    saldoPendiente,
    estadoPago: estaPago
      ? "pagado"
      : saldoAFavor
        ? "saldo_a_favor"
        : pagosDetectados
          ? "parcial"
          : "pendiente",
  };
}

function getTarjetaCuentaId(tarjeta) {
  return tarjeta?.cuentaTarjeta?._id || tarjeta?.cuentaTarjeta || null;
}

function getTarjetaCuentaPagoId(tarjeta) {
  return tarjeta?.cuentaPagoDefault?._id || tarjeta?.cuentaPagoDefault || null;
}

function getMovimientoContableConfig(movimiento) {
  const amount = Math.abs(Number(movimiento.montoReal || movimiento.montoOriginalExcel || 0));

  if (movimiento.tipoMovimiento === "compra") {
    return {
      descripcion: movimiento.detalle,
      flujoBancario: -amount,
      economiaReal: -amount,
      porcentajeEconomiaReal: 100,
      incluirEnGastoBancario: true,
      incluirEnGastoReal: true,
    };
  }

  if (movimiento.tipoMovimiento === "pago") {
    return {
      descripcion: `Pago tarjeta: ${movimiento.detalle}`,
      flujoBancario: amount,
      economiaReal: 0,
      porcentajeEconomiaReal: 0,
      incluirEnGastoBancario: false,
      incluirEnGastoReal: false,
    };
  }

  if (movimiento.tipoMovimiento === "credito") {
    return {
      descripcion: `Credito tarjeta: ${movimiento.detalle}`,
      flujoBancario: amount,
      economiaReal: 0,
      porcentajeEconomiaReal: 0,
      incluirEnGastoBancario: false,
      incluirEnGastoReal: false,
    };
  }

  if (movimiento.tipoMovimiento === "saldo_anterior") {
    return {
      descripcion: `Saldo anterior tarjeta: ${movimiento.detalle}`,
      flujoBancario: -Math.abs(Number(movimiento.montoReal || movimiento.montoOriginalExcel || 0)),
      economiaReal: 0,
      porcentajeEconomiaReal: 0,
      incluirEnGastoBancario: false,
      incluirEnGastoReal: false,
    };
  }

  return {
    descripcion: `Ajuste tarjeta: ${movimiento.detalle}`,
    flujoBancario: Number(movimiento.montoReal || movimiento.montoOriginalExcel || 0),
    economiaReal: 0,
    porcentajeEconomiaReal: 0,
    incluirEnGastoBancario: false,
    incluirEnGastoReal: false,
  };
}

export const crearTarjetaCreditoService = async ({ usuarioId, data }) => {
  const payload = normalizarTarjetaPayload(data);

  await validarRelaciones({
    usuarioId,
    banco: payload.banco,
    cuentaTarjeta: payload.cuentaTarjeta,
    cuentaPagoDefault: payload.cuentaPagoDefault,
  });

  try {
    return await TarjetaCredito.create({
      ...payload,
      usuario: usuarioId,
    });
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error("Ya existe una tarjeta con ese nombre y ultimos digitos.");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

export const obtenerTarjetasCreditoService = async (usuarioId) => {
  const tarjetas = await TarjetaCredito.find({ usuario: usuarioId })
    .populate("banco", "nombre")
    .populate("cuentaTarjeta", "nombre tipo")
    .populate("cuentaPagoDefault", "nombre")
    .sort({ createdAt: -1 })
    .lean();

  const tarjetasConResumen = await Promise.all(
    tarjetas.map(async (tarjeta) => {
      const resumenes = await ResumenTarjeta.find({
        usuario: usuarioId,
        tarjeta: tarjeta._id,
      })
        .sort({ fechaCierre: -1, createdAt: -1 })
        .lean();
      const ultimoResumen = resumenes[0] || null;
      const resumenIds = resumenes.map((resumen) => resumen._id);
      const movimientos = resumenIds.length
        ? await MovimientoTarjeta.find({
            usuario: usuarioId,
            tarjeta: tarjeta._id,
            resumen: { $in: resumenIds },
          })
            .select("resumen tipoMovimiento moneda montoOriginalExcel")
            .lean()
        : [];
      const movimientosPorResumen = movimientos.reduce((map, movimiento) => {
        const resumenId = String(movimiento.resumen || "");
        const current = map.get(resumenId) || [];
        current.push(movimiento);
        map.set(resumenId, current);
        return map;
      }, new Map());
      const resumenesConBalance = resumenes.map((resumen) => ({
        ...resumen,
        movimientosBalance: buildMovementBalance(
          movimientosPorResumen.get(String(resumen._id)) || [],
        ),
      }));

      return {
        ...tarjeta,
        resumenes: resumenesConBalance,
        ultimoResumen: resumenesConBalance[0] || ultimoResumen,
      };
    }),
  );

  return tarjetasConResumen;
};

export const obtenerTarjetaCreditoPorIdService = async ({ id, usuarioId }) => {
  const tarjeta = await TarjetaCredito.findOne({ _id: id, usuario: usuarioId })
    .populate("banco", "nombre")
    .populate("cuentaTarjeta", "nombre tipo")
    .populate("cuentaPagoDefault", "nombre");

  if (!tarjeta) {
    throw new Error("Tarjeta no encontrada");
  }

  return tarjeta;
};

export const actualizarTarjetaCreditoService = async ({ id, usuarioId, data }) => {
  const payload = normalizarTarjetaPayload(data);

  await validarRelaciones({
    usuarioId,
    banco: payload.banco,
    cuentaTarjeta: payload.cuentaTarjeta,
    cuentaPagoDefault: payload.cuentaPagoDefault,
  });

  const tarjeta = await TarjetaCredito.findOneAndUpdate(
    { _id: id, usuario: usuarioId },
    payload,
    { new: true, runValidators: true },
  );

  if (!tarjeta) {
    throw new Error("Tarjeta no encontrada");
  }

  return tarjeta;
};

export const eliminarTarjetaCreditoService = async ({ id, usuarioId }) => {
  const movimientos = await MovimientoTarjeta.countDocuments({
    tarjeta: id,
    usuario: usuarioId,
  });

  if (movimientos > 0) {
    const error = new Error("No se puede eliminar una tarjeta con movimientos importados.");
    error.status = 409;
    throw error;
  }

  const tarjeta = await TarjetaCredito.findOneAndDelete({
    _id: id,
    usuario: usuarioId,
  });

  if (!tarjeta) {
    throw new Error("Tarjeta no encontrada");
  }

  return tarjeta;
};

export const obtenerMovimientosTarjetaService = async ({
  tarjetaId,
  usuarioId,
}) => {
  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

  return MovimientoTarjeta.find({
    tarjeta: tarjetaId,
    usuario: usuarioId,
  })
    .populate("gastoGenerado")
    .sort({ fecha: -1, _id: -1 });
};

async function crearGastoDesdeMovimiento({ tarjeta, tarjetaId, movimiento, usuarioId }) {
  const cuentaTarjeta = getTarjetaCuentaId(tarjeta);

  if (!cuentaTarjeta) {
    const error = new Error("Configura una cuenta tarjeta antes de generar gastos.");
    error.status = 400;
    throw error;
  }

  const config = getMovimientoContableConfig(movimiento);
  const hashBase = `tarjeta-gasto|${movimiento._id}`;
  const gasto = await crearGastoService({
    usuarioId,
    data: {
      fecha: movimiento.fecha,
      descripcion: config.descripcion,
      flujoBancario: config.flujoBancario,
      economiaReal: config.economiaReal,
      porcentajeEconomiaReal: config.porcentajeEconomiaReal,
      categoria: null,
      cuenta: cuentaTarjeta,
      incluirEnGastoBancario: config.incluirEnGastoBancario,
      incluirEnGastoReal: config.incluirEnGastoReal,
      origen: "tarjeta_credito",
      tarjetaCredito: tarjetaId,
      movimientoTarjeta: movimiento._id,
      hashImportacion: hashBase,
    },
  });

  movimiento.gastoGenerado = gasto._id;
  await movimiento.save();

  return gasto;
}

async function crearDebitoPagoDesdeCuenta({
  cuentaPago,
  movimiento,
  tarjeta,
  tarjetaId,
  usuarioId,
}) {
  if (!cuentaPago || movimiento.tipoMovimiento !== "pago") {
    return null;
  }

  const amount = Math.abs(Number(movimiento.montoBancario || movimiento.montoReal || movimiento.montoOriginalExcel || 0));

  if (!amount) return null;

  const fecha = new Date(movimiento.fecha);
  const inicioDia = new Date(fecha);
  inicioDia.setUTCHours(0, 0, 0, 0);
  const finDia = new Date(inicioDia);
  finDia.setUTCDate(finDia.getUTCDate() + 1);

  const pagoExistente = await Gasto.findOne({
    usuario: usuarioId,
    cuenta: cuentaPago,
    fecha: { $gte: inicioDia, $lt: finDia },
    $expr: {
      $lt: [
        {
          $abs: {
            $subtract: [
              { $abs: { $ifNull: ["$flujoBancario", 0] } },
              amount,
            ],
          },
        },
        0.01,
      ],
    },
  });

  if (pagoExistente) {
    return pagoExistente;
  }

  return crearGastoService({
    usuarioId,
    data: {
      fecha: movimiento.fecha,
      descripcion: `Pago a ${tarjeta.nombre}: ${movimiento.detalle}`,
      flujoBancario: -amount,
      economiaReal: 0,
      porcentajeEconomiaReal: 0,
      categoria: null,
      cuenta: cuentaPago,
      incluirEnGastoBancario: false,
      incluirEnGastoReal: false,
      origen: "tarjeta_credito",
      tarjetaCredito: tarjetaId,
      movimientoTarjeta: movimiento._id,
      hashImportacion: `tarjeta-pago-cuenta|${movimiento._id}`,
    },
  });
}

export const crearGastoDesdeMovimientoTarjetaService = async ({
  cuentaPago,
  tarjetaId,
  movimientoId,
  usuarioId,
}) => {
  if (!mongoose.Types.ObjectId.isValid(movimientoId)) {
    const error = new Error("Movimiento de tarjeta invalido");
    error.status = 400;
    throw error;
  }

  const tarjeta = await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });
  const cuentaPagoFinal = normalizarObjectIdOpcional(cuentaPago) || getTarjetaCuentaPagoId(tarjeta);

  const movimiento = await MovimientoTarjeta.findOne({
    _id: movimientoId,
    tarjeta: tarjetaId,
    usuario: usuarioId,
  });

  if (!movimiento) {
    throw new Error("Movimiento de tarjeta no encontrado");
  }

  if (movimiento.gastoGenerado) {
    const error = new Error("Este movimiento ya tiene un gasto generado.");
    error.status = 409;
    throw error;
  }

  const gasto = await crearGastoDesdeMovimiento({
    tarjeta,
    tarjetaId,
    movimiento,
    usuarioId,
  });
  await crearDebitoPagoDesdeCuenta({
    cuentaPago: cuentaPagoFinal,
    movimiento,
    tarjeta,
    tarjetaId,
    usuarioId,
  });

  return {
    gasto,
    movimiento,
  };
};

export const crearGastosDesdeMovimientosTarjetaService = async ({
  cuentaPago,
  tarjetaId,
  movimientoIds,
  usuarioId,
}) => {
  const tarjeta = await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });
  const cuentaPagoFinal = normalizarObjectIdOpcional(cuentaPago) || getTarjetaCuentaPagoId(tarjeta);

  if (cuentaPagoFinal) {
    const cuentaEncontrada = await Cuenta.findOne({
      _id: cuentaPagoFinal,
      usuario: usuarioId,
    });

    if (!cuentaEncontrada) {
      const error = new Error("Cuenta de pago no encontrada");
      error.status = 400;
      throw error;
    }
  }

  const uniqueIds = [...new Set(movimientoIds.map((id) => String(id)))];
  const movimientos = await MovimientoTarjeta.find({
    _id: { $in: uniqueIds },
    tarjeta: tarjetaId,
    usuario: usuarioId,
  });

  let creados = 0;
  let omitidos = 0;
  let errores = 0;
  const gastos = [];

  for (const movimiento of movimientos) {
    if (movimiento.gastoGenerado) {
      omitidos++;
      continue;
    }

    try {
      const gasto = await crearGastoDesdeMovimiento({
        tarjeta,
        tarjetaId,
        movimiento,
        usuarioId,
      });
      await crearDebitoPagoDesdeCuenta({
        cuentaPago: cuentaPagoFinal,
        movimiento,
        tarjeta,
        tarjetaId,
        usuarioId,
      });
      gastos.push(gasto);
      creados++;
    } catch {
      errores++;
    }
  }

  const noEncontrados = uniqueIds.length - movimientos.length;

  return {
    creados,
    omitidos: omitidos + noEncontrados,
    errores,
    gastos,
  };
};

export const eliminarMovimientoTarjetaService = async ({
  tarjetaId,
  movimientoId,
  usuarioId,
  eliminarGastoGenerado = false,
}) => {
  if (!mongoose.Types.ObjectId.isValid(movimientoId)) {
    const error = new Error("Movimiento de tarjeta invalido");
    error.status = 400;
    throw error;
  }

  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

  const movimiento = await MovimientoTarjeta.findOne({
    _id: movimientoId,
    tarjeta: tarjetaId,
    usuario: usuarioId,
  });

  if (!movimiento) {
    throw new Error("Movimiento de tarjeta no encontrado");
  }

  if (movimiento.gastoGenerado && !eliminarGastoGenerado) {
    const gastoAsociado = await Gasto.exists({
      _id: movimiento.gastoGenerado,
      usuario: usuarioId,
      movimientoTarjeta: movimiento._id,
    });

    if (gastoAsociado) {
      const error = new Error(
        "Este movimiento tiene un gasto generado. Elimina tambien el gasto para borrar el movimiento.",
      );
      error.status = 409;
      throw error;
    }

    movimiento.gastoGenerado = null;
  }

  if (movimiento.gastoGenerado && eliminarGastoGenerado) {
    await Gasto.deleteOne({
      _id: movimiento.gastoGenerado,
      usuario: usuarioId,
      movimientoTarjeta: movimiento._id,
    });
  }

  if (eliminarGastoGenerado) {
    await Gasto.deleteMany({
      _id: { $ne: movimiento.gastoGenerado },
      usuario: usuarioId,
      movimientoTarjeta: movimiento._id,
    });
  }

  await MovimientoTarjeta.deleteOne({ _id: movimiento._id, usuario: usuarioId });

  return { movimientoEliminado: movimiento._id };
};

export const eliminarResumenTarjetaService = async ({
  tarjetaId,
  resumenId,
  usuarioId,
  eliminarGastosGenerados = false,
}) => {
  if (!mongoose.Types.ObjectId.isValid(resumenId)) {
    const error = new Error("Resumen de tarjeta invalido");
    error.status = 400;
    throw error;
  }

  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

  const resumen = await ResumenTarjeta.findOne({
    _id: resumenId,
    tarjeta: tarjetaId,
    usuario: usuarioId,
  });

  if (!resumen) {
    throw new Error("Resumen de tarjeta no encontrado");
  }

  const movimientos = await MovimientoTarjeta.find({
    resumen: resumenId,
    tarjeta: tarjetaId,
    usuario: usuarioId,
  });
  const movimientosConGasto = movimientos.filter((movimiento) =>
    Boolean(movimiento.gastoGenerado),
  );

  if (movimientosConGasto.length && !eliminarGastosGenerados) {
    const error = new Error(
      "Este resumen tiene movimientos con gastos generados. Confirma eliminar esos gastos para borrar el resumen.",
    );
    error.status = 409;
    throw error;
  }

  if (movimientosConGasto.length && eliminarGastosGenerados) {
    await Gasto.deleteMany({
      usuario: usuarioId,
      movimientoTarjeta: { $in: movimientos.map((movimiento) => movimiento._id) },
    });
  }

  await MovimientoTarjeta.deleteMany({
    resumen: resumenId,
    tarjeta: tarjetaId,
    usuario: usuarioId,
  });
  await ResumenTarjeta.deleteOne({ _id: resumenId, tarjeta: tarjetaId, usuario: usuarioId });

  return {
    resumenEliminado: resumen._id,
    movimientosEliminados: movimientos.length,
    gastosEliminados: movimientosConGasto.length,
  };
};

function generarHashResumen({ tarjetaId, periodo, fechaCierre }) {
  const cierre = fechaCierre ? new Date(fechaCierre).toISOString().slice(0, 10) : "";
  return `resumen|${tarjetaId}|${String(periodo || "").trim().toLowerCase()}|${cierre}`;
}

export const crearResumenTarjetaService = async ({
  tarjetaId,
  usuarioId,
  data,
}) => {
  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

  const hashImportacion =
    data.hashImportacion ||
    generarHashResumen({
      tarjetaId,
      periodo: data.periodo,
      fechaCierre: data.fechaCierre,
    });

  try {
    return await ResumenTarjeta.create({
      ...data,
      usuario: usuarioId,
      tarjeta: tarjetaId,
      hashImportacion,
    });
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error("Ya existe un resumen importado para ese periodo.");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

export const obtenerResumenesTarjetaService = async ({ tarjetaId, usuarioId }) => {
  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

  return ResumenTarjeta.find({ tarjeta: tarjetaId, usuario: usuarioId }).sort({
    fechaCierre: -1,
    createdAt: -1,
  });
};

export const obtenerResumenTarjetaPorIdService = async ({
  tarjetaId,
  resumenId,
  usuarioId,
}) => {
  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

  const resumen = await ResumenTarjeta.findOne({
    _id: resumenId,
    tarjeta: tarjetaId,
    usuario: usuarioId,
  });

  if (!resumen) {
    throw new Error("Resumen de tarjeta no encontrado");
  }

  return resumen;
};

export const importarExcelTarjetaService = async ({
  tarjetaId,
  usuarioId,
  buffer,
}) => {
  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

  const parsed = parseCreditCardExcel(buffer);
  const hashResumen = parsed.resumen.hashImportacion;

  let resumen = await ResumenTarjeta.findOne({
    usuario: usuarioId,
    tarjeta: tarjetaId,
    hashImportacion: hashResumen,
  });
  let resumenCreado = false;

  if (!resumen) {
    resumen = await ResumenTarjeta.create({
      ...parsed.resumen,
      usuario: usuarioId,
      tarjeta: tarjetaId,
    });
    resumenCreado = true;
  }

  let movimientosCreados = 0;
  let movimientosDuplicados = 0;

  for (const movimiento of parsed.movimientos) {
    try {
      await MovimientoTarjeta.create({
        ...movimiento,
        usuario: usuarioId,
        tarjeta: tarjetaId,
        resumen: resumen._id,
      });
      movimientosCreados++;
    } catch (error) {
      if (error.code === 11000) {
        movimientosDuplicados++;
      } else {
        throw error;
      }
    }
  }

  return {
    resumen,
    resumenCreado,
    movimientosDetectados: parsed.movimientos.length,
    movimientosCreados,
    movimientosDuplicados,
  };
};
