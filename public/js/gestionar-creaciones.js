requireAuth();
renderHeader({ title: "Gestión de Creaciones" });;

const token = getToken();
  
const gestionError = document.getElementById("gestionError");

const prevGastosBtn = document.getElementById("prevGastosBtn");
const nextGastosBtn = document.getElementById("nextGastosBtn");
const gastosPaginaActual = document.getElementById("gastosPaginaActual");

// Bulk bancos
const selectAllBancos = document.getElementById("selectAllBancos");
const eliminarBancosSeleccionadosBtn = document.getElementById("eliminarBancosSeleccionadosBtn");
const bulkBancosError = document.getElementById("bulkBancosError");
const bulkBancosSuccess = document.getElementById("bulkBancosSuccess");

// Bulk cuentas
const selectAllCuentas = document.getElementById("selectAllCuentas");
const bulkCuentaBanco = document.getElementById("bulkCuentaBanco");
const aplicarBulkCuentasBtn = document.getElementById("aplicarBulkCuentasBtn");
const eliminarCuentasSeleccionadasBtn = document.getElementById("eliminarCuentasSeleccionadasBtn");
const bulkCuentasError = document.getElementById("bulkCuentasError");
const bulkCuentasSuccess = document.getElementById("bulkCuentasSuccess");

// Bulk gastos
const selectAllGastos = document.getElementById("selectAllGastos");
const eliminarGastosSeleccionadosBtn = document.getElementById("eliminarGastosSeleccionadosBtn");
const bulkGastosError = document.getElementById("bulkGastosError");
const bulkGastosSuccess = document.getElementById("bulkGastosSuccess");

const filtroFechaDesde = document.getElementById("filtroFechaDesde");
const filtroFechaHasta = document.getElementById("filtroFechaHasta");
const filtrarGastosBtn = document.getElementById("filtrarGastosBtn");
const limpiarFiltroGastosBtn = document.getElementById("limpiarFiltroGastosBtn");

const selectAllCategorias = document.getElementById("selectAllCategorias");
const eliminarCategoriasSeleccionadasBtn = document.getElementById("eliminarCategoriasSeleccionadasBtn");
const bulkCategoriasError = document.getElementById("bulkCategoriasError");
const bulkCategoriasSuccess = document.getElementById("bulkCategoriasSuccess");

const openBancoModalBtn = document.getElementById("openBancoModal");
const openCuentaModalBtn = document.getElementById("openCuentaModal");
const openCategoriaModalBtn = document.getElementById("openCategoriaModal");
const openGastoModalBtn = document.getElementById("openGastoModal");

const bancoModal = document.getElementById("bancoModal");
const cuentaModal = document.getElementById("cuentaModal");
const categoriaModal = document.getElementById("categoriaModal");
const gastoModal = document.getElementById("gastoModal");

const modalBancoForm = document.getElementById("modalBancoForm");
const modalCuentaForm = document.getElementById("modalCuentaForm");
const modalCategoriaForm = document.getElementById("modalCategoriaForm");
const modalGastoForm = document.getElementById("modalGastoForm");

const modalBancoNombre = document.getElementById("modalBancoNombre");
const modalCuentaNombre = document.getElementById("modalCuentaNombre");
const modalCuentaBanco = document.getElementById("modalCuentaBanco");
const modalCategoriaNombre = document.getElementById("modalCategoriaNombre");

const modalGastoFecha = document.getElementById("modalGastoFecha");
const modalGastoDescripcion = document.getElementById("modalGastoDescripcion");
const modalGastoFlujo = document.getElementById("modalGastoFlujo");
const modalGastoPorcentaje = document.getElementById("modalGastoPorcentaje");
const modalGastoEconomia = document.getElementById("modalGastoEconomia");
const modalGastoCategoria = document.getElementById("modalGastoCategoria");
const modalGastoCuenta = document.getElementById("modalGastoCuenta");

const modalGastoIncluirBancario = document.getElementById("modalGastoIncluirBancario");
const modalGastoIncluirReal = document.getElementById("modalGastoIncluirReal");

const modalBancoError = document.getElementById("modalBancoError");
const modalCuentaError = document.getElementById("modalCuentaError");
const modalCategoriaError = document.getElementById("modalCategoriaError");
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

//const filtroMes = document.getElementById("filtroMes");
//const filtroAnio = document.getElementById("filtroAnio");

const modoFiltroGastos = document.getElementById("modoFiltroGastos");
const mesGastos = document.getElementById("mesGastos");
const anioGastos = document.getElementById("anioGastos");

const grupoMesGastos = document.getElementById("grupoMesGastos");
const grupoAnioGastos = document.getElementById("grupoAnioGastos");
const grupoDesdeGastos = document.getElementById("grupoDesdeGastos");
const grupoHastaGastos = document.getElementById("grupoHastaGastos");

const filtroCategoriaGastos = document.getElementById("filtroCategoriaGastos");
const filtroCuentaGastos = document.getElementById("filtroCuentaGastos");

