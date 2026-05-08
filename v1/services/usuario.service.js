import Usuario from "../models/usuario.model.js";
import bcrypt from "bcryptjs";

const buildUsuarioActualSafeUpdate = (data) => {
    const datosPermitidos = {};

    if (data.username !== undefined) {
        datosPermitidos.username = data.username;
    }

    if (data.email !== undefined) {
        datosPermitidos.email = data.email;
    }

    if (data.password !== undefined) {
        datosPermitidos.password = bcrypt.hashSync(
            data.password,
            parseInt(process.env.ROUNDS) || 10
        );
    }

    return datosPermitidos;
};

const buildUsuarioAdminSafeUpdate = (data) => {
    const datosPermitidos = {};

    if (data.username !== undefined) {
        datosPermitidos.username = data.username;
    }

    if (data.email !== undefined) {
        datosPermitidos.email = data.email;
    }

    if (data.rol !== undefined) {
        datosPermitidos.rol = data.rol;
    }

    return datosPermitidos;
};

export const obtenerUsuariosService = async () => {
    const usuarios = await Usuario.find().select("-password").sort({ createdAt: -1 });
    return usuarios;
};

export const obtenerUsuarioActualService = async (usuarioId) => {
    const usuario = await Usuario.findById(usuarioId).select("-password");

    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }

    return usuario;
};

export const actualizarUsuarioActualService = async (usuarioId, data) => {
    const datosPermitidos = buildUsuarioActualSafeUpdate(data);

    if (Object.keys(datosPermitidos).length === 0) {
        throw new Error("No hay campos válidos para actualizar");
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
        usuarioId,
        datosPermitidos,
        {
            returnDocument: "after",
            runValidators: true
        }
    ).select("-password");

    if (!usuarioActualizado) {
        throw new Error("Usuario no encontrado");
    }

    return usuarioActualizado;
};

export const obtenerUsuarioPorIdService = async (id) => {
    const usuario = await Usuario.findById(id).select("-password");

    if (!usuario) {
        throw new Error("Usuario no encontrado");
    }

    return usuario;
};

export const actualizarUsuarioService = async (id, data) => {
    const datosPermitidos = buildUsuarioAdminSafeUpdate(data);

    if (Object.keys(datosPermitidos).length === 0) {
        throw new Error("No hay campos válidos para actualizar");
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
        id,
        datosPermitidos,
        {
            returnDocument: "after",
            runValidators: true
        }
    ).select("-password");

    if (!usuarioActualizado) {
        throw new Error("Usuario no encontrado");
    }

    return usuarioActualizado;
};

export const eliminarTodosLosUsuariosService = async () => {
    await Usuario.deleteMany({ rol: { $ne: "admin" } });
};