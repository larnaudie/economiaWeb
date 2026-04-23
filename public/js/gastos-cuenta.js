requireAuth();

const params = new URLSearchParams(window.location.search);
const cuentaId = params.get("cuenta");
console.log("cuentaId recibido:", cuentaId);
if (!cuentaId || cuentaId === "undefined" || cuentaId === "null") {
  const body = document.getElementById("gastosCuentaBody");
  if (body) {
    body.innerHTML = `<tr><td colspan="8">El id de cuenta no es válido.</td></tr>`;
  }
  throw new Error("El id de cuenta no es válido.");
}
const modoFiltroGastosCuenta = document.getElementById("modoFiltroGastosCuenta");
const categoriaGastosCuenta = document.getElementById("categoriaGastosCuenta");
const mesGastosCuenta = document.getElementById("mesGastosCuenta");
const anioGastosCuenta = document.getElementById("anioGastosCuenta");
const desdeGastosCuenta = document.getElementById("desdeGastosCuenta");
const hastaGastosCuenta = document.getElementById("hastaGastosCuenta");

const grupoMesGastosCuenta = document.getElementById("grupoMesGastosCuenta");
const grupoAnioGastosCuenta = document.getElementById("grupoAnioGastosCuenta");
const grupoDesdeGastosCuenta = document.getElementById("grupoDesdeGastosCuenta");
const grupoHastaGastosCuenta = document.getElementById("grupoHastaGastosCuenta");

const filtrarGastosCuentaBtn = document.getElementById("filtrarGastosCuentaBtn");
const limpiarFiltroGastosCuentaBtn = document.getElementById("limpiarFiltroGastosCuentaBtn");

let gastosCuentaCache = [];
let categoriasCuentaCache = [];
let gastosCuentaTodos = [];

const selectAllGastosCuenta = document.getElementById("selectAllGastosCuenta");
const bulkCategoriaGastosCuenta = document.getElementById("bulkCategoriaGastosCuenta");
const bulkPorcentajeGastosCuenta = document.getElementById("bulkPorcentajeGastosCuenta");
const aplicarBulkGastosCuentaBtn = document.getElementById("aplicarBulkGastosCuentaBtn");
const eliminarBulkGastosCuentaBtn = document.getElementById("eliminarBulkGastosCuentaBtn");
const bulkGastosCuentaError = document.getElementById("bulkGastosCuentaError");
const bulkGastosCuentaSuccess = document.getElementById("bulkGastosCuentaSuccess");

const editarGastoCuentaModal = document.getElementById("editarGastoCuentaModal");
const editarGastoCuentaForm = document.getElementById("editarGastoCuentaForm");
const editarGastoCuentaId = document.getElementById("editarGastoCuentaId");
const editarGastoCuentaFecha = document.getElementById("editarGastoCuentaFecha");
const editarGastoCuentaDescripcion = document.getElementById("editarGastoCuentaDescripcion");
const editarGastoCuentaFlujo = document.getElementById("editarGastoCuentaFlujo");
const editarGastoCuentaPorcentaje = document.getElementById("editarGastoCuentaPorcentaje");
const editarGastoCuentaEconomia = document.getElementById("editarGastoCuentaEconomia");
const editarGastoCuentaCategoria = document.getElementById("editarGastoCuentaCategoria");
const editarGastoCuentaError = document.getElementById("editarGastoCuentaError");

const editarSeleccionadosGastosCuentaBtn = document.getElementById("editarSeleccionadosGastosCuentaBtn");
const bloquearSeleccionadosGastosCuentaBtn = document.getElementById("bloquearSeleccionadosGastosCuentaBtn");

let paginaActualGastosCuenta = 1;
let totalPaginasGastosCuenta = 1;

const prevGastosCuentaBtn = document.getElementById("prevGastosCuentaBtn");
const nextGastosCuentaBtn = document.getElementById("nextGastosCuentaBtn");
const gastosCuentaPaginaActual = document.getElementById("gastosCuentaPaginaActual");

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
}

