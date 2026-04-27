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
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    }
});

export default mongoose.model("Cuenta", cuentaSchema);