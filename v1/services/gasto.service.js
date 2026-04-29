import Gasto from "../models/gasto.model.js";
import { buildGastoBaseMatch } from "../utils/gastosFilters.js";
import { buildBulkCreateGastos, buildBulkUpdateGastos } from "../utils/gastosBulk.js";

export const obtenerGastosService = async (
    usuarioId,
    mes,
    pagina,
    fechaDesde,
    fechaHasta,
    categoria,
    cuenta,
    busqueda,
    flujoMin,
    flujoMax,
    realMin,
    realMax
) => {
    const match = buildGastoBaseMatch({
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
    });

    const pipeline = [
        { $match: match }
    ];
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

export const actualizarGastoService = async ({ id, usuarioId, data }) => {
  const gasto = await Gasto.findOne({ _id: id, usuario: usuarioId });

  if (!gasto) {
    throw new Error("Gasto no encontrado");
  }

  if (data.fecha !== undefined) gasto.fecha = data.fecha;
  if (data.descripcion !== undefined) gasto.descripcion = data.descripcion;
  if (data.flujoBancario !== undefined) gasto.flujoBancario = data.flujoBancario;
  if (data.economiaReal !== undefined) gasto.economiaReal = data.economiaReal;
  if (data.porcentajeEconomiaReal !== undefined) gasto.porcentajeEconomiaReal = data.porcentajeEconomiaReal;
  if (data.categoria !== undefined) gasto.categoria = data.categoria;
  if (data.cuenta !== undefined) gasto.cuenta = data.cuenta;

  if (data.incluirEnGastoBancario !== undefined) {
    gasto.incluirEnGastoBancario = data.incluirEnGastoBancario;
  }

  if (data.incluirEnGastoReal !== undefined) {
    gasto.incluirEnGastoReal = data.incluirEnGastoReal;
  }

  await gasto.save();
  return gasto;
};

export const eliminarGastoService = async (id, usuarioId) => {
    const gastoEliminado = await Gasto.findOneAndDelete({
        _id: id,
        usuario: usuarioId
    });

    if (!gastoEliminado) {
        throw new Error("Gasto no encontrado");
    }

    return gastoEliminado;
};

export const crearGastoService = async ({ usuarioId, data }) => {
    const nuevoGasto = await Gasto.create({
        usuario: usuarioId,
        fecha: data.fecha,
        descripcion: data.descripcion,
        flujoBancario: data.flujoBancario,
        economiaReal: data.economiaReal,
        porcentajeEconomiaReal: data.porcentajeEconomiaReal,
        categoria: data.categoria,
        cuenta: data.cuenta,
        incluirEnGastoBancario: data.incluirEnGastoBancario ?? true,
        incluirEnGastoReal: data.incluirEnGastoReal ?? true
    });

    return nuevoGasto;
};

export const obtenerGastosPorUsuarioService = async (
    usuarioId,
    mes,
    pagina,
    fechaDesde,
    fechaHasta,
    categoria,
    cuenta,
    busqueda,
    flujoMin,
    flujoMax,
    realMin,
    realMax
) => {
    return obtenerGastosService(
        usuarioId,
        mes,
        pagina,
        fechaDesde,
        fechaHasta,
        categoria,
        cuenta,
        busqueda,
        flujoMin,
        flujoMax,
        realMin,
        realMax
    );
};

export const crearGastosBulkService = async ({ usuarioId, gastos }) => {
    if (!Array.isArray(gastos) || gastos.length === 0) {
        throw new Error("No se recibieron gastos para crear");
    }

    const operaciones = buildBulkCreateGastos({ usuarioId, gastos });

    const resultado = await Gasto.bulkWrite(operaciones);

    return resultado;
};

export const actualizarGastosBulkService = async ({ usuarioId, gastos }) => {
    if (!Array.isArray(gastos) || gastos.length === 0) {
        throw new Error("No se recibieron gastos para actualizar");
    }

    const operaciones = buildBulkUpdateGastos({ usuarioId, gastos });

    const resultado = await Gasto.bulkWrite(operaciones);

    return resultado;
};

export const eliminarTodosLosGastosService = async () => {
    await Gasto.deleteMany({});
}