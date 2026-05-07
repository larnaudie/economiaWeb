import express from "express";
import { requireAdmin } from "../middlewares/requireAdmin.middleware.js";
import {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    obtenerUsuarioActual,
    actualizarUsuarioActual,
    obtenerBancosUsuario,
    obtenerCuentasUsuario,
    obtenerCategoriasUsuario,
    obtenerGastosUsuario,
    eliminarTodosLosUsuarios
} from "../controllers/usuarios.controller.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/usuarios
router.get("/",requireAdmin, obtenerUsuarios)
router.get("/me", obtenerUsuarioActual)
router.patch("/me", actualizarUsuarioActual)
router.get("/me/bancos", obtenerBancosUsuario)
router.get("/me/cuentas", obtenerCuentasUsuario)
router.get("/me/categorias", obtenerCategoriasUsuario)
router.get("/me/gastos", obtenerGastosUsuario)
router.delete("/eliminar-todo",requireAdmin, eliminarTodosLosUsuarios)
router.get("/:id",requireAdmin, obtenerUsuarioPorId)
router.patch("/:id",requireAdmin, actualizarUsuario)

export default router;