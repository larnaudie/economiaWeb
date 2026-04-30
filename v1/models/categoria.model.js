import mongoose from "mongoose";

const categoriaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },
    categoriaGrupo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CategoriaGrupo",
        default: null
    }
});

categoriaSchema.index({ nombre: 1, usuario: 1 }, { unique: true });

export default mongoose.model("Categoria", categoriaSchema);