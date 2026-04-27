export function buildBulkUpdateGastos({ usuarioId, gastos }) {
    return gastos.map((gasto) => ({
        updateOne: {
            filter: {
                _id: gasto._id,
                usuario: usuarioId
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
                    incluirEnGastoReal: gasto.incluirEnGastoReal ?? true
                }
            }
        }
    }));
}

export function buildBulkCreateGastos({ usuarioId, gastos }) {
    return gastos.map((gasto) => ({
        insertOne: {
            document: {
                usuario: usuarioId,
                fecha: gasto.fecha,
                descripcion: gasto.descripcion,
                flujoBancario: gasto.flujoBancario,
                economiaReal: gasto.economiaReal,
                porcentajeEconomiaReal: gasto.porcentajeEconomiaReal,
                categoria: gasto.categoria,
                cuenta: gasto.cuenta,
                incluirEnGastoBancario: gasto.incluirEnGastoBancario ?? true,
                incluirEnGastoReal: gasto.incluirEnGastoReal ?? true
            }
        }
    }));
}