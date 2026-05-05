import express from "express";
import {
  crearCategoriaGrupo,
  obtenerCategoriasGrupo,
  actualizarCategoriaGrupo,
  eliminarCategoriaGrupo,
  eliminarTodosLasCategoriasGrupo
} from "../controllers/categoriaGrupo.controller.js";

import { authenticateToken } from "../middlewares/authenticate.middleware.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/", crearCategoriaGrupo);
router.get("/", obtenerCategoriasGrupo);
router.delete("/eliminar-todo", eliminarTodosLasCategoriasGrupo);
router.patch("/:id", actualizarCategoriaGrupo);
router.delete("/:id", eliminarCategoriaGrupo);

export default router;