const editarSeleccionadosGastosBtn = document.getElementById("editarSeleccionadosGastosBtn");
const bloquearSeleccionadosGastosBtn = document.getElementById("bloquearSeleccionadosGastosBtn");

const bulkGastoIncluirBancario = document.getElementById("bulkGastoIncluirBancario");
const bulkGastoIncluirReal = document.getElementById("bulkGastoIncluirReal");


let paginaGastosActual = 1;
let totalPaginasGastos = 1;

let bancosCache = [];
let cuentasCache = [];
let gastosCache = [];
let categoriasCache = [];

async function cargarBancos() {
  const token = getAuthToken();
  const data = await apiRequest("/bancos", "GET", null, token);
  bancosCache = getApiData(data)
}

async function cargarCuentas() {
  const token = getAuthToken();
  const data = await apiRequest("/cuentas", "GET", null, token);
  cuentasCache = getApiData(data);
}

async function cargarCategorias() {
  const token = getAuthToken();
  if (!token) return;

  const data = await apiRequest("/categorias", "GET", null, token);
  categoriasCache = getApiData(data);
}

function editarSeleccionadosGastos() {
  const seleccionados = getSelectedItems(gastosCache);

  if (!seleccionados.length) {
    bulkGastosError.textContent = "No hay gastos seleccionados.";
    return;
  }

  bulkGastosError.textContent = "";
  seleccionados.forEach(g => g.isEditing = true);
  renderGastosPaginados();
}

function bloquearSeleccionadosGastos() {
  const seleccionados = getSelectedItems(gastosCache);

  if (!seleccionados.length) {
    bulkGastosError.textContent = "No hay gastos seleccionados.";
    return;
  }

  bulkGastosError.textContent = "";
  seleccionados.forEach(g => g.isEditing = false);
  renderGastosPaginados();
}

function actualizarVisibilidadFiltrosGastos() {
  if (modoFiltroGastos.value === "todos") {
    grupoMesGastos.style.display = "none";
    grupoAnioGastos.style.display = "none";
    grupoDesdeGastos.style.display = "none";
    grupoHastaGastos.style.display = "none";
    return;
  }

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

function buildDateRangeGestion(modo, mes, anio, desde, hasta) {
  if (modo === "mes") {
    if (!mes || !anio) {
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

    return {
      fechaDesde: `${anio}-01-01`,
      fechaHasta: `${anio}-12-31`
    };
  }

  if (!desde || !hasta) {
    throw new Error("Seleccioná desde y hasta.");
  }

  if (desde > hasta) {
    throw new Error("La fecha desde no puede ser mayor que hasta.");
  }

  return {
    fechaDesde: desde,
    fechaHasta: hasta
  };
}

function getFiltrosTodosLosGastos() {
  if (modoFiltroGastos.value === "todos") {
    return {
      fechaDesde: "",
      fechaHasta: "",
      categoria: filtroCategoriaGastos.value,
      cuenta: filtroCuentaGastos.value
    };
  }

  const { fechaDesde, fechaHasta } = buildDateRangeGestion(
    modoFiltroGastos.value,
    mesGastos.value,
    anioGastos.value,
    filtroFechaDesde.value,
    filtroFechaHasta.value
  );

  return {
    fechaDesde,
    fechaHasta,
    categoria: filtroCategoriaGastos.value,
    cuenta: filtroCuentaGastos.value
  };
}

function resetFiltrosTodosLosGastos() {
  modoFiltroGastos.value = "todos";
  mesGastos.value = "";
  anioGastos.value = new Date().getFullYear();
  filtroFechaDesde.value = "";
  filtroFechaHasta.value = "";
  filtroCategoriaGastos.value = "";
  filtroCuentaGastos.value = "";
  actualizarVisibilidadFiltrosGastos();
}

function renderFiltrosGastos() {
  filtroCategoriaGastos.innerHTML = `
    <option value="">Todas</option>
    ${categoriasCache.map(c => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;

  filtroCuentaGastos.innerHTML = `
    <option value="">Todas</option>
    ${cuentasCache.map(c => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
}

function getAuthToken() {
  if (!token) {
    window.location.href = "login.html";
    return null;
  }
  return token;
}

function renderEditarGastoSelects(categoriaSeleccionada = "", cuentaSeleccionada = "") {
  editarGastoCategoria.innerHTML =
    '<option value="">Seleccionar categoría</option>' +
    categoriasCache
      .map(categoria => `
        <option value="${categoria._id}" ${categoriaSeleccionada === categoria._id ? "selected" : ""}>
          ${categoria.nombre}
        </option>
      `)
      .join("");

  editarGastoCuenta.innerHTML =
    '<option value="">Seleccionar cuenta</option>' +
    cuentasCache
      .map(cuenta => `
        <option value="${cuenta._id}" ${cuentaSeleccionada === cuenta._id ? "selected" : ""}>
          ${cuenta.nombre}
        </option>
      `)
      .join("");
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

  const calculado = flujo * (porcentaje / 100);
  editarGastoEconomia.value = calculado.toFixed(2);
}

function renderBulkBancosSelect() {
  bulkCuentaBanco.innerHTML = '<option value="">No cambiar</option>' +
    bancosCache
      .map(banco => `<option value="${banco._id}">${banco.nombre}</option>`)
      .join("");
}

async function calcularTotalPaginasGastos() {
  const authToken = getAuthToken();
  if (!authToken) return 1;

  let pagina = 1;
  let seguir = true;

  const { fechaDesde, fechaHasta, categoria, cuenta } = getFiltrosTodosLosGastos();

  while (seguir) {
    const params = new URLSearchParams();
    params.set("pagina", pagina);

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (categoria) params.set("categoria", categoria);
    if (cuenta) params.set("cuenta", cuenta);

    const data = await apiRequest(`/usuarios/me/gastos?${params.toString()}`, "GET", null, authToken);
    const gastosPagina = getApiData(data);

    if (gastosPagina.length < 20) {
      seguir = false;
    } else {
      pagina++;
    }
  }

  return pagina;
}

async function cargarRecursosBulk() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const [bancos, categorias] = await Promise.all([
      apiRequest("/usuarios/me/bancos", "GET", null, authToken),
      apiRequest("/usuarios/me/categorias", "GET", null, authToken)
    ]);

    bancosCache = (getApiData(bancos)).map(b => ({ ...b, selected: b.selected ?? false }));
    categoriasCache = getApiData(categorias);

    renderBulkBancosSelect();
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar recursos auxiliares";
  }
}

function attachBancoEvents() {
  document.querySelectorAll(".banco-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const banco = bancosCache.find(b => b._id === id);
      if (banco) banco.selected = e.target.checked;
      updateSelectAllState(bancosCache, selectAllBancos);
    });
  });
}

