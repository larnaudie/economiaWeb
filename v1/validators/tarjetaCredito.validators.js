import Joi from "joi";

const objectIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const tarjetaCreditoSchema = Joi.object({
  nombre: Joi.string().min(2).max(120).trim().required().messages({
    "string.empty": "El nombre de la tarjeta es obligatorio",
    "string.min": "El nombre debe tener al menos 2 caracteres",
    "string.max": "El nombre no puede superar los 120 caracteres",
    "any.required": "El nombre de la tarjeta es obligatorio",
  }),

  banco: objectIdSchema.optional().allow(null, "").messages({
    "string.pattern.base": "El banco debe ser un ObjectId valido",
  }),

  cuentaTarjeta: objectIdSchema.optional().allow(null, "").messages({
    "string.pattern.base": "La cuenta de tarjeta debe ser un ObjectId valido",
  }),

  cuentaPagoDefault: objectIdSchema.optional().allow(null, "").messages({
    "string.pattern.base": "La cuenta de pago debe ser un ObjectId valido",
  }),

  ultimosDigitos: Joi.string().max(4).trim().optional().allow("").messages({
    "string.max": "Los ultimos digitos no pueden superar 4 caracteres",
  }),

  monedaPrincipal: Joi.string().valid("UYU", "USD").optional(),
  limiteUYU: Joi.number().min(0).optional().allow(null),
  limiteUSD: Joi.number().min(0).optional().allow(null),
  diaCierre: Joi.number().integer().min(1).max(31).optional().allow(null),
  diaVencimiento: Joi.number().integer().min(1).max(31).optional().allow(null),
  activa: Joi.boolean().optional(),
});

export const tarjetaCreditoUpdateSchema = tarjetaCreditoSchema.fork(
  ["nombre"],
  (schema) => schema.optional(),
);

export const crearGastosMovimientosTarjetaSchema = Joi.object({
  movimientoIds: Joi.array().items(objectIdSchema).min(1).required().messages({
    "array.base": "Los movimientos deben enviarse como un array",
    "array.min": "Debe seleccionarse al menos un movimiento",
    "any.required": "Los movimientos son obligatorios",
  }),
  cuentaPago: objectIdSchema.optional().allow(null, "").messages({
    "string.pattern.base": "La cuenta de pago debe ser un ObjectId valido",
  }),
});
