import mongoose from "mongoose";

const deudaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },

    descripcion: { type: String, required: true },

    tipo: {
        type: String,
        enum: ["deuda", "prestamo", "financiacion", "hipotecario"],
        default: "deuda"
    },

    moneda: {
        type: String,
        enum: ["UYU", "USD", "UI"],
        default: "UYU"
    },

    entidad: { type: String, default: "" },

    montoTotal: { type: Number, required: true },

    montoOriginalAntesEntrega: { type: Number, default: null },

    porcentajeFinanciacion: { type: Number, default: null },

    entregaInicialMonto: { type: Number, default: 0 },

    entregaInicialMoneda: {
        type: String,
        enum: ["UYU", "USD", "UI"],
        default: "UYU"
    },

    entregaInicialConvertida: { type: Number, default: 0 },

    saldoPendiente: { type: Number, default: null },

    cuotasTotales: { type: Number, required: true },

    cuotaActual: { type: Number, default: 0 },

    montoPagadoInicial: { type: Number, default: 0 },

    montoCuota: { type: Number, required: true },

    tasaInteres: { type: Number, default: null },

    plazoAnios: { type: Number, default: null },

    diaVencimiento: { type: Number, default: null },

    cuentaPagoDefault: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cuenta",
        default: null
    },

    categoriaDefault: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoria",
        default: null
    },

    fechaInicio: { type: Date, required: true },

    historialPagos: [
        {
            fecha: { type: Date, required: true },
            cuotaNumero: { type: Number, required: true },
            montoMonedaOrigen: { type: Number, default: null },
            monedaOrigen: { type: String, enum: ["UYU", "USD", "UI"], default: "UYU" },
            cotizacion: { type: Number, default: null },
            montoDebitadoUYU: { type: Number, required: true },
            cuenta: { type: mongoose.Schema.Types.ObjectId, ref: "Cuenta", default: null },
            categoria: { type: mongoose.Schema.Types.ObjectId, ref: "Categoria", default: null },
            gasto: { type: mongoose.Schema.Types.ObjectId, ref: "Gasto", default: null }
        }
    ],

    activa: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Deuda", deudaSchema);
