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

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/bancos
router.get("/", obtenerBancos)
router.post("/", validateBody(bancoSchema), crearBanco)
router.get("/:id", obtenerBancoPorId)
router.patch("/:id", validateBody(bancoSchema), actualizarBanco)
router.delete("/:id", eliminarBanco)
router.delete("/eliminar-todo", eliminarTodosLosBancos)

export default router;