import express from "express";
import {
  actualizarTarjetaCredito,
  crearGastoDesdeMovimientoTarjeta,
  crearGastosDesdeMovimientosTarjeta,
  crearResumenTarjeta,
  eliminarMovimientoTarjeta,
  eliminarResumenTarjeta,
  crearTarjetaCredito,
  eliminarTarjetaCredito,
  importarExcelTarjeta,
  obtenerMovimientosTarjeta,
  obtenerResumenesTarjeta,
  obtenerResumenTarjetaPorId,
  obtenerTarjetaCreditoPorId,
  obtenerTarjetasCredito,
} from "../controllers/tarjetasCredito.controller.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";
import { validateObjectId } from "../middlewares/validateObjectId.middleware.js";
import {
  crearGastosMovimientosTarjetaSchema,
  tarjetaCreditoSchema,
  tarjetaCreditoUpdateSchema,
} from "../validators/tarjetaCredito.validators.js";
import { resumenTarjetaSchema } from "../validators/resumenTarjeta.validators.js";

const router = express.Router();

router.get("/", obtenerTarjetasCredito);
router.post("/", validateBody(tarjetaCreditoSchema), crearTarjetaCredito);
router.get("/:id", validateObjectId, obtenerTarjetaCreditoPorId);
router.patch(
  "/:id",
  validateObjectId,
  validateBody(tarjetaCreditoUpdateSchema),
  actualizarTarjetaCredito,
);
router.delete("/:id", validateObjectId, eliminarTarjetaCredito);
router.post("/:id/importar-excel", validateObjectId, importarExcelTarjeta);
router.post(
  "/:id/movimientos/crear-gastos",
  validateObjectId,
  validateBody(crearGastosMovimientosTarjetaSchema),
  crearGastosDesdeMovimientosTarjeta,
);
router.post(
  "/:id/movimientos/:movimientoId/crear-gasto",
  validateObjectId,
  crearGastoDesdeMovimientoTarjeta,
);
router.delete(
  "/:id/movimientos/:movimientoId",
  validateObjectId,
  eliminarMovimientoTarjeta,
);
router.get("/:id/movimientos", validateObjectId, obtenerMovimientosTarjeta);
router.get("/:id/resumenes", validateObjectId, obtenerResumenesTarjeta);
router.post(
  "/:id/resumenes",
  validateObjectId,
  validateBody(resumenTarjetaSchema),
  crearResumenTarjeta,
);
router.get(
  "/:id/resumenes/:resumenId",
  validateObjectId,
  obtenerResumenTarjetaPorId,
);
router.delete(
  "/:id/resumenes/:resumenId",
  validateObjectId,
  eliminarResumenTarjeta,
);

export default router;
