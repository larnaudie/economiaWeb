import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true 
    },
    bancos: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Banco"
        }
    ],
    cuentas: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Cuenta"
        }
    ],
    gastos: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Gasto"
        }
    ],
    categorias: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Categoria"
        }
    ]

});

export default mongoose.model("Usuario", usuarioSchema);