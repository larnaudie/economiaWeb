let gastosGlobal = [];
let deudasGlobal = [];

async function cargarDashboard() {
  const token = getToken();
  if (!token) return;

  const [gastos, deudasResp] = await Promise.all([
    obtenerTodosLosGastosDashboard(token),
    apiRequest("/deudas", "GET", null, token)
  ]);

  gastosGlobal = gastos;
  deudasGlobal = getApiData(deudasResp);

  aplicarDashboard();
}

function filtrarUltimosDosMesesConDatos(gastos) {
  const meses = [...new Set(
    gastos
      .filter(g => g.fecha)
      .map(g => {
        const fecha = new Date(g.fecha);
        return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
      })
  )].sort();

  const ultimosDosMeses = meses.slice(-2);

  return gastos.filter(g => {
    if (!g.fecha) return false;

    const fecha = new Date(g.fecha);
    const key = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;

    return ultimosDosMeses.includes(key);
  });
}

function aplicarDashboard() {
  const { desde, hasta } = getRangoFechas();

  let gastos = gastosGlobal;

  if (desde || hasta) {
    gastos = filtrarGastosPorFecha(gastosGlobal, desde, hasta);
  } else {
    gastos = filtrarUltimosDosMesesConDatos(gastosGlobal);
  }

  renderGastoRealPorCategoria(gastos);
  renderBancarioVsReal(gastos);
  renderComparativoMensual(gastos);
  renderSaldoDeudas(deudasGlobal);
}

function filtrarMesActual(gastos) {
  const now = new Date();
  const mes = now.getMonth();
  const año = now.getFullYear();

  return gastos.filter(g => {
    if (!g.fecha) return false;
    const fecha = new Date(g.fecha);
    return fecha.getMonth() === mes && fecha.getFullYear() === año;
  });
}

document.getElementById("aplicarFiltroDashboard")
  .addEventListener("click", aplicarDashboard);

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

  const labels = Object.keys(acumulado);
  const values = Object.values(acumulado).map(v => Number(v.toFixed(2)));

  crearChart("gastoRealCategoriaChart", "doughnut", {
    labels,
    datasets: [{
      data: values
    }]
  }, {
    cutout: "60%"
  });

  renderLegend("gastoRealCategoriaLegend", labels, values);
}

function getRangoFechas() {
  return {
    desde: document.getElementById("filtroDesde").value,
    hasta: document.getElementById("filtroHasta").value
  };
}

function filtrarGastosPorFecha(gastos, desde, hasta) {
  if (!desde && !hasta) return gastos;

  return gastos.filter(g => {
    if (!g.fecha) return false;

    const fechaGasto = g.fecha.slice(0, 10);

    if (desde && fechaGasto < desde) return false;
    if (hasta && fechaGasto > hasta) return false;

    return true;
  });
}

async function obtenerTodosLosGastosDashboard(token) {
  let pagina = 1;
  let todos = [];
  let seguir = true;

  while (seguir) {
    const data = await apiRequest(`/gastos?pagina=${pagina}`, "GET", null, token);
    const gastosPagina = getApiData(data);

    todos = [...todos, ...gastosPagina];

    if (gastosPagina.length < 20) {
      seguir = false;
    } else {
      pagina++;
    }
  }

  return todos;
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

  bancario = Number(bancario.toFixed(2));
  real = Number(real.toFixed(2));

  crearChart("bancarioVsRealChart", "bar", {
    labels: ["Gasto Bancario", "Gasto Real"],
    datasets: [{
      label: "Total",
      data: [bancario, real]
    }]
  });
}

function renderComparativoMensual(gastos) {
  const acumulado = {};

  gastos.forEach(g => {
    if (!g.fecha) return;
    if (esTransferenciaDashboard(g)) return;

    const fecha = new Date(g.fecha);
    const key = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;

    if (!acumulado[key]) {
      acumulado[key] = {
        bancario: 0,
        real: 0
      };
    }

    const flujo = Number(g.flujoBancario) || 0;
    const economia = Number(g.economiaReal) || 0;

    if (g.incluirEnGastoBancario === true && flujo < 0) {
      acumulado[key].bancario += Math.abs(flujo);
    }

    if (g.incluirEnGastoReal === true && economia < 0) {
      acumulado[key].real += Math.abs(economia);
    }
  });

  const labels = Object.keys(acumulado).sort();

  crearChart("evolucionMensualChart", "bar", {
    labels,
    datasets: [
      {
        label: "Gasto Bancario",
        data: labels.map(label => Number(acumulado[label].bancario.toFixed(2)))
      },
      {
        label: "Gasto Real",
        data: labels.map(label => Number(acumulado[label].real.toFixed(2)))
      }
    ]
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

  if (window.charts) {
    if (window.charts[canvasId]) {
      window.charts[canvasId].destroy();
    }
  } else {
    window.charts = {};
  }
  window.charts[canvasId] = new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: type === "doughnut" ? 2 : 1.6,
      plugins: {
        legend: {
          display: type !== "doughnut",
          position: "bottom",
          labels: {
            font: {
              size: 15,
              weight: "bold"
            }
          }
        },
        tooltip: {
          titleFont: {
            size: 16
          },
          bodyFont: {
            size: 15
          },
          callbacks: {
            label: function (context) {
              const value = Number(context.raw || 0).toFixed(2);
              return `${context.dataset.label}: ${value}`;
            }
          }
        }
      },
      scales: type === "doughnut"
        ? {}
        : {
          x: {
            ticks: {
              font: {
                size: 14,
                weight: "bold"
              }
            }
          },
          y: {
            ticks: {
              font: {
                size: 14,
                weight: "bold"
              },
              callback: value => value.toLocaleString()
            }
          }
        }
    }
  });
}

function renderLegend(containerId, labels, data) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = labels.map((label, i) => `
    <div class="legend-item">
      <span>${label}</span>
      <strong>${Number(data[i]).toFixed(2)}</strong>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", cargarDashboard);