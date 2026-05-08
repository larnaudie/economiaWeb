import CategoriaGrupo from "../models/categoriaGrupo.model.js";

export async function crearCategoriaGrupoService(data, usuarioId) {
  return await CategoriaGrupo.create({
    nombre: data.nombre,
    usuario: usuarioId
  });
}

export async function obtenerCategoriasGrupoService(usuarioId) {
  return await CategoriaGrupo.find({ usuario: usuarioId }).sort({ nombre: 1 });
}

export async function actualizarCategoriaGrupoService(id, data, usuarioId) {
  const categoriaGrupo = await CategoriaGrupo.findOneAndUpdate(
    { _id: id, usuario: usuarioId },
    { nombre: data.nombre },
    { new: true, runValidators: true }
  );

  if (!categoriaGrupo) {
    const error = new Error("Categoría principal no encontrada");
    error.status = 404;
    throw error;
  }

  return categoriaGrupo;
}

export async function eliminarCategoriaGrupoService(id, usuarioId) {
  const categoriaGrupo = await CategoriaGrupo.findOneAndDelete({
    _id: id,
    usuario: usuarioId
  });

  if (!categoriaGrupo) {
    const error = new Error("Categoría principal no encontrada");
    error.status = 404;
    throw error;
  }

  return categoriaGrupo;
}

export const eliminarTodosLasCategoriasGrupoService = async () => {
    await CategoriaGrupo.deleteMany({});
}