function attachCuentaEvents() {
  document.querySelectorAll(".cuenta-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const cuenta = cuentasCache.find(c => c._id === id);
      if (cuenta) cuenta.selected = e.target.checked;
      updateSelectAllState(cuentasCache, selectAllCuentas);
    });
  });
}

function attachGastoEvents() {
  document.querySelectorAll(".gasto-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const gasto = gastosCache.find(g => g._id === id);
      if (gasto) gasto.selected = e.target.checked;
      updateSelectAllState(gastosCache, selectAllGastos);
    });
  });

  document.querySelectorAll(".gasto-incluir-bancario").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const gasto = gastosCache.find(g => g._id === id);
      if (!gasto) return;

      gasto.incluirEnGastoBancario = Number(gasto.flujoBancario) !== 0
        ? e.target.checked
        : false;
    });
  });

  document.querySelectorAll(".gasto-incluir-real").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const gasto = gastosCache.find(g => g._id === id);
      if (!gasto) return;

      gasto.incluirEnGastoReal = Number(gasto.economiaReal) !== 0
        ? e.target.checked
        : false;
    });
  });
}

async function cargarGastosPaginados() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const { fechaDesde, fechaHasta, categoria, cuenta } = getFiltrosTodosLosGastos();

    const params = new URLSearchParams();
    params.set("pagina", paginaGastosActual);

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);
    if (categoria) params.set("categoria", categoria);
    if (cuenta) params.set("cuenta", cuenta);

    const data = await apiRequest(`/usuarios/me/gastos?${params.toString()}`, "GET", null, authToken);

    gastosCache = getApiData(data).map(gasto => ({
      ...gasto,
      selected: false,
      isEditing: false
    }));

    renderGastosPaginados();
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar los gastos";
  }
}

async function cargarListas() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const [bancos, cuentas, categorias] = await Promise.all([
      apiRequest("/usuarios/me/bancos", "GET", null, authToken),
      apiRequest("/usuarios/me/cuentas", "GET", null, authToken),
      apiRequest("/usuarios/me/categorias", "GET", null, authToken)
    ]);

    bancosCache = (getApiData(bancos)).map(banco => ({
      ...banco,
      selected: false
    }));

    cuentasCache = (getApiData(cuentas)).map(cuenta => ({
      ...cuenta,
      selected: false
    }));

    categoriasCache = (getApiData(categorias)).map(categoria => ({
      ...categoria,
      selected: false
    }));

    renderTableRows({
      containerId: "bancosList",
      items: bancosCache,
      colspan: 3,
      renderItem: banco => `
      <tr>
        <td><input type="checkbox" class="banco-checkbox" data-id="${banco._id}" ${banco.selected ? "checked" : ""}></td>
        <td>${banco.nombre}</td>
        <td>
          <button type="button" onclick="editarBanco('${banco._id}', '${escapeQuotes(banco.nombre)}')">Editar</button>
          <button type="button" onclick="eliminarBanco('${banco._id}')">Eliminar</button>
        </td>
      </tr>
    `
    });

    renderTableRows({
      containerId: "cuentasList",
      items: cuentasCache,
      colspan: 4,
      renderItem: cuenta => `
  <tr>
    <td>
      <input type="checkbox" class="cuenta-checkbox" data-id="${cuenta._id}" ${cuenta.selected ? "checked" : ""}>
    </td>
    <td>${cuenta.nombre}</td>
    <td>${cuenta.banco?.nombre || "N/A"}</td>
    <td>
      <button
        type="button"
        onclick="editarCuenta(
          '${cuenta._id}',
          '${escapeQuotes(cuenta.nombre)}',
          '${cuenta.banco?._id || cuenta.banco || ""}'
        )"
      >
        Editar
      </button>
      <button type="button" onclick="eliminarCuenta('${cuenta._id}')">Eliminar</button>
    </td>
  </tr>
`
    });

    renderTableRows({
      containerId: "categoriasList",
      items: categoriasCache,
      colspan: 3,
      renderItem: categoria => `
      <tr>
        <td><input type="checkbox" class="categoria-checkbox" data-id="${categoria._id}" ${categoria.selected ? "checked" : ""}></td>
        <td>${categoria.nombre}</td>
        <td>
          <button type="button" onclick="editarCategoria('${categoria._id}', '${escapeQuotes(categoria.nombre)}')">Editar</button>
          <button type="button" onclick="eliminarCategoria('${categoria._id}')">Eliminar</button>
        </td>
      </tr>
    `
    });

    updateSelectAllState(bancosCache, selectAllBancos);
    updateSelectAllState(cuentasCache, selectAllCuentas);
    updateSelectAllState(categoriasCache, selectAllCategorias);

    attachBancoEvents();
    attachCuentaEvents();
    attachCategoriaEvents();

    renderBulkBancosSelect();
    renderFiltrosGastos();
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar los datos";
  }
}

