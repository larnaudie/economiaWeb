import express from "express";
import {
  crearCategoriaGrupo,
  obtenerCategoriasGrupo,
  actualizarCategoriaGrupo,
  eliminarCategoriaGrupo,
  eliminarTodosLasCategoriasGrupo
} from "../controllers/categoriaGrupo.controller.js";

import { authenticateToken } from "../middlewares/authenticate.middleware.js";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import { validateObjectId } from "../middlewares/validateObjectId.middleware.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/", crearCategoriaGrupo);
router.get("/", obtenerCategoriasGrupo);
router.delete("/eliminar-todo",requireAdmin, eliminarTodosLasCategoriasGrupo);
router.patch("/:id",validateObjectId, actualizarCategoriaGrupo);
router.delete("/:id",validateObjectId, eliminarCategoriaGrupo);

export default router;