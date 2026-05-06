const bancoSeleccionadoDashboard = document.getElementById("bancoSeleccionado");
const cuentaDashboard = document.getElementById("cuentaDashboard");

const modoFiltroDashboard = document.getElementById("modoFiltroDashboard");
const mesDashboard = document.getElementById("mesDashboard");
const anioDashboard = document.getElementById("anioDashboard");
const filtroDesde = document.getElementById("filtroDesde");
const filtroHasta = document.getElementById("filtroHasta");

const grupoMesDashboard = document.getElementById("grupoMesDashboard");
const grupoAnioDashboard = document.getElementById("grupoAnioDashboard");
const grupoDesdeDashboard = document.getElementById("grupoDesdeDashboard");
const grupoHastaDashboard = document.getElementById("grupoHastaDashboard");

const tipoAgrupacionCategoria = document.getElementById(
  "tipoAgrupacionCategoria",
);

let gastosGlobal = [];
let deudasGlobal = [];
let cuentasBancoDashboard = [];
window.charts = window.charts || {};

function actualizarVisibilidadFiltrosDashboard() {
  const modo = modoFiltroDashboard.value;

  grupoMesDashboard.style.display = modo === "mes" ? "" : "none";
  grupoAnioDashboard.style.display = modo === "mes" ? "" : "none";
  grupoDesdeDashboard.style.display = modo === "rango" ? "" : "none";
  grupoHastaDashboard.style.display = modo === "rango" ? "" : "none";
}

function getCuentaId(gasto) {
  if (!gasto?.cuenta) return "";
  return typeof gasto.cuenta === "object" ? gasto.cuenta._id : gasto.cuenta;
}

function getFechaKey(gasto) {
  const fecha = new Date(gasto.fecha);
  return {
    anio: fecha.getUTCFullYear(),
    mes: fecha.getUTCMonth() + 1,
    key: `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`,
  };
}

function filtrarPorBancoYCuenta(gastos) {
  const cuentaId = cuentaDashboard?.value || "";

  if (cuentaId) {
    return gastos.filter((g) => getCuentaId(g) === cuentaId);
  }

  const idsCuentasBanco = cuentasBancoDashboard.map((c) => c._id);

  if (!idsCuentasBanco.length) {
    return gastos;
  }

  return gastos.filter((g) => idsCuentasBanco.includes(getCuentaId(g)));
}

function filtrarPorFechaDashboard(gastos) {
  const modo = modoFiltroDashboard.value;

  if (modo === "todos") {
    return gastos;
  }

  if (modo === "mes") {
    const mes = Number(mesDashboard.value);
    const anio = Number(anioDashboard.value);

    return gastos.filter((g) => {
      if (!g.fecha) return false;
      const fecha = getFechaKey(g);
      return fecha.mes === mes && fecha.anio === anio;
    });
  }

  if (modo === "rango") {
    const desde = filtroDesde.value;
    const hasta = filtroHasta.value;

    if (!desde || !hasta) {
      alert("Seleccioná desde y hasta.");
      return gastos;
    }

    return gastos.filter((g) => {
      if (!g.fecha) return false;
      const fecha = g.fecha.slice(0, 10);
      return fecha >= desde && fecha <= hasta;
    });
  }

  return gastos;
}

function getGastosDashboardFiltrados() {
  let gastos = deduplicarGastos(gastosGlobal);

  gastos = filtrarPorBancoYCuenta(gastos);
  gastos = filtrarPorFechaDashboard(gastos);

  return gastos;
}

