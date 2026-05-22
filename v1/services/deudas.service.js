import Deuda from "../models/deudas.model.js";
import { crearGastoService } from "./gasto.service.js";

function calcularCuotasTotales(cuotasTotales, plazoAnios) {
  if (cuotasTotales !== undefined && cuotasTotales !== null && cuotasTotales !== "") {
    return Number(cuotasTotales);
  }

  if (plazoAnios !== undefined && plazoAnios !== null && plazoAnios !== "") {
    return Number(plazoAnios) * 12;
  }

  return null;
}

function calcularMontoCuota(montoTotal, cuotasTotales, montoCuota, tasaInteres) {
  if (montoCuota !== undefined && montoCuota !== null && montoCuota !== "") {
    return Number(Number(montoCuota).toFixed(2));
  }

  const total = Number(montoTotal);
  const cuotas = Number(cuotasTotales);
  const tasaAnual = Number(tasaInteres);

  if (!total || !cuotas) {
    const error = new Error("Ingresa cuotas totales o plazo en años para calcular la cuota.");
    error.status = 400;
    throw error;
  }

  if (tasaInteres !== undefined && tasaInteres !== null && tasaInteres !== "" && tasaAnual > 0) {
    const tasaMensual = tasaAnual / 100 / 12;
    const cuota = (total * tasaMensual) / (1 - (1 + tasaMensual) ** -cuotas);
    return Number(cuota.toFixed(2));
  }

  return Number((Number(montoTotal) / Number(cuotasTotales)).toFixed(2));
}

function normalizarObjectIdOpcional(value) {
  return value === "" ? null : value;
}

function calcularMontoDebitado({ montoDebitadoUYU, montoMonedaOrigen, cotizacion }) {
  if (montoDebitadoUYU !== undefined && montoDebitadoUYU !== null && montoDebitadoUYU !== "") {
    return Number(montoDebitadoUYU);
  }

  if (montoMonedaOrigen && cotizacion) {
    return Number((Number(montoMonedaOrigen) * Number(cotizacion)).toFixed(2));
  }

  return null;
}

export const crearDeudaService = async ({ usuarioId, data }) => {
  const cuotasTotales = calcularCuotasTotales(data.cuotasTotales, data.plazoAnios);
  const montoCuota = calcularMontoCuota(
    data.montoTotal,
    cuotasTotales,
    data.montoCuota,
    data.tasaInteres,
  );
  const cuotaActual = Number(data.cuotaActual || 0);
  const montoPagadoInicial = Number(data.montoPagadoInicial || 0);
  const totalEstimado = Number((montoCuota * cuotasTotales).toFixed(2));
  const pagadoInicial = Number((cuotaActual * montoCuota + montoPagadoInicial).toFixed(2));
  const saldoPendiente =
    data.saldoPendiente ??
    Number(Math.max(0, totalEstimado - pagadoInicial).toFixed(2));

  const deuda = await Deuda.create({
    usuario: usuarioId,
    descripcion: data.descripcion,
    tipo: data.tipo || "deuda",
    moneda: data.moneda || "UYU",
    entidad: data.entidad || "",
    montoTotal: data.montoTotal,
    montoOriginalAntesEntrega: data.montoOriginalAntesEntrega ?? null,
    porcentajeFinanciacion: data.porcentajeFinanciacion ?? null,
    entregaInicialMonto: data.entregaInicialMonto ?? 0,
    entregaInicialMoneda: data.entregaInicialMoneda || "UYU",
    entregaInicialConvertida: data.entregaInicialConvertida ?? 0,
    saldoPendiente,
    cuotasTotales,
    cuotaActual,
    montoPagadoInicial,
    montoCuota,
    tasaInteres: data.tasaInteres ?? null,
    plazoAnios: data.plazoAnios ?? null,
    diaVencimiento: data.diaVencimiento ?? null,
    cuentaPagoDefault: normalizarObjectIdOpcional(data.cuentaPagoDefault),
    categoriaDefault: normalizarObjectIdOpcional(data.categoriaDefault),
    fechaInicio: data.fechaInicio
  });

  return deuda;
};

export const obtenerDeudasService = async (usuarioId) => {
  return Deuda.find({ usuario: usuarioId }).sort({ createdAt: -1 });
};

export const obtenerDeudaPorIdService = async ({ id, usuarioId }) => {
  const deuda = await Deuda.findOne({ _id: id, usuario: usuarioId });

  if (!deuda) {
    throw new Error("Deuda no encontrada");
  }

  return deuda;
};

