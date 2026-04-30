import Usuario from "../models/usuario.model.js";

export const obtenerUsuariosService = async () => {
    const usuarios = await Usuario.find();
    return usuarios;
}

export const obtenerUsuarioActualService = async (usuarioId) => {
    const usuario = await Usuario.findById(usuarioId);
    return usuario;
}

export const actualizarUsuarioActualService = async (usuarioId, data) => {
    const usuarioActualizado = await Usuario.findByIdAndUpdate(usuarioId, data, { returnDocument: "after" });
    return usuarioActualizado;
}

export const obtenerUsuarioPorIdService = async (id) => {
    const usuario = await Usuario.findById(id);
    return usuario;
}

export const actualizarUsuarioService = async (id, data) => {
    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, data, { returnDocument: "after" });
    return usuarioActualizado;
}

export const eliminarTodosLosUsuariosService = async () => {
    await Usuario.deleteMany({});
}
