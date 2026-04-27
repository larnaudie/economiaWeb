import mongoose from "mongoose";

export function buildUsuarioMatch(usuarioId) {
    return {
        usuario: new mongoose.Types.ObjectId(usuarioId)
    };
}

export function buildFechaMatch(mes, fechaDesde, fechaHasta) {
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
            fechaMatch.fecha.$gte = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        }

        if (fechaHasta) {
            const [year, month, day] = fechaHasta.split("-").map(Number);
            fechaMatch.fecha.$lte = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        }
    }

    return fechaMatch;
}

export function buildObjectIdMatch(field, value, errorMessage) {
    if (!value) return {};

    if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(errorMessage);
    }

    return {
        [field]: new mongoose.Types.ObjectId(value)
    };
}

export function buildBusquedaMatch(busqueda) {
    if (!busqueda || busqueda.trim() === "") return {};

    return {
        descripcion: {
            $regex: busqueda.trim(),
            $options: "i"
        }
    };
}

export function buildRangoGastoMatch({ flujoMin, flujoMax, realMin, realMax }) {
    const match = {};

    if (flujoMin !== undefined || flujoMax !== undefined) {
        match.flujoBancario = {};

        if (flujoMin !== undefined) {
            match.flujoBancario.$gte = Number(flujoMin);
        }

        if (flujoMax !== undefined) {
            match.flujoBancario.$lte = Number(flujoMax);
        }
    }

    if (realMin !== undefined || realMax !== undefined) {
        match.economiaReal = {};

        if (realMin !== undefined) {
            match.economiaReal.$gte = Number(realMin);
        }

        if (realMax !== undefined) {
            match.economiaReal.$lte = Number(realMax);
        }
    }

    return match;
}

export function buildGastoBaseMatch({
    usuarioId,
    mes,
    fechaDesde,
    fechaHasta,
    categoria,
    cuenta,
    busqueda,
    flujoMin,
    flujoMax,
    realMin,
    realMax
}) {
    return {
        ...buildUsuarioMatch(usuarioId),
        ...buildFechaMatch(mes, fechaDesde, fechaHasta),
        ...buildObjectIdMatch("categoria", categoria, "El id de categoría no es válido."),
        ...buildObjectIdMatch("cuenta", cuenta, "El id de cuenta no es válido."),
        ...buildBusquedaMatch(busqueda),
        ...buildRangoGastoMatch({ flujoMin, flujoMax, realMin, realMax })
    };
}