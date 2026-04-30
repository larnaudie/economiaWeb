import mongoose from "mongoose";

const categoriaGrupoSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true
  }
);

categoriaGrupoSchema.index(
  { nombre: 1, usuario: 1 },
  { unique: true }
);

export default mongoose.model("CategoriaGrupo", categoriaGrupoSchema);