function attachCategoriaEvents() {
  document.querySelectorAll(".categoria-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const categoria = categoriasCache.find(c => c._id === id);
      if (categoria) categoria.selected = e.target.checked;
      updateSelectAllState(categoriasCache, selectAllCategorias);
    });
  });
}

async function editarCategoria(id, nombreActual) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const nuevoNombre = prompt("Nuevo nombre de la categoría:", nombreActual);
  if (!nuevoNombre || !nuevoNombre.trim()) return;

  try {
    await apiRequest(`/categorias/${id}`, "PATCH", { nombre: nuevoNombre.trim() }, authToken);
    await cargarListas();
  } catch (error) {
    gestionError.textContent = error.message || "Error al editar categoría";
  }
}

async function eliminarCategoria(id) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const confirmado = confirm("¿Seguro que querés eliminar esta categoría?");
  if (!confirmado) return;

  try {
    await apiRequest(`/categorias/${id}`, "DELETE", null, authToken);
    await cargarListas();
  } catch (error) {
    gestionError.textContent = error.message || "Error al eliminar categoría";
  }
}

async function eliminarCategoriasSeleccionadas() {
  const authToken = getAuthToken();
  if (!authToken) return;

  bulkCategoriasError.textContent = "";
  bulkCategoriasSuccess.textContent = "";

  const seleccionadas = categoriasCache.filter(categoria => categoria.selected);

  if (!seleccionadas.length) {
    bulkCategoriasError.textContent = "No hay categorías seleccionadas.";
    return;
  }

  const confirmado = confirm(`¿Seguro que querés eliminar ${seleccionadas.length} categoría(s)?`);
  if (!confirmado) return;

  let eliminadas = 0;
  let errores = 0;

  for (const categoria of seleccionadas) {
    try {
      await apiRequest(`/categorias/${categoria._id}`, "DELETE", null, authToken);
      eliminadas++;
    } catch {
      errores++;
    }
  }

  await cargarListas();

  if (eliminadas > 0) {
    bulkCategoriasSuccess.textContent = `Se eliminaron ${eliminadas} categoría(s).`;
  }

  if (errores > 0) {
    bulkCategoriasError.textContent = `No se pudieron eliminar ${errores} categoría(s).`;
  }
}

async function editarBanco(id, nombreActual) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const nuevoNombre = prompt("Nuevo nombre del banco:", nombreActual);
  if (!nuevoNombre || !nuevoNombre.trim()) return;

  try {
    await apiRequest(`/bancos/${id}`, "PATCH", { nombre: nuevoNombre.trim() }, authToken);
    await cargarListas();
  } catch (error) {
    gestionError.textContent = error.message || "Error al editar banco";
  }
}

async function eliminarBanco(id) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const confirmado = confirm("¿Seguro que querés eliminar este banco?");
  if (!confirmado) return;

  try {
    await apiRequest(`/bancos/${id}`, "DELETE", null, authToken);
    await cargarListas();
  } catch (error) {
    gestionError.textContent = error.message || "Error al eliminar banco";
  }
}

