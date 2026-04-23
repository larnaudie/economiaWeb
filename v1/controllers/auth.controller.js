import {registrarUsuarioService, loginUsuarioService} from "../services/auth.services.js";

 export const registrarUsuario = async (req, res) => {
    const result = await registrarUsuarioService(req.body);
    res.json({ message: "Registro de usuario exitoso", ...result });
}

export const loginUsuario = async (req, res) => {
    const { username, password } = req.body;
    const result = await loginUsuarioService(username, password);
    if(result.message) return res.status(400).json(result);
    res.json({ message: "Inicio de sesión exitoso", ...result });
}