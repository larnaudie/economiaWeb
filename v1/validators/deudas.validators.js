import Joi from "joi";

export const deudaSchema = Joi.object({
  descripcion: Joi.string().min(3).max(200).required().messages({
    "string.empty": "La descripción es obligatoria",
    "string.min": "La descripción debe tener al menos 3 caracteres",
    "string.max": "La descripción no puede superar los 200 caracteres",
    "any.required": "La descripción es obligatoria"
  }),

  montoTotal: Joi.number().positive().required().messages({
    "number.base": "El monto total debe ser un número",
    "number.positive": "El monto total debe ser mayor a 0",
    "any.required": "El monto total es obligatorio"
  }),

  cuotasTotales: Joi.number().integer().positive().required().messages({
    "number.base": "Las cuotas totales deben ser un número",
    "number.integer": "Las cuotas totales deben ser un número entero",
    "number.positive": "Las cuotas totales deben ser mayor a 0",
    "any.required": "Las cuotas totales son obligatorias"
  }),

  montoCuota: Joi.number().positive().required().messages({
    "number.base": "El monto de la cuota debe ser un número",
    "number.positive": "El monto de la cuota debe ser mayor a 0",
    "any.required": "El monto de la cuota es obligatorio"
  }),

  fechaInicio: Joi.date().required().messages({
    "date.base": "La fecha de inicio debe ser válida",
    "any.required": "La fecha de inicio es obligatoria"
  })
});