async function calcularTotalPaginasGastosCuenta() {
  const token = getToken();
  if (!token) return 1;

  const { fechaDesde, fechaHasta } = getFiltrosGastosCuenta();

  let pagina = 1;
  let seguir = true;

  while (seguir) {
    const params = new URLSearchParams();
    params.set("cuenta", cuentaId);
    params.set("pagina", pagina);

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (categoriaGastosCuenta.value) params.set("categoria", categoriaGastosCuenta.value);

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, token);
    const gastosPagina = data.gastos || [];

    if (gastosPagina.length < 20) {
      seguir = false;
    } else {
      pagina++;
    }
  }

  return pagina;
}

async function obtenerTodosLosGastosCuentaFiltrados() {
  const token = getToken();
  if (!token) return [];

  let pagina = 1;
  let todos = [];
  let seguir = true;

  const { fechaDesde, fechaHasta } = getFiltrosGastosCuenta();

  while (seguir) {
    const params = new URLSearchParams();
    params.set("cuenta", cuentaId);
    params.set("pagina", pagina);

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (categoriaGastosCuenta.value) params.set("categoria", categoriaGastosCuenta.value);

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, token);
    const gastosPagina = data.gastos || [];

    todos = [...todos, ...gastosPagina];

    if (gastosPagina.length < 20) {
      seguir = false;
    } else {
      pagina++;
    }
  }

  return todos;
}

function renderResumenTotalesCuenta(gastos) {
  const body = document.getElementById("resumenTotalesCuentaBody");

  let gastoBancario = 0;
  let gastoReal = 0;
  let balanceBancario = 0;
  let balanceReal = 0;

  for (const gasto of gastos) {
    const flujo = Number(gasto.flujoBancario) || 0;
    const economia = Number(gasto.economiaReal) || 0;

    if (gasto.incluirEnGastoBancario === true) {
      gastoBancario += flujo;
    }

    if (gasto.incluirEnGastoReal === true) {
      gastoReal += economia;
    }

    balanceBancario += flujo;
    balanceReal += economia;
  }

  body.innerHTML = `
    <tr>
      <td>Gasto Bancario:</td>
      <td>${gastoBancario.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Gasto Real:</td>
      <td>${gastoReal.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Balance Bancario:</td>
      <td>${balanceBancario.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Balance Real:</td>
      <td>${balanceReal.toFixed(2)}</td>
    </tr>
  `;
}

function renderTotalesCategoriasCuenta(gastos) {
  const body = document.getElementById("totalesCategoriasCuentaBody");

  const acumulado = {};

  for (const g of gastos) {
    if (g.incluirEnGastoReal !== true) continue;

    const nombre = g.categoria?.nombre || "Sin categoría";
    const valor = Number(g.economiaReal) || 0;

    if (!acumulado[nombre]) {
      acumulado[nombre] = 0;
    }

    acumulado[nombre] += valor;
  }

  const filas = Object.entries(acumulado)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total);

  if (!filas.length) {
    body.innerHTML = `<tr><td colspan="2">No hay datos</td></tr>`;
    return;
  }

  body.innerHTML = filas.map(f => `
    <tr>
      <td>${f.nombre}</td>
      <td>${f.total.toFixed(2)}</td>
    </tr>
  `).join("");
}

async function cargarResumenYTotalesCuenta() {
  try {
    gastosCuentaTodos = await obtenerTodosLosGastosCuentaFiltrados();

    renderResumenTotalesCuenta(gastosCuentaTodos);
    renderTotalesCategoriasCuenta(gastosCuentaTodos);

  } catch (error) {
    console.error(error);
  }
}

function editarSeleccionadosGastosCuenta() {
  const seleccionados = gastosCuentaCache.filter(g => g.selected);

  if (!seleccionados.length) {
    bulkGastosCuentaError.textContent = "No hay gastos seleccionados.";
    return;
  }

  bulkGastosCuentaError.textContent = "";
  seleccionados.forEach(g => {
    g.isEditing = true;
  });

  renderGastosCuenta(gastosCuentaCache);
}

