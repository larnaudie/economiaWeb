import express from "express";
import {
    obtenerGastos,
    obtenerGastoPorId,
    actualizarGasto,
    eliminarGasto,
    crearGasto,
    crearGastosBulk,
    actualizarGastosBulk,
    eliminarTodosLosGastos
} from "../controllers/gastos.controller.js";
import {
    gastoSchema,
    gastosBulkSchema,
    gastosBulkUpdateSchema,
    gastoUpdateSchema
} from "../validators/gasto.validators.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/gastos
router.get("/", obtenerGastos)
router.get("/:id", obtenerGastoPorId)
router.patch("/:id", validateBody(gastoUpdateSchema), actualizarGasto);
router.post("/", validateBody(gastoSchema), crearGasto)
router.delete("/:id", eliminarGasto)
router.post("/bulk", validateBody(gastosBulkSchema), crearGastosBulk);
router.patch("/bulk", validateBody(gastosBulkUpdateSchema), actualizarGastosBulk);
router.delete("/", eliminarTodosLosGastos);
export default router;