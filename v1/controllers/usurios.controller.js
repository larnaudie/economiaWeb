import {
    obtenerUsuarioPorIdService,
    obtenerUsuariosService,
    actualizarUsuarioService,
    obtenerUsuarioActualService,
    actualizarUsuarioActualService
} from "../services/usuario.service.js";
import { obtenerBancosPorUsuarioService } from "../services/banco.service.js";
import { obtenerCuentasPorUsuarioService } from "../services/cuenta.service.js";
import { obtenerCategoriasPorUsuarioService } from "../services/categoria.service.js";
import { obtenerGastosPorUsuarioService } from "../services/gasto.service.js";
import { obtenerGastosService } from "../services/gasto.service.js";

export const obtenerUsuarios = async (req, res) => {
    const usuariosObtenidos = await obtenerUsuariosService();
    res.json({ message: "Usuarios obtenidos", usuarios: usuariosObtenidos });
}

export const obtenerUsuarioActual = async (req, res) => {
    const usuarioObtenido = await obtenerUsuarioActualService(req.user.id);
    const { password, ...usuarioSafe } = usuarioObtenido.toObject();
    res.json({ message: "Usuario obtenido", usuario: usuarioSafe });
}

export const actualizarUsuarioActual = async (req, res) => {
    const usuarioActualizado = await actualizarUsuarioActualService(req.user.id, req.body);
    const { password, ...usuarioSafe } = usuarioActualizado.toObject();
    res.json({ message: "Perfil actualizado exitosamente", usuario: usuarioSafe });
}

export const obtenerBancosUsuario = async (req, res) => {
    const bancos = await obtenerBancosPorUsuarioService(req.user.id);
    res.json({ message: "Bancos del usuario obtenidos", bancos });
}

export const obtenerCuentasUsuario = async (req, res) => {
    const cuentas = await obtenerCuentasPorUsuarioService(req.user.id);
    res.json({ message: "Cuentas del usuario obtenidas", cuentas });
}

export const obtenerCategoriasUsuario = async (req, res) => {
    const categorias = await obtenerCategoriasPorUsuarioService(req.user.id);
    res.json({ message: "Categorias del usuario obtenidas", categorias });
}

export const obtenerGastosUsuario = async (req, res) => {
  const { mes, pagina, fechaDesde, fechaHasta, categoria, cuenta } = req.query;

  const gastosObtenidos = await obtenerGastosService(
    req.user.id,
    mes,
    pagina,
    fechaDesde,
    fechaHasta,
    categoria,
    cuenta
  );

  res.json({ message: "Gastos obtenidos", gastos: gastosObtenidos });
};

export const obtenerUsuarioPorId = async (req, res) => {
    const { id } = req.params;
    const usuarioObtenido = await obtenerUsuarioPorIdService(id);
    const { password, ...usuarioSafe } = usuarioObtenido.toObject();
    res.json({ message: `Usuario ${usuarioObtenido.id} obtenido con exito`, usuario: usuarioSafe });
}

export const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const usuarioActualizado = await actualizarUsuarioService(id, req.body);
    const { password, ...usuarioSafe } = usuarioActualizado.toObject();
    res.json({ message: `Usuario ${usuarioActualizado.id} actualizado exitosamente`, usuario: usuarioSafe });
}