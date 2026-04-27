requireAuth();
renderHeader({ title: "Crear Gasto" });;

const token = getToken();

  
const gestionError = document.getElementById("gestionError");

const prevGastosBtn = document.getElementById("prevGastosBtn");
const nextGastosBtn = document.getElementById("nextGastosBtn");
const gastosPaginaActual = document.getElementById("gastosPaginaActual");

const selectAllGastos = document.getElementById("selectAllGastos");
const bulkGastoCategoria = document.getElementById("bulkGastoCategoria");
const bulkGastoCuenta = document.getElementById("bulkGastoCuenta");
const bulkGastoPorcentaje = document.getElementById("bulkGastoPorcentaje");
const aplicarBulkGastosBtn = document.getElementById("aplicarBulkGastosBtn");
const eliminarGastosSeleccionadosBtn = document.getElementById("eliminarGastosSeleccionadosBtn");
const bulkGastosError = document.getElementById("bulkGastosError");
const bulkGastosSuccess = document.getElementById("bulkGastosSuccess");

const filtroFechaDesde = document.getElementById("filtroFechaDesde");
const filtroFechaHasta = document.getElementById("filtroFechaHasta");
const filtrarGastosBtn = document.getElementById("filtrarGastosBtn");
const limpiarFiltroGastosBtn = document.getElementById("limpiarFiltroGastosBtn");

const openGastoModalBtn = document.getElementById("openGastoModal");
const gastoModal = document.getElementById("gastoModal");
const modalGastoForm = document.getElementById("modalGastoForm");
const modalGastoFecha = document.getElementById("modalGastoFecha");
const modalGastoDescripcion = document.getElementById("modalGastoDescripcion");
const modalGastoFlujo = document.getElementById("modalGastoFlujo");
const modalGastoPorcentaje = document.getElementById("modalGastoPorcentaje");
const modalGastoEconomia = document.getElementById("modalGastoEconomia");
const modalGastoCategoria = document.getElementById("modalGastoCategoria");
const modalGastoCuenta = document.getElementById("modalGastoCuenta");
const modalGastoError = document.getElementById("modalGastoError");

const editarGastoModal = document.getElementById("editarGastoModal");
const editarGastoForm = document.getElementById("editarGastoForm");
const editarGastoId = document.getElementById("editarGastoId");
const editarGastoFecha = document.getElementById("editarGastoFecha");
const editarGastoDescripcion = document.getElementById("editarGastoDescripcion");
const editarGastoFlujo = document.getElementById("editarGastoFlujo");
const editarGastoPorcentaje = document.getElementById("editarGastoPorcentaje");
const editarGastoEconomia = document.getElementById("editarGastoEconomia");
const editarGastoCategoria = document.getElementById("editarGastoCategoria");
const editarGastoCuenta = document.getElementById("editarGastoCuenta");
const editarGastoError = document.getElementById("editarGastoError");

const modoFiltroGastos = document.getElementById("modoFiltroGastos");
const mesGastos = document.getElementById("mesGastos");
const anioGastos = document.getElementById("anioGastos");

const grupoMesGastos = document.getElementById("grupoMesGastos");
const grupoAnioGastos = document.getElementById("grupoAnioGastos");
const grupoDesdeGastos = document.getElementById("grupoDesdeGastos");
const grupoHastaGastos = document.getElementById("grupoHastaGastos");

let paginaActual = 1;
let totalPaginas = 1;

let gastosCache = [];
let categoriasCache = [];
let cuentasCache = [];

function actualizarVisibilidadFiltrosGastos() {
  if (modoFiltroGastos.value === "mes") {
    grupoMesGastos.style.display = "";
    grupoAnioGastos.style.display = "";
    grupoDesdeGastos.style.display = "none";
    grupoHastaGastos.style.display = "none";
    return;
  }

  if (modoFiltroGastos.value === "anio") {
    grupoMesGastos.style.display = "none";
    grupoAnioGastos.style.display = "";
    grupoDesdeGastos.style.display = "none";
    grupoHastaGastos.style.display = "none";
    return;
  }

  grupoMesGastos.style.display = "none";
  grupoAnioGastos.style.display = "none";
  grupoDesdeGastos.style.display = "";
  grupoHastaGastos.style.display = "";
}

