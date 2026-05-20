import mongoose from "mongoose";

const gastoSchema = new mongoose.Schema({
  estado: {
    type: String,
    enum: ["pendiente", "creado"],
    default: "creado",
  },

  fecha: {
    type: Date,
    required: true,
    default: Date.now,
  },

  descripcion: {
    type: String,
    required: true,
  },

  flujoBancario: {
    type: Number,
    default: null,
  },

  economiaReal: {
    type: Number,
    default: null,
  },

  porcentajeEconomiaReal: {
    type: Number,
    default: null,
  },

  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categoria",
    default: null,
  },

  cuenta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cuenta",
    default: null,
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

  facturaUrl: {
    type: String,
    default: "",
  },

  facturaPublicId: {
    type: String,
    default: "",
  },

  origen: {
    type: String,
    enum: ["manual", "excel_bancario", "tarjeta_credito", "deuda"],
    default: "manual",
  },

  tarjetaCredito: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "TarjetaCredito",
    default: null,
  },

  movimientoTarjeta: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MovimientoTarjeta",
    default: null,
  },
});

gastoSchema.index(
  { usuario: 1, cuenta: 1, hashImportacion: 1 },
  { unique: true }
);

const Gasto = mongoose.model("Gasto", gastoSchema);

export default Gasto;
