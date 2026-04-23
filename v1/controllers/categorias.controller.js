import {
    obtenerCategoriasService,
    obtenerCategoriaPorIdService,
    actualizarCategoriaService,
    crearCategoriaService,
    eliminarCategoriaService,
    obtenerTotalesPorCategoriaService
} from "../services/categoria.service.js";

export const obtenerCategorias = async (req, res) => {
    const categoriasObtenidas = await obtenerCategoriasService(req.user.id);
    res.json({ message: "Categorias obtenidas", categorias: categoriasObtenidas });
}

export const obtenerTotalesPorCategoria = async (req, res) => {
    const { mes, anual } = req.query;
    const totales = await obtenerTotalesPorCategoriaService(req.user.id, mes, anual);
    res.json({ message: "Totales por categoria obtenidos", totales });
}

export const obtenerCategoriaPorId = async (req, res) => {
    const { id } = req.params;
    const categoriaObtenida = await obtenerCategoriaPorIdService(id);
    res.json({ message: `Categoria ${categoriaObtenida.id} obtenida con exito`, categoria: categoriaObtenida });
}

export const actualizarCategoria = async (req, res) => {
    const { id } = req.params;
    const categoriaActualizada = await actualizarCategoriaService(id, req.body);
    res.json({ message: `Categoria ${categoriaActualizada.id} actualizada exitosamente`, ...categoriaActualizada });
}

export const crearCategoria = async (req, res) => {
    const { categoria, existed } = await crearCategoriaService(req.body, req.user.id);
    const message = existed ? "Categoria ya existe" : "Categoria creada exitosamente";
    res.json({ message, categoria });
}

export const eliminarCategoria = async (req, res) => {
    const { id } = req.params;
    await eliminarCategoriaService(id);
    res.json({ message: `Categoria ${id} eliminada exitosamente` });
}