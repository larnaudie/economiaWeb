import Banco from "../models/banco.model.js";

export const obtenerBancosService = async (usuarioId) => {
    const bancos = await Banco.find({ usuario: usuarioId });
    return bancos;
}

export const obtenerBancoPorIdService = async (id) => {
    const banco = await Banco.findById(id);
    return banco;
}

export const actualizarBancoService = async (id, data) => {
    const bancoActualizado = await Banco.findByIdAndUpdate(id, data, { returnDocument: "after" });
    return bancoActualizado;
}

export const eliminarBancoService = async (id) => {
    const bancoEliminado = await Banco.findByIdAndDelete(id);
    return bancoEliminado;
}

export const crearBancoService = async (data, usuarioId) => {
    const nuevoBanco = new Banco({ ...data, usuario: usuarioId });
    await nuevoBanco.save();
    return nuevoBanco;
}

export const obtenerBancosPorUsuarioService = async (usuarioId) => {
    const bancos = await Banco.find({ usuario: usuarioId });
    return bancos;
}