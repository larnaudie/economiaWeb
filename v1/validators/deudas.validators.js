import Joi from "joi";

export const deudaSchema = Joi.object({
  descripcion: Joi.string().min(3).max(200).required().messages({
    "string.empty": "La descripcion es obligatoria",
    "string.min": "La descripcion debe tener al menos 3 caracteres",
    "string.max": "La descripcion no puede superar los 200 caracteres",
    "any.required": "La descripcion es obligatoria",
  }),

  tipo: Joi.string()
    .valid("deuda", "prestamo", "financiacion", "hipotecario")
    .optional(),

  moneda: Joi.string().valid("UYU", "USD", "UI").optional(),

  entidad: Joi.string().max(120).optional().allow(""),

  montoTotal: Joi.number().positive().required().messages({
    "number.base": "El monto total debe ser un numero",
    "number.positive": "El monto total debe ser mayor a 0",
    "any.required": "El monto total es obligatorio",
  }),

  montoOriginalAntesEntrega: Joi.number().positive().optional().allow(null),
  porcentajeFinanciacion: Joi.number().min(0).max(100).optional().allow(null),
  entregaInicialMonto: Joi.number().min(0).optional().allow(null),
  entregaInicialMoneda: Joi.string().valid("UYU", "USD", "UI").optional(),
  entregaInicialConvertida: Joi.number().min(0).optional().allow(null),

  cuotasTotales: Joi.number().integer().positive().optional().allow(null).messages({
    "number.base": "Las cuotas totales deben ser un numero",
    "number.integer": "Las cuotas totales deben ser un numero entero",
    "number.positive": "Las cuotas totales deben ser mayor a 0",
  }),

  saldoPendiente: Joi.number().min(0).optional().allow(null),
  cuotaActual: Joi.number().integer().min(0).optional().allow(null),
  montoPagadoInicial: Joi.number().min(0).optional().allow(null),

  montoCuota: Joi.number().positive().optional().allow(null).messages({
    "number.base": "El monto de la cuota debe ser un numero",
    "number.positive": "El monto de la cuota debe ser mayor a 0",
  }),

  tasaInteres: Joi.number().min(0).optional().allow(null),
  plazoAnios: Joi.number().integer().positive().optional().allow(null),
  diaVencimiento: Joi.number().integer().min(1).max(31).optional().allow(null),
  cuentaPagoDefault: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().allow(null, ""),
  categoriaDefault: Joi.string().regex(/^[0-9a-fA-F]{24}$/).optional().allow(null, ""),

  fechaInicio: Joi.date().required().messages({
    "date.base": "La fecha de inicio debe ser valida",
    "any.required": "La fecha de inicio es obligatoria",
  }),
}).custom((value, helpers) => {
  if (!value.cuotasTotales && !value.plazoAnios) {
    return helpers.error("any.custom", {
      message: "Ingresa cuotas totales o plazo en años",
    });
  }

  if (value.cuotaActual && value.cuotasTotales && value.cuotaActual > value.cuotasTotales) {
    return helpers.error("any.custom", {
      message: "Las cuotas ya pagadas no pueden superar las cuotas totales",
    });
  }

  return value;
}).messages({
  "any.custom": "{{#message}}",
});
