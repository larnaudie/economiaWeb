import {
  actualizarTarjetaCreditoService,
  crearGastoDesdeMovimientoTarjetaService,
  crearGastosDesdeMovimientosTarjetaService,
  crearResumenTarjetaService,
  crearTarjetaCreditoService,
  eliminarMovimientoTarjetaService,
  eliminarResumenTarjetaService,
  eliminarTarjetaCreditoService,
  importarExcelTarjetaService,
  obtenerMovimientosTarjetaService,
  obtenerResumenesTarjetaService,
  obtenerResumenTarjetaPorIdService,
  obtenerTarjetaCreditoPorIdService,
  obtenerTarjetasCreditoService,
} from "../services/tarjetaCredito.service.js";
import { successResponse } from "../utils/apiResponse.js";
import multer from "multer";

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ];

    if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.endsWith(".xlsx")) {
      return cb(new Error("Tipo de archivo no permitido"));
    }

    cb(null, true);
  },
});

export function runExcelUpload(req, res) {
  return new Promise((resolve, reject) => {
    excelUpload.single("excel")(req, res, (error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

export const crearTarjetaCredito = async (req, res, next) => {
  try {
    const tarjeta = await crearTarjetaCreditoService({
      usuarioId: req.user.id,
      data: req.body,
    });

    successResponse(res, "Tarjeta creada", tarjeta, 201);
  } catch (error) {
    next(error);
  }
};

export const obtenerTarjetasCredito = async (req, res, next) => {
  try {
    const tarjetas = await obtenerTarjetasCreditoService(req.user.id);
    successResponse(res, "Tarjetas obtenidas", tarjetas);
  } catch (error) {
    next(error);
  }
};

export const obtenerTarjetaCreditoPorId = async (req, res, next) => {
  try {
    const tarjeta = await obtenerTarjetaCreditoPorIdService({
      id: req.params.id,
      usuarioId: req.user.id,
    });

    successResponse(res, "Tarjeta obtenida", tarjeta);
  } catch (error) {
    next(error);
  }
};

export const actualizarTarjetaCredito = async (req, res, next) => {
  try {
    const tarjeta = await actualizarTarjetaCreditoService({
      id: req.params.id,
      usuarioId: req.user.id,
      data: req.body,
    });

    successResponse(res, "Tarjeta actualizada", tarjeta);
  } catch (error) {
    next(error);
  }
};

export const eliminarTarjetaCredito = async (req, res, next) => {
  try {
    const tarjeta = await eliminarTarjetaCreditoService({
      id: req.params.id,
      usuarioId: req.user.id,
    });

    successResponse(res, "Tarjeta eliminada", tarjeta);
  } catch (error) {
    next(error);
  }
};

export const obtenerMovimientosTarjeta = async (req, res, next) => {
  try {
    const movimientos = await obtenerMovimientosTarjetaService({
      tarjetaId: req.params.id,
      usuarioId: req.user.id,
    });

    successResponse(res, "Movimientos de tarjeta obtenidos", movimientos);
  } catch (error) {
    next(error);
  }
};

export const crearGastoDesdeMovimientoTarjeta = async (req, res, next) => {
  try {
    const resultado = await crearGastoDesdeMovimientoTarjetaService({
      tarjetaId: req.params.id,
      movimientoId: req.params.movimientoId,
      usuarioId: req.user.id,
    });

    successResponse(res, "Gasto creado desde movimiento de tarjeta", resultado, 201);
  } catch (error) {
    next(error);
  }
};

export const crearGastosDesdeMovimientosTarjeta = async (req, res, next) => {
  try {
    const resultado = await crearGastosDesdeMovimientosTarjetaService({
      tarjetaId: req.params.id,
      movimientoIds: req.body.movimientoIds,
      usuarioId: req.user.id,
    });

    successResponse(res, "Gastos creados desde movimientos de tarjeta", resultado, 201);
  } catch (error) {
    next(error);
  }
};

export const eliminarMovimientoTarjeta = async (req, res, next) => {
  try {
    const resultado = await eliminarMovimientoTarjetaService({
      tarjetaId: req.params.id,
      movimientoId: req.params.movimientoId,
      usuarioId: req.user.id,
      eliminarGastoGenerado: req.body?.eliminarGastoGenerado === true,
    });

    successResponse(res, "Movimiento de tarjeta eliminado", resultado);
  } catch (error) {
    next(error);
  }
};

export const eliminarResumenTarjeta = async (req, res, next) => {
  try {
    const resultado = await eliminarResumenTarjetaService({
      tarjetaId: req.params.id,
      resumenId: req.params.resumenId,
      usuarioId: req.user.id,
      eliminarGastosGenerados: req.body?.eliminarGastosGenerados === true,
    });

    successResponse(res, "Resumen de tarjeta eliminado", resultado);
  } catch (error) {
    next(error);
  }
};

export const crearResumenTarjeta = async (req, res, next) => {
  try {
    const resumen = await crearResumenTarjetaService({
      tarjetaId: req.params.id,
      usuarioId: req.user.id,
      data: req.body,
    });

    successResponse(res, "Resumen de tarjeta creado", resumen, 201);
  } catch (error) {
    next(error);
  }
};

export const obtenerResumenesTarjeta = async (req, res, next) => {
  try {
    const resumenes = await obtenerResumenesTarjetaService({
      tarjetaId: req.params.id,
      usuarioId: req.user.id,
    });

    successResponse(res, "Resumenes de tarjeta obtenidos", resumenes);
  } catch (error) {
    next(error);
  }
};

export const obtenerResumenTarjetaPorId = async (req, res, next) => {
  try {
    const resumen = await obtenerResumenTarjetaPorIdService({
      tarjetaId: req.params.id,
      resumenId: req.params.resumenId,
      usuarioId: req.user.id,
    });

    successResponse(res, "Resumen de tarjeta obtenido", resumen);
  } catch (error) {
    next(error);
  }
};

export const importarExcelTarjeta = async (req, res, next) => {
  try {
    await runExcelUpload(req, res);

    if (!req.file) {
      const error = new Error("No se subio ningun Excel");
      error.status = 400;
      throw error;
    }

    const resultado = await importarExcelTarjetaService({
      tarjetaId: req.params.id,
      usuarioId: req.user.id,
      buffer: req.file.buffer,
    });

    successResponse(res, "Excel de tarjeta importado", resultado, 201);
  } catch (error) {
    next(error);
  }
};
