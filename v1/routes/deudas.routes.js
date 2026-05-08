import express from "express";
import {
  crearDeuda,
  obtenerDeudas,
  obtenerDeudaPorId,
  actualizarDeuda,
  eliminarDeuda,
  pagarCuotaDeuda,
  eliminarTodosLasDeudas
} from "../controllers/deudas.controller.js";
import {requireAdmin} from "../middlewares/requireAdmin.middleware.js"

import { validateBody } from "../middlewares/validateBody.middleware.js";
import { validateObjectId } from "../middlewares/validateObjectId.middleware.js";
import { deudaSchema } from "../validators/deudas.validators.js";

const router = express.Router();

router.post("/", validateBody(deudaSchema), crearDeuda);
router.get("/", obtenerDeudas);
router.delete("/eliminar-todo",requireAdmin, eliminarTodosLasDeudas);
router.get("/:id",validateObjectId, obtenerDeudaPorId);
router.patch("/:id",validateObjectId, validateBody(deudaSchema), actualizarDeuda);
router.delete("/:id",validateObjectId, eliminarDeuda);

router.post("/:id/pagar-cuota",validateObjectId, pagarCuotaDeuda);

export default router;