function bloquearSeleccionadosGastosCuenta() {
  const seleccionados = gastosCuentaCache.filter(g => g.selected);

  if (!seleccionados.length) {
    bulkGastosCuentaError.textContent = "No hay gastos seleccionados.";
    return;
  }

  bulkGastosCuentaError.textContent = "";
  seleccionados.forEach(g => {
    g.isEditing = false;
  });

  renderGastosCuenta(gastosCuentaCache);
}

/*
function esMovimientoInterno(gasto) {
  const nombreCategoria = String(gasto?.categoria?.nombre || "").toLowerCase();
  return nombreCategoria.includes("transf") || nombreCategoria.includes("ahorro");
}*/

function formatearFecha(fecha) {
  const d = new Date(fecha);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function renderGastosCuenta(gastos) {
  const body = document.getElementById("gastosCuentaBody");

  if (!gastos || gastos.length === 0) {
    body.innerHTML = `<tr><td colspan="8">No hay gastos</td></tr>`;
    return;
  }

  body.innerHTML = gastos.map(g => {
    const readOnlyAttr = g.isEditing ? "" : "readonly";
    const porcentajeDisabledAttr = Number(g.flujoBancario) === 0 ? "disabled" : "";

    return `
      <tr data-id="${g._id}">
        <td>
          <input type="checkbox" class="gasto-cuenta-checkbox" data-id="${g._id}" ${g.selected ? "checked" : ""}>
        </td>

        <td>
          <input type="date" class="row-fecha" value="${g.fecha ? new Date(g.fecha).toISOString().slice(0, 10) : ""}" ${readOnlyAttr}>
        </td>

        <td>
          <textarea class="row-descripcion" maxlength="500" ${readOnlyAttr}>${g.descripcion || ""}</textarea>
        </td>

        <td>
          <input type="number" class="row-flujo" step="0.01" value="${g.flujoBancario ?? 0}" ${readOnlyAttr}>
        </td>

        <td>
          <input type="number" class="row-porcentaje" min="0" max="100" step="0.01"
            value="${g.porcentajeEconomiaReal ?? 0}" ${porcentajeDisabledAttr}>
        </td>

        <td>
          <input type="number" class="row-economia" step="0.01"
            value="${g.economiaReal ?? 0}" ${Number(g.flujoBancario) === 0 ? "" : "readonly"}>
        </td>

        <td>
          <select class="row-categoria">
            ${buildCategoriaOptions(g.categoria?._id || g.categoria || "")}
          </select>
        </td>

        <td>
          <div class="inline-group">
            <button type="button" class="edit-row-btn" data-id="${g._id}">
              ${g.isEditing ? "Bloquear" : "Editar"}
            </button>

            <button type="button" class="save-row-btn" data-id="${g._id}">
              Guardar
            </button>

            <button type="button" class="delete-row-btn" data-id="${g._id}">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  attachGastosCuentaEvents();
  actualizarEstadoSelectAllGastosCuenta();
}

async function cargarCategoriasParaGastosCuenta() {
  const token = getToken();
  if (!token) return;

  const data = await apiRequest("/categorias", "GET", null, token);
  const categorias = data.categorias || [];
  categoriasCuentaCache = categorias;

  bulkCategoriaGastosCuenta.innerHTML = `
    <option value="">No cambiar</option>
    ${categorias.map(c => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
}

function buildCategoriaOptions(selectedValue = "") {
  return `
    <option value="">Seleccionar categoría</option>
    ${categoriasCuentaCache.map(c => `
      <option value="${c._id}" ${selectedValue === c._id ? "selected" : ""}>
        ${c.nombre}
      </option>
    `).join("")}
  `;
}

async function cargarGastosCuenta() {
  const token = getToken();
  if (!token) return;

  try {
    const { fechaDesde, fechaHasta } = getFiltrosGastosCuenta();

    const params = new URLSearchParams();
    params.set("cuenta", cuentaId);
    params.set("pagina", paginaActualGastosCuenta);

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (categoriaGastosCuenta.value) params.set("categoria", categoriaGastosCuenta.value);

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, token);

    gastosCuentaCache = (data.gastos || []).map(g => ({
      ...g,
      selected: false,
      isEditing: false
    }));

    renderGastosCuenta(gastosCuentaCache);

    if (gastosCuentaPaginaActual) {
      gastosCuentaPaginaActual.textContent = `${paginaActualGastosCuenta} / ${totalPaginasGastosCuenta}`;
    }

    if (prevGastosCuentaBtn) {
      prevGastosCuentaBtn.disabled = paginaActualGastosCuenta === 1;
    }

    if (nextGastosCuentaBtn) {
      nextGastosCuentaBtn.disabled = paginaActualGastosCuenta >= totalPaginasGastosCuenta;
    }

  } catch (error) {
    const body = document.getElementById("gastosCuentaBody");
    if (body) {
      body.innerHTML = `<tr><td colspan="8">${error.message || "Error al cargar gastos"}</td></tr>`;
    }
  }
}

function attachGastosCuentaEvents() {
  document.querySelectorAll(".gasto-cuenta-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const gasto = gastosCuentaCache.find(g => g._id === id);
      if (gasto) gasto.selected = e.target.checked;
      actualizarEstadoSelectAllGastosCuenta();
    });
  });

  document.querySelectorAll(".edit-row-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const gasto = gastosCuentaCache.find(g => g._id === id);
      if (!gasto) return;

      gasto.isEditing = !gasto.isEditing;
      renderGastosCuenta(gastosCuentaCache);
    });
  });

  document.querySelectorAll(".save-row-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      await guardarFilaGastoCuenta(id);
    });
  });

  document.querySelectorAll(".delete-row-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      await eliminarGastoCuenta(id);
    });
  });

  document.querySelectorAll("#gastosCuentaBody tr").forEach((rowElement) => {
    const id = rowElement.dataset.id;
    const gasto = gastosCuentaCache.find(g => g._id === id);
    if (!gasto) return;

    rowElement.querySelector(".row-fecha")?.addEventListener("input", (e) => {
      gasto.fecha = e.target.value;
    });

    rowElement.querySelector(".row-descripcion")?.addEventListener("input", (e) => {
      gasto.descripcion = e.target.value;
    });

    rowElement.querySelector(".row-flujo")?.addEventListener("input", (e) => {
      gasto.flujoBancario = Number(e.target.value);

      if (Number(gasto.flujoBancario) === 0) {
        gasto.porcentajeEconomiaReal = 0;
      } else {
        gasto.economiaReal = Number(
          (Number(gasto.flujoBancario) * (Number(gasto.porcentajeEconomiaReal) / 100)).toFixed(2)
        );
      }

      renderGastosCuenta(gastosCuentaCache);
    });

    rowElement.querySelector(".row-porcentaje")?.addEventListener("input", (e) => {
      if (Number(gasto.flujoBancario) === 0) {
        gasto.porcentajeEconomiaReal = 0;
        return;
      }

      gasto.porcentajeEconomiaReal = Number(e.target.value);
      gasto.economiaReal = Number(
        (Number(gasto.flujoBancario) * (Number(gasto.porcentajeEconomiaReal) / 100)).toFixed(2)
      );

      const economiaInput = rowElement.querySelector(".row-economia");
      if (economiaInput) {
        economiaInput.value = gasto.economiaReal;
      }
    });

    rowElement.querySelector(".row-economia")?.addEventListener("input", (e) => {
      if (Number(gasto.flujoBancario) === 0) {
        gasto.economiaReal = Number(e.target.value) || 0;
        gasto.porcentajeEconomiaReal = 0;
      }
    });

    rowElement.querySelector(".row-categoria")?.addEventListener("change", (e) => {
      gasto.categoria = e.target.value;
    });
  });
}

