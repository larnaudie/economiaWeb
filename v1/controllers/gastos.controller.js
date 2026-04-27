import {
    obtenerGastosService,
    obtenerGastoPorIdService,
    actualizarGastoService,
    eliminarGastoService,
    crearGastoService,
    crearGastosBulkService,
    actualizarGastosBulkService
} from "../services/gasto.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const obtenerGastos = async (req, res, next) => {
    try {
        const {
            mes,
            pagina,
            fechaDesde,
            fechaHasta,
            categoria,
            cuenta,
            busqueda,
            flujoMin,
            flujoMax,
            realMin,
            realMax
        } = req.query;

        const gastosObtenidos = await obtenerGastosService(
            req.user.id,
            mes,
            pagina,
            fechaDesde,
            fechaHasta,
            categoria,
            cuenta,
            busqueda,
            flujoMin,
            flujoMax,
            realMin,
            realMax
        );

        successResponse(res, "Gastos obtenidos", gastosObtenidos);
    } catch (error) {
        next(error);
    }
};

export const obtenerGastoPorId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const gastoObtenido = await obtenerGastoPorIdService(id);
        successResponse(res, `Gasto ${gastoObtenido.id} obtenido con exito`, gastoObtenido);
    } catch (error) {
        next(error);
    }
}

export const actualizarGasto = async (req, res, next) => {
    try {
        const { id } = req.params;

        const gastoActualizado = await actualizarGastoService({
            id,
            usuarioId: req.user.id,
            data: req.body
        });

        successResponse(res, "Gasto actualizado", gastoActualizado);
    } catch (error) {
        next(error);
    }
};

export const crearGasto = async (req, res, next) => {
    try {
        const gastoCreado = await crearGastoService({
            usuarioId: req.user.id,
            data: req.body
        });

        successResponse(res, "Gasto creado", gastoCreado, 201);
    } catch (error) {
        next(error);
    }
};

export const eliminarGasto = async (req, res, next) => {
    try {
        const { id } = req.params;
        const gastoEliminado = await eliminarGastoService(id, req.user.id);
        successResponse(res, `Gasto ${gastoEliminado.id} eliminado exitosamente`, gastoEliminado);
    } catch (error) {
        next(error);
    }
};

export const crearGastosBulk = async (req, res, next) => {
    try {
        const resultado = await crearGastosBulkService({
            usuarioId: req.user.id,
            gastos: req.body.gastos
        });

        successResponse(res, "Gastos creados masivamente", resultado, 201);
    } catch (error) {
        next(error);
    }
};

export const actualizarGastosBulk = async (req, res, next) => {
    try {
        const resultado = await actualizarGastosBulkService({
            usuarioId: req.user.id,
            gastos: req.body.gastos
        });

        successResponse(res, "Gastos actualizados masivamente", resultado);
    } catch (error) {
        next(error);
    }
};