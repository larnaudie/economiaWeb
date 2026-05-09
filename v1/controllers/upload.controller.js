import Usuario from "../models/usuario.model.js";
import { upload } from "../middlewares/multer.middleware.js";
import cloudinary from "../config/cloduinary.js";
import multer from "../utils/multer.utils.js";
import { runMulterSingle } from "../utils/multer.utils.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.utils.js"

export const subirFotoPerfil = async (req, res, next) => {
  try {
    await runMulterSingle(upload, "imagen", req, res);

    if (!req.file) {
      const error = new Error("No se subió ninguna imagen");
      error.status = 400;
      throw error;
    }

    const result = await uploadBufferToCloudinary(
      cloudinary,
      req.file.buffer,
      {
        resource_type: "image",
        folder: "economia-web/perfiles",
        transformation: [
          {
            width: 400,
            height: 400,
            crop: "fill",
            gravity: "face",
          },
        ],
      }
    );

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      req.user.id,
      { fotoPerfilUrl: result.secure_url },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Foto de perfil actualizada",
      data: {
        fotoPerfilUrl: usuarioActualizado.fotoPerfilUrl,
        usuario: usuarioActualizado,
      },
    });
  } catch (error) {
    next(error);
  }
};