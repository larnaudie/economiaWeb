import AuditLog from "../models/auditLog.model.js";

export const crearAuditLogService = async ({
  usuario,
  accion,
  entidad,
  entidadId = null,
  detalle = null,
}) => {
  await AuditLog.create({
    usuario,
    accion,
    entidad,
    entidadId,
    detalle,
  });
};