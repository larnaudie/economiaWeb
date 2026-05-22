import { obtenerCotizacionesService } from "../services/cotizaciones.service.js";
import { successResponse } from "../utils/apiResponse.js";

export const obtenerCotizaciones = async (req, res, next) => {
  try {
    const cotizaciones = await obtenerCotizacionesService();
    successResponse(res, "Cotizaciones obtenidas", cotizaciones);
  } catch (error) {
    next(error);
  }
};
