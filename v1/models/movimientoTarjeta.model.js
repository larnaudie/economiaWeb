import mongoose from "mongoose";

const movimientoTarjetaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },

    tarjeta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TarjetaCredito",
      required: true,
      index: true,
    },

    resumen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumenTarjeta",
      default: null,
      index: true,
    },

    fecha: {
      type: Date,
      required: true,
    },

    tarjetaEnmascarada: {
      type: String,
      default: "",
      trim: true,
    },

    detalle: {
      type: String,
      required: true,
      trim: true,
    },

    tipoMovimiento: {
      type: String,
      enum: ["compra", "pago", "credito", "saldo_anterior", "ajuste"],
      required: true,
    },

    moneda: {
      type: String,
      enum: ["UYU", "USD"],
      required: true,
    },

    montoOriginalExcel: {
      type: Number,
      required: true,
    },

    montoReal: {
      type: Number,
      default: 0,
    },

    montoBancario: {
      type: Number,
      default: 0,
    },

    periodoResumen: {
      type: String,
      default: "",
      trim: true,
    },

    fechaCierre: {
      type: Date,
      default: null,
    },

    fechaVencimiento: {
      type: Date,
      default: null,
    },

    gastoGenerado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gasto",
      default: null,
    },

    hashImportacion: {
      type: String,
      required: true,
    },

    origenImportacion: {
      type: String,
      default: "excel_tarjeta",
    },
  },
  { timestamps: true },
);

movimientoTarjetaSchema.index(
  { usuario: 1, tarjeta: 1, hashImportacion: 1 },
  { unique: true },
);

export default mongoose.model("MovimientoTarjeta", movimientoTarjetaSchema);