function obtenerFechasFiltroGastos() {
  const modo = modoFiltroGastos.value;

  if (modo === "mes") {
    const mes = Number(mesGastos.value);
    const anio = Number(anioGastos.value);

    if (!mes || !anio) {
      throw new Error("Seleccioná mes y año.");
    }

    const fechaDesde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const fechaHasta = `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

    return { fechaDesde, fechaHasta };
  }

  if (modo === "anio") {
    const anio = Number(anioGastos.value);

    if (!anio) {
      throw new Error("Ingresá un año.");
    }

    return {
      fechaDesde: `${anio}-01-01`,
      fechaHasta: `${anio}-12-31`
    };
  }

  if (!filtroFechaDesde.value || !filtroFechaHasta.value) {
    throw new Error("Seleccioná fecha desde y hasta.");
  }

  if (filtroFechaDesde.value > filtroFechaHasta.value) {
    throw new Error("La fecha desde no puede ser mayor que la fecha hasta.");
  }

  return {
    fechaDesde: filtroFechaDesde.value,
    fechaHasta: filtroFechaHasta.value
  };
}

function resetFiltrosGastos() {
  modoFiltroGastos.value = "mes";
  mesGastos.value = String(new Date().getMonth() + 1);
  anioGastos.value = new Date().getFullYear();
  filtroFechaDesde.value = "";
  filtroFechaHasta.value = "";
  actualizarVisibilidadFiltrosGastos();
}

function getAuthToken() {
  if (!token) {
    window.location.href = "login.html";
    return null;
  }
  return token;
}

function openModal(modal) {
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
}

function renderList(containerId, items, renderItem) {
  const container = document.getElementById(containerId);

  if (!items || items.length === 0) {
    container.innerHTML = '<tr><td colspan="9">No hay elementos registrados.</td></tr>';
    return;
  }

  container.innerHTML = items.map(renderItem).join("");
}

function actualizarEstadoSelectAll(items, checkbox) {
  if (!items.length) {
    checkbox.checked = false;
    checkbox.indeterminate = false;
    return;
  }

  const seleccionados = items.filter(item => item.selected);

  if (seleccionados.length === 0) {
    checkbox.checked = false;
    checkbox.indeterminate = false;
    return;
  }

  if (seleccionados.length === items.length) {
    checkbox.checked = true;
    checkbox.indeterminate = false;
    return;
  }

  checkbox.checked = false;
  checkbox.indeterminate = true;
}

function toggleSelectAll(items, checked) {
  items.forEach(item => {
    item.selected = checked;
  });
}

function formatearFecha(fecha) {
  const d = new Date(fecha);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function fechaInputValue(fecha) {
  const d = new Date(fecha);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderBulkGastosSelects() {
  bulkGastoCategoria.innerHTML =
    '<option value="">No cambiar</option>' +
    categoriasCache.map(categoria => `<option value="${categoria._id}">${categoria.nombre}</option>`).join("");

  bulkGastoCuenta.innerHTML =
    '<option value="">No cambiar</option>' +
    cuentasCache.map(cuenta => `<option value="${cuenta._id}">${cuenta.nombre}</option>`).join("");
}

function renderModalGastoSelects() {
  modalGastoCategoria.innerHTML =
    '<option value="">Seleccionar categoría</option>' +
    categoriasCache.map(categoria => `<option value="${categoria._id}">${categoria.nombre}</option>`).join("");

  modalGastoCuenta.innerHTML =
    '<option value="">Seleccionar cuenta</option>' +
    cuentasCache.map(cuenta => `<option value="${cuenta._id}">${cuenta.nombre}</option>`).join("");
}

function renderEditarGastoSelects(categoriaSeleccionada = "", cuentaSeleccionada = "") {
  editarGastoCategoria.innerHTML =
    '<option value="">Seleccionar categoría</option>' +
    categoriasCache.map(categoria => `
      <option value="${categoria._id}" ${categoriaSeleccionada === categoria._id ? "selected" : ""}>
        ${categoria.nombre}
      </option>
    `).join("");

  editarGastoCuenta.innerHTML =
    '<option value="">Seleccionar cuenta</option>' +
    cuentasCache.map(cuenta => `
      <option value="${cuenta._id}" ${cuentaSeleccionada === cuenta._id ? "selected" : ""}>
        ${cuenta.nombre}
      </option>
    `).join("");
}

function actualizarEconomiaModalGasto() {
  const flujo = Number(modalGastoFlujo.value);
  const porcentaje = Number(modalGastoPorcentaje.value);

  if (
    Number.isNaN(flujo) ||
    Number.isNaN(porcentaje) ||
    modalGastoFlujo.value === "" ||
    modalGastoPorcentaje.value === ""
  ) {
    modalGastoEconomia.value = "";
    return;
  }

  modalGastoEconomia.value = (flujo * (porcentaje / 100)).toFixed(2);
}

function actualizarEconomiaEditarGasto() {
  const flujo = Number(editarGastoFlujo.value);
  const porcentaje = Number(editarGastoPorcentaje.value);

  if (
    Number.isNaN(flujo) ||
    Number.isNaN(porcentaje) ||
    editarGastoFlujo.value === "" ||
    editarGastoPorcentaje.value === ""
  ) {
    editarGastoEconomia.value = "";
    return;
  }

  editarGastoEconomia.value = (flujo * (porcentaje / 100)).toFixed(2);
}

modalGastoFlujo.addEventListener("input", actualizarEconomiaModalGasto);
modalGastoPorcentaje.addEventListener("input", actualizarEconomiaModalGasto);
editarGastoFlujo.addEventListener("input", actualizarEconomiaEditarGasto);
editarGastoPorcentaje.addEventListener("input", actualizarEconomiaEditarGasto);

function attachGastoEvents() {
  document.querySelectorAll(".gasto-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const gasto = gastosCache.find(g => g._id === id);
      if (gasto) gasto.selected = e.target.checked;
      actualizarEstadoSelectAll(gastosCache, selectAllGastos);
    });
  });
}

async function cargarRecursos() {
  const authToken = getAuthToken();
  if (!authToken) return;

  const [categorias, cuentas] = await Promise.all([
    apiRequest("/categorias", "GET", null, authToken),
    apiRequest("/cuentas", "GET", null, authToken)
  ]);

  categoriasCache = getApiData(categorias);
  cuentasCache = getApiData(cuentas);

  renderBulkGastosSelects();
}

async function calcularTotalPaginasGastos() {
  const authToken = getAuthToken();
  if (!authToken) return 1;

  const { fechaDesde, fechaHasta } = obtenerFechasFiltroGastos();

  let pagina = 1;
  let seguir = true;

  while (seguir) {
    const params = new URLSearchParams();
    params.set("pagina", pagina);
    params.set("fechaDesde", fechaDesde);
    params.set("fechaHasta", fechaHasta);

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, authToken);
    const gastosPagina = getApiData(data);

    if (gastosPagina.length < 20) {
      seguir = false;
    } else {
      pagina++;
    }
  }

  return pagina;
}

async function cargarGastosPaginados() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const { fechaDesde, fechaHasta } = obtenerFechasFiltroGastos();

    const params = new URLSearchParams();
    params.set("pagina", paginaActual);
    params.set("fechaDesde", fechaDesde);
    params.set("fechaHasta", fechaHasta);

    const data = await apiRequest(`/gastos?${params.toString()}`, "GET", null, authToken);

    gastosCache = (getApiData(data)).map(gasto => ({
      ...gasto,
      selected: false
    }));

    renderTableRows({
      containerId: "gastosList",
      items: gastosCache,
      colspan: 11,
      renderItem: gasto => `
      <tr>
        <td><input type="checkbox" class="gasto-checkbox" data-id="${gasto._id}" ${gasto.selected ? "checked" : ""}></td>
        <td>${gasto.fecha ? formatearFecha(gasto.fecha) : "N/A"}</td>
        <td>${gasto.descripcion || "N/A"}</td>
        <td>${gasto.cuenta?.nombre || "N/A"}</td>
        <td>${gasto.categoria?.nombre || "N/A"}</td>
        <td>${gasto.flujoBancario ?? "N/A"}</td>
        <td>${gasto.porcentajeEconomiaReal ?? "N/A"}</td>
        <td>${gasto.economiaReal ?? "N/A"}</td>
        <td>
          <button type="button" onclick="editarGasto('${gasto._id}')">Editar</button>
          <button type="button" onclick="eliminarGasto('${gasto._id}')">Eliminar</button>
        </td>
      </tr>
    `
    });

    gastosPaginaActual.textContent = `${paginaActual} / ${totalPaginas}`;
    prevGastosBtn.disabled = paginaActual === 1;
    nextGastosBtn.disabled = paginaActual >= totalPaginas;

    actualizarEstadoSelectAll(gastosCache, selectAllGastos);
    attachGastoEvents();
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar los gastos";
  }
}

async function editarGasto(id) {
  const authToken = getAuthToken();
  if (!authToken) return;

  editarGastoError.textContent = "";

  try {
    await cargarRecursos();

    const gastoActual = await apiRequest(`/gastos/${id}`, "GET", null, authToken);
    const gasto = gastoActual.gasto;

    editarGastoId.value = gasto._id;
    editarGastoFecha.value = gasto.fecha ? fechaInputValue(gasto.fecha) : "";
    editarGastoDescripcion.value = gasto.descripcion || "";
    editarGastoFlujo.value = gasto.flujoBancario ?? "";
    editarGastoPorcentaje.value = gasto.porcentajeEconomiaReal ?? "";
    editarGastoEconomia.value = gasto.economiaReal ?? "";

    renderEditarGastoSelects(
      gasto.categoria?._id || gasto.categoria || "",
      gasto.cuenta?._id || gasto.cuenta || ""
    );

    actualizarEconomiaEditarGasto();
    openModal(editarGastoModal);
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar el gasto para editar";
  }
}

async function eliminarGasto(id) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const confirmado = confirm("¿Seguro que querés eliminar este gasto?");
  if (!confirmado) return;

  try {
    await apiRequest(`/gastos/${id}`, "DELETE", null, authToken);
    totalPaginas = await calcularTotalPaginasGastos();
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    await cargarGastosPaginados();
  } catch (error) {
    gestionError.textContent = error.message || "Error al eliminar gasto";
  }
}

async function aplicarBulkGastos() {
  const authToken = getAuthToken();
  if (!authToken) return;

  bulkGastosError.textContent = "";
  bulkGastosSuccess.textContent = "";

  const categoria = bulkGastoCategoria.value;
  const cuenta = bulkGastoCuenta.value;
  const porcentajeRaw = bulkGastoPorcentaje.value;

  const hayCategoria = categoria !== "";
  const hayCuenta = cuenta !== "";
  const hayPorcentaje = porcentajeRaw !== "";

  if (!hayCategoria && !hayCuenta && !hayPorcentaje) {
    bulkGastosError.textContent = "Seleccioná al menos un valor para aplicar.";
    return;
  }

  const seleccionados = getSelectedItems(gastosCache);

  if (!seleccionados.length) {
    bulkGastosError.textContent = "No hay gastos seleccionados.";
    return;
  }

  if (hayPorcentaje) {
    const porcentaje = Number(porcentajeRaw);
    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      bulkGastosError.textContent = "El porcentaje debe estar entre 0 y 100.";
      return;
    }
  }

  let actualizados = 0;
  let errores = 0;

  for (const gasto of seleccionados) {
    try {
      const nuevoPorcentaje = hayPorcentaje ? Number(porcentajeRaw) : Number(gasto.porcentajeEconomiaReal);
      const nuevoFlujo = Number(gasto.flujoBancario);
      const nuevaEconomiaReal = Number((nuevoFlujo * (nuevoPorcentaje / 100)).toFixed(2));

      await apiRequest(
        `/gastos/${gasto._id}`,
        "PATCH",
        {
          fecha: gasto.fecha,
          descripcion: gasto.descripcion,
          flujoBancario: nuevoFlujo,
          economiaReal: nuevaEconomiaReal,
          porcentajeEconomiaReal: nuevoPorcentaje,
          categoria: hayCategoria ? categoria : (gasto.categoria?._id || gasto.categoria),
          cuenta: hayCuenta ? cuenta : (gasto.cuenta?._id || gasto.cuenta)
        },
        authToken
      );

      actualizados++;
    } catch {
      errores++;
    }
  }

  await cargarGastosPaginados();

  if (actualizados > 0) bulkGastosSuccess.textContent = `Se actualizaron ${actualizados} gasto(s).`;
  if (errores > 0) bulkGastosError.textContent = `No se pudieron actualizar ${errores} gasto(s).`;
}

async function eliminarGastosSeleccionados() {
  const authToken = getAuthToken();
  if (!authToken) return;

  bulkGastosError.textContent = "";
  bulkGastosSuccess.textContent = "";

  const seleccionados = getSelectedItems(gastosCache);

  if (!seleccionados.length) {
    bulkGastosError.textContent = "No hay gastos seleccionados.";
    return;
  }

  const confirmado = confirm(`¿Seguro que querés eliminar ${seleccionados.length} gasto(s)?`);
  if (!confirmado) return;

  let eliminados = 0;
  let errores = 0;

  for (const gasto of seleccionados) {
    try {
      await apiRequest(`/gastos/${gasto._id}`, "DELETE", null, authToken);
      eliminados++;
    } catch {
      errores++;
    }
  }

  totalPaginas = await calcularTotalPaginasGastos();
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;
  await cargarGastosPaginados();

  if (eliminados > 0) bulkGastosSuccess.textContent = `Se eliminaron ${eliminados} gasto(s).`;
  if (errores > 0) bulkGastosError.textContent = `No se pudieron eliminar ${errores} gasto(s).`;
}

modalGastoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const authToken = getAuthToken();
  if (!authToken) return;

  modalGastoError.textContent = "";

  const fecha = modalGastoFecha.value;
  const descripcion = modalGastoDescripcion.value.trim();
  const flujoBancario = Number(modalGastoFlujo.value);
  const porcentajeEconomiaReal = Number(modalGastoPorcentaje.value);
  const economiaReal = Number(modalGastoEconomia.value);
  const categoria = modalGastoCategoria.value;
  const cuenta = modalGastoCuenta.value;

  if (
    !fecha ||
    !descripcion ||
    !categoria ||
    !cuenta ||
    modalGastoFlujo.value === "" ||
    modalGastoPorcentaje.value === "" ||
    modalGastoEconomia.value === "" ||
    Number.isNaN(flujoBancario) ||
    Number.isNaN(porcentajeEconomiaReal) ||
    Number.isNaN(economiaReal)
  ) {
    modalGastoError.textContent = "Todos los campos son obligatorios.";
    return;
  }

  if (descripcion.length < 5 || descripcion.length > 500) {
    modalGastoError.textContent = "La descripción debe tener entre 5 y 500 caracteres.";
    return;
  }

  if (porcentajeEconomiaReal < 0 || porcentajeEconomiaReal > 100) {
    modalGastoError.textContent = "El porcentaje debe estar entre 0 y 100.";
    return;
  }

  try {
    await apiRequest(
      "/gastos",
      "POST",
      {
        fecha,
        descripcion,
        flujoBancario,
        economiaReal,
        porcentajeEconomiaReal,
        categoria,
        cuenta
      },
      authToken
    );

    modalGastoForm.reset();
    modalGastoPorcentaje.value = 100;
    modalGastoEconomia.value = "";
    closeModal(gastoModal);

    totalPaginas = await calcularTotalPaginasGastos();
    await cargarGastosPaginados();
  } catch (error) {
    modalGastoError.textContent = error.message || "Error al crear gasto";
  }
});

editarGastoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const authToken = getAuthToken();
  if (!authToken) return;

  editarGastoError.textContent = "";

  const id = editarGastoId.value;
  const fecha = editarGastoFecha.value;
  const descripcion = editarGastoDescripcion.value.trim();
  const flujoBancario = Number(editarGastoFlujo.value);
  const porcentajeEconomiaReal = Number(editarGastoPorcentaje.value);
  const economiaReal = Number(editarGastoEconomia.value);
  const categoria = editarGastoCategoria.value;
  const cuenta = editarGastoCuenta.value;

  if (
    !id ||
    !fecha ||
    !descripcion ||
    !categoria ||
    !cuenta ||
    editarGastoFlujo.value === "" ||
    editarGastoPorcentaje.value === "" ||
    editarGastoEconomia.value === "" ||
    Number.isNaN(flujoBancario) ||
    Number.isNaN(porcentajeEconomiaReal) ||
    Number.isNaN(economiaReal)
  ) {
    editarGastoError.textContent = "Todos los campos son obligatorios.";
    return;
  }

  if (descripcion.length < 5 || descripcion.length > 500) {
    editarGastoError.textContent = "La descripción debe tener entre 5 y 500 caracteres.";
    return;
  }

  if (porcentajeEconomiaReal < 0 || porcentajeEconomiaReal > 100) {
    editarGastoError.textContent = "El porcentaje debe estar entre 0 y 100.";
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
        economiaReal,
        porcentajeEconomiaReal,
        categoria,
        cuenta
      },
      authToken
    );

    closeModal(editarGastoModal);
    editarGastoForm.reset();
    editarGastoEconomia.value = "";

    totalPaginas = await calcularTotalPaginasGastos();
    await cargarGastosPaginados();
  } catch (error) {
    editarGastoError.textContent = error.message || "Error al editar gasto";
  }
});

openGastoModalBtn.addEventListener("click", async () => {
  modalGastoError.textContent = "";
  await cargarRecursos();
  renderModalGastoSelects();
  actualizarEconomiaModalGasto();
  openModal(gastoModal);
});

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

prevGastosBtn.addEventListener("click", async () => {
  if (paginaActual > 1) {
    paginaActual--;
    await cargarGastosPaginados();
  }
});

nextGastosBtn.addEventListener("click", async () => {
  if (paginaActual < totalPaginas) {
    paginaActual++;
    await cargarGastosPaginados();
  }
});

modoFiltroGastos.addEventListener("change", actualizarVisibilidadFiltrosGastos);

filtrarGastosBtn.addEventListener("click", async () => {
  try {
    paginaActual = 1;
    totalPaginas = await calcularTotalPaginasGastos();
    await cargarGastosPaginados();
  } catch (error) {
    gestionError.textContent = error.message || "Error al aplicar el filtro";
  }
});

limpiarFiltroGastosBtn.addEventListener("click", async () => {
  try {
    resetFiltrosGastos();
    paginaActual = 1;
    totalPaginas = await calcularTotalPaginasGastos();
    await cargarGastosPaginados();
  } catch (error) {
    gestionError.textContent = error.message || "Error al limpiar el filtro";
  }
});

selectAllGastos.addEventListener("change", (e) => {
  toggleSelectAll(gastosCache, e.target.checked);

  renderTableRows({
    containerId: "gastosList",
    items: gastosCache,
    colspan: 11,
    renderItem: gasto => `
    <tr>
      <td><input type="checkbox" class="gasto-checkbox" data-id="${gasto._id}" ${gasto.selected ? "checked" : ""}></td>
      <td>${gasto.fecha ? formatearFecha(gasto.fecha) : "N/A"}</td>
      <td>${gasto.descripcion || "N/A"}</td>
      <td>${gasto.cuenta?.nombre || "N/A"}</td>
      <td>${gasto.categoria?.nombre || "N/A"}</td>
      <td>${gasto.flujoBancario ?? "N/A"}</td>
      <td>${gasto.porcentajeEconomiaReal ?? "N/A"}</td>
      <td>${gasto.economiaReal ?? "N/A"}</td>
      <td>
        <button type="button" onclick="editarGasto('${gasto._id}')">Editar</button>
        <button type="button" onclick="eliminarGasto('${gasto._id}')">Eliminar</button>
      </td>
    </tr>
  `
  });

  attachGastoEvents();
  actualizarEstadoSelectAll(gastosCache, selectAllGastos);
});

aplicarBulkGastosBtn.addEventListener("click", aplicarBulkGastos);
eliminarGastosSeleccionadosBtn.addEventListener("click", eliminarGastosSeleccionados);
 

window.editarGasto = editarGasto;
window.eliminarGasto = eliminarGasto;

document.addEventListener("DOMContentLoaded", async () => {
  resetFiltrosGastos();
  await cargarRecursos();
  totalPaginas = await calcularTotalPaginasGastos();
  await cargarGastosPaginados();
});