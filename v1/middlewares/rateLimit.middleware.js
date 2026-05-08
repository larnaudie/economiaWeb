import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Demasiados intentos de autenticación. Intenta más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});