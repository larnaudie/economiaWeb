export const validateBody = schema => (req, res, next) => {
    const { value, error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            success: false,
            message: "Error en la validación",
            details: error.details
        });
    }
    //req.validatedBody = value;
    req.body = value; // Sobrescribimos el body con los datos validados y transformados
    next();
}
