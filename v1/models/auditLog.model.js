import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    accion: {
      type: String,
      required: true,
    },
    entidad: {
      type: String,
      required: true,
    },
    entidadId: {
      type: String,
      default: null,
    },
    detalle: {
      type: Object,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AuditLog", auditLogSchema);