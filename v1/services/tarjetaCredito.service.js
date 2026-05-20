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

async function validarRelaciones({ usuarioId, banco, cuentaPagoDefault }) {
  if (banco) {
    const bancoEncontrado = await Banco.findOne({ _id: banco, usuario: usuarioId });

    if (!bancoEncontrado) {
      throw new Error("Banco no encontrado");
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
    cuentaPagoDefault: normalizarObjectIdOpcional(data.cuentaPagoDefault),
    limiteUYU: data.limiteUYU === "" ? null : data.limiteUYU,
    limiteUSD: data.limiteUSD === "" ? null : data.limiteUSD,
    diaCierre: data.diaCierre === "" ? null : data.diaCierre,
    diaVencimiento: data.diaVencimiento === "" ? null : data.diaVencimiento,
  };
}

export const crearTarjetaCreditoService = async ({ usuarioId, data }) => {
  const payload = normalizarTarjetaPayload(data);

  await validarRelaciones({
    usuarioId,
    banco: payload.banco,
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
    .populate("cuentaPagoDefault", "nombre")
    .sort({ createdAt: -1 })
    .lean();

  const tarjetasConResumen = await Promise.all(
    tarjetas.map(async (tarjeta) => {
      const ultimoResumen = await ResumenTarjeta.findOne({
        usuario: usuarioId,
        tarjeta: tarjeta._id,
      })
        .sort({ fechaCierre: -1, createdAt: -1 })
        .lean();

      return {
        ...tarjeta,
        ultimoResumen,
      };
    }),
  );

  return tarjetasConResumen;
};

export const obtenerTarjetaCreditoPorIdService = async ({ id, usuarioId }) => {
  const tarjeta = await TarjetaCredito.findOne({ _id: id, usuario: usuarioId })
    .populate("banco", "nombre")
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

async function crearGastoDesdeMovimiento({ tarjetaId, movimiento, usuarioId }) {
  const monto = Number(movimiento.montoReal || 0);
  const gasto = await crearGastoService({
    usuarioId,
    data: {
      fecha: movimiento.fecha,
      descripcion: movimiento.detalle,
      flujoBancario: monto,
      economiaReal: monto,
      porcentajeEconomiaReal: 100,
      categoria: null,
      cuenta: null,
      incluirEnGastoBancario: false,
      incluirEnGastoReal: true,
      origen: "tarjeta_credito",
      tarjetaCredito: tarjetaId,
      movimientoTarjeta: movimiento._id,
      hashImportacion: `tarjeta-gasto|${movimiento._id}`,
    },
  });

  movimiento.gastoGenerado = gasto._id;
  await movimiento.save();

  return gasto;
}

export const crearGastoDesdeMovimientoTarjetaService = async ({
  tarjetaId,
  movimientoId,
  usuarioId,
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

  if (movimiento.tipoMovimiento !== "compra") {
    const error = new Error("Solo las compras de tarjeta pueden generar gastos.");
    error.status = 400;
    throw error;
  }

  if (movimiento.gastoGenerado) {
    const error = new Error("Este movimiento ya tiene un gasto generado.");
    error.status = 409;
    throw error;
  }

  const gasto = await crearGastoDesdeMovimiento({
    tarjetaId,
    movimiento,
    usuarioId,
  });

  return {
    gasto,
    movimiento,
  };
};

export const crearGastosDesdeMovimientosTarjetaService = async ({
  tarjetaId,
  movimientoIds,
  usuarioId,
}) => {
  await obtenerTarjetaCreditoPorIdService({ id: tarjetaId, usuarioId });

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
    if (movimiento.tipoMovimiento !== "compra" || movimiento.gastoGenerado) {
      omitidos++;
      continue;
    }

    try {
      const gasto = await crearGastoDesdeMovimiento({
        tarjetaId,
        movimiento,
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
    const error = new Error(
      "Este movimiento tiene un gasto generado. Elimina tambien el gasto para borrar el movimiento.",
    );
    error.status = 409;
    throw error;
  }

  if (movimiento.gastoGenerado && eliminarGastoGenerado) {
    await Gasto.deleteOne({
      _id: movimiento.gastoGenerado,
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
      movimientoTarjeta: { $in: movimientosConGasto.map((movimiento) => movimiento._id) },
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
