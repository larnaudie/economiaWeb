import Joi from "joi";

export const cuentaSchema = Joi.object({
    nombre: Joi.string()
        .required()
        .min(2)
        .max(50)
        .trim()
        .messages({
            "string.empty": "El nombre de la cuenta es obligatorio",
            "string.min": "El nombre debe tener al menos 2 caracteres",
            "string.max": "El nombre no puede exceder 50 caracteres",
            "any.required": "El nombre de la cuenta es obligatorio"
        }),
    banco: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .messages({
            "string.pattern.base": "El banco debe ser un ObjectId válido",
            "any.required": "El banco es obligatorio"
        })
});