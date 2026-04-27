import express from "express";
import {
    obtenerCuentas,
    obtenerCuentaPorId,
    actualizarCuenta,
    eliminarCuenta,
    crearCuenta
} from "../controllers/cuentas.controller.js";
import { cuentaSchema,cuentaUpdateSchema  } from "../validators/cuenta.validators.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/cuentas
router.get("/", obtenerCuentas)
router.get("/:id", obtenerCuentaPorId)
router.patch("/:id", validateBody(cuentaUpdateSchema), actualizarCuenta);
router.post("/", validateBody(cuentaSchema), crearCuenta)
router.delete("/:id", eliminarCuenta)

export default router;