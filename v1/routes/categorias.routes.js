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
import { validateBody } from "../middlewares/validateBody.middleware.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/categorias
router.get("/", obtenerCategorias)
router.get("/totales", obtenerTotalesPorCategoria)
router.get("/:id", obtenerCategoriaPorId)
router.patch("/:id", validateBody(categoriaSchema), actualizarCategoria)
router.post("/", validateBody(categoriaSchema), crearCategoria)
router.delete("/:id", eliminarCategoria);
router.delete("/", eliminarTodosLasCategorias);

export default router;