import Joi from "joi";

export const deudaSchema = Joi.object({
  descripcion: Joi.string().min(3).max(200).required().messages({
    "string.empty": "La descripcion es obligatoria",
    "string.min": "La descripcion debe tener al menos 3 caracteres",
    "string.max": "La descripcion no puede superar los 200 caracteres",
    "any.required": "La descripcion es obligatoria",
  }),

  montoTotal: Joi.number().positive().required().messages({
    "number.base": "El monto total debe ser un numero",
    "number.positive": "El monto total debe ser mayor a 0",
    "any.required": "El monto total es obligatorio",
  }),

  cuotasTotales: Joi.number().integer().positive().required().messages({
    "number.base": "Las cuotas totales deben ser un numero",
    "number.integer": "Las cuotas totales deben ser un numero entero",
    "number.positive": "Las cuotas totales deben ser mayor a 0",
    "any.required": "Las cuotas totales son obligatorias",
  }),

  montoCuota: Joi.number().positive().optional().messages({
    "number.base": "El monto de la cuota debe ser un numero",
    "number.positive": "El monto de la cuota debe ser mayor a 0",
  }),

  fechaInicio: Joi.date().required().messages({
    "date.base": "La fecha de inicio debe ser valida",
    "any.required": "La fecha de inicio es obligatoria",
  }),
});
