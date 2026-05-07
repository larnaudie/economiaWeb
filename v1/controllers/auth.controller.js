import {
  registrarUsuarioService,
  loginUsuarioService,
} from "../services/auth.services.js";

export const registrarUsuario = async (req, res, next) => {
  try {
    const result = await registrarUsuarioService(req.body);
    res.status(201).json({ message: "Registro de usuario exitoso", ...result });
  } catch (error) {
    next(error);
  }
};

export const loginUsuario = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await loginUsuarioService(username, password);

    if (result.message) {
      return res.status(401).json({
        success: false,
        message: result.message,
        details: null,
      });
    }

    res.json({ message: "Inicio de sesión exitoso", ...result });
  } catch (error) {
    next(error);
  }
};
