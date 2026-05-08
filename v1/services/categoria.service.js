import mongoose from "mongoose";
import Categoria from "../models/categoria.model.js";
import CategoriaGrupo from "../models/categoriaGrupo.model.js";
import Gasto from "../models/gasto.model.js";

export const obtenerTotalesPorCategoriaService = async (
  usuarioId,
  mes,
  anual,
) => {
  const pipeline = [
    {
      $match: {
        usuario: mongoose.Types.ObjectId(usuarioId),
      },
    },
    {
      $lookup: {
        from: "gastos",
        localField: "_id",
        foreignField: "categoria",
        as: "gastos",
      },
    },
    { $unwind: "$gastos" },
  ];
  if (mes) {
    const mesNum = parseInt(mes);
    const year = new Date().getFullYear();
    pipeline.push({
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $month: "$gastos.fecha" }, mesNum] },
            { $eq: [{ $year: "$gastos.fecha" }, year] },
          ],
        },
      },
    });
  } else if (anual) {
    const year = parseInt(anual);
    pipeline.push({
      $match: {
        $expr: { $eq: [{ $year: "$gastos.fecha" }, year] },
      },
    });
  }
  pipeline.push({
    $group: {
      _id: "$_id",
      nombre: { $first: "$nombre" },
      total: { $sum: "$gastos.economiaReal" }, // o flujoBancario, según prefieras
    },
  });
  const totales = await Categoria.aggregate(pipeline);
  return totales;
};

export const obtenerCategoriasService = async (usuarioId) => {
  const categorias = await Categoria.find({ usuario: usuarioId })
    .populate("categoriaGrupo", "nombre")
    .sort({ nombre: 1 });

  return categorias;
};

export const obtenerCategoriaPorIdService = async (id, usuarioId) => {
  const categoria = await Categoria.findOne({
    _id: id,
    usuario: usuarioId,
  }).populate("categoriaGrupo", "nombre");

  if (!categoria) {
    throw new Error("Categoría no encontrada");
  }

  return categoria;
};

export const actualizarCategoriaService = async (id, usuarioId, data) => {
  if (data.categoriaGrupo !== undefined) {
    const categoriaGrupo = await CategoriaGrupo.findOne({
      _id: data.categoriaGrupo,
      usuario: usuarioId,
    });

    if (!categoriaGrupo) {
      throw new Error("Categoría principal no encontrada");
    }
  }
  const updateData = {
    ...data,
    categoriaGrupo: data.categoriaGrupo || null,
  };

  const categoriaActualizada = await Categoria.findOneAndUpdate(
    { _id: id, usuario: usuarioId },
    updateData,
    { returnDocument: "after", runValidators: true },
  ).populate("categoriaGrupo", "nombre");

  if (!categoriaActualizada) {
    throw new Error("Categoría no encontrada");
  }

  return categoriaActualizada;
};

export const eliminarCategoriaService = async (id, usuarioId) => {
  const categoriaEliminada = await Categoria.findOneAndDelete({
    _id: id,
    usuario: usuarioId,
  });

  if (!categoriaEliminada) {
    throw new Error("Categoría no encontrada");
  }

  return categoriaEliminada;
};

export const crearCategoriaService = async (data, usuarioId) => {
  const categoriaExistente = await Categoria.findOne({
    usuario: usuarioId,
    nombre: { $regex: new RegExp(`^${data.nombre}$`, "i") },
  }).populate("categoriaGrupo", "nombre");

  if (categoriaExistente) {
    return { categoria: categoriaExistente, existed: true };
  }

  if (data.categoriaGrupo !== undefined) {
    const categoriaGrupo = await CategoriaGrupo.findOne({
      _id: data.categoriaGrupo,
      usuario: usuarioId,
    });

    if (!categoriaGrupo) {
      throw new Error("Categoría principal no encontrada");
    }
  }

  const nuevaCategoria = new Categoria({
    nombre: data.nombre,
    usuario: usuarioId,
    categoriaGrupo: data.categoriaGrupo || null,
  });

  await nuevaCategoria.save();

  await nuevaCategoria.populate("categoriaGrupo", "nombre");

  return { categoria: nuevaCategoria, existed: false };
};

export const obtenerCategoriasPorUsuarioService = async (usuarioId) => {
  const categorias = await Categoria.find({ usuario: usuarioId })
    .populate("categoriaGrupo", "nombre")
    .sort({ nombre: 1 });

  return categorias;
};

export const eliminarTodosLasCategoriasService = async () => {
  await Categoria.deleteMany({});
};
