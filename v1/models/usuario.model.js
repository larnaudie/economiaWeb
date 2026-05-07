import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  rol: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
});

export default mongoose.model("Usuario", usuarioSchema);
