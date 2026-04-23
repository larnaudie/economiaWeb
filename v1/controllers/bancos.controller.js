import {
    obtenerBancosService,
    obtenerBancoPorIdService,
    actualizarBancoService,
    crearBancoService,
    eliminarBancoService
} from "../services/banco.service.js";

export const obtenerBancos = async (req, res) => {
    const bancosObtenidos = await obtenerBancosService(req.user.id);
    res.json({ message: "Bancos obtenidos", bancos: bancosObtenidos });
}

export const obtenerBancoPorId = async (req, res) => {
    const { id } = req.params;
    const bancoObtenido = await obtenerBancoPorIdService(id);
    res.json({ message: `Banco ${bancoObtenido.id} obtenido con exito`, banco: bancoObtenido });
}

export const actualizarBanco = async (req, res) => {
    const { id } = req.params;
    const bancoActualizado = await actualizarBancoService(id, req.body);
    res.json({ message: `Banco ${bancoActualizado.id} actualizado exitosamente`, ...bancoActualizado });
}

export const crearBanco = async (req, res) => {
    const nuevoBanco = await crearBancoService(req.body, req.user.id);
    res.json({ message: "Banco creado exitosamente", banco: nuevoBanco });
}

export const eliminarBanco = async (req, res) => {
    const { id } = req.params;
    const bancoEliminado = await eliminarBancoService(id);
    res.json({ message: `Banco ${bancoEliminado.id} eliminado exitosamente`, banco: bancoEliminado });
};