async function editarCuenta(id, nombreActual, bancoActual) {
  const authToken = getAuthToken();
  if (!authToken) return;

  await cargarRecursosBulk();

  const nuevoNombre = prompt("Nuevo nombre de la cuenta:", nombreActual);
  if (!nuevoNombre || !nuevoNombre.trim()) return;

  let mensajeBancos = "Seleccioná el banco escribiendo el número:\n\n";
  bancosCache.forEach((banco, index) => {
    mensajeBancos += `${index + 1}. ${banco.nombre}\n`;
  });

  const indiceBanco = prompt(mensajeBancos);

  if (!indiceBanco || Number.isNaN(Number(indiceBanco))) return;

  const bancoSeleccionado = bancosCache[Number(indiceBanco) - 1];
  if (!bancoSeleccionado) {
    gestionError.textContent = "Banco inválido.";
    return;
  }

  try {
    await apiRequest(
      `/cuentas/${id}`,
      "PATCH",
      {
        nombre: nuevoNombre.trim(),
        banco: bancoSeleccionado._id
      },
      authToken
    );

    await cargarListas();
  } catch (error) {
    gestionError.textContent = error.message || "Error al editar cuenta";
  }
}

async function eliminarCuenta(id) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const confirmado = confirm("¿Seguro que querés eliminar esta cuenta?");
  if (!confirmado) return;

  try {
    await apiRequest(`/cuentas/${id}`, "DELETE", null, authToken);
    await cargarListas();
  } catch (error) {
    gestionError.textContent = error.message || "Error al eliminar cuenta";
  }
}

async function editarGasto(id) {
  const authToken = getAuthToken();
  if (!authToken) return;

  editarGastoError.textContent = "";

  try {
    await cargarRecursosBulk();

    const gastoActual = await apiRequest(`/gastos/${id}`, "GET", null, authToken);
    const gasto = getApiData(gastoActual, null);

    editarGastoId.value = gasto._id;
    editarGastoFecha.value = gasto.fecha ? fechaInputValueUTC(gasto.fecha) : "";
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

    totalPaginasGastos = await calcularTotalPaginasGastos();

    if (paginaGastosActual > totalPaginasGastos) {
      paginaGastosActual = totalPaginasGastos;
    }

    await cargarGastosPaginados();
  } catch (error) {
    gestionError.textContent = error.message || "Error al eliminar gasto";
  }
}

// Bulk bancos
async function eliminarBancosSeleccionados() {
  const authToken = getAuthToken();
  if (!authToken) return;

  bulkBancosError.textContent = "";
  bulkBancosSuccess.textContent = "";

  const seleccionados = getSelectedItems(bancosCache);

  if (!seleccionados.length) {
    bulkBancosError.textContent = "No hay bancos seleccionados.";
    return;
  }

  const confirmado = confirm(`¿Seguro que querés eliminar ${seleccionados.length} banco(s)?`);
  if (!confirmado) return;

  let eliminados = 0;
  let errores = 0;

  for (const banco of seleccionados) {
    try {
      await apiRequest(`/bancos/${banco._id}`, "DELETE", null, authToken);
      eliminados++;
    } catch {
      errores++;
    }
  }

  await cargarListas();
  await cargarRecursosBulk();

  if (eliminados > 0) {
    bulkBancosSuccess.textContent = `Se eliminaron ${eliminados} banco(s).`;
  }
  if (errores > 0) {
    bulkBancosError.textContent = `No se pudieron eliminar ${errores} banco(s).`;
  }
}

// Bulk cuentas
async function aplicarBulkCuentas() {
  const authToken = getAuthToken();
  if (!authToken) return;

  bulkCuentasError.textContent = "";
  bulkCuentasSuccess.textContent = "";

  const banco = bulkCuentaBanco.value;
  const seleccionadas = cuentasCache.filter(cuenta => cuenta.selected);

  if (!seleccionadas.length) {
    bulkCuentasError.textContent = "No hay cuentas seleccionadas.";
    return;
  }

  if (!banco) {
    bulkCuentasError.textContent = "Seleccioná un banco para aplicar.";
    return;
  }

  let actualizadas = 0;
  let errores = 0;

  for (const cuenta of seleccionadas) {
    try {
      await apiRequest(
        `/cuentas/${cuenta._id}`,
        "PATCH",
        {
          nombre: cuenta.nombre,
          banco
        },
        authToken
      );
      actualizadas++;
    } catch {
      errores++;
    }
  }

  await cargarListas();
  await cargarRecursosBulk();

  if (actualizadas > 0) {
    bulkCuentasSuccess.textContent = `Se actualizaron ${actualizadas} cuenta(s).`;
  }
  if (errores > 0) {
    bulkCuentasError.textContent = `No se pudieron actualizar ${errores} cuenta(s).`;
  }
}

async function eliminarCuentasSeleccionadas() {
  const authToken = getAuthToken();
  if (!authToken) return;

  bulkCuentasError.textContent = "";
  bulkCuentasSuccess.textContent = "";

  const seleccionadas = cuentasCache.filter(cuenta => cuenta.selected);

  if (!seleccionadas.length) {
    bulkCuentasError.textContent = "No hay cuentas seleccionadas.";
    return;
  }

  const confirmado = confirm(`¿Seguro que querés eliminar ${seleccionadas.length} cuenta(s)?`);
  if (!confirmado) return;

  let eliminadas = 0;
  let errores = 0;

  for (const cuenta of seleccionadas) {
    try {
      await apiRequest(`/cuentas/${cuenta._id}`, "DELETE", null, authToken);
      eliminadas++;
    } catch {
      errores++;
    }
  }

  await cargarListas();
  await cargarRecursosBulk();

  if (eliminadas > 0) {
    bulkCuentasSuccess.textContent = `Se eliminaron ${eliminadas} cuenta(s).`;
  }
  if (errores > 0) {
    bulkCuentasError.textContent = `No se pudieron eliminar ${errores} cuenta(s).`;
  }
}

