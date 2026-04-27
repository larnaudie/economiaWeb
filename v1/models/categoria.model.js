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
    }
});

categoriaSchema.index({ nombre: 1, usuario: 1 }, { unique: true });

export default mongoose.model("Categoria", categoriaSchema);