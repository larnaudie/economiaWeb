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

router.get("/", obtenerCategoriasGrupo);
router.post("/", crearCategoriaGrupo);
router.patch("/:id", actualizarCategoriaGrupo);
router.delete("/:id", eliminarCategoriaGrupo);
router.delete("/eliminar-todo", eliminarTodosLasCategoriasGrupo);

export default router;