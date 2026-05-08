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
import { deudaSchema } from "../validators/deudas.validators.js";

const router = express.Router();

router.post("/", validateBody(deudaSchema), crearDeuda);
router.get("/", obtenerDeudas);
router.delete("/eliminar-todo",requireAdmin, eliminarTodosLasDeudas);
router.get("/:id", obtenerDeudaPorId);
router.patch("/:id", validateBody(deudaSchema), actualizarDeuda);
router.delete("/:id", eliminarDeuda);

router.post("/:id/pagar-cuota", pagarCuotaDeuda);

export default router;