/*
// Bulk gastos
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

  if (hayPorcentaje) {
    const porcentaje = Number(porcentajeRaw);
    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      bulkGastosError.textContent = "El porcentaje debe estar entre 0 y 100.";
      return;
    }
  }

  const seleccionados = getSelectedItems(gastosCache);

  if (!seleccionados.length) {
    bulkGastosError.textContent = "No hay gastos seleccionados.";
    return;
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

  if (actualizados > 0) {
    bulkGastosSuccess.textContent = `Se actualizaron ${actualizados} gasto(s).`;
  }
  if (errores > 0) {
    bulkGastosError.textContent = `No se pudieron actualizar ${errores} gasto(s).`;
  }
}
*/

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

  totalPaginasGastos = await calcularTotalPaginasGastos();

  if (paginaGastosActual > totalPaginasGastos) {
    paginaGastosActual = totalPaginasGastos;
  }

  await cargarGastosPaginados();

  if (eliminados > 0) {
    bulkGastosSuccess.textContent = `Se eliminaron ${eliminados} gasto(s).`;
  }
  if (errores > 0) {
    bulkGastosError.textContent = `No se pudieron eliminar ${errores} gasto(s).`;
  }
}


function gastoPasaFiltroFecha(gasto) {
  const desde = filtroFechaDesde.value;
  const hasta = filtroFechaHasta.value;

  if (!desde && !hasta) return true;
  if (!gasto.fecha) return false;

  const fechaGasto = new Date(gasto.fecha);
  fechaGasto.setHours(0, 0, 0, 0);

  if (desde) {
    const fechaDesde = new Date(desde);
    fechaDesde.setHours(0, 0, 0, 0);

    if (fechaGasto < fechaDesde) {
      return false;
    }
  }

  if (hasta) {
    const fechaHasta = new Date(hasta);
    fechaHasta.setHours(0, 0, 0, 0);

    if (fechaGasto > fechaHasta) {
      return false;
    }
  }

  return true;
}

function renderGastosPaginados() {
  renderTableRows({
    containerId: "gastosList",
    items: gastosCache,
    colspan: 11,
    renderItem: gasto => `
    <tr>
      <td>
        <input
          type="checkbox"
          class="gasto-checkbox"
          data-id="${gasto._id}"
          ${gasto.selected ? "checked" : ""}
        >
      </td>

      <td>${gasto.fecha ? formatFechaUTC(gasto.fecha) : "N/A"}</td>
      <td>${gasto.descripcion || "N/A"}</td>
      <td>${gasto.cuenta?.nombre || "N/A"}</td>
      <td>${gasto.categoria?.nombre || "N/A"}</td>
      <td>${gasto.flujoBancario ?? "N/A"}</td>
      <td>${gasto.porcentajeEconomiaReal ?? "N/A"}</td>
      <td>${gasto.economiaReal ?? "N/A"}</td>

      <td>
        <input 
          type="checkbox" 
          class="gasto-incluir-bancario" 
          data-id="${gasto._id}"
          ${gasto.incluirEnGastoBancario ? "checked" : ""}
          ${Number(gasto.flujoBancario) === 0 ? "disabled" : ""}
        >
      </td>

      <td>
        <input 
          type="checkbox" 
          class="gasto-incluir-real" 
          data-id="${gasto._id}"
          ${gasto.incluirEnGastoReal ? "checked" : ""}
          ${Number(gasto.economiaReal) === 0 ? "disabled" : ""}
        >
      </td>

      <td>
        <button type="button" onclick="editarGasto('${gasto._id}')">Editar</button>
        <button type="button" onclick="eliminarGasto('${gasto._id}')">Eliminar</button>
      </td>
    </tr>
  `
  });

  gastosPaginaActual.textContent = `${paginaGastosActual} / ${totalPaginasGastos}`;
  prevGastosBtn.disabled = paginaGastosActual === 1;
  nextGastosBtn.disabled = paginaGastosActual >= totalPaginasGastos;

  updateSelectAllState(gastosCache, selectAllGastos);
  attachGastoEvents();
}

function renderModalCuentaBancos() {
  modalCuentaBanco.innerHTML = '<option value="">Seleccionar banco</option>' +
    bancosCache.map(banco => `<option value="${banco._id}">${banco.nombre}</option>`).join("");
}

