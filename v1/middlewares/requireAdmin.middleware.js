export const requireAdmin = (req, res, next) => {
    if (req.user?.rol !== "admin") {
        return res.status(403).json({
            success: false,
            message: "No tenés permisos de administrador"
        });
    }

    next();
};