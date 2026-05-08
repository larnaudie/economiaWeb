import Deuda from "../models/deudas.model.js";
import { crearGastoService } from "./gasto.service.js";

export const crearDeudaService = async ({ usuarioId, data }) => {
  const deuda = await Deuda.create({
    usuario: usuarioId,
    descripcion: data.descripcion,
    montoTotal: data.montoTotal,
    cuotasTotales: data.cuotasTotales,
    montoCuota: data.montoCuota,
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
  const deuda = await Deuda.findOneAndUpdate(
    { _id: id, usuario: usuarioId },
    data,
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
  fecha
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

  const gasto = await crearGastoService({
    usuarioId,
    data: {
      fecha,
      descripcion: `Cuota deuda: ${deuda.descripcion}`,
      flujoBancario: -Math.abs(deuda.montoCuota),
      economiaReal: -Math.abs(deuda.montoCuota),
      porcentajeEconomiaReal: 100,
      categoria,
      cuenta,
      incluirEnGastoBancario: true,
      incluirEnGastoReal: true
    }
  });

  deuda.cuotaActual += 1;

  if (deuda.cuotaActual >= deuda.cuotasTotales) {
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