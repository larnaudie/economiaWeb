import Gasto from "../models/gasto.model.js";
import Cuenta from "../models/cuenta.model.js";
import Categoria from "../models/categoria.model.js";
import MovimientoTarjeta from "../models/movimientoTarjeta.model.js";
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

function generarHashPendiente() {
  return `pendiente|${Date.now()}|${Math.random().toString(36).slice(2)}`;
}

function normalizarCampoOpcional(value) {
  return value === "" ? null : value;
}

function gastoRequiereCategoria(gasto) {
  return gasto.incluirEnGastoBancario !== false || gasto.incluirEnGastoReal !== false;
}

function obtenerCamposRequeridosParaGastoCreado(gasto) {
  const requiredFields = [
    "fecha",
    "descripcion",
    "flujoBancario",
    "economiaReal",
    "porcentajeEconomiaReal",
    "cuenta",
  ];

  if (gastoRequiereCategoria(gasto)) {
    requiredFields.push("categoria");
  }

  return requiredFields;
}

function validarGastoCreado(gasto) {
  const requiredFields = obtenerCamposRequeridosParaGastoCreado(gasto);

  const missingField = requiredFields.find((field) => {
    const value = gasto[field];
    return value === undefined || value === null || value === "";
  });

  if (missingField) {
    const error = new Error("Para marcar el gasto como creado faltan datos obligatorios.");
    error.status = 400;
    throw error;
  }
}

function inferirEstadoGasto(gasto) {
  const requiredFields = obtenerCamposRequeridosParaGastoCreado(gasto);

  const completo = requiredFields.every((field) => {
    const value = gasto[field];
    return value !== undefined && value !== null && value !== "";
  });

  return completo ? "creado" : "pendiente";
}

async function validarCuentaYCategoria({ usuarioId, cuenta, categoria }) {
  if (cuenta) {
    const cuentaEncontrada = await Cuenta.findOne({
      _id: cuenta,
      usuario: usuarioId,
    });

    if (!cuentaEncontrada) {
      throw new Error("Cuenta no encontrada");
    }
  }

  if (categoria) {
    const categoriaEncontrada = await Categoria.findOne({
      _id: categoria,
      usuario: usuarioId,
    });

    if (!categoriaEncontrada) {
      throw new Error("Categoria no encontrada");
    }
  }

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
  estado,
  flujoMin,
  flujoMax,
  realMin,
  realMax,
  limite,
  incluirMeta = false,
) => {
  const match = buildGastoBaseMatch({
    usuarioId,
    mes,
    fechaDesde,
    fechaHasta,
    categoria,
    cuenta,
    busqueda,
    estado,
    flujoMin,
    flujoMax,
    realMin,
    realMax,
  });

  const lookups = [
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
  ];

  const pipeline = [{ $match: match }, ...lookups];

  if (pagina) {
    const pageNumber = Math.max(1, parseInt(pagina, 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(limite, 10) || 20));
    const skip = (pageNumber - 1) * pageSize;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: pageSize });

    if (incluirMeta) {
      const [items, total] = await Promise.all([
        Gasto.aggregate(pipeline),
        Gasto.countDocuments(match),
      ]);

      return {
        items,
        total,
        pagina: pageNumber,
        limite: pageSize,
        totalPaginas: Math.max(1, Math.ceil(total / pageSize)),
      };
    }
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
  const gasto = await Gasto.findOne({ _id: id, usuario: usuarioId });

  if (!gasto) {
    throw new Error("Gasto no encontrado");
  }

  const nextCuenta =
    data.cuenta !== undefined ? normalizarCampoOpcional(data.cuenta) : gasto.cuenta;
  const nextCategoria =
    data.categoria !== undefined
      ? normalizarCampoOpcional(data.categoria)
      : gasto.categoria;
  await validarCuentaYCategoria({
    usuarioId,
    cuenta: nextCuenta,
    categoria: nextCategoria,
  });

  if (data.fecha !== undefined) gasto.fecha = data.fecha;
  if (data.descripcion !== undefined) gasto.descripcion = data.descripcion;
  if (data.flujoBancario !== undefined)
    gasto.flujoBancario = data.flujoBancario;
  if (data.economiaReal !== undefined) gasto.economiaReal = data.economiaReal;
  if (data.porcentajeEconomiaReal !== undefined)
    gasto.porcentajeEconomiaReal = data.porcentajeEconomiaReal;
  if (data.categoria !== undefined)
    gasto.categoria = normalizarCampoOpcional(data.categoria);
  if (data.cuenta !== undefined) gasto.cuenta = normalizarCampoOpcional(data.cuenta);
  if (data.facturaUrl !== undefined) gasto.facturaUrl = data.facturaUrl;
  if (data.facturaPublicId !== undefined) gasto.facturaPublicId = data.facturaPublicId;

  if (data.incluirEnGastoBancario !== undefined) {
    gasto.incluirEnGastoBancario = data.incluirEnGastoBancario;
  }

  if (data.incluirEnGastoReal !== undefined) {
    gasto.incluirEnGastoReal = data.incluirEnGastoReal;
  }

  gasto.estado = inferirEstadoGasto(gasto);

  if (gasto.estado === "creado") {
    validarGastoCreado(gasto);
    gasto.hashImportacion = generarHashGasto({
      fecha: gasto.fecha,
      descripcion: gasto.descripcion,
      flujoBancario: gasto.flujoBancario,
      economiaReal: gasto.economiaReal,
      cuenta: gasto.cuenta,
    });
  }

  await gasto.save();
  return gasto;
};