function renderModalGastoSelects() {
  modalGastoCategoria.innerHTML = '<option value="">Seleccionar categoría</option>' +
    categoriasCache.map(categoria => `<option value="${categoria._id}">${categoria.nombre}</option>`).join("");

  modalGastoCuenta.innerHTML = '<option value="">Seleccionar cuenta</option>' +
    cuentasCache.map(cuenta => `<option value="${cuenta._id}">${cuenta.nombre}</option>`).join("");
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

  const calculado = flujo * (porcentaje / 100);
  modalGastoEconomia.value = calculado.toFixed(2);
}

modalGastoFlujo.addEventListener("input", actualizarEconomiaModalGasto);
modalGastoPorcentaje.addEventListener("input", actualizarEconomiaModalGasto);

modalBancoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const authToken = getAuthToken();
  if (!authToken) return;

  modalBancoError.textContent = "";

  const nombre = modalBancoNombre.value.trim();
  if (!nombre) {
    modalBancoError.textContent = "El nombre es obligatorio.";
    return;
  }

  try {
    await apiRequest("/bancos", "POST", { nombre }, authToken);
    modalBancoForm.reset();
    closeModal(bancoModal);
    await cargarListas();
    await cargarRecursosBulk();
  } catch (error) {
    modalBancoError.textContent = error.message || "Error al crear banco";
  }
});

modalCuentaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const authToken = getAuthToken();
  if (!authToken) return;

  modalCuentaError.textContent = "";

  const nombre = modalCuentaNombre.value.trim();
  const banco = modalCuentaBanco.value;

  if (!nombre || !banco) {
    modalCuentaError.textContent = "Todos los campos son obligatorios.";
    return;
  }

  try {
    await apiRequest("/cuentas", "POST", { nombre, banco }, authToken);
    modalCuentaForm.reset();
    closeModal(cuentaModal);
    await cargarListas();
    await cargarRecursosBulk();
  } catch (error) {
    modalCuentaError.textContent = error.message || "Error al crear cuenta";
  }
});

modalCategoriaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const authToken = getAuthToken();
  if (!authToken) return;

  modalCategoriaError.textContent = "";

  const nombre = modalCategoriaNombre.value.trim();
  if (!nombre) {
    modalCategoriaError.textContent = "El nombre es obligatorio.";
    return;
  }

  try {
    await apiRequest("/categorias", "POST", { nombre }, authToken);
    modalCategoriaForm.reset();
    closeModal(categoriaModal);
    await cargarListas();
    await cargarRecursosBulk();
  } catch (error) {
    modalCategoriaError.textContent = error.message || "Error al crear categoría";
  }
});

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
        cuenta,
        incluirEnGastoBancario: Number(flujoBancario) !== 0 && modalGastoIncluirBancario.checked,
        incluirEnGastoReal: Number(economiaReal) !== 0 && modalGastoIncluirReal.checked
      },
      authToken
    );

    modalGastoForm.reset();
    modalGastoPorcentaje.value = 100;
    modalGastoEconomia.value = "";
    closeModal(gastoModal);

    totalPaginasGastos = await calcularTotalPaginasGastos();
    await cargarGastosPaginados();
  } catch (error) {
    modalGastoError.textContent = error.message || "Error al crear gasto";
  }
});

// Listeners paginación
prevGastosBtn.addEventListener("click", async () => {
  if (paginaGastosActual > 1) {
    paginaGastosActual--;
    await cargarGastosPaginados();
  }
});

nextGastosBtn.addEventListener("click", async () => {
  if (paginaGastosActual < totalPaginasGastos) {
    paginaGastosActual++;
    await cargarGastosPaginados();
  }
});

// Listeners select all
selectAllBancos.addEventListener("change", (e) => {
  toggleItemsSelection(bancosCache, e.target.checked);
  renderTableRows({
    containerId: "bancosList",
    items: bancosCache,
    colspan: 3,
    renderItem: banco => `
    <tr>
      <td><input type="checkbox" class="banco-checkbox" data-id="${banco._id}" ${banco.selected ? "checked" : ""}></td>
      <td>${banco.nombre}</td>
      <td>
        <button type="button" onclick="editarBanco('${banco._id}', '${escapeQuotes(banco.nombre)}')">Editar</button>
        <button type="button" onclick="eliminarBanco('${banco._id}')">Eliminar</button>
      </td>
    </tr>
  `
  });
  attachBancoEvents();
  updateSelectAllState(bancosCache, selectAllBancos);
});

selectAllCuentas.addEventListener("change", (e) => {
  toggleItemsSelection(cuentasCache, e.target.checked);
  renderTableRows({
    containerId: "cuentasList",
    items: cuentasCache,
    colspan: 4,
    renderItem: cuenta => `
    <tr>
      <td><input type="checkbox" class="cuenta-checkbox" data-id="${cuenta._id}" ${cuenta.selected ? "checked" : ""}></td>
      <td>${cuenta.nombre}</td>
      <td>${cuenta.banco?.nombre || "N/A"}</td>
      <td>
        <button type="button" onclick="editarCuenta('${cuenta._id}', '${escapeQuotes(cuenta.nombre)}', '${cuenta.banco?._id || cuenta.banco || ""}')">Editar</button>
        <button type="button" onclick="eliminarCuenta('${cuenta._id}')">Eliminar</button>
      </td>
    </tr>
  `
  });
  attachCuentaEvents();
  updateSelectAllState(cuentasCache, selectAllCuentas);
});

