import Cuenta from "../models/cuenta.model.js";

export const obtenerCuentasService = async (usuarioId, banco) => {
    const filtro = { usuario: usuarioId };

    if (banco) {
        filtro.banco = banco;
    }

    const cuentas = await Cuenta.find(filtro).populate("banco");
    return cuentas;
}

export const obtenerCuentaPorIdService = async (id) => {
    const cuenta = await Cuenta.findById(id).populate("banco");
    return cuenta;
}

export const actualizarCuentaService = async (id, usuarioId, data) => {
    const cuentaActualizada = await Cuenta.findOneAndUpdate(
        { _id: id, usuario: usuarioId },
        data,
        { returnDocument: "after" }
    ).populate("banco");

    if (!cuentaActualizada) {
        throw new Error("Cuenta no encontrada");
    }

    return cuentaActualizada;
}

export const eliminarCuentaService = async (id, usuarioId) => {
    const cuentaEliminada = await Cuenta.findOneAndDelete({
        _id: id,
        usuario: usuarioId
    });

    if (!cuentaEliminada) {
        throw new Error("Cuenta no encontrada");
    }

    return cuentaEliminada;
}

export const crearCuentaService = async (data, usuarioId) => {
    const nuevaCuenta = new Cuenta({ ...data, usuario: usuarioId });
    await nuevaCuenta.save();
    const cuentaConBanco = await Cuenta.findById(nuevaCuenta._id).populate("banco");
    return cuentaConBanco;
}

export const obtenerCuentasPorUsuarioService = async (usuarioId) => {
    const cuentas = await Cuenta.find({ usuario: usuarioId }).populate("banco");
    return cuentas;
}

export const eliminarTodosLasCuentasService = async () => {
    await Cuenta.deleteMany({});
}