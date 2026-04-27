import {
    obtenerCuentasService,
    obtenerCuentaPorIdService,
    actualizarCuentaService,
    crearCuentaService,
    eliminarCuentaService,
} from "../services/cuenta.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const obtenerCuentas = async (req, res, next) => {
    try {
        const { banco } = req.query;
        const cuentasObtenidas = await obtenerCuentasService(req.user.id, banco);
        successResponse(res, "Cuentas obtenidas", cuentasObtenidas);
    } catch (error) {
        next(error);
    }
}

export const obtenerCuentaPorId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cuentaObtenida = await obtenerCuentaPorIdService(id);
        successResponse(res, `Cuenta ${cuentaObtenida.id} obtenida con exito`, cuentaObtenida);
    } catch (error) {
        next(error);
    }
}

export const actualizarCuenta = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cuentaActualizada = await actualizarCuentaService(id, req.user.id, req.body);
        successResponse(res, `Cuenta ${cuentaActualizada.id} actualizada exitosamente`, cuentaActualizada);
    } catch (error) {
        next(error);
    }
}

export const crearCuenta = async (req, res, next) => {
    try {
        const nuevaCuenta = await crearCuentaService(req.body, req.user.id);
        successResponse(res, "Cuenta creada exitosamente", nuevaCuenta, 201);
    } catch (error) {
        next(error);
    }
}

export const eliminarCuenta = async (req, res, next) => {
    try {
        const { id } = req.params;
        const cuentaEliminada = await eliminarCuentaService(id, req.user.id);
        successResponse(res, `Cuenta ${cuentaEliminada.id} eliminada exitosamente`, cuentaEliminada);
    } catch (error) {
        next(error);
    }
};