import Joi from "joi";

export const usuarioSchema = Joi.object({
    username: Joi.string()
        .required()
        .min(3)
        .max(30)
        .trim()
        .messages({
            "string.empty": "El username es obligatorio",
            "string.min": "El username debe tener al menos 3 caracteres",
            "string.max": "El username no puede exceder 30 caracteres",
            "any.required": "El username es obligatorio"
        }),
    password: Joi.string()
        .required()
        .min(6)
        .pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/)
        .messages({
            "string.empty": "La contraseña es obligatoria",
            "string.min": "La contraseña debe tener al menos 6 caracteres",
            "string.pattern.base": "La contraseña debe contener al menos una letra y un número",
            "any.required": "La contraseña es obligatoria"
        }),
    email: Joi.string()
        .email()
        .allow('')
        .messages({
            "string.email": "El email debe ser válido"
        }),
    edad: Joi.number()
        .integer()
        .min(0)
        .max(120)
        .messages({
            "number.base": "La edad debe ser un número",
            "number.min": "La edad no puede ser negativa",
            "number.max": "La edad no puede exceder 120"
        }),
    altura: Joi.number()
        .min(0)
        .messages({
            "number.base": "La altura debe ser un número",
            "number.min": "La altura no puede ser negativa"
        }),
    peso: Joi.number()
        .min(0)
        .messages({
            "number.base": "El peso debe ser un número",
            "number.min": "El peso no puede ser negativo"
        }),
    points: Joi.number()
        .min(0)
        .default(0)
        .messages({
            "number.base": "Los puntos deben ser un número",
            "number.min": "Los puntos no pueden ser negativos"
        }),
    cuentas: Joi.array()
        .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
        .messages({
            "array.base": "Las cuentas deben ser un array",
            "string.pattern.base": "Cada cuenta debe ser un ObjectId válido"
        })
});