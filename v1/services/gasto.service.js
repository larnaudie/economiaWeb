import mongoose from "mongoose";
import Gasto from "../models/gasto.model.js";

function buildFechaMatch(mes, fechaDesde, fechaHasta) {
    const fechaMatch = {};

    if (mes && mes !== "todos") {
        const mesNum = parseInt(mes);
        const year = new Date().getUTCFullYear();

        fechaMatch.$expr = {
            $and: [
                { $eq: [{ $month: "$fecha" }, mesNum] },
                { $eq: [{ $year: "$fecha" }, year] }
            ]
        };
    }

    if (fechaDesde || fechaHasta) {
        fechaMatch.fecha = {};

        if (fechaDesde) {
            const [year, month, day] = fechaDesde.split("-").map(Number);
            const desde = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            fechaMatch.fecha.$gte = desde;
        }

        if (fechaHasta) {
            const [year, month, day] = fechaHasta.split("-").map(Number);
            const hasta = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
            fechaMatch.fecha.$lte = hasta;
        }
    }

    return fechaMatch;
}

export const obtenerGastosService = async (
    usuarioId,
    mes,
    pagina,
    fechaDesde,
    fechaHasta,
    categoria,
    cuenta
) => {
    const pipeline = [
        {
            $match: {
                usuario: new mongoose.Types.ObjectId(usuarioId)
            }
        }
    ];

    const fechaMatch = buildFechaMatch(mes, fechaDesde, fechaHasta);
    if (Object.keys(fechaMatch).length > 0) {
        pipeline.push({ $match: fechaMatch });
    }

    const categoriaMatch = buildCategoriaMatch(categoria);
    if (Object.keys(categoriaMatch).length > 0) {
        pipeline.push({ $match: categoriaMatch });
    }

    const cuentaMatch = buildCuentaMatch(cuenta);
    if (Object.keys(cuentaMatch).length > 0) {
        pipeline.push({ $match: cuentaMatch });
    }
    pipeline.push(
        {
            $lookup: {
                from: "categorias",
                localField: "categoria",
                foreignField: "_id",
                as: "categoria"
            }
        },
        {
            $lookup: {
                from: "cuentas",
                localField: "cuenta",
                foreignField: "_id",
                as: "cuenta"
            }
        },
        { $unwind: { path: "$categoria", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$cuenta", preserveNullAndEmptyArrays: true } },
        { $sort: { fecha: -1 } }
    );

    const skip = pagina ? (parseInt(pagina) - 1) * 20 : 0;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: 20 });

    return await Gasto.aggregate(pipeline);
};

export const obtenerGastoPorIdService = async (id) => {
    const gasto = await Gasto.findById(id);
    return gasto;
};

export const actualizarGastoService = async (id, data) => {
    const flujoBancario = Number(data.flujoBancario);
    const porcentajeEconomiaReal = Number(data.porcentajeEconomiaReal);
    const economiaRealIngresada = Number(data.economiaReal);

    let economiaFinal = 0;
    let porcentajeFinal = porcentajeEconomiaReal;

    if (flujoBancario === 0) {
        economiaFinal = Number.isNaN(economiaRealIngresada) ? 0 : economiaRealIngresada;
        porcentajeFinal = 0;
    } else {
        economiaFinal = Number((flujoBancario * (porcentajeEconomiaReal / 100)).toFixed(2));
    }

    const dataActualizada = {
        ...data,
        flujoBancario,
        porcentajeEconomiaReal: porcentajeFinal,
        economiaReal: economiaFinal
    };

    const gastoActualizado = await Gasto.findByIdAndUpdate(id, dataActualizada, { returnDocument: "after" });
    return gastoActualizado;
};

export const eliminarGastoService = async (id) => {
    const gastoEliminado = await Gasto.findByIdAndDelete(id);
    return gastoEliminado;
};

