import {
    obtenerUsuarioPorIdService,
    obtenerUsuariosService,
    actualizarUsuarioService,
    obtenerUsuarioActualService,
    actualizarUsuarioActualService,
    eliminarTodosLosUsuariosService
} from "../services/usuario.service.js";
import { obtenerBancosPorUsuarioService } from "../services/banco.service.js";
import { obtenerCuentasPorUsuarioService } from "../services/cuenta.service.js";
import { obtenerCategoriasPorUsuarioService } from "../services/categoria.service.js";
import { obtenerGastosService } from "../services/gasto.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const obtenerUsuarios = async (req, res, next) => {
    try {
        const usuariosObtenidos = await obtenerUsuariosService();
        successResponse(res, "Usuarios obtenidos", usuariosObtenidos);
    } catch (error) {
        next(error);
    }
}

export const obtenerUsuarioActual = async (req, res, next) => {
    try {
        const usuarioObtenido = await obtenerUsuarioActualService(req.user.id);
        successResponse(res, "Usuario obtenido", usuarioObtenido);
    } catch (error) {
        next(error);
    }
}

export const actualizarUsuarioActual = async (req, res, next) => {
    try {
        const usuarioActualizado = await actualizarUsuarioActualService(req.user.id, req.body);
        successResponse(res, "Perfil actualizado exitosamente", usuarioActualizado);
    } catch (error) {
        next(error);
    }
}

export const obtenerBancosUsuario = async (req, res, next) => {
    try {
        const bancos = await obtenerBancosPorUsuarioService(req.user.id);
        successResponse(res, "Bancos del usuario obtenidos", bancos);
    } catch (error) {
        next(error);
    }
}

export const obtenerCuentasUsuario = async (req, res, next) => {
    try {
        const cuentas = await obtenerCuentasPorUsuarioService(req.user.id);
        successResponse(res, "Cuentas del usuario obtenidas", cuentas);
    } catch (error) {
        next(error);
    }
}

export const obtenerCategoriasUsuario = async (req, res, next) => {
    try {
        const categorias = await obtenerCategoriasPorUsuarioService(req.user.id);
        successResponse(res, "Categorias del usuario obtenidas", categorias);
    } catch (error) {
        next(error);
    }
}

export const obtenerGastosUsuario = async (req, res, next) => {
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

export const obtenerUsuarioPorId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const usuarioObtenido = await obtenerUsuarioPorIdService(id);
        successResponse(res, `Usuario ${usuarioObtenido.id} obtenido con exito`, usuarioObtenido);
    } catch (error) {
        next(error);
    }
}

export const actualizarUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const usuarioActualizado = await actualizarUsuarioService(id, req.body);
        successResponse(res, `Usuario ${usuarioActualizado.id} actualizado exitosamente`, usuarioActualizado);
    } catch (error) {
        next(error);
    }
}

export const eliminarTodosLosUsuarios = async (req, res, next) => {
    try {
        await eliminarTodosLosUsuariosService(req.user.id);
        successResponse(res, "Todos los usuarios eliminados exitosamente", null);
    } catch (error) {
        next(error);
    }
};