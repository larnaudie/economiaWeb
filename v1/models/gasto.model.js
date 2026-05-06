import mongoose from "mongoose";

const gastoSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true,
  },

  descripcion: {
    type: String,
    required: true,
  },

  flujoBancario: {
    type: Number,
    required: true,
  },

  economiaReal: {
    type: Number,
    required: true,
  },

  porcentajeEconomiaReal: {
    type: Number,
    required: true,
  },

  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categoria",
    required: true,
  },

  cuenta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cuenta",
    required: true,
  },

  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: true,
  },

  incluirEnGastoBancario: {
    type: Boolean,
    default: true,
  },

  incluirEnGastoReal: {
    type: Boolean,
    default: true,
  },

  hashImportacion: {
    type: String,
    required: true,
  },
});

gastoSchema.index(
  { usuario: 1, cuenta: 1, hashImportacion: 1 },
  { unique: true }
);

const Gasto = mongoose.model("Gasto", gastoSchema);

export default Gasto;