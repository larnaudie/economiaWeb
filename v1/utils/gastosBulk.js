function generarHashGasto({
  fecha,
  descripcion,
  flujoBancario,
  economiaReal,
  cuenta,
}) {
  const fechaNormalizada = new Date(fecha).toISOString().slice(0, 10);
  const descripcionNormalizada = String(descripcion || "")
    .trim()
    .toLowerCase();
  const flujo = Number(flujoBancario || 0).toFixed(2);
  const real = Number(economiaReal || 0).toFixed(2);
  const cuentaId = String(cuenta || "");

  return `${fechaNormalizada}|${descripcionNormalizada}|${flujo}|${real}|${cuentaId}`;
}

export function buildBulkUpdateGastos({ usuarioId, gastos }) {
  return gastos.map((gasto) => ({
    updateOne: {
      filter: {
        _id: gasto._id,
        usuario: usuarioId,
      },
      update: {
        $set: {
          fecha: gasto.fecha,
          descripcion: gasto.descripcion,
          flujoBancario: gasto.flujoBancario,
          economiaReal: gasto.economiaReal,
          porcentajeEconomiaReal: gasto.porcentajeEconomiaReal,
          categoria: gasto.categoria,
          cuenta: gasto.cuenta,
          incluirEnGastoBancario: gasto.incluirEnGastoBancario ?? true,
          incluirEnGastoReal: gasto.incluirEnGastoReal ?? true,
        },
      },
    },
  }));
}

export const buildBulkCreateGastos = ({ usuarioId, gastos }) => {
  return gastos.map((gasto) => {
    const hashImportacion = generarHashGasto({
      fecha: gasto.fecha,
      descripcion: gasto.descripcion,
      flujoBancario: gasto.flujoBancario,
      economiaReal: gasto.economiaReal,
      cuenta: gasto.cuenta,
    });

    return {
      insertOne: {
        document: {
          ...gasto,
          usuario: usuarioId,
          incluirEnGastoBancario: gasto.incluirEnGastoBancario ?? true,
          incluirEnGastoReal: gasto.incluirEnGastoReal ?? true,
          hashImportacion,
        },
      },
    };
  });
};
