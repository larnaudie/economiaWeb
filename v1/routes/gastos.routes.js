import express from "express";
import {
    obtenerGastos,
    obtenerGastoPorId,
    actualizarGasto,
    eliminarGasto,
    crearGasto,
    crearGastosBulk,
    actualizarGastosBulk,
    actualizarOrdenGastosCuenta,
    eliminarTodosLosGastos
} from "../controllers/gastos.controller.js";
import {
    gastoSchema,
    gastosBulkSchema,
    gastosBulkUpdateSchema,
    gastoUpdateSchema
} from "../validators/gasto.validators.js";
import {requireAdmin} from "../middlewares/requireAdmin.middleware.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/gastos
router.post("/", validateBody(gastoSchema), crearGasto)
router.get("/", obtenerGastos)
router.patch("/orden-cuenta", actualizarOrdenGastosCuenta);
router.delete("/eliminar-todo", requireAdmin, eliminarTodosLosGastos);
router.post("/bulk", validateBody(gastosBulkSchema), crearGastosBulk);
router.patch("/bulk", validateBody(gastosBulkUpdateSchema), actualizarGastosBulk);
router.get("/:id", obtenerGastoPorId)
router.patch("/:id", validateBody(gastoUpdateSchema), actualizarGasto);
router.delete("/:id", eliminarGasto)
export default router;