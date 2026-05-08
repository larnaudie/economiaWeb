export const errorMiddleware = (err, req, res, next) => {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === "production";

  console.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(status).json({
    success: false,
    message:
      isProduction && status === 500
        ? "Error interno del servidor"
        : err.message || "Error interno del servidor",
    details: isProduction ? null : err.details || null,
  });
};