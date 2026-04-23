import mongoose from "mongoose";

const gastoSchema = new mongoose.Schema({
    fecha: {
        type: Date,
        required: true
    },
    descripcion: {
        type: String,
        required: true
    },
    flujoBancario: {
        type: Number,
        required: true
    },
    economiaReal: {
        type: Number,
        required: true
    },
    porcentajeEconomiaReal: {
        type: Number,
        required: true
    },
    categoria: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoria",
        required: true
    },
    cuenta: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cuenta",
        required: true
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    }
});

export default mongoose.model("Gasto", gastoSchema);