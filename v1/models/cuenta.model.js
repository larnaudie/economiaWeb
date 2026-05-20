import mongoose from "mongoose";

const cuentaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    banco: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Banco",
        required: true
    },
    tipo: {
        type: String,
        enum: ["caja_ahorro", "cuenta_corriente", "tarjeta_credito"],
        default: "caja_ahorro",
        required: true
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    }
});

export default mongoose.model("Cuenta", cuentaSchema);
