import express from "express";
import { authenticateToken } from "../middlewares/authenticate.middleware.js";
import { subirFotoPerfil } from "../controllers/upload.controller.js";

const router = express.Router();

router.post("/perfil", authenticateToken, subirFotoPerfil);

export default router;