async function obtenerTodosLosGastosDashboard(token) {
  let pagina = 1;
  let todos = [];
  let seguir = true;

  while (seguir) {
    const data = await apiRequest(
      `/gastos?pagina=${pagina}`,
      "GET",
      null,
      token,
    );
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

async function cargarCuentasDashboardPorBanco(bancoId) {
  const token = getToken();
  if (!token || !cuentaDashboard || !bancoId) return;

  const data = await apiRequest(
    `/usuarios/me/cuentas?banco=${bancoId}`,
    "GET",
    null,
    token,
  );
  cuentasBancoDashboard = getApiData(data);

  cuentaDashboard.innerHTML = `
    <option value="">Todas las cuentas del banco</option>
    ${cuentasBancoDashboard
      .map(
        (c) => `
      <option value="${c._id}">${c.nombre}</option>
    `,
      )
      .join("")}
  `;
}

function calcularTotales(gastos) {
  let bancario = 0;
  let real = 0;

  gastos.forEach((g) => {
    if (debeContarGastoBancario(g)) {
      bancario += Number(g.flujoBancario) || 0;
    }

    if (debeContarGastoReal(g)) {
      real += Number(g.economiaReal) || 0;
    }
  });

  return {
    bancario: Number(bancario.toFixed(2)),
    real: Number(real.toFixed(2)),
  };
}

function acumularPorCategoria(gastos, tipo) {
  const acumulado = {};
  const agrupacion = tipoAgrupacionCategoria?.value || "subcategoria";

  gastos.forEach((g) => {
    const debeContar =
      tipo === "bancario" ? debeContarGastoBancario(g) : debeContarGastoReal(g);

    if (!debeContar) return;

    const valor =
      tipo === "bancario"
        ? Number(g.flujoBancario) || 0
        : Number(g.economiaReal) || 0;

    let nombre = "Sin categoría";

    if (agrupacion === "categoriaPrincipal") {
      nombre = g.categoria?.categoriaGrupo?.nombre || "Sin categoría principal";
    } else {
      nombre = g.categoria?.nombre || "Sin subcategoría";
    }

    acumulado[nombre] = (acumulado[nombre] || 0) + Math.abs(valor);
  });

  return Object.entries(acumulado).sort((a, b) => b[1] - a[1]);
}

function renderGastoRealPorCategoria(gastos) {
  const entries = acumularPorCategoria(gastos, "real");
  const labels = entries.map((e) => e[0]);
  const values = entries.map((e) => Number(e[1].toFixed(2)));

  crearChart("gastoRealCategoriaChart", "doughnut", {
    labels,
    datasets: [{ data: values }],
  });

  renderLegend("gastoRealCategoriaLegend", labels, values);
}

function renderGastoBancarioPorCategoria(gastos) {
  const entries = acumularPorCategoria(gastos, "bancario");
  const labels = entries.map((e) => e[0]);
  const values = entries.map((e) => Number(e[1].toFixed(2)));

  crearChart("gastoBancarioCategoriaChart", "doughnut", {
    labels,
    datasets: [{ data: values }],
  });

  renderLegend("gastoBancarioCategoriaLegend", labels, values);
}

function renderBancarioVsReal(gastos) {
  const { bancario, real } = calcularTotales(gastos);

  crearChart("bancarioVsRealChart", "bar", {
    labels: ["Gasto Bancario", "Gasto Real"],
    datasets: [
      {
        label: "Total",
        data: [Math.abs(bancario), Math.abs(real)],
      },
    ],
  });
}

function deduplicarGastos(gastos) {
  const map = new Map();

  gastos.forEach((g) => {
    const key =
      g._id ||
      `${g.fecha}-${g.descripcion}-${g.flujoBancario}-${g.economiaReal}-${getCuentaId(g)}`;

    if (!map.has(key)) {
      map.set(key, g);
    }
  });

  return Array.from(map.values());
}
/**
 * function deduplicarGastos(gastos) {
  const map = new Map();

  gastos.forEach((g) => {
    if (!g?._id) return;

    if (!map.has(g._id)) {
      map.set(g._id, g);
    }
  });

  return Array.from(map.values());
}
 */

function renderComparativoMensual() {
  const gastos = deduplicarGastos(filtrarPorBancoYCuenta(gastosGlobal));

  const acumulado = {};

  gastos.forEach((g) => {
    if (!g.fecha) return;

    const fecha = new Date(g.fecha);
    const key = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;

    if (!acumulado[key]) {
      acumulado[key] = {
        bancario: 0,
        real: 0,
      };
    }

    const flujo = Number(g.flujoBancario) || 0;

    if (debeContarGastoBancario(g)) {
      acumulado[key].bancario += Number(g.flujoBancario || 0);
    }

    if (debeContarGastoReal(g)) {
      acumulado[key].real += Number(g.economiaReal || 0);
    }
  });

  const labels = Object.keys(acumulado).sort();

  crearChart("evolucionMensualChart", "bar", {
    labels,
    datasets: [
      {
        label: "Gasto Bancario",
        data: labels.map((label) =>
          Math.abs(Number(acumulado[label].bancario.toFixed(2))),
        ),
      },
      {
        label: "Gasto Real",
        data: labels.map((label) =>
          Math.abs(Number(acumulado[label].real.toFixed(2))),
        ),
      },
    ],
  });
}

function renderSaldoDeudas(deudas) {
  const activas = deudas.filter((d) => d.activa);

  crearChart("deudasSaldoChart", "bar", {
    labels: activas.map((d) => d.descripcion),
    datasets: [
      {
        label: "Saldo restante",
        data: activas.map((d) => {
          const pagado = Number(d.montoCuota) * Number(d.cuotaActual);
          return Math.max(0, Number(d.montoTotal) - pagado);
        }),
      },
    ],
  });
}

function renderLegend(containerId, labels, values) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!labels.length) {
    container.innerHTML = "<p>No hay datos.</p>";
    return;
  }

  container.innerHTML = labels
    .map(
      (label, index) => `
    <div>
      <strong>${label}</strong>: ${formatMoney(values[index])}
    </div>
  `,
    )
    .join("");
}

