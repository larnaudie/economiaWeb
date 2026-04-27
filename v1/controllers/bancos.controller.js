import {
    obtenerBancosService,
    obtenerBancoPorIdService,
    actualizarBancoService,
    crearBancoService,
    eliminarBancoService
} from "../services/banco.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const obtenerBancos = async (req, res, next) => {
    try {
        const bancosObtenidos = await obtenerBancosService(req.user.id);
        successResponse(res, "Bancos obtenidos", bancosObtenidos);
    } catch (error) {
        next(error);
    }
}

export const obtenerBancoPorId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const bancoObtenido = await obtenerBancoPorIdService(id);
        successResponse(res, `Banco ${bancoObtenido.id} obtenido con exito`, bancoObtenido);
    } catch (error) {
        next(error);
    }
}

export const actualizarBanco = async (req, res, next) => {
    try {
        const { id } = req.params;
        const bancoActualizado = await actualizarBancoService(id, req.user.id, req.body);
        successResponse(res, `Banco ${bancoActualizado.id} actualizado exitosamente`, bancoActualizado);
    } catch (error) {
        next(error);
    }
}

export const crearBanco = async (req, res, next) => {
    try {
        const nuevoBanco = await crearBancoService(req.body, req.user.id);
        successResponse(res, "Banco creado exitosamente", nuevoBanco, 201);
    } catch (error) {
        next(error);
    }
}

export const eliminarBanco = async (req, res, next) => {
    try {
        const { id } = req.params;
        const bancoEliminado = await eliminarBancoService(id, req.user.id);
        successResponse(res, `Banco ${bancoEliminado.id} eliminado exitosamente`, bancoEliminado);
    } catch (error) {
        next(error);
    }
};