import Usuario from "../models/usuario.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const registrarUsuarioService = async (data) => {
    const passwordHash = bcrypt.hashSync(data.password, parseInt(process.env.ROUNDS) || 10);
    const nuevoUsuario = new Usuario({ username: data.username, password: passwordHash });
    await nuevoUsuario.save();
    const token = jwt.sign({ id: nuevoUsuario._id }, process.env.SECRET_KEY, { expiresIn: "1d" });
    return { token, id: nuevoUsuario._id, username: nuevoUsuario.username };
}

export const loginUsuarioService = async (username, password) => {
   const usuario = await Usuario.findOne({ username: new RegExp(`^${username}$`, 'i') });
   if (!usuario) return { message: "Credenciales inválidas" };
   const isMatch = bcrypt.compareSync(password, usuario.password);
   if (!isMatch) return { message: "Credenciales inválidas" };
   const token = jwt.sign({ id: usuario._id }, process.env.SECRET_KEY, { expiresIn: "1d" });
   return { token, id: usuario._id, username: usuario.username };
}