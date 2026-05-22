import mongoose from "mongoose";

const tarjetaCreditoSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true,
    },

    nombre: {
      type: String,
      required: true,
      trim: true,
    },

    banco: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Banco",
      default: null,
    },

    cuentaTarjeta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cuenta",
      default: null,
    },

    cuentaPagoDefault: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cuenta",
      default: null,
    },

    ultimosDigitos: {
      type: String,
      trim: true,
      default: "",
    },

    monedaPrincipal: {
      type: String,
      enum: ["UYU", "USD"],
      default: "UYU",
    },

    limiteUYU: {
      type: Number,
      default: null,
    },

    limiteUSD: {
      type: Number,
      default: null,
    },

    diaCierre: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },

    diaVencimiento: {
      type: Number,
      min: 1,
      max: 31,
      default: null,
    },

    activa: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

tarjetaCreditoSchema.index(
  { usuario: 1, nombre: 1, ultimosDigitos: 1 },
  { unique: true },
);

export default mongoose.model("TarjetaCredito", tarjetaCreditoSchema);