async function guardarFilaGastoCuenta(id) {
  const token = getToken();
  if (!token) return;

  const gasto = gastosCuentaCache.find(g => g._id === id);
  if (!gasto) return;

  if (!gasto.fecha) {
    bulkGastosCuentaError.textContent = "La fecha es obligatoria.";
    return;
  }

  if (!gasto.descripcion || gasto.descripcion.trim().length < 5) {
    bulkGastosCuentaError.textContent = "La descripción debe tener al menos 5 caracteres.";
    return;
  }

  if (!gasto.categoria) {
    bulkGastosCuentaError.textContent = "Seleccioná una categoría.";
    return;
  }

  try {
    await apiRequest(
      `/gastos/${id}`,
      "PATCH",
      {
        fecha: gasto.fecha,
        descripcion: gasto.descripcion.trim(),
        flujoBancario: Number(gasto.flujoBancario),
        porcentajeEconomiaReal: Number(gasto.porcentajeEconomiaReal),
        economiaReal: Number(gasto.economiaReal),
        categoria: gasto.categoria?._id || gasto.categoria,
        cuenta: cuentaId
      },
      token
    );

    gasto.isEditing = false;
    bulkGastosCuentaError.textContent = "";
    bulkGastosCuentaSuccess.textContent = "Gasto actualizado correctamente.";
    renderGastosCuenta(gastosCuentaCache);
    await cargarResumenYTotalesCuenta();
  } catch (error) {
    bulkGastosCuentaError.textContent = error.message || "Error al guardar el gasto.";
  }
}

