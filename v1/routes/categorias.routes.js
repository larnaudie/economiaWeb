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
import {validateObjectId }from "../middlewares/validateObjectId.middleware.js"

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/categorias
router.post("/", validateBody(categoriaSchema), crearCategoria)
router.get("/", obtenerCategorias)
router.delete("/eliminar-todo",requireAdmin, eliminarTodosLasCategorias);
router.get("/totales", obtenerTotalesPorCategoria)
router.get("/:id",validateObjectId, obtenerCategoriaPorId)
router.patch("/:id",validateObjectId, validateBody(categoriaSchema), actualizarCategoria)
router.delete("/:id",validateObjectId, eliminarCategoria);

export default router;