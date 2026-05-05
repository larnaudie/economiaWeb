const modoFiltroDashboard = document.getElementById("modoFiltroDashboard");
const mesDashboard = document.getElementById("mesDashboard");
const anioDashboard = document.getElementById("anioDashboard");

const grupoMesDashboard = document.getElementById("grupoMesDashboard");
const grupoAnioDashboard = document.getElementById("grupoAnioDashboard");
const grupoDesdeDashboard = document.getElementById("grupoDesdeDashboard");
const grupoHastaDashboard = document.getElementById("grupoHastaDashboard");

let gastosGlobal = [];
let deudasGlobal = [];
const tipoAgrupacionCategoria = document.getElementById("tipoAgrupacionCategoria");

function actualizarVisibilidadFiltrosDashboard() {
  const modo = modoFiltroDashboard.value;

  if (modo === "todos") {
    grupoMesDashboard.style.display = "none";
    grupoAnioDashboard.style.display = "none";
    grupoDesdeDashboard.style.display = "none";
    grupoHastaDashboard.style.display = "none";
    return;
  }

  grupoMesDashboard.style.display = modo === "mes" ? "" : "none";
  grupoAnioDashboard.style.display = modo === "mes" ? "" : "none";

  grupoDesdeDashboard.style.display = modo === "rango" ? "" : "none";
  grupoHastaDashboard.style.display = modo === "rango" ? "" : "none";
}

function getGastosFiltradosDashboard() {
  const modo = modoFiltroDashboard.value;

  if (modo === "todos") {
    return gastosGlobal;
  }

  if (modo === "mes") {
    const mes = Number(mesDashboard.value);
    const anio = Number(anioDashboard.value) || new Date().getUTCFullYear();

    return gastosGlobal.filter(g => {
      if (!g.fecha) return false;

      const fecha = new Date(g.fecha);
      return (
        fecha.getUTCMonth() + 1 === mes &&
        fecha.getUTCFullYear() === anio
      );
    });
  }

  if (modo === "rango") {
    const { desde, hasta } = getRangoFechas();
    return filtrarGastosPorFecha(gastosGlobal, desde, hasta);
  }

  return gastosGlobal;
}

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
  const gastos = getGastosFiltradosDashboard();

  renderGastoRealPorCategoria(gastos);
  renderGastoBancarioPorCategoria(gastos);
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

function esTransferenciaDashboard(g) {
  const nombre = g.categoria?.nombre?.toLowerCase() || "";

  return (
    nombre.includes("transf") ||
    nombre.includes("ahorro") ||
    nombre.includes("movimiento") ||
    nombre.includes("balance")
  );
}

function renderGastoRealPorCategoria(gastos) {
  const acumulado = {};
  const tipoAgrupacion = tipoAgrupacionCategoria?.value || "subcategoria";

  gastos.forEach(g => {
    if (esTransferenciaDashboard(g)) return;
    if (g.incluirEnGastoReal !== true) return;

    const valor = Number(g.economiaReal) || 0;
    if (valor >= 0) return;

    let nombreGrupo = "Sin categoría";

    if (tipoAgrupacion === "categoriaPrincipal") {
      nombreGrupo =
        g.categoria?.categoriaGrupo?.nombre ||
        "Sin categoría principal";
    } else {
      nombreGrupo =
        g.categoria?.nombre ||
        "Sin subcategoría";
    }

    acumulado[nombreGrupo] = (acumulado[nombreGrupo] || 0) + Math.abs(valor);
  });

  const entries = Object.entries(acumulado)
    .sort((a, b) => b[1] - a[1]);

  const labels = entries.map(e => e[0]);
  const values = entries.map(e => Number(e[1].toFixed(2)));

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

function renderGastoBancarioPorCategoria(gastos) {
  const acumulado = {};
  const tipoAgrupacion = tipoAgrupacionCategoria?.value || "subcategoria";

  gastos.forEach(g => {
    if (esTransferenciaDashboard(g)) return;
    if (g.incluirEnGastoBancario !== true) return;

    const valor = Number(g.flujoBancario) || 0;
    if (valor >= 0) return;

    let nombreGrupo = "Sin categoría";

    if (tipoAgrupacion === "categoriaPrincipal") {
      nombreGrupo =
        g.categoria?.categoriaGrupo?.nombre ||
        "Sin categoría principal";
    } else {
      nombreGrupo =
        g.categoria?.nombre ||
        "Sin subcategoría";
    }

    acumulado[nombreGrupo] =
      (acumulado[nombreGrupo] || 0) + Math.abs(valor);
  });

  const entries = Object.entries(acumulado)
    .sort((a, b) => b[1] - a[1]);

  const labels = entries.map(e => e[0]);
  const values = entries.map(e => Number(e[1].toFixed(2)));

  crearChart("gastoBancarioCategoriaChart", "doughnut", {
    labels,
    datasets: [{
      data: values
    }]
  }, {
    cutout: "60%"
  });

  renderLegend("gastoBancarioCategoriaLegend", labels, values);
}

modoFiltroDashboard?.addEventListener("change", () => {
  actualizarVisibilidadFiltrosDashboard();
  aplicarDashboard();
});

document.getElementById("aplicarFiltroDashboard")
  ?.addEventListener("click", aplicarDashboard);

tipoAgrupacionCategoria?.addEventListener("change", aplicarDashboard);

document.addEventListener("DOMContentLoaded", async () => {
  const now = new Date();

  mesDashboard.value = String(now.getUTCMonth() + 1);
  anioDashboard.value = now.getUTCFullYear();

  actualizarVisibilidadFiltrosDashboard();
  await cargarDashboard();
});