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

import { validateBody } from "../middlewares/validateBody.middleware.js";
import { deudaSchema } from "../validators/deudas.validators.js";

const router = express.Router();

router.post("/", validateBody(deudaSchema), crearDeuda);
router.get("/", obtenerDeudas);
router.get("/:id", obtenerDeudaPorId);
router.patch("/:id", validateBody(deudaSchema), actualizarDeuda);
router.delete("/:id", eliminarDeuda);
router.delete("/eliminar-todo", eliminarTodosLasDeudas);

router.post("/:id/pagar-cuota", pagarCuotaDeuda);

export default router;