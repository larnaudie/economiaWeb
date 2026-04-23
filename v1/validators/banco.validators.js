import Joi from "joi";

export const bancoSchema = Joi.object({
    nombre: Joi.string()
        .required()
        .min(2)
        .max(50)
        .trim()
        .messages({
            "string.empty": "El nombre del banco es obligatorio",
            "string.min": "El nombre debe tener al menos 2 caracteres",
            "string.max": "El nombre no puede exceder 50 caracteres",
            "any.required": "El nombre del banco es obligatorio"
        })
});