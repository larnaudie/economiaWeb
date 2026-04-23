import {
    obtenerCuentasService,
    obtenerCuentaPorIdService,
    actualizarCuentaService,
    crearCuentaService,
    eliminarCuentaService,
} from "../services/cuenta.service.js";

export const obtenerCuentas = async (req, res) => {
    const { banco } = req.query;
    const cuentasObtenidas = await obtenerCuentasService(req.user.id, banco);
    res.json({ message: "Cuentas obtenidas", cuentas: cuentasObtenidas });
}

export const obtenerCuentaPorId = async (req, res) => {
    const { id } = req.params;
    const cuentaObtenida = await obtenerCuentaPorIdService(id);
    res.json({ message: `Cuenta ${cuentaObtenida.id} obtenida con exito`, cuenta: cuentaObtenida });
}

export const actualizarCuenta = async (req, res) => {
    const { id } = req.params;
    const cuentaActualizada = await actualizarCuentaService(id, req.body);
    res.json({ message: `Cuenta ${cuentaActualizada.id} actualizada exitosamente`, ...cuentaActualizada });
}

export const crearCuenta = async (req, res) => {
    const nuevaCuenta = await crearCuentaService(req.body, req.user.id);
    res.json({ message: "Cuenta creada exitosamente", cuenta: nuevaCuenta });
}

export const eliminarCuenta = async (req, res) => {
    const { id } = req.params;
    const cuentaEliminada = await eliminarCuentaService(id);
    res.json({ message: `Cuenta ${cuentaEliminada.id} eliminada exitosamente`, cuenta: cuentaEliminada });
};