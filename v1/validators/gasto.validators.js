import Joi from "joi";

export const gastoSchema = Joi.object({
    fecha: Joi.date()
        .required()
        .messages({
            "date.base": "La fecha debe ser una fecha válida",
            "any.required": "La fecha es obligatoria"
        }),
    descripcion: Joi.string()
        .required()
        .min(2)
        .max(500)
        .trim()
        .messages({
            "string.empty": "La descripción es obligatoria",
            "string.min": "La descripción debe tener al menos 2 caracteres",
            "string.max": "La descripción no puede exceder 500 caracteres",
            "any.required": "La descripción es obligatoria"
        }),
    flujoBancario: Joi.number()
        .required()
        .messages({
            "number.base": "El flujo bancario debe ser un número",
            "any.required": "El flujo bancario es obligatorio"
        }),
    economiaReal: Joi.number()
        .required()
        .messages({
            "number.base": "La economía real debe ser un número",
            "any.required": "La economía real es obligatoria"
        }),
    porcentajeEconomiaReal: Joi.number()
        .required()
        .min(0)
        .max(100)
        .messages({
            "number.base": "El porcentaje de economía real debe ser un número",
            "number.min": "El porcentaje no puede ser negativo",
            "number.max": "El porcentaje no puede exceder 100",
            "any.required": "El porcentaje de economía real es obligatorio"
        }),
    categoria: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
            "string.pattern.base": "La categoría debe ser un ObjectId válido",
            "any.required": "La categoría es obligatoria"
        }),
    cuenta: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
            "string.pattern.base": "La cuenta debe ser un ObjectId válido",
            "any.required": "La cuenta es obligatoria"
        }),
    incluirEnGastoBancario: Joi.boolean().optional(),
    incluirEnGastoReal: Joi.boolean().optional(),
});

export const gastosBulkSchema = Joi.object({
    gastos: Joi.array()
        .items(gastoSchema)
        .min(1)
        .required()
        .messages({
            "array.base": "Gastos debe ser un array",
            "array.min": "Debe enviarse al menos un gasto",
            "any.required": "Gastos es obligatorio"
        })
});

export const gastosBulkUpdateSchema = Joi.object({
    gastos: Joi.array()
        .items(
            gastoSchema.keys({
                _id: Joi.string()
                    .required()
                    .regex(/^[0-9a-fA-F]{24}$/)
                    .messages({
                        "string.pattern.base": "El _id debe ser un ObjectId válido",
                        "any.required": "El _id es obligatorio"
                    })
            })
        )
        .min(1)
        .required()
        .messages({
            "array.base": "Gastos debe ser un array",
            "array.min": "Debe enviarse al menos un gasto",
            "any.required": "Gastos es obligatorio"
        })
});

export const gastoUpdateSchema = gastoSchema.fork(
    [
        "fecha",
        "descripcion",
        "flujoBancario",
        "economiaReal",
        "porcentajeEconomiaReal",
        "categoria",
        "cuenta"
    ],
    (schema) => schema.optional()
);