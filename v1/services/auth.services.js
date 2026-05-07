import Usuario from "../models/usuario.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const registrarUsuarioService = async (data) => {
  const usuarioExistente = await Usuario.findOne({
    username: new RegExp(`^${data.username}$`, "i"),
  });

  if (usuarioExistente) {
    const error = new Error("Usuario ya existe");
    error.status = 409;
    throw error;
  }

  let rol = "user";

  if (data.codigo) {
    if (data.codigo !== process.env.ADMIN_REGISTER_CODE) {
      const error = new Error("No se pudo registrar el usuario");
      error.status = 400;
      throw error;
    }

    const adminExistente = await Usuario.findOne({ rol: "admin" });

    if (adminExistente) {
      const error = new Error(
        "Error al registrar el Admin, contacte con soporte",
      );
      error.status = 409;
      throw error;
    }

    rol = "admin";
  }

  const passwordHash = bcrypt.hashSync(
    data.password,
    parseInt(process.env.ROUNDS) || 10,
  );

  const nuevoUsuario = new Usuario({
    username: data.username,
    password: passwordHash,
    rol,
  });

  await nuevoUsuario.save();

  const token = jwt.sign(
    { id: nuevoUsuario._id, rol: nuevoUsuario.rol },
    process.env.SECRET_KEY,
    { expiresIn: "1d" },
  );

  return {
    token,
    id: nuevoUsuario._id,
    username: nuevoUsuario.username,
    rol: nuevoUsuario.rol,
  };
};

export const loginUsuarioService = async (username, password) => {
  const usuario = await Usuario.findOne({
    username: new RegExp(`^${username}$`, "i"),
  });
  if (!usuario) {
    return { message: "Usuario o contraseña incorrectos" };
  }

  const isMatch = bcrypt.compareSync(password, usuario.password);

  if (!isMatch) {
    return { message: "Usuario o contraseña incorrectos" };
  }

  const tokenExpiration = usuario.rol === "admin" ? "1h" : "1d";

  const token = jwt.sign(
    { id: usuario._id, rol: usuario.rol },
    process.env.SECRET_KEY,
    { expiresIn: tokenExpiration },
  );

  return {
    token,
    id: usuario._id,
    username: usuario.username,
    rol: usuario.rol,
  };
};
