import {
  crearCategoriaGrupoService,
  obtenerCategoriasGrupoService,
  actualizarCategoriaGrupoService,
  eliminarCategoriaGrupoService,
  eliminarTodosLasCategoriasGrupoService
} from "../services/categoriaGrupo.service.js";
import { crearAuditLogService } from "../services/auditLog.service.js";
import { successResponse } from "../utils/apiResponse.js";

export async function crearCategoriaGrupo(req, res, next) {
  try {
    const categoriaGrupo = await crearCategoriaGrupoService(
      req.body,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Categoría principal creada",
      data: categoriaGrupo
    });
  } catch (error) {
    next(error);
  }
}

export async function obtenerCategoriasGrupo(req, res, next) {
  try {
    const categoriasGrupo = await obtenerCategoriasGrupoService(req.user.id);

    res.json({
      success: true,
      message: "Categorías principales obtenidas",
      data: categoriasGrupo
    });
  } catch (error) {
    next(error);
  }
}

export async function actualizarCategoriaGrupo(req, res, next) {
  try {
    const categoriaGrupo = await actualizarCategoriaGrupoService(
      req.params.id,
      req.body,
      req.user.id
    );

    res.json({
      success: true,
      message: "Categoría principal actualizada",
      data: categoriaGrupo
    });
  } catch (error) {
    next(error);
  }
}

export async function eliminarCategoriaGrupo(req, res, next) {
  try {
    await eliminarCategoriaGrupoService(req.params.id, req.user.id);

    res.json({
      success: true,
      message: "Categoría principal eliminada",
      data: null
    });
  } catch (error) {
    next(error);
  }
}

export const eliminarTodosLasCategoriasGrupo = async (req, res, next) => {
  try {
    await eliminarTodosLasCategoriasGrupoService();

    await crearAuditLogService({
      usuario: req.user.id,
      accion: "ELIMINAR_TODAS_LAS_CATEGORIAS_GRUPO",
      entidad: "CategoriaGrupo",
      detalle: {
        alcance: "Todas las categorías grupo",
      },
    });

    successResponse(res, "Todas las categorias principales eliminadas exitosamente", null);
  } catch (error) {
    next(error);
  }
};