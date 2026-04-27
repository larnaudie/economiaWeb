import mongoose from "mongoose";

const bancoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    }
});

export default mongoose.model("Banco", bancoSchema);