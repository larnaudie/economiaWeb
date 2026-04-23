import mongoose from "mongoose";
import Categoria from "../models/categoria.model.js";
import Gasto from "../models/gasto.model.js";

export const obtenerTotalesPorCategoriaService = async (usuarioId, mes, anual) => {
    const pipeline = [
        {
            $match: {
                usuario: mongoose.Types.ObjectId(usuarioId)
            }
        },
        {
            $lookup: {
                from: "gastos",
                localField: "_id",
                foreignField: "categoria",
                as: "gastos"
            }
        },
        { $unwind: "$gastos" }
    ];
    if (mes) {
        const mesNum = parseInt(mes);
        const year = new Date().getFullYear();
        pipeline.push({
            $match: {
                $expr: {
                    $and: [
                        { $eq: [{ $month: "$gastos.fecha" }, mesNum] },
                        { $eq: [{ $year: "$gastos.fecha" }, year] }
                    ]
                }
            }
        });
    } else if (anual) {
        const year = parseInt(anual);
        pipeline.push({
            $match: {
                $expr: { $eq: [{ $year: "$gastos.fecha" }, year] }
            }
        });
    }
    pipeline.push(
        {
            $group: {
                _id: "$_id",
                nombre: { $first: "$nombre" },
                total: { $sum: "$gastos.economiaReal" }  // o flujoBancario, según prefieras
            }
        }
    );
    const totales = await Categoria.aggregate(pipeline);
    return totales;
}

export const obtenerCategoriasService = async (usuarioId) => {
    const categorias = await Categoria.find({ usuario: usuarioId });
    return categorias;
}

export const obtenerCategoriaPorIdService = async (id) => {
    const categoria = await Categoria.findById(id);
    return categoria;
}

export const actualizarCategoriaService = async (id, data) => {
    const categoriaActualizada = await Categoria.findByIdAndUpdate(id, data, { returnDocument: "after" });
    return categoriaActualizada;
}

export const eliminarCategoriaService = async (id) => {
    const categoriaEliminada = await Categoria.findByIdAndDelete(id);
    return categoriaEliminada;
}

export const crearCategoriaService = async (data, usuarioId) => {
    const categoriaExistente = await Categoria.findOne({
        usuario: usuarioId,
        nombre: { $regex: new RegExp(`^${data.nombre}$`, 'i') }
    });
    if (categoriaExistente) {
        return { categoria: categoriaExistente, existed: true };
    }
    const nuevaCategoria = new Categoria({ ...data, usuario: usuarioId });
    await nuevaCategoria.save();
    return { categoria: nuevaCategoria, existed: false };
}

export const obtenerCategoriasPorUsuarioService = async (usuarioId) => {
    const categorias = await Categoria.find({ usuario: usuarioId });
    return categorias;
}