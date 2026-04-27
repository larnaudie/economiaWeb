async function cargarDashboard() {
  const token = getToken();
  if (!token) return;

  try {
    const [gastosResp, deudasResp] = await Promise.all([
      apiRequest("/gastos", "GET", null, token),
      apiRequest("/deudas", "GET", null, token)
    ]);

    const gastos = getApiData(gastosResp);
    const deudas = getApiData(deudasResp);

    renderGastoRealPorCategoria(gastos);
    renderBancarioVsReal(gastos);
    renderEvolucionMensual(gastos);
    renderSaldoDeudas(deudas);
  } catch (error) {
    console.error("Error al cargar dashboard:", error);
  }
}

function esTransferenciaDashboard(gasto) {
  const categoria = String(gasto?.categoria?.nombre || "").toLowerCase();
  return categoria.includes("transf");
}

function renderGastoRealPorCategoria(gastos) {
  const acumulado = {};

  gastos.forEach(g => {
    if (esTransferenciaDashboard(g)) return;
    if (g.incluirEnGastoReal !== true) return;

    const valor = Number(g.economiaReal) || 0;
    if (valor >= 0) return;

    const categoria = g.categoria?.nombre || "Sin categoría";
    acumulado[categoria] = (acumulado[categoria] || 0) + Math.abs(valor);
  });

  crearChart("gastoRealCategoriaChart", "doughnut", {
    labels: Object.keys(acumulado),
    datasets: [{
      label: "Gasto real",
      data: Object.values(acumulado)
    }]
  });
}

function renderBancarioVsReal(gastos) {
  let bancario = 0;
  let real = 0;

  gastos.forEach(g => {
    if (esTransferenciaDashboard(g)) return;

    const flujo = Number(g.flujoBancario) || 0;
    const economia = Number(g.economiaReal) || 0;

    if (g.incluirEnGastoBancario === true && flujo < 0) {
      bancario += Math.abs(flujo);
    }

    if (g.incluirEnGastoReal === true && economia < 0) {
      real += Math.abs(economia);
    }
  });

  crearChart("bancarioVsRealChart", "bar", {
    labels: ["Gasto Bancario", "Gasto Real"],
    datasets: [{
      label: "Total",
      data: [bancario, real]
    }]
  });
}

function renderEvolucionMensual(gastos) {
  const acumulado = {};

  gastos.forEach(g => {
    if (!g.fecha) return;
    if (esTransferenciaDashboard(g)) return;
    if (g.incluirEnGastoReal !== true) return;

    const valor = Number(g.economiaReal) || 0;
    if (valor >= 0) return;

    const fecha = new Date(g.fecha);
    const key = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;

    acumulado[key] = (acumulado[key] || 0) + Math.abs(valor);
  });

  const labels = Object.keys(acumulado).sort();

  crearChart("evolucionMensualChart", "line", {
    labels,
    datasets: [{
      label: "Gasto real mensual",
      data: labels.map(label => acumulado[label]),
      tension: 0.35
    }]
  });
}

function renderSaldoDeudas(deudas) {
  const activas = deudas.filter(d => d.activa);

  const labels = activas.map(d => d.descripcion);

  const data = activas.map(d => {
    const pagado = Number(d.montoCuota) * Number(d.cuotaActual);
    return Math.max(0, Number(d.montoTotal) - pagado);
  });

  crearChart("deudasSaldoChart", "bar", {
    labels,
    datasets: [{
      label: "Saldo restante",
      data
    }]
  });
}

function crearChart(canvasId, type, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", cargarDashboard);