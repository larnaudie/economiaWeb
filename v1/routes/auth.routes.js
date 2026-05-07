import express from "express";
import { registrarUsuario, loginUsuario } from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { validateBody } from "../middlewares/validateBody.middleware.js";
import { registrarUsuarioSchema, loginUsuarioSchema } from "../validators/auth.validators.js";
const router = express.Router({ mergeParams: true });

//Peticiones a /v1/auth
router.post("/register", authLimiter, validateBody(registrarUsuarioSchema), registrarUsuario)
router.post("/login", authLimiter, validateBody(loginUsuarioSchema), loginUsuario)

export default router;