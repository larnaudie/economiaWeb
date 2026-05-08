import express from "express";
import {
    obtenerCategorias,
    obtenerCategoriaPorId,
    actualizarCategoria,
    crearCategoria,
    eliminarCategoria,
    obtenerTotalesPorCategoria,
    eliminarTodosLasCategorias
} from "../controllers/categorias.controller.js";
import { categoriaSchema } from "../validators/categoria.validators.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/categorias
router.post("/", validateBody(categoriaSchema), crearCategoria)
router.get("/", obtenerCategorias)
router.delete("/eliminar-todo",requireAdmin, eliminarTodosLasCategorias);
router.get("/totales", obtenerTotalesPorCategoria)
router.get("/:id", obtenerCategoriaPorId)
router.patch("/:id", validateBody(categoriaSchema), actualizarCategoria)
router.delete("/:id", eliminarCategoria);

export default router;