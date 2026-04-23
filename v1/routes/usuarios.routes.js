import express from "express";
import {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    obtenerUsuarioActual,
    actualizarUsuarioActual,
    obtenerBancosUsuario,
    obtenerCuentasUsuario,
    obtenerCategoriasUsuario,
    obtenerGastosUsuario
} from "../controllers/usurios.controller.js";

const router = express.Router({ mergeParams: true });

//Peticiones a /v1/usuarios
router.get("/", obtenerUsuarios)
router.get("/me", obtenerUsuarioActual)
router.patch("/me", actualizarUsuarioActual)
router.get("/me/bancos", obtenerBancosUsuario)
router.get("/me/cuentas", obtenerCuentasUsuario)
router.get("/me/categorias", obtenerCategoriasUsuario)
router.get("/me/gastos", obtenerGastosUsuario)
router.get("/:id", obtenerUsuarioPorId)
router.patch("/:id", actualizarUsuario)

export default router;