function actualizarEstadoSelectAllGastosCuenta() {
  if (!gastosCuentaCache.length) {
    selectAllGastosCuenta.checked = false;
    selectAllGastosCuenta.indeterminate = false;
    return;
  }

  const seleccionados = gastosCuentaCache.filter(g => g.selected);

  if (seleccionados.length === 0) {
    selectAllGastosCuenta.checked = false;
    selectAllGastosCuenta.indeterminate = false;
    return;
  }

  if (seleccionados.length === gastosCuentaCache.length) {
    selectAllGastosCuenta.checked = true;
    selectAllGastosCuenta.indeterminate = false;
    return;
  }

  selectAllGastosCuenta.checked = false;
  selectAllGastosCuenta.indeterminate = true;
}

selectAllGastosCuenta.addEventListener("change", (e) => {
  gastosCuentaCache.forEach(g => {
    g.selected = e.target.checked;
  });
  renderGastosCuenta(gastosCuentaCache);
});

async function eliminarGastoCuenta(id) {
  const token = getToken();
  if (!token) return;

  const confirmado = confirm("¿Seguro que querés eliminar este gasto?");
  if (!confirmado) return;

  await apiRequest(`/gastos/${id}`, "DELETE", null, token);
  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();
}

async function eliminarGastosCuentaSeleccionados() {
  const token = getToken();
  if (!token) return;

  bulkGastosCuentaError.textContent = "";
  bulkGastosCuentaSuccess.textContent = "";

  const seleccionados = gastosCuentaCache.filter(g => g.selected);

  if (!seleccionados.length) {
    bulkGastosCuentaError.textContent = "No hay gastos seleccionados.";
    return;
  }

  const confirmado = confirm(`¿Seguro que querés eliminar ${seleccionados.length} gasto(s)?`);
  if (!confirmado) return;

  let eliminados = 0;
  let errores = 0;

  for (const gasto of seleccionados) {
    try {
      await apiRequest(`/gastos/${gasto._id}`, "DELETE", null, token);
      eliminados++;
    } catch {
      errores++;
    }
  }

  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();

  if (eliminados > 0) {
    bulkGastosCuentaSuccess.textContent = `Se eliminaron ${eliminados} gasto(s).`;
  }

  if (errores > 0) {
    bulkGastosCuentaError.textContent = `No se pudieron eliminar ${errores} gasto(s).`;
  }
}

