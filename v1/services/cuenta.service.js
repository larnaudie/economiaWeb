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

export const actualizarCuentaService = async (id, data) => {
    const cuentaActualizada = await Cuenta.findByIdAndUpdate(id, data, { returnDocument: "after" }).populate("banco");
    return cuentaActualizada;
}

export const eliminarCuentaService = async (id) => {
    const cuentaEliminada = await Cuenta.findByIdAndDelete(id);
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