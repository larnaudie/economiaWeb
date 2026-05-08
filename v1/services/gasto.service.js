import Gasto from "../models/gasto.model.js";
import Cuenta from "../models/cuenta.model.js";
import Categoria from "../models/categoria.model.js";
import { buildGastoBaseMatch } from "../utils/gastosFilters.js";
import {
  buildBulkCreateGastos,
  buildBulkUpdateGastos,
} from "../utils/gastosBulk.js";

function generarHashGasto({
  fecha,
  descripcion,
  flujoBancario,
  economiaReal,
  cuenta,
}) {
  const fechaNormalizada = new Date(fecha).toISOString().slice(0, 10);
  const descripcionNormalizada = String(descripcion || "")
    .trim()
    .toLowerCase();
  const flujo = Number(flujoBancario || 0).toFixed(2);
  const real = Number(economiaReal || 0).toFixed(2);
  const cuentaId = String(cuenta || "");

  return `${fechaNormalizada}|${descripcionNormalizada}|${flujo}|${real}|${cuentaId}`;
}

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
  realMax,
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
    realMax,
  });

  const pipeline = [{ $match: match }];
  pipeline.push(
    {
      $lookup: {
        from: "categorias",
        localField: "categoria",
        foreignField: "_id",
        as: "categoria",
      },
    },
    { $unwind: { path: "$categoria", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "categoriagrupos",
        localField: "categoria.categoriaGrupo",
        foreignField: "_id",
        as: "categoriaGrupo",
      },
    },
    { $unwind: { path: "$categoriaGrupo", preserveNullAndEmptyArrays: true } },

    {
      $addFields: {
        "categoria.categoriaGrupo": "$categoriaGrupo",
      },
    },
    {
      $project: {
        categoriaGrupo: 0,
      },
    },

    {
      $lookup: {
        from: "cuentas",
        localField: "cuenta",
        foreignField: "_id",
        as: "cuenta",
      },
    },
    { $unwind: { path: "$cuenta", preserveNullAndEmptyArrays: true } },

    { $sort: { ordenCuenta: 1, fecha: -1, _id: -1 } },
  );

  if (pagina) {
    const skip = (parseInt(pagina) - 1) * 20;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: 20 });
  }

  return await Gasto.aggregate(pipeline);
};

export const obtenerGastoPorIdService = async (id, usuarioId) => {
  const gasto = await Gasto.findOne({
    _id: id,
    usuario: usuarioId,
  });

  if (!gasto) {
    throw new Error("Gasto no encontrado");
  }

  return gasto;
};

export const actualizarGastoService = async ({ id, usuarioId, data }) => {
  const cuenta = await Cuenta.findOne({
    _id: data.cuenta,
    usuario: usuarioId,
  });

  if (!cuenta) {
    throw new Error("Cuenta no encontrada");
  }

  const categoria = await Categoria.findOne({
    _id: data.categoria,
    usuario: usuarioId,
  });

  if (!categoria) {
    throw new Error("Categoría no encontrada");
  }
  const gasto = await Gasto.findOne({ _id: id, usuario: usuarioId });

  if (!gasto) {
    throw new Error("Gasto no encontrado");
  }

  if (data.fecha !== undefined) gasto.fecha = data.fecha;
  if (data.descripcion !== undefined) gasto.descripcion = data.descripcion;
  if (data.flujoBancario !== undefined)
    gasto.flujoBancario = data.flujoBancario;
  if (data.economiaReal !== undefined) gasto.economiaReal = data.economiaReal;
  if (data.porcentajeEconomiaReal !== undefined)
    gasto.porcentajeEconomiaReal = data.porcentajeEconomiaReal;
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
    usuario: usuarioId,
  });

  if (!gastoEliminado) {
    throw new Error("Gasto no encontrado");
  }

  return gastoEliminado;
};

export const crearGastoService = async ({ usuarioId, data }) => {
  const cuenta = await Cuenta.findOne({
    _id: data.cuenta,
    usuario: usuarioId,
  });

  if (!cuenta) {
    throw new Error("Cuenta no encontrada");
  }

  const categoria = await Categoria.findOne({
    _id: data.categoria,
    usuario: usuarioId,
  });

  if (!categoria) {
    throw new Error("Categoría no encontrada");
  }
  const hashImportacion = generarHashGasto({
    fecha: data.fecha,
    descripcion: data.descripcion,
    flujoBancario: data.flujoBancario,
    economiaReal: data.economiaReal,
    cuenta: data.cuenta,
  });

  try {
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
      incluirEnGastoReal: data.incluirEnGastoReal ?? true,
      hashImportacion,
    });

    return nuevoGasto;
  } catch (error) {
    if (error.code === 11000) {
      const err = new Error("Este gasto ya existe para esta cuenta.");
      err.status = 409;
      throw err;
    }

    throw error;
  }
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
  realMax,
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
    realMax,
  );
};

export const crearGastosBulkService = async ({ usuarioId, gastos }) => {
  const cuenta = await Cuenta.findOne({
    _id: data.cuenta,
    usuario: usuarioId,
  });

  if (!cuenta) {
    throw new Error("Cuenta no encontrada");
  }

  const categoria = await Categoria.findOne({
    _id: data.categoria,
    usuario: usuarioId,
  });

  if (!categoria) {
    throw new Error("Categoría no encontrada");
  }
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error("No se recibieron gastos para crear");
  }

  const operaciones = buildBulkCreateGastos({ usuarioId, gastos });

  try {
    const resultado = await Gasto.bulkWrite(operaciones, {
      ordered: false,
    });

    return resultado;
  } catch (error) {
    if (
      error.code === 11000 ||
      error.writeErrors?.some((e) => e.code === 11000)
    ) {
      const err = new Error("Uno o más gastos ya existen para esta cuenta.");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

export const actualizarGastosBulkService = async ({ usuarioId, gastos }) => {
  const cuenta = await Cuenta.findOne({
    _id: data.cuenta,
    usuario: usuarioId,
  });

  if (!cuenta) {
    throw new Error("Cuenta no encontrada");
  }

  const categoria = await Categoria.findOne({
    _id: data.categoria,
    usuario: usuarioId,
  });

  if (!categoria) {
    throw new Error("Categoría no encontrada");
  }
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error("No se recibieron gastos para actualizar");
  }

  const operaciones = buildBulkUpdateGastos({ usuarioId, gastos });

  const resultado = await Gasto.bulkWrite(operaciones);

  return resultado;
};

export const actualizarOrdenGastosCuentaService = async ({
  usuarioId,
  gastos,
}) => {
  const cuenta = await Cuenta.findOne({
    _id: data.cuenta,
    usuario: usuarioId,
  });

  if (!cuenta) {
    throw new Error("Cuenta no encontrada");
  }

  const categoria = await Categoria.findOne({
    _id: data.categoria,
    usuario: usuarioId,
  });

  if (!categoria) {
    throw new Error("Categoría no encontrada");
  }
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error("No se recibieron gastos para ordenar");
  }

  const operaciones = gastos.map((gasto, index) => ({
    updateOne: {
      filter: {
        _id: gasto.id,
        usuario: usuarioId,
      },
      update: {
        $set: {
          ordenCuenta: index + 1,
        },
      },
    },
  }));

  return await Gasto.bulkWrite(operaciones);
};

export const eliminarTodosLosGastosService = async () => {
  await Gasto.deleteMany({ usuario: usuarioId });
};