function actualizarEconomiaEditarGastoCuenta() {
  const flujo = Number(editarGastoCuentaFlujo.value);
  const porcentaje = Number(editarGastoCuentaPorcentaje.value);

  if (
    Number.isNaN(flujo) ||
    Number.isNaN(porcentaje) ||
    editarGastoCuentaFlujo.value === "" ||
    editarGastoCuentaPorcentaje.value === ""
  ) {
    editarGastoCuentaEconomia.value = "";
    return;
  }

  if (flujo === 0) {
    editarGastoCuentaPorcentaje.value = 0;
    return;
  }

  editarGastoCuentaEconomia.value = (flujo * (porcentaje / 100)).toFixed(2);
}

async function editarGastoCuenta(id) {
  const token = getToken();
  if (!token) return;

  editarGastoCuentaError.textContent = "";
  await cargarCategoriasParaGastosCuenta();

  const data = await apiRequest(`/gastos/${id}`, "GET", null, token);
  const gasto = data.gasto;

  editarGastoCuentaId.value = gasto._id;
  editarGastoCuentaFecha.value = gasto.fecha ? new Date(gasto.fecha).toISOString().slice(0, 10) : "";
  editarGastoCuentaDescripcion.value = gasto.descripcion || "";
  editarGastoCuentaFlujo.value = gasto.flujoBancario ?? "";
  editarGastoCuentaPorcentaje.value = gasto.porcentajeEconomiaReal ?? 0;
  editarGastoCuentaEconomia.value = gasto.economiaReal ?? 0;
  editarGastoCuentaCategoria.value = gasto.categoria?._id || gasto.categoria || "";

  openModal(editarGastoCuentaModal);
}

function actualizarVisibilidadFiltrosGastosCuenta() {
  if (modoFiltroGastosCuenta.value === "mes") {
    grupoMesGastosCuenta.style.display = "";
    grupoAnioGastosCuenta.style.display = "";
    grupoDesdeGastosCuenta.style.display = "none";
    grupoHastaGastosCuenta.style.display = "none";
    return;
  }

  if (modoFiltroGastosCuenta.value === "anio") {
    grupoMesGastosCuenta.style.display = "none";
    grupoAnioGastosCuenta.style.display = "";
    grupoDesdeGastosCuenta.style.display = "none";
    grupoHastaGastosCuenta.style.display = "none";
    return;
  }

  grupoMesGastosCuenta.style.display = "none";
  grupoAnioGastosCuenta.style.display = "none";
  grupoDesdeGastosCuenta.style.display = "";
  grupoHastaGastosCuenta.style.display = "";
}

