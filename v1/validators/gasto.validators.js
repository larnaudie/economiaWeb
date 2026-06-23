import Joi from "joi";

const objectIdSchema = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

export const gastoSchema = Joi.object({
  estado: Joi.string()
    .valid("pendiente", "creado")
    .optional()
    .messages({
      "any.only": "El estado debe ser pendiente o creado",
    }),

  fecha: Joi.date().optional().messages({
    "date.base": "La fecha debe ser una fecha valida",
  }),

  descripcion: Joi.string().required().min(2).max(500).trim().messages({
    "string.empty": "La descripcion es obligatoria",
    "string.min": "La descripcion debe tener al menos 2 caracteres",
    "string.max": "La descripcion no puede exceder 500 caracteres",
    "any.required": "La descripcion es obligatoria",
  }),

  flujoBancario: Joi.number()
    .optional()
    .allow(null)
    .messages({
      "number.base": "El flujo bancario debe ser un numero",
      "any.required": "El flujo bancario es obligatorio",
    }),

  economiaReal: Joi.number()
    .optional()
    .allow(null)
    .messages({
      "number.base": "La economia real debe ser un numero",
      "any.required": "La economia real es obligatoria",
    }),

  porcentajeEconomiaReal: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .allow(null)
    .messages({
      "number.base": "El porcentaje de economia real debe ser un numero",
      "number.min": "El porcentaje no puede ser negativo",
      "number.max": "El porcentaje no puede exceder 100",
      "any.required": "El porcentaje de economia real es obligatorio",
    }),

  categoria: objectIdSchema
    .optional()
    .allow(null, "")
    .messages({
      "string.pattern.base": "La categoria debe ser un ObjectId valido",
      "any.required": "La categoria es obligatoria",
    }),

  cuenta: objectIdSchema
    .optional()
    .allow(null, "")
    .messages({
      "string.pattern.base": "La cuenta debe ser un ObjectId valido",
      "any.required": "La cuenta es obligatoria",
    }),

  incluirEnGastoBancario: Joi.boolean().optional(),
  incluirEnGastoReal: Joi.boolean().optional(),
  facturaUrl: Joi.string().uri().optional().allow(""),
  facturaPublicId: Joi.string().optional().allow(""),
  origen: Joi.string()
    .valid("manual", "excel_bancario", "tarjeta_credito", "deuda")
    .optional(),
  tarjetaCredito: objectIdSchema.optional().allow(null, ""),
  movimientoTarjeta: objectIdSchema.optional().allow(null, ""),
  gastoRepetidoConfirmado: Joi.boolean().optional(),
});

export const gastosBulkSchema = Joi.object({
  gastos: Joi.array().items(gastoSchema).min(1).required().messages({
    "array.base": "Gastos debe ser un array",
    "array.min": "Debe enviarse al menos un gasto",
    "any.required": "Gastos es obligatorio",
  }),
});

export const gastosBulkUpdateSchema = Joi.object({
  gastos: Joi.array()
    .items(
      gastoSchema.keys({
        _id: objectIdSchema.required().messages({
          "string.pattern.base": "El _id debe ser un ObjectId valido",
          "any.required": "El _id es obligatorio",
        }),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Gastos debe ser un array",
      "array.min": "Debe enviarse al menos un gasto",
      "any.required": "Gastos es obligatorio",
    }),
});

export const gastoUpdateSchema = gastoSchema.fork(
  [
    "fecha",
    "descripcion",
    "flujoBancario",
    "economiaReal",
    "porcentajeEconomiaReal",
    "categoria",
    "cuenta",
    "estado",
    "gastoRepetidoConfirmado",
  ],
  (schema) => schema.optional(),
).prefs({ noDefaults: true });