export const crearGastoService = async (data, usuarioId) => {
    const flujoBancario = Number(data.flujoBancario);
    const porcentajeEconomiaReal = Number(data.porcentajeEconomiaReal);
    const economiaRealIngresada = Number(data.economiaReal);

    let economiaFinal = 0;
    let porcentajeFinal = porcentajeEconomiaReal;

    if (flujoBancario === 0) {
        economiaFinal = Number.isNaN(economiaRealIngresada) ? 0 : economiaRealIngresada;
        porcentajeFinal = 0;
    } else {
        economiaFinal = Number((flujoBancario * (porcentajeEconomiaReal / 100)).toFixed(2));
    }

    const nuevoGasto = new Gasto({
        ...data,
        flujoBancario,
        porcentajeEconomiaReal: porcentajeFinal,
        economiaReal: economiaFinal,
        usuario: usuarioId
    });

    await nuevoGasto.save();
    return nuevoGasto;
};

export const obtenerGastosPorUsuarioService = async (usuarioId, mes, pagina, fechaDesde, fechaHasta, categoria, cuenta) => {
    const pipeline = [
        {
            $match: {
                usuario: new mongoose.Types.ObjectId(usuarioId)
            }
        }
    ];

    const fechaMatch = buildFechaMatch(mes, fechaDesde, fechaHasta);
    if (Object.keys(fechaMatch).length > 0) {
        pipeline.push({ $match: fechaMatch });
    }

    const categoriaMatch = buildCategoriaMatch(categoria);
    if (Object.keys(categoriaMatch).length > 0) {
        pipeline.push({ $match: categoriaMatch });
    }

    const cuentaMatch = buildCuentaMatch(cuenta);
    if (Object.keys(cuentaMatch).length > 0) {
        pipeline.push({ $match: cuentaMatch });
    }

    pipeline.push(
        {
            $lookup: {
                from: "categorias",
                localField: "categoria",
                foreignField: "_id",
                as: "categoria"
            }
        },
        {
            $lookup: {
                from: "cuentas",
                localField: "cuenta",
                foreignField: "_id",
                as: "cuenta"
            }
        },
        { $unwind: { path: "$categoria", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$cuenta", preserveNullAndEmptyArrays: true } },
        { $sort: { fecha: -1 } }
    );

    const skip = pagina ? (parseInt(pagina) - 1) * 20 : 0;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: 20 });

    return await Gasto.aggregate(pipeline);
};

function parseFechaSoloDia(fechaStr) {
    if (!fechaStr) return fechaStr;

    if (fechaStr instanceof Date) return fechaStr;

    if (typeof fechaStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
        const [year, month, day] = fechaStr.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    }

    return new Date(fechaStr);
}

function resolverEconomiaReal(flujoBancarioRaw, porcentajeRaw, economiaRealRaw) {
    const flujoBancario = Number(flujoBancarioRaw);
    const porcentajeEconomiaReal = Number(porcentajeRaw);
    const economiaRealIngresada = Number(economiaRealRaw);

    if (flujoBancario === 0) {
        return {
            flujoBancario,
            porcentajeEconomiaReal: 0,
            economiaReal: Number.isNaN(economiaRealIngresada) ? 0 : economiaRealIngresada
        };
    }

    return {
        flujoBancario,
        porcentajeEconomiaReal,
        economiaReal: Number((flujoBancario * (porcentajeEconomiaReal / 100)).toFixed(2))
    };
}

function buildCategoriaMatch(categoria) {
    const match = {};

    if (categoria) {
        if (!mongoose.Types.ObjectId.isValid(categoria)) {
            throw new Error("El id de categoría no es válido.");
        }

        match.categoria = new mongoose.Types.ObjectId(categoria);
    }

    return match;
}

function buildCuentaMatch(cuenta) {
    const match = {};

    if (cuenta) {
        if (!mongoose.Types.ObjectId.isValid(cuenta)) {
            throw new Error("El id de cuenta no es válido.");
        }

        match.cuenta = new mongoose.Types.ObjectId(cuenta);
    }

    return match;
}