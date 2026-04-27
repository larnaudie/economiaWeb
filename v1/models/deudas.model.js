import mongoose from "mongoose";

const deudaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },

    descripcion: { type: String, required: true },

    montoTotal: { type: Number, required: true },

    cuotasTotales: { type: Number, required: true },

    cuotaActual: { type: Number, default: 0 },

    montoCuota: { type: Number, required: true },

    fechaInicio: { type: Date, required: true },

    activa: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Deuda", deudaSchema);