function crearChart(canvasId, type, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (window.charts[canvasId]) {
    window.charts[canvasId].destroy();
  }

  window.charts[canvasId] = new Chart(canvas, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

function aplicarDashboard() {
  const gastos = getGastosDashboardFiltrados();

  renderGastoRealPorCategoria(gastos);
  renderGastoBancarioPorCategoria(gastos);
  renderBancarioVsReal(gastos);
  renderComparativoMensual();
  renderSaldoDeudas(deudasGlobal);
}

async function cargarDashboard() {
  const token = getToken();
  if (!token) return;

  const [gastosResp, deudasResp] = await Promise.all([
    obtenerTodosLosGastosDashboard(token),
    apiRequest("/deudas", "GET", null, token),
  ]);

  gastosGlobal = gastosResp;
  deudasGlobal = getApiData(deudasResp);

  if (bancoSeleccionadoDashboard?.value) {
    await cargarCuentasDashboardPorBanco(bancoSeleccionadoDashboard.value);
  }

  aplicarDashboard();
}

modoFiltroDashboard?.addEventListener("change", () => {
  actualizarVisibilidadFiltrosDashboard();
  aplicarDashboard();
});

document
  .getElementById("aplicarFiltroDashboard")
  ?.addEventListener("click", aplicarDashboard);

tipoAgrupacionCategoria?.addEventListener("change", aplicarDashboard);

cuentaDashboard?.addEventListener("change", aplicarDashboard);

bancoSeleccionadoDashboard?.addEventListener("change", async () => {
  await cargarCuentasDashboardPorBanco(bancoSeleccionadoDashboard.value);
  aplicarDashboard();
});

document.addEventListener("DOMContentLoaded", async () => {
  const now = new Date();

  mesDashboard.value = String(now.getUTCMonth() + 1);
  anioDashboard.value = now.getUTCFullYear();

  actualizarVisibilidadFiltrosDashboard();

  setTimeout(async () => {
    await cargarDashboard();
  }, 300);
});

function debugDiferenciaDashboard(mes, anio) {
  const gastosMes = gastosGlobal.filter((g) => {
    if (!g.fecha) return false;

    const fecha = new Date(g.fecha);

    return fecha.getUTCMonth() + 1 === mes && fecha.getUTCFullYear() === anio;
  });

  console.table(
    gastosMes.map((g) => ({
      fecha: g.fecha?.slice(0, 10),
      descripcion: g.descripcion,
      categoria: g.categoria?.nombre,
      cuenta: typeof g.cuenta === "object" ? g.cuenta.nombre : g.cuenta,
      flujoBancario: g.flujoBancario,
      economiaReal: g.economiaReal,
      incluirEnGastoBancario: g.incluirEnGastoBancario,
      incluirEnGastoReal: g.incluirEnGastoReal,
      cuentaBancario: debeContarGastoBancario(g),
      cuentaReal: debeContarGastoReal(g),
    })),
  );

  const totalBancario = gastosMes
    .filter(debeContarGastoBancario)
    .reduce((acc, g) => acc + Number(g.flujoBancario || 0), 0);

  const totalReal = gastosMes
    .filter(debeContarGastoReal)
    .reduce((acc, g) => acc + Number(g.economiaReal || 0), 0);

  console.log("Dashboard bancario:", totalBancario);
  console.log("Dashboard real:", totalReal);
}

function debugMarzoDashboardDetallado() {
  const gastosMarzo = deduplicarGastos(
    filtrarPorBancoYCuenta(gastosGlobal),
  ).filter((g) => {
    const fecha = new Date(g.fecha);
    return fecha.getUTCMonth() + 1 === 3 && fecha.getUTCFullYear() === 2026;
  });

  const incluidosBancario = gastosMarzo.filter(debeContarGastoBancario);
  const incluidosReal = gastosMarzo.filter(debeContarGastoReal);

  console.log("Cuenta seleccionada:", cuentaDashboard.value);
  console.log("Cantidad marzo filtrada:", gastosMarzo.length);

  console.table(
    gastosMarzo.map((g) => ({
      fecha: g.fecha?.slice(0, 10),
      descripcion: g.descripcion,
      categoria: g.categoria?.nombre,
      cuenta: typeof g.cuenta === "object" ? g.cuenta.nombre : g.cuenta,
      cuentaId: typeof g.cuenta === "object" ? g.cuenta._id : g.cuenta,
      flujoBancario: g.flujoBancario,
      economiaReal: g.economiaReal,
      incluirBancario: g.incluirEnGastoBancario,
      incluirReal: g.incluirEnGastoReal,
      cuentaBancario: debeContarGastoBancario(g),
      cuentaReal: debeContarGastoReal(g),
    })),
  );

  console.log(
    "Total bancario dashboard marzo:",
    incluidosBancario
      .reduce((acc, g) => acc + Number(g.flujoBancario || 0), 0)
      .toFixed(2),
  );

  console.log(
    "Total real dashboard marzo:",
    incluidosReal
      .reduce((acc, g) => acc + Number(g.economiaReal || 0), 0)
      .toFixed(2),
  );

  console.log("Incluidos bancario:");
  console.table(
    incluidosBancario.map((g) => ({
      fecha: g.fecha?.slice(0, 10),
      descripcion: g.descripcion,
      categoria: g.categoria?.nombre,
      flujoBancario: g.flujoBancario,
    })),
  );

  console.log("Incluidos real:");
  console.table(
    incluidosReal.map((g) => ({
      fecha: g.fecha?.slice(0, 10),
      descripcion: g.descripcion,
      categoria: g.categoria?.nombre,
      economiaReal: g.economiaReal,
    })),
  );
}
