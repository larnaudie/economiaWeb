import Banco from "../models/banco.model.js";

export const obtenerBancosService = async (usuarioId) => {
    const bancos = await Banco.find({ usuario: usuarioId });
    return bancos;
}

export const obtenerBancoPorIdService = async (id) => {
    const banco = await Banco.findById(id);
    return banco;
}

export const actualizarBancoService = async (id, usuarioId, data) => {
    const bancoActualizado = await Banco.findOneAndUpdate(
        { _id: id, usuario: usuarioId },
        data,
        { returnDocument: "after" }
    );

    if (!bancoActualizado) {
        throw new Error("Banco no encontrado");
    }

    return bancoActualizado;
}

export const eliminarBancoService = async (id, usuarioId) => {
    const bancoEliminado = await Banco.findOneAndDelete({
        _id: id,
        usuario: usuarioId
    });

    if (!bancoEliminado) {
        throw new Error("Banco no encontrado");
    }

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

export const eliminarTodosLosBancosService = async () => {
    await Banco.deleteMany({});
}