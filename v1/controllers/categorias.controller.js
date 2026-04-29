import {
    obtenerCategoriasService,
    obtenerCategoriaPorIdService,
    actualizarCategoriaService,
    crearCategoriaService,
    eliminarCategoriaService,
    obtenerTotalesPorCategoriaService,
    eliminarTodosLasCategoriasService
} from "../services/categoria.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const obtenerCategorias = async (req, res, next) => {
    try {
        const categoriasObtenidas = await obtenerCategoriasService(req.user.id);
        successResponse(res, "Categorias obtenidas", categoriasObtenidas);
    } catch (error) {
        next(error);
    }
}

export const obtenerTotalesPorCategoria = async (req, res, next) => {
    try {
        const { mes, anual } = req.query;
        const totales = await obtenerTotalesPorCategoriaService(req.user.id, mes, anual);
        successResponse(res, "Totales por categoria obtenidos", totales);
    } catch (error) {
        next(error);
    }
}

export const obtenerCategoriaPorId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const categoriaObtenida = await obtenerCategoriaPorIdService(id);
        successResponse(res, `Categoria ${categoriaObtenida.id} obtenida con exito`, categoriaObtenida);
    } catch (error) {
        next(error);
    }
}

export const actualizarCategoria = async (req, res, next) => {
    try {
        const { id } = req.params;
        const categoriaActualizada = await actualizarCategoriaService(id, req.user.id, req.body);
        successResponse(res, `Categoria ${categoriaActualizada.id} actualizada exitosamente`, categoriaActualizada);
    } catch (error) {
        next(error);
    }
}

export const crearCategoria = async (req, res, next) => {
    try {
        const { categoria, existed } = await crearCategoriaService(req.body, req.user.id);
        const message = existed ? "Categoria ya existe" : "Categoria creada exitosamente";
        const status = existed ? 200 : 201;

        successResponse(res, message, categoria, status);
    } catch (error) {
        next(error);
    }
}

export const eliminarCategoria = async (req, res, next) => {
    try {
        const { id } = req.params;
        await eliminarCategoriaService(id, req.user.id);
        successResponse(res, `Categoria ${id} eliminada exitosamente`);
    } catch (error) {
        next(error);
    }
}

export const eliminarTodosLasCategorias = async (req, res, next) => {
    try {
        await eliminarTodosLasCategoriasService(req.user.id);
        successResponse(res, "Todas las categorias eliminadas exitosamente", null);
    } catch (error) {
        next(error);
    }
};