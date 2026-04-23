import Joi from "joi";

export const agregarUsuarioSchema = Joi.object({
    nombre: Joi.string().trim().min(3).max(30).required().messages({
        "string.base": "El nombre debe ser una cadena de texto",
        "string.empty": "El nombre no puede estar vacío",
        "string.min": "El nombre debe tener al menos {#limit} caracteres",
        "string.max": "El nombre no puede tener más de {#limit} caracteres",
        "any.required": "El nombre es obligatorio"
    }),
    email: Joi.string().email().required().messages({
        "string.base": "El email debe ser una cadena de texto",
        "string.empty": "El email no puede estar vacío",
        "string.email": "El email debe ser un correo electrónico válido",
        "any.required": "El email es obligatorio"
    }),
    edad: Joi.number().integer().positive().min(18).max(100).required().messages({
        "number.base": "La edad debe ser un número",
        "number.empty": "La edad no puede estar vacía",
        "number.integer": "La edad debe ser un número entero",
        "number.positive": "La edad debe ser un número positivo",
        "number.min": "La edad debe ser al menos {#limit}",
        "number.max": "La edad no puede ser mayor que {#limit}",
        "any.required": "La edad es obligatoria"
    }),
    contraseña: Joi.string().min(6).pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/).required().messages({
        "string.base": "La contraseña debe ser una cadena de texto",
        "string.empty": "La contraseña no puede estar vacía",
        "string.min": "La contraseña debe tener al menos {#limit} caracteres",
        "string.pattern.base": "La contraseña debe contener al menos una letra y un número",
        "any.required": "La contraseña es obligatoria"
    })
});