export const actualizarDeudaService = async ({ id, usuarioId, data }) => {
  const payload = {
    ...data,
    cuentaPagoDefault: normalizarObjectIdOpcional(data.cuentaPagoDefault),
    categoriaDefault: normalizarObjectIdOpcional(data.categoriaDefault),
  };

  if (
    data.montoTotal !== undefined ||
    data.cuotasTotales !== undefined ||
    data.montoCuota !== undefined ||
    data.tasaInteres !== undefined ||
    data.plazoAnios !== undefined
  ) {
    const current = await Deuda.findOne({ _id: id, usuario: usuarioId });
    if (!current) {
      throw new Error("Deuda no encontrada");
    }

    payload.cuotasTotales = calcularCuotasTotales(
      data.cuotasTotales ?? current.cuotasTotales,
      data.plazoAnios ?? current.plazoAnios,
    );
    payload.montoCuota = calcularMontoCuota(
      data.montoTotal ?? current.montoTotal,
      payload.cuotasTotales,
      data.montoCuota ?? current.montoCuota,
      data.tasaInteres ?? current.tasaInteres,
    );
  }

  const deuda = await Deuda.findOneAndUpdate(
    { _id: id, usuario: usuarioId },
    payload,
    { new: true, runValidators: true }
  );

  if (!deuda) {
    throw new Error("Deuda no encontrada");
  }

  return deuda;
};

export const eliminarDeudaService = async ({ id, usuarioId }) => {
  const deuda = await Deuda.findOneAndDelete({
    _id: id,
    usuario: usuarioId
  });

  if (!deuda) {
    throw new Error("Deuda no encontrada");
  }

  return deuda;
};

export const pagarCuotaDeudaService = async ({
  id,
  usuarioId,
  cuenta,
  categoria,
  fecha,
  montoDebitadoUYU,
  montoMonedaOrigen,
  cotizacion
}) => {
  const deuda = await Deuda.findOne({ _id: id, usuario: usuarioId });

  if (!deuda) {
    throw new Error("Deuda no encontrada");
  }

  if (!deuda.activa) {
    throw new Error("La deuda ya está finalizada");
  }

  if (deuda.cuotaActual >= deuda.cuotasTotales) {
    deuda.activa = false;
    await deuda.save();
    throw new Error("La deuda ya tiene todas sus cuotas pagadas");
  }

  const montoOrigen = montoMonedaOrigen ?? deuda.montoCuota;
  const montoDebitado = calcularMontoDebitado({
    montoDebitadoUYU,
    montoMonedaOrigen: montoOrigen,
    cotizacion,
  });

  if (montoDebitado === null) {
    const error = new Error("Ingresa el monto debitado en pesos o la cotizacion.");
    error.status = 400;
    throw error;
  }

  const cuentaPago = normalizarObjectIdOpcional(cuenta) || deuda.cuentaPagoDefault;
  const categoriaGasto =
    normalizarObjectIdOpcional(categoria) || deuda.categoriaDefault;

  const gasto = await crearGastoService({
    usuarioId,
    data: {
      fecha,
      descripcion: `Cuota ${deuda.cuotaActual + 1}/${deuda.cuotasTotales}: ${deuda.descripcion}`,
      flujoBancario: -Math.abs(montoDebitado),
      economiaReal: -Math.abs(montoDebitado),
      porcentajeEconomiaReal: 100,
      categoria: categoriaGasto,
      cuenta: cuentaPago,
      incluirEnGastoBancario: true,
      incluirEnGastoReal: true,
      origen: "deuda"
    }
  });

  deuda.cuotaActual += 1;
  deuda.saldoPendiente = Math.max(
    0,
    Number(deuda.saldoPendiente ?? deuda.montoTotal) - Number(montoOrigen || 0),
  );

  deuda.historialPagos.push({
    fecha: fecha || new Date(),
    cuotaNumero: deuda.cuotaActual,
    montoMonedaOrigen: montoOrigen,
    monedaOrigen: deuda.moneda,
    cotizacion: cotizacion ?? null,
    montoDebitadoUYU: montoDebitado,
    cuenta: cuentaPago,
    categoria: categoriaGasto,
    gasto: gasto._id,
  });

  if (deuda.cuotaActual >= deuda.cuotasTotales || deuda.saldoPendiente <= 0) {
    deuda.activa = false;
  }

  await deuda.save();

  return {
    deuda,
    gasto
  };
};

export const eliminarTodosLasDeudasService = async () => {
    await Deuda.deleteMany({});
}
