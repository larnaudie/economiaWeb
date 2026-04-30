requireAuth();
renderHeader({ title: "Gastos por Cuenta" });;

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
const busquedaGastosCuenta = document.getElementById("busquedaGastosCuenta");
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

const editarGastoCuentaIncluirBancario = document.getElementById("editarGastoCuentaIncluirBancario");
const editarGastoCuentaIncluirReal = document.getElementById("editarGastoCuentaIncluirReal");

let paginaActualGastosCuenta = 1;
let totalPaginasGastosCuenta = 1;

const prevGastosCuentaBtn = document.getElementById("prevGastosCuentaBtn");
const nextGastosCuentaBtn = document.getElementById("nextGastosCuentaBtn");
const gastosCuentaPaginaActual = document.getElementById("gastosCuentaPaginaActual");

const verDesgloseBancarioBtn = document.getElementById("verDesgloseBancarioBtn");
const verDesgloseRealBtn = document.getElementById("verDesgloseRealBtn");
const desgloseGastosCuentaSection = document.getElementById("desgloseGastosCuentaSection");
const desgloseGastosCuentaTitulo = document.getElementById("desgloseGastosCuentaTitulo");
const desgloseGastosCuentaBody = document.getElementById("desgloseGastosCuentaBody");

const selectAllDesglose = document.getElementById("selectAllDesglose");
const editarSeleccionadosDesgloseBtn = document.getElementById("editarSeleccionadosDesgloseBtn");
const bloquearSeleccionadosDesgloseBtn = document.getElementById("bloquearSeleccionadosDesgloseBtn");
const eliminarSeleccionadosDesgloseBtn = document.getElementById("eliminarSeleccionadosDesgloseBtn");

const bulkDesgloseError = document.getElementById("bulkDesgloseError");
const bulkDesgloseSuccess = document.getElementById("bulkDesgloseSuccess");

const guardarSeleccionadosDesgloseBtn = document.getElementById("guardarSeleccionadosDesgloseBtn");

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
    if (busquedaGastosCuenta?.value.trim()) {
      params.set("busqueda", busquedaGastosCuenta.value.trim());
    }

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, token);
    const gastosPagina = getApiData(data);

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
    if (busquedaGastosCuenta?.value.trim()) {
      params.set("busqueda", busquedaGastosCuenta.value.trim());
    }

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, token);
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

function esTransferencia(gasto) {
  const nombreCategoria = String(gasto?.categoria?.nombre || "").toLowerCase();
  return nombreCategoria.includes("transf");
}

function renderResumenTotalesCuenta(gastos) {
  let gastoBancario = 0;
  let gastoReal = 0;
  let saldoBancario = 0;

  gastos.forEach(g => {
    const flujo = Number(g.flujoBancario) || 0;
    const real = Number(g.economiaReal) || 0;
    const transferencia = esTransferencia(g);

    saldoBancario += flujo;

    if (g.incluirEnGastoBancario === true && flujo < 0 && !transferencia) {
      gastoBancario += flujo;
    }

    if (g.incluirEnGastoReal === true && real < 0 && !transferencia) {
      gastoReal += real;
    }
  });

  document.getElementById("gastoBancarioTotal").textContent = formatMoney(gastoBancario)
  document.getElementById("gastoRealTotal").textContent = formatMoney(gastoReal);
  document.getElementById("saldoBancarioTotal").textContent = formatMoney(saldoBancario);
}

