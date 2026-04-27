import {
  crearDeudaService,
  obtenerDeudasService,
  obtenerDeudaPorIdService,
  actualizarDeudaService,
  eliminarDeudaService,
  pagarCuotaDeudaService
} from "../services/deudas.service.js";

import { successResponse } from "../utils/apiResponse.js";

export const crearDeuda = async (req, res, next) => {
  try {
    const deuda = await crearDeudaService({
      usuarioId: req.user.id,
      data: req.body
    });

    successResponse(res, "Deuda creada", deuda, 201);
  } catch (error) {
    next(error);
  }
};

export const obtenerDeudas = async (req, res, next) => {
  try {
    const deudas = await obtenerDeudasService(req.user.id);

    successResponse(res, "Deudas obtenidas", deudas);
  } catch (error) {
    next(error);
  }
};

export const obtenerDeudaPorId = async (req, res, next) => {
  try {
    const deuda = await obtenerDeudaPorIdService({
      id: req.params.id,
      usuarioId: req.user.id
    });

    successResponse(res, "Deuda obtenida", deuda);
  } catch (error) {
    next(error);
  }
};

export const actualizarDeuda = async (req, res, next) => {
  try {
    const deuda = await actualizarDeudaService({
      id: req.params.id,
      usuarioId: req.user.id,
      data: req.body
    });

    successResponse(res, "Deuda actualizada", deuda);
  } catch (error) {
    next(error);
  }
};

export const eliminarDeuda = async (req, res, next) => {
  try {
    const deuda = await eliminarDeudaService({
      id: req.params.id,
      usuarioId: req.user.id
    });

    successResponse(res, "Deuda eliminada", deuda);
  } catch (error) {
    next(error);
  }
};

export const pagarCuotaDeuda = async (req, res, next) => {
  try {
    const resultado = await pagarCuotaDeudaService({
      id: req.params.id,
      usuarioId: req.user.id,
      cuenta: req.body.cuenta,
      categoria: req.body.categoria,
      fecha: req.body.fecha
    });

    successResponse(res, "Cuota pagada", resultado, 201);
  } catch (error) {
    next(error);
  }
};