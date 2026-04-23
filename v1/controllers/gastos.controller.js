import {
    obtenerGastosService,
    obtenerGastoPorIdService,
    actualizarGastoService,
    eliminarGastoService,
    crearGastoService
} from "../services/gasto.service.js";

export const obtenerGastos = async (req, res) => {
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

export const obtenerGastoPorId = async (req, res) => {
    const { id } = req.params;
    const gastoObtenido = await obtenerGastoPorIdService(id);
    res.json({ message: `Gasto ${gastoObtenido.id} obtenido con exito`, gasto: gastoObtenido });
}

export const actualizarGasto = async (req, res) => {
    const { id } = req.params;
    const {
        fecha,
        descripcion,
        flujoBancario,
        economiaReal,
        porcentajeEconomiaReal,
        categoria,
        cuenta,
        incluirEnGastoBancario,
        incluirEnGastoReal
    } = req.body;

    const gastoActualizado = await actualizarGastoService(
        id,
        req.user.id,
        fecha,
        descripcion,
        flujoBancario,
        economiaReal,
        porcentajeEconomiaReal,
        categoria,
        cuenta,
        incluirEnGastoBancario,
        incluirEnGastoReal
    );

    res.json({ message: "Gasto actualizado", gasto: gastoActualizado });
};

export const crearGasto = async (req, res) => {
    const {
        fecha,
        descripcion,
        flujoBancario,
        economiaReal,
        porcentajeEconomiaReal,
        categoria,
        cuenta,
        incluirEnGastoBancario,
        incluirEnGastoReal
    } = req.body;

    const gastoCreado = await crearGastoService(
        req.user.id,
        fecha,
        descripcion,
        flujoBancario,
        economiaReal,
        porcentajeEconomiaReal,
        categoria,
        cuenta,
        incluirEnGastoBancario,
        incluirEnGastoReal
    );

    res.status(201).json({ message: "Gasto creado", gasto: gastoCreado });
};
export const eliminarGasto = async (req, res) => {
    const { id } = req.params;
    const gastoEliminado = await eliminarGastoService(id);
    res.json({
        message: `Gasto ${gastoEliminado.id} eliminado exitosamente`,
        gasto: gastoEliminado
    });
};