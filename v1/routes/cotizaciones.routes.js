import express from "express";
import { obtenerCotizaciones } from "../controllers/cotizaciones.controller.js";

const router = express.Router();

router.get("/", obtenerCotizaciones);

export default router;