selectAllGastos.addEventListener("change", (e) => {
  toggleItemsSelection(gastosCache, e.target.checked);
  renderGastosPaginados();
});

// Listeners bulk
eliminarBancosSeleccionadosBtn.addEventListener("click", eliminarBancosSeleccionados);
aplicarBulkCuentasBtn.addEventListener("click", aplicarBulkCuentas);
eliminarCuentasSeleccionadasBtn.addEventListener("click", eliminarCuentasSeleccionadas);
//aplicarBulkGastosBtn.addEventListener("click", aplicarBulkGastos);
eliminarGastosSeleccionadosBtn.addEventListener("click", eliminarGastosSeleccionados);

 

window.editarBanco = editarBanco;
window.eliminarBanco = eliminarBanco;
window.editarCuenta = editarCuenta;
window.eliminarCuenta = eliminarCuenta;
window.editarGasto = editarGasto;
window.eliminarGasto = eliminarGasto;
window.editarCategoria = editarCategoria;
window.eliminarCategoria = eliminarCategoria;

filtrarGastosBtn.addEventListener("click", async () => {
  paginaGastosActual = 1;
  totalPaginasGastos = await calcularTotalPaginasGastos();
  await cargarGastosPaginados();
});

limpiarFiltroGastosBtn.addEventListener("click", async () => {
  resetFiltrosTodosLosGastos();
  paginaGastosActual = 1;
  totalPaginasGastos = await calcularTotalPaginasGastos();
  await cargarGastosPaginados();
});

selectAllCategorias.addEventListener("change", (e) => {
  toggleItemsSelection(categoriasCache, e.target.checked);

  renderTableRows({
    containerId: "categoriasList",
    items: categoriasCache,
    colspan: 3,
    renderItem: categoria => `
    <tr>
      <td><input type="checkbox" class="categoria-checkbox" data-id="${categoria._id}" ${categoria.selected ? "checked" : ""}></td>
      <td>${categoria.nombre}</td>
      <td>
        <button type="button" onclick="editarCategoria('${categoria._id}', '${escapeQuotes(categoria.nombre)}')">Editar</button>
        <button type="button" onclick="eliminarCategoria('${categoria._id}')">Eliminar</button>
      </td>
    </tr>
  `});

  attachCategoriaEvents();
  updateSelectAllState(categoriasCache, selectAllCategorias);
});

eliminarCategoriasSeleccionadasBtn.addEventListener("click", eliminarCategoriasSeleccionadas)

openCuentaModalBtn.addEventListener("click", async () => {
  modalCuentaError.textContent = "";
  await cargarRecursosBulk();
  renderModalCuentaBancos();
  openModal(cuentaModal);
});

openCategoriaModalBtn.addEventListener("click", () => {
  modalCategoriaError.textContent = "";
  openModal(categoriaModal);
});

openGastoModalBtn.addEventListener("click", async () => {
  modalGastoError.textContent = "";
  await cargarRecursosBulk();
  renderModalGastoSelects();
  actualizarEconomiaModalGasto();
  modalGastoIncluirBancario.checked = true;
  modalGastoIncluirReal.checked = true;
  openModal(gastoModal);
});

openBancoModalBtn.addEventListener("click", () => {
  modalBancoError.textContent = "";
  openModal(bancoModal);
});

editarGastoFlujo.addEventListener("input", actualizarEconomiaEditarGasto);
editarGastoPorcentaje.addEventListener("input", actualizarEconomiaEditarGasto);

editarSeleccionadosGastosBtn.addEventListener("click", editarSeleccionadosGastos);
bloquearSeleccionadosGastosBtn.addEventListener("click", bloquearSeleccionadosGastos);

modoFiltroGastos.addEventListener("change", () => {
  if (modoFiltroGastos.value === "mes" && !mesGastos.value) {
    mesGastos.value = "1";
  }

  actualizarVisibilidadFiltrosGastos();
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
        porcentajeEconomiaReal,
        economiaReal,
        categoria,
        cuenta,
        incluirEnGastoBancario: Number(flujoBancario) !== 0,
        incluirEnGastoReal: Number(economiaReal) !== 0
      },
      authToken
    );

    closeModal(editarGastoModal);
    editarGastoForm.reset();
    editarGastoEconomia.value = "";

    totalPaginasGastos = await calcularTotalPaginasGastos();
    await cargarGastosPaginados();
  } catch (error) {
    editarGastoError.textContent = error.message || "Error al editar gasto";
  }
});

//ESTO DEBE IR ULTIMO
document.addEventListener("DOMContentLoaded", async () => {
  resetFiltrosTodosLosGastos();

  await cargarListas();

  totalPaginasGastos = await calcularTotalPaginasGastos();
  await cargarGastosPaginados();

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close;
      const modal = document.getElementById(modalId);
      closeModal(modal);
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target);
    }
  });
});