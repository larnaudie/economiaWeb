import Joi from "joi";

export const categoriaSchema = Joi.object({
    nombre: Joi.string()
        .required()
        .min(2)
        .max(50)
        .trim()
        .messages({
            "string.empty": "El nombre de la categoría es obligatorio",
            "string.min": "El nombre debe tener al menos 2 caracteres",
            "string.max": "El nombre no puede exceder 50 caracteres",
            "any.required": "El nombre de la categoría es obligatorio"
        }),

    categoriaGrupo: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .allow(null, "")
        .optional()
        .messages({
            "string.pattern.base": "La categoría principal no es válida"
        })
});