import express from "express";
import {
    obtenerGastos,
    obtenerGastoPorId,
    actualizarGasto,
    eliminarGasto,
    crearGasto
} from "../controllers/gastos.controller.js";
import { gastoSchema } from "../validators/gasto.validators.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/gastos
router.get("/", obtenerGastos)
router.get("/:id", obtenerGastoPorId)
router.patch("/:id", validateBody(gastoSchema), actualizarGasto)
router.post("/", validateBody(gastoSchema), crearGasto)
router.delete("/:id", eliminarGasto)

export default router;