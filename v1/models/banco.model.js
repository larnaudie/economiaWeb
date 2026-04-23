import mongoose from "mongoose";
//import Cuenta from "./cuenta.model.js";

const bancoSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    listaCuentas: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cuenta"
        }
    ],
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    }

});

export default mongoose.model("Banco", bancoSchema);