import express from "express";
import {
    obtenerCuentas,
    obtenerCuentaPorId,
    actualizarCuenta,
    eliminarCuenta,
    crearCuenta,
    eliminarTodasLasCuentas
} from "../controllers/cuentas.controller.js";
import { cuentaSchema,cuentaUpdateSchema  } from "../validators/cuenta.validators.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";
import {requireAdmin} from "../middlewares/requireAdmin.middleware.js"
import {validateObjectId} from "../middlewares/validateObjectId.middleware.js"

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/cuentas
router.post("/", validateBody(cuentaSchema), crearCuenta)
router.get("/", obtenerCuentas)
router.delete("/eliminar-todo",requireAdmin, eliminarTodasLasCuentas);
router.get("/:id",validateObjectId, obtenerCuentaPorId)
router.patch("/:id",validateObjectId, validateBody(cuentaUpdateSchema), actualizarCuenta);
router.delete("/:id",validateObjectId, eliminarCuenta)

export default router;