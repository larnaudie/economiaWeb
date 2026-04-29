async function cargarDashboard() {
  const token = getToken();
  if (!token) return;

  try {
    const [gastos, deudasResp] = await Promise.all([
      obtenerTodosLosGastosDashboard(token),
      apiRequest("/deudas", "GET", null, token)
    ]);

    const deudas = getApiData(deudasResp);

    renderGastoRealPorCategoria(gastos);
    renderBancarioVsReal(gastos);
    renderComparativoMensual(gastos);
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

  new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
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
              callback: value => Number(value).toFixed(0)
            }
          }
        }
    }
  });
}

document.addEventListener("DOMContentLoaded", cargarDashboard);