export const actualizarFacturaGastoService = async ({
  id,
  usuarioId,
  facturaUrl,
  facturaPublicId,
}) => {
  const gasto = await Gasto.findOne({ _id: id, usuario: usuarioId });

  if (!gasto) {
    throw new Error("Gasto no encontrado");
  }

  gasto.facturaUrl = facturaUrl;
  gasto.facturaPublicId = facturaPublicId || "";
  await gasto.save();

  return gasto;
};

export const eliminarGastoService = async (id, usuarioId, options = {}) => {
  const gastoEliminado = await Gasto.findOneAndDelete({
    _id: id,
    usuario: usuarioId,
  });

  if (!gastoEliminado) {
    throw new Error("Gasto no encontrado");
  }

  if (gastoEliminado.movimientoTarjeta) {
    if (options.eliminarMovimientoTarjeta) {
      await MovimientoTarjeta.deleteOne({
        _id: gastoEliminado.movimientoTarjeta,
        usuario: usuarioId,
      });
      await Gasto.deleteMany({
        _id: { $ne: gastoEliminado._id },
        usuario: usuarioId,
        movimientoTarjeta: gastoEliminado.movimientoTarjeta,
      });
    } else {
      await MovimientoTarjeta.updateOne(
        {
          _id: gastoEliminado.movimientoTarjeta,
          usuario: usuarioId,
          gastoGenerado: gastoEliminado._id,
        },
        { $set: { gastoGenerado: null } },
      );
    }
  }

  return gastoEliminado;
};

export const crearGastoService = async ({ usuarioId, data }) => {
  const fecha = data.fecha || new Date();
  const cuenta = normalizarCampoOpcional(data.cuenta);
  const categoria = normalizarCampoOpcional(data.categoria);

  await validarCuentaYCategoria({ usuarioId, cuenta, categoria });

  const gastoData = {
    usuario: usuarioId,
    fecha,
    descripcion: data.descripcion,
    flujoBancario: data.flujoBancario ?? null,
    economiaReal: data.economiaReal ?? null,
    porcentajeEconomiaReal: data.porcentajeEconomiaReal ?? null,
    categoria,
    cuenta,
    incluirEnGastoBancario: data.incluirEnGastoBancario ?? true,
    incluirEnGastoReal: data.incluirEnGastoReal ?? true,
    facturaUrl: data.facturaUrl || "",
    facturaPublicId: data.facturaPublicId || "",
    origen: data.origen || "manual",
    tarjetaCredito: data.tarjetaCredito || null,
    movimientoTarjeta: data.movimientoTarjeta || null,
  };

  gastoData.estado = inferirEstadoGasto(gastoData);

  if (gastoData.estado === "creado") {
    validarGastoCreado(gastoData);
    gastoData.hashImportacion = generarHashGasto({
      fecha,
      descripcion: data.descripcion,
      flujoBancario: data.flujoBancario,
      economiaReal: data.economiaReal,
      cuenta,
    });
  } else {
    gastoData.hashImportacion = data.hashImportacion || generarHashPendiente();
  }

  try {
    return await Gasto.create(gastoData);
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
  estado,
  flujoMin,
  flujoMax,
  realMin,
  realMax,
  limite,
  incluirMeta,
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
    estado,
    flujoMin,
    flujoMax,
    realMin,
    realMax,
    limite,
    incluirMeta,
  );
};

export const crearGastosBulkService = async ({ usuarioId, gastos }) => {
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error("No se recibieron gastos para crear");
  }

  for (const gasto of gastos) {
    await validarCuentaYCategoria({
      usuarioId,
      cuenta: gasto.cuenta,
      categoria: gasto.categoria,
    });
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
      const err = new Error("Uno o mas gastos ya existen para esta cuenta.");
      err.status = 409;
      throw err;
    }

    throw error;
  }
};

export const actualizarGastosBulkService = async ({ usuarioId, gastos }) => {
  if (!Array.isArray(gastos) || gastos.length === 0) {
    throw new Error("No se recibieron gastos para actualizar");
  }

  for (const gasto of gastos) {
    if (gasto.cuenta !== undefined || gasto.categoria !== undefined) {
      await validarCuentaYCategoria({
        usuarioId,
        cuenta: gasto.cuenta,
        categoria: gasto.categoria,
      });
    }
  }

  const operaciones = buildBulkUpdateGastos({ usuarioId, gastos });

  const resultado = await Gasto.bulkWrite(operaciones);

  return resultado;
};

export const actualizarOrdenGastosCuentaService = async ({
  usuarioId,
  gastos,
}) => {
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
  await Gasto.deleteMany({});
};
