import mongoose from "mongoose";

const resumenTarjetaSchema = new mongoose.Schema(
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

    periodo: {
      type: String,
      required: true,
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

    limiteUYU: {
      type: Number,
      default: null,
    },

    limiteUSD: {
      type: Number,
      default: null,
    },

    creditoDisponibleUYU: {
      type: Number,
      default: null,
    },

    creditoDisponibleUSD: {
      type: Number,
      default: null,
    },

    saldoAnteriorUYU: {
      type: Number,
      default: 0,
    },

    saldoAnteriorUSD: {
      type: Number,
      default: 0,
    },

    cargosMesUYU: {
      type: Number,
      default: 0,
    },

    cargosMesUSD: {
      type: Number,
      default: 0,
    },

    pagoContadoUYU: {
      type: Number,
      default: 0,
    },

    pagoContadoUSD: {
      type: Number,
      default: 0,
    },

    pagoMinimoUYU: {
      type: Number,
      default: 0,
    },

    pagoMinimoUSD: {
      type: Number,
      default: 0,
    },

    tasaPesosTEA: {
      type: Number,
      default: null,
    },

    tasaPesosTEM: {
      type: Number,
      default: null,
    },

    tasaDolaresTEA: {
      type: Number,
      default: null,
    },

    tasaDolaresTEM: {
      type: Number,
      default: null,
    },

    origenImportacion: {
      type: String,
      default: "excel_tarjeta",
    },

    hashImportacion: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

resumenTarjetaSchema.index(
  { usuario: 1, tarjeta: 1, hashImportacion: 1 },
  { unique: true },
);

export default mongoose.model("ResumenTarjeta", resumenTarjetaSchema);
