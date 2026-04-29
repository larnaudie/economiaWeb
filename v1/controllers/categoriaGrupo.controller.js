import {
  crearCategoriaGrupoService,
  obtenerCategoriasGrupoService,
  actualizarCategoriaGrupoService,
  eliminarCategoriaGrupoService
} from "../services/categoriaGrupo.service.js";

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

export async function eliminarTodosLasCategoriasGrupo(req, res, next) {
  try {
    await eliminarTodosLasCategoriasGrupoService();
    res.json({
      success: true,
      message: "Todas las categorías principales eliminadas",
      data: null
    });
  } catch (error) {
    next(error);
  }
}