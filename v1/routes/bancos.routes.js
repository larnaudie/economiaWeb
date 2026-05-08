import express from "express";
import {
    obtenerBancos,
    obtenerBancoPorId,
    actualizarBanco,
    eliminarBanco,
    crearBanco,
    eliminarTodosLosBancos
} from "../controllers/bancos.controller.js";
import { bancoSchema } from "../validators/banco.validators.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import {validateObjectId} from "../middlewares/validateObjectId.middleware.js"

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/bancos
router.get("/", obtenerBancos)
router.post("/", validateBody(bancoSchema), crearBanco)
router.get("/:id",validateObjectId, obtenerBancoPorId)
router.patch("/:id",validateObjectId, validateBody(bancoSchema), actualizarBanco)
router.delete("/eliminar-todo",requireAdmin, eliminarTodosLosBancos)
router.delete("/:id",validateObjectId, eliminarBanco)

export default router;