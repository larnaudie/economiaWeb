export const errorMiddleware = (err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Error interno del servidor",
        details: err.details || null
    });
}