function buildDateRangeCuenta(modo, mes, anio, desde, hasta) {
  if (modo === "mes") {
    if (!anio || !mes) {
      throw new Error("Seleccioná mes y año.");
    }

    const mesNum = Number(mes);
    const anioNum = Number(anio);

    const fechaDesde = `${anioNum}-${String(mesNum).padStart(2, "0")}-01`;
    const ultimoDia = new Date(anioNum, mesNum, 0).getDate();
    const fechaHasta = `${anioNum}-${String(mesNum).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    return { fechaDesde, fechaHasta };
  }

  if (modo === "anio") {
    if (!anio) {
      throw new Error("Ingresá un año.");
    }

    const anioNum = Number(anio);
    return {
      fechaDesde: `${anioNum}-01-01`,
      fechaHasta: `${anioNum}-12-31`
    };
  }

  if (!desde || !hasta) {
    throw new Error("Seleccioná desde y hasta.");
  }

  if (desde > hasta) {
    throw new Error("La fecha desde no puede ser mayor que la fecha hasta.");
  }

  return {
    fechaDesde: desde,
    fechaHasta: hasta
  };
}

function getFiltrosGastosCuenta() {
  return buildDateRangeCuenta(
    modoFiltroGastosCuenta.value,
    mesGastosCuenta.value,
    anioGastosCuenta.value,
    desdeGastosCuenta.value,
    hastaGastosCuenta.value
  );
}

function resetFiltrosGastosCuenta() {
  modoFiltroGastosCuenta.value = "mes";
  mesGastosCuenta.value = String(new Date().getMonth() + 1);
  anioGastosCuenta.value = new Date().getFullYear();
  desdeGastosCuenta.value = "";
  hastaGastosCuenta.value = "";
  categoriaGastosCuenta.value = "";
  actualizarVisibilidadFiltrosGastosCuenta();
}

async function cargarCategoriasFiltroGastosCuenta() {
  const token = getToken();
  if (!token) return;

  const data = await apiRequest("/categorias", "GET", null, token);
  const categorias = data.categorias || [];

  categoriaGastosCuenta.innerHTML = `
    <option value="">Todas</option>
    ${categorias.map(c => `
      <option value="${c._id}">${c.nombre}</option>
    `).join("")}
  `;
}

async function aplicarBulkGastosCuenta() {
  const token = getToken();
  if (!token) return;

  bulkGastosCuentaError.textContent = "";
  bulkGastosCuentaSuccess.textContent = "";

  const seleccionados = gastosCuentaCache.filter(g => g.selected);
  const categoria = bulkCategoriaGastosCuenta.value;
  const porcentajeRaw = bulkPorcentajeGastosCuenta.value;

  const hayCategoria = categoria !== "";
  const hayPorcentaje = porcentajeRaw !== "";

  if (!seleccionados.length) {
    bulkGastosCuentaError.textContent = "No hay gastos seleccionados.";
    return;
  }

  if (!hayCategoria && !hayPorcentaje) {
    bulkGastosCuentaError.textContent = "Seleccioná al menos un valor para aplicar.";
    return;
  }

  let actualizados = 0;
  let errores = 0;

  for (const gasto of seleccionados) {
    try {
      let nuevoPorcentaje = Number(gasto.porcentajeEconomiaReal);
      let nuevaEconomia = Number(gasto.economiaReal);

      if (hayPorcentaje) {
        if (Number(gasto.flujoBancario) === 0) {
          nuevoPorcentaje = 0;
          nuevaEconomia = Number(gasto.economiaReal); // mantener valor original
        } else {
          nuevoPorcentaje = Number(porcentajeRaw);
          nuevaEconomia = Number((Number(gasto.flujoBancario) * (nuevoPorcentaje / 100)).toFixed(2));
        }
      }

      await apiRequest(
        `/gastos/${gasto._id}`,
        "PATCH",
        {
          fecha: new Date(gasto.fecha).toISOString().slice(0, 10),
          descripcion: gasto.descripcion,
          flujoBancario: Number(gasto.flujoBancario),
          porcentajeEconomiaReal: nuevoPorcentaje,
          economiaReal: nuevaEconomia,
          categoria: hayCategoria ? categoria : (gasto.categoria?._id || gasto.categoria),
          cuenta: cuentaId
        },
        token
      );

      actualizados++;
    } catch {
      errores++;
    }
  }

  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();

  if (actualizados > 0) {
    bulkGastosCuentaSuccess.textContent = `Se actualizaron ${actualizados} gasto(s).`;
  }

  if (errores > 0) {
    bulkGastosCuentaError.textContent = `No se pudieron actualizar ${errores} gasto(s).`;
  }
}

aplicarBulkGastosCuentaBtn.addEventListener("click", aplicarBulkGastosCuenta);
eliminarBulkGastosCuentaBtn.addEventListener("click", eliminarGastosCuentaSeleccionados);

editarGastoCuentaFlujo.addEventListener("input", actualizarEconomiaEditarGastoCuenta);
editarGastoCuentaPorcentaje.addEventListener("input", actualizarEconomiaEditarGastoCuenta);

document.querySelectorAll(".close-modal").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modalId = btn.dataset.close;
    const modal = document.getElementById(modalId);
    if (modal) closeModal(modal);
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    closeModal(e.target);
  }
});

window.editarGastoCuenta = editarGastoCuenta;
window.eliminarGastoCuenta = eliminarGastoCuenta;

editarGastoCuentaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  editarGastoCuentaError.textContent = "";

  const id = editarGastoCuentaId.value;
  const fecha = editarGastoCuentaFecha.value;
  const descripcion = editarGastoCuentaDescripcion.value.trim();
  const flujoBancario = Number(editarGastoCuentaFlujo.value);
  const porcentajeEconomiaReal = Number(editarGastoCuentaPorcentaje.value);
  const economiaReal = Number(editarGastoCuentaEconomia.value);
  const categoria = editarGastoCuentaCategoria.value;

  if (!id || !fecha || !descripcion || !categoria) {
    editarGastoCuentaError.textContent = "Todos los campos son obligatorios.";
    return;
  }

  if (descripcion.length < 5 || descripcion.length > 500) {
    editarGastoCuentaError.textContent = "La descripción debe tener entre 5 y 500 caracteres.";
    return;
  }

  if (Number.isNaN(flujoBancario) || Number.isNaN(porcentajeEconomiaReal) || Number.isNaN(economiaReal)) {
    editarGastoCuentaError.textContent = "Los valores numéricos no son válidos.";
    return;
  }

  if (porcentajeEconomiaReal < 0 || porcentajeEconomiaReal > 100) {
    editarGastoCuentaError.textContent = "El porcentaje debe estar entre 0 y 100.";
    return;
  }

  try {
    await apiRequest(
      `/gastos/${id}`,
      "PATCH",
      {
        fecha,
        descripcion,
        flujoBancario,
        porcentajeEconomiaReal,
        economiaReal,
        categoria,
        cuenta: cuentaId
      },
      token
    );

    closeModal(editarGastoCuentaModal);
    await cargarGastosCuenta();
  } catch (error) {
    editarGastoCuentaError.textContent = error.message || "Error al editar gasto.";
  }
});

modoFiltroGastosCuenta.addEventListener("change", actualizarVisibilidadFiltrosGastosCuenta);

filtrarGastosCuentaBtn.addEventListener("click", async () => {
  try {
    paginaActualGastosCuenta = 1;
    totalPaginasGastosCuenta = await calcularTotalPaginasGastosCuenta();
    await cargarGastosCuenta();
    await cargarResumenYTotalesCuenta();
  } catch (error) {
    const body = document.getElementById("gastosCuentaBody");
    body.innerHTML = `<tr><td colspan="8">${error.message || "Error al filtrar gastos"}</td></tr>`;
  }
});

limpiarFiltroGastosCuentaBtn.addEventListener("click", async () => {
  try {
    resetFiltrosGastosCuenta();
    paginaActualGastosCuenta = 1;
    totalPaginasGastosCuenta = await calcularTotalPaginasGastosCuenta();
    await cargarGastosCuenta();
    await cargarResumenYTotalesCuenta();
  } catch (error) {
    const body = document.getElementById("gastosCuentaBody");
    body.innerHTML = `<tr><td colspan="8">${error.message || "Error al limpiar filtros"}</td></tr>`;
  }
});

categoriaGastosCuenta.addEventListener("change", async () => {
  paginaActualGastosCuenta = 1;
  totalPaginasGastosCuenta = await calcularTotalPaginasGastosCuenta();
  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();
});

editarSeleccionadosGastosCuentaBtn.addEventListener("click", editarSeleccionadosGastosCuenta);
bloquearSeleccionadosGastosCuentaBtn.addEventListener("click", bloquearSeleccionadosGastosCuenta);

if (prevGastosCuentaBtn) {
  prevGastosCuentaBtn.addEventListener("click", async () => {
    if (paginaActualGastosCuenta > 1) {
      paginaActualGastosCuenta--;
      await cargarGastosCuenta();
    }
  });
}

if (nextGastosCuentaBtn) {
  nextGastosCuentaBtn.addEventListener("click", async () => {
    if (paginaActualGastosCuenta < totalPaginasGastosCuenta) {
      paginaActualGastosCuenta++;
      await cargarGastosCuenta();
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  resetFiltrosGastosCuenta();
  await cargarCategoriasFiltroGastosCuenta();
  await cargarCategoriasParaGastosCuenta();
  totalPaginasGastosCuenta = await calcularTotalPaginasGastosCuenta();
  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();

});