function obtenerGastosParaDesglose(tipo) {
  return gastosCuentaTodos
    .filter(g => {
      const transferencia = esTransferencia(g);

      if (tipo === "bancario") {
        const flujo = Number(g.flujoBancario) || 0;
        return g.incluirEnGastoBancario === true && flujo < 0 && !transferencia;
      }

      if (tipo === "real") {
        const real = Number(g.economiaReal) || 0;
        return g.incluirEnGastoReal === true && real < 0 && !transferencia;
      }

      return false;
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

function renderDesgloseGastosCuenta(tipo) {
  const gastos = obtenerGastosParaDesglose(tipo);

  desgloseGastosCuentaSection.style.display = "";

  desgloseGastosCuentaTitulo.textContent =
    tipo === "bancario"
      ? "Desglose de Gasto Bancario"
      : "Desglose de Gasto Real";

  if (!gastos.length) {
    desgloseGastosCuentaBody.innerHTML = `<tr><td colspan="6">No hay gastos incluidos en este total.</td></tr>`;
    return;
  }

  let acumulado = 0;

  desgloseGastosCuentaBody.innerHTML = gastos.map(g => {
    const monto = tipo === "bancario"
      ? Number(g.flujoBancario) || 0
      : Number(g.economiaReal) || 0;

    acumulado += monto;

    return `
      <tr data-id="${g._id}">
        <td>
          <input type="checkbox" class="desglose-checkbox" data-id="${g._id}">
        </td>
        <td>${g.fecha ? formatFechaUTC(g.fecha) : "N/A"}</td>
        <td>${g.descripcion || "N/A"}</td>
        <td>${g.categoria?.nombre || "Sin categoría"}</td>
        <td>${formatMoney(monto)}</td>
        <td>${formatMoney(acumulado)}</td>
        <td>
          <button type="button" onclick="editarGastoCuenta('${g._id}')">Editar</button>
          <button type="button" onclick="eliminarGastoCuenta('${g._id}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join("");
}

function getDesgloseSeleccionados() {
  const checkboxes = document.querySelectorAll(".desglose-checkbox:checked");
  const ids = Array.from(checkboxes).map(cb => cb.dataset.id);

  return gastosCuentaTodos.filter(g => ids.includes(g._id));
}

selectAllDesglose.addEventListener("change", (e) => {
  document.querySelectorAll(".desglose-checkbox").forEach(cb => {
    cb.checked = e.target.checked;
  });
});

let tipoDesgloseActual = null;

editarSeleccionadosDesgloseBtn.addEventListener("click", () => {
  const seleccionados = getDesgloseSeleccionados();

  if (!seleccionados.length) {
    bulkDesgloseError.textContent = "No hay gastos seleccionados.";
    return;
  }

  bulkDesgloseError.textContent = "";

  seleccionados.forEach(g => g.isEditing = true);

  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

bloquearSeleccionadosDesgloseBtn.addEventListener("click", () => {
  const seleccionados = getDesgloseSeleccionados();

  if (!seleccionados.length) {
    bulkDesgloseError.textContent = "No hay gastos seleccionados.";
    return;
  }

  bulkDesgloseError.textContent = "";

  seleccionados.forEach(g => g.isEditing = false);

  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

eliminarSeleccionadosDesgloseBtn.addEventListener("click", async () => {
  const token = getToken();
  if (!token) return;

  const seleccionados = getDesgloseSeleccionados();

  if (!seleccionados.length) {
    bulkDesgloseError.textContent = "No hay gastos seleccionados.";
    return;
  }

  const confirmado = confirm(`¿Eliminar ${seleccionados.length} gastos?`);
  if (!confirmado) return;

  let eliminados = 0;

  for (const g of seleccionados) {
    try {
      await apiRequest(`/gastos/${g._id}`, "DELETE", null, token);
      eliminados++;
    } catch { }
  }

  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();

  bulkDesgloseSuccess.textContent = `${eliminados} gastos eliminados`;
});

guardarSeleccionadosDesgloseBtn.addEventListener("click", async () => {
  const token = getToken();
  if (!token) return;

  const seleccionados = getDesgloseSeleccionados();

  if (!seleccionados.length) {
    bulkDesgloseError.textContent = "No hay gastos seleccionados.";
    return;
  }

  bulkDesgloseError.textContent = "";
  bulkDesgloseSuccess.textContent = "";

  let actualizados = 0;
  let errores = 0;

  for (const g of seleccionados) {
    try {
      const incluirEnGastoBancario = Number(g.flujoBancario) !== 0
        ? g.incluirEnGastoBancario
        : false;

      const incluirEnGastoReal = Number(g.economiaReal) !== 0
        ? g.incluirEnGastoReal
        : false;

      await apiRequest(
        `/gastos/${g._id}`,
        "PATCH",
        {
          fecha: g.fecha,
          descripcion: g.descripcion,
          flujoBancario: Number(g.flujoBancario),
          economiaReal: Number(g.economiaReal),
          porcentajeEconomiaReal: Number(g.porcentajeEconomiaReal),
          categoria: g.categoria?._id || g.categoria,
          cuenta: g.cuenta?._id || g.cuenta,
          incluirEnGastoBancario,
          incluirEnGastoReal
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
    bulkDesgloseSuccess.textContent = `${actualizados} gastos actualizados`;
  }

  if (errores > 0) {
    bulkDesgloseError.textContent = `${errores} errores al actualizar`;
  }
});

function renderTotalesCategoriasCuenta(gastos) {
  const body = document.getElementById("totalesCategoriasCuentaBody");

  const acumulado = {};

  for (const g of gastos) {
    const nombre = g.categoria?.nombre || "Sin categoría";
    const valor = Number(g.economiaReal) || 0;

    if (!acumulado[nombre]) {
      acumulado[nombre] = 0;
    }

    acumulado[nombre] += valor;
  }

  const filas = Object.entries(acumulado)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => a.total - b.total);

  if (!filas.length) {
    body.innerHTML = `<tr><td colspan="2">No hay datos</td></tr>`;
    return;
  }

  body.innerHTML = filas.map(f => `
    <tr>
      <td>${f.nombre}</td>
      <td>${formatMoney(f.total)}</td>
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
  const seleccionados = getSelectedItems(gastosCuentaCache);

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
  const seleccionados = getSelectedItems(gastosCuentaCache);

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

function renderGastosCuenta(gastos) {
  const body = document.getElementById("gastosCuentaBody");

  if (!gastos || gastos.length === 0) {
    body.innerHTML = `<tr><td colspan="10">No hay gastos</td></tr>`;
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
          <input 
  type="checkbox" 
  class="row-incluir-bancario" 
  ${g.incluirEnGastoBancario ? "checked" : ""}
  ${Number(g.flujoBancario) === 0 ? "disabled" : ""}
>
        </td>

        <td>
          <input 
  type="checkbox" 
  class="row-incluir-real" 
  ${g.incluirEnGastoReal ? "checked" : ""}
  ${Number(g.economiaReal) === 0 ? "disabled" : ""}
>
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
  const categorias = getApiData(data);
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
    if (busquedaGastosCuenta?.value.trim()) {
      params.set("busqueda", busquedaGastosCuenta.value.trim());
    }

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, token);

    gastosCuentaCache = (getApiData(data)).map(g => ({
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
  const rows = document.querySelectorAll("#gastosCuentaBody tr");

  rows.forEach(row => {
    const id = row.dataset.id;
    const gasto = gastosCuentaCache.find(g => g._id === id);

    if (!gasto) return;

    row.querySelector(".row-descripcion")?.addEventListener("input", e => {
      gasto.descripcion = e.target.value;
    });

    row.querySelector(".row-flujo")?.addEventListener("input", e => {
      gasto.flujoBancario = Number(e.target.value);

      if (Number(formatMoney(gasto.flujoBancario)) === 0) {
        gasto.incluirEnGastoBancario = false;
      }

      renderResumenTotalesCuenta(gastosCuentaCache);
    });

    row.querySelector(".row-porcentaje")?.addEventListener("input", e => {
      gasto.porcentajeEconomiaReal = Number(e.target.value);
    });

    row.querySelector(".row-economia")?.addEventListener("input", e => {
      gasto.economiaReal = formatMoney(Number(e.target.value));

      if (Number(formatMoney(gasto.economiaReal)) === 0) {
        gasto.incluirEnGastoReal = false;
      }

      renderResumenTotalesCuenta(gastosCuentaCache);
    });

    row.querySelector(".row-categoria")?.addEventListener("change", e => {
      gasto.categoria = e.target.value;
    });

    row.querySelector(".row-incluir-bancario")?.addEventListener("change", e => {
      gasto.incluirEnGastoBancario = Number(formatMoney(gasto.flujoBancario)) !== 0
        ? e.target.checked
        : false;

      const gastoEnTodos = gastosCuentaTodos.find(g => g._id === id);
      if (gastoEnTodos) {
        gastoEnTodos.incluirEnGastoBancario = gasto.incluirEnGastoBancario;
      }

      renderResumenTotalesCuenta(gastosCuentaTodos);
    });

    row.querySelector(".row-incluir-real")?.addEventListener("change", e => {
      gasto.incluirEnGastoReal = Number(formatMoney(gasto.economiaReal)) !== 0
        ? e.target.checked
        : false;

      const gastoEnTodos = gastosCuentaTodos.find(g => g._id === id);
      if (gastoEnTodos) {
        gastoEnTodos.incluirEnGastoReal = gasto.incluirEnGastoReal;
      }

      renderResumenTotalesCuenta(gastosCuentaTodos);
    });

    row.querySelector(".save-row-btn")?.addEventListener("click", () => {
      guardarFilaGastoCuenta(id);
    });
  });
}

async function guardarFilaGastoCuenta(id) {
  const token = getToken();
  if (!token) return;

  const gasto = gastosCuentaCache.find(g => g._id === id);
  if (!gasto) return;

  const incluirEnGastoBancario = Number(formatMoney(gasto.flujoBancario)) !== 0
    ? gasto.incluirEnGastoBancario
    : false;

  const incluirEnGastoReal = Number(formatMoney(gasto.economiaReal)) !== 0
    ? gasto.incluirEnGastoReal
    : false;

  try {
    await apiRequest(
      `/gastos/${id}`,
      "PATCH",
      {
        fecha: gasto.fecha,
        descripcion: String(gasto.descripcion || "").trim(),
        flujoBancario: Number(formatMoney(gasto.flujoBancario)),
        porcentajeEconomiaReal: Number(gasto.porcentajeEconomiaReal),
        economiaReal: Number(formatMoney(gasto.economiaReal)),
        categoria: gasto.categoria?._id || gasto.categoria,
        cuenta: cuentaId,
        incluirEnGastoBancario,
        incluirEnGastoReal
      },
      token
    );

    await cargarGastosCuenta();
    await cargarResumenYTotalesCuenta();

    bulkGastosCuentaSuccess.textContent = "Gasto actualizado correctamente.";
  } catch (error) {
    bulkGastosCuentaError.textContent = error.message || "Error al actualizar gasto.";
  }
}

function actualizarEstadoSelectAllGastosCuenta() {
  updateSelectAllState(gastosCuentaCache, selectAllGastosCuenta);
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

  const seleccionados = getSelectedItems(gastosCuentaCache);

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

  editarGastoCuentaEconomia.value = formatMoney(flujo * (porcentaje / 100));
}

async function editarGastoCuenta(id) {
  const token = getToken();
  if (!token) return;

  editarGastoCuentaError.textContent = "";
  await cargarCategoriasParaGastosCuenta();

  const data = await apiRequest(`/gastos/${id}`, "GET", null, token);
  const gasto = getApiData(data, null);

  editarGastoCuentaId.value = gasto._id;
  editarGastoCuentaFecha.value = gasto.fecha ? new Date(gasto.fecha).toISOString().slice(0, 10) : "";
  editarGastoCuentaDescripcion.value = gasto.descripcion || "";
  editarGastoCuentaFlujo.value = gasto.flujoBancario ?? "";
  editarGastoCuentaPorcentaje.value = gasto.porcentajeEconomiaReal ?? 0;
  editarGastoCuentaEconomia.value = formatMoney(gasto.economiaReal) ?? 0;
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
  mesGastosCuenta.value = "1";
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
  const categorias = getApiData(data);

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

  const seleccionados = getSelectedItems(gastosCuentaCache);
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
      let nuevaEconomia = Number(formatMoney(gasto.economiaReal));

      if (hayPorcentaje) {
        if (Number(formatMoney(gasto.flujoBancario)) === 0) {
          nuevoPorcentaje = 0;
          nuevaEconomia = Number(formatMoney(gasto.economiaReal)); // mantener valor original
        } else {
          nuevoPorcentaje = Number(porcentajeRaw);
          nuevaEconomia = Number((Number(formatMoney(gasto.flujoBancario)) * (nuevoPorcentaje / 100)).toFixed(2));
        }
      }

      await apiRequest(
        `/gastos/${gasto._id}`,
        "PATCH",
        {
          fecha: new Date(gasto.fecha).toISOString().slice(0, 10),
          descripcion: gasto.descripcion,
          flujoBancario: Number(formatMoney(gasto.flujoBancario)),
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

verDesgloseBancarioBtn.addEventListener("click", () => {
  tipoDesgloseActual = "bancario";
  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

verDesgloseRealBtn.addEventListener("click", () => {
  tipoDesgloseActual = "real";
  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

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