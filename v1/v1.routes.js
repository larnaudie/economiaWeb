import express from 'express';
import {authenticateToken} from './middlewares/authenticate.middleware.js';
import authRouter from "./routes/auth.routes.js";
import bancosRouter from "./routes/bancos.routes.js";
import usuariosRouter from "./routes/usuarios.routes.js";
import cuentasRouter from "./routes/cuentas.routes.js";
import gastosRouter from "./routes/gastos.routes.js";
import categoriaRouter from "./routes/categorias.routes.js";
import deudasRoutes from "./routes/deudas.routes.js";
import categoriasGrupoRoutes from "./routes/categoriaGrupo.routes.js"

const router = express.Router({ mergeParams: true });

//rutas desprotegidas
router.use("/auth", authRouter);

router.use(authenticateToken);

//rutas protegidas

router.use("/bancos", bancosRouter);
router.use("/usuarios", usuariosRouter);
router.use("/cuentas", cuentasRouter);
router.use("/gastos", gastosRouter);
router.use("/categorias", categoriaRouter);
router.use("/deudas", deudasRoutes);
router.use("/categorias-grupo", categoriasGrupoRoutes);

export default router; 
