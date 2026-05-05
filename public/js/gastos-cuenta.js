requireAuth();
renderHeader({ title: "Gastos por Cuenta" });
const crearGastoCuentaForm = document.getElementById("crearGastoCuentaForm");
const crearGastoFecha = document.getElementById("crearGastoFecha");
const crearGastoDescripcion = document.getElementById("crearGastoDescripcion");
const crearGastoFlujo = document.getElementById("crearGastoFlujo");
const crearGastoPorcentaje = document.getElementById("crearGastoPorcentaje");
const crearGastoEconomia = document.getElementById("crearGastoEconomia");

const crearGastoCategoria = document.getElementById("crearGastoCategoria");

const crearGastoIncluirBancario = document.getElementById(
  "crearGastoIncluirBancario",
);
const crearGastoIncluirReal = document.getElementById("crearGastoIncluirReal");

const crearGastoError = document.getElementById("crearGastoError");
const ordenGastosCuenta = document.getElementById("ordenGastosCuenta");
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
const modoFiltroGastosCuenta = document.getElementById(
  "modoFiltroGastosCuenta",
);
const categoriaGastosCuenta = document.getElementById("categoriaGastosCuenta");
const busquedaGastosCuenta = document.getElementById("busquedaGastosCuenta");
const mesGastosCuenta = document.getElementById("mesGastosCuenta");
const anioGastosCuenta = document.getElementById("anioGastosCuenta");
const desdeGastosCuenta = document.getElementById("desdeGastosCuenta");
const modoFiltroTotalesCuenta = document.getElementById(
  "modoFiltroTotalesCuenta",
);
const categoriaTotalesCuenta = document.getElementById(
  "categoriaTotalesCuenta",
);
const busquedaTotalesCuenta = document.getElementById("busquedaTotalesCuenta");
const mesTotalesCuenta = document.getElementById("mesTotalesCuenta");
const anioTotalesCuenta = document.getElementById("anioTotalesCuenta");
const desdeTotalesCuenta = document.getElementById("desdeTotalesCuenta");
const hastaTotalesCuenta = document.getElementById("hastaTotalesCuenta");

const grupoMesTotalesCuenta = document.getElementById("grupoMesTotalesCuenta");
const grupoAnioTotalesCuenta = document.getElementById(
  "grupoAnioTotalesCuenta",
);
const grupoDesdeTotalesCuenta = document.getElementById(
  "grupoDesdeTotalesCuenta",
);
const grupoHastaTotalesCuenta = document.getElementById(
  "grupoHastaTotalesCuenta",
);

const filtrarTotalesCuentaBtn = document.getElementById(
  "filtrarTotalesCuentaBtn",
);
const limpiarFiltroTotalesCuentaBtn = document.getElementById(
  "limpiarFiltroTotalesCuentaBtn",
);
const hastaGastosCuenta = document.getElementById("hastaGastosCuenta");

const grupoMesGastosCuenta = document.getElementById("grupoMesGastosCuenta");
const grupoAnioGastosCuenta = document.getElementById("grupoAnioGastosCuenta");
const grupoDesdeGastosCuenta = document.getElementById(
  "grupoDesdeGastosCuenta",
);
const grupoHastaGastosCuenta = document.getElementById(
  "grupoHastaGastosCuenta",
);

const filtrarGastosCuentaBtn = document.getElementById(
  "filtrarGastosCuentaBtn",
);
const limpiarFiltroGastosCuentaBtn = document.getElementById(
  "limpiarFiltroGastosCuentaBtn",
);

const guardarOrdenGastosCuentaBtn = document.getElementById(
  "guardarOrdenGastosCuentaBtn",
);

let gastosCuentaCache = [];
let categoriasCuentaCache = [];
let gastosCuentaTodos = [];

const selectAllGastosCuenta = document.getElementById("selectAllGastosCuenta");
const bulkCategoriaGastosCuenta = document.getElementById(
  "bulkCategoriaGastosCuenta",
);
const bulkPorcentajeGastosCuenta = document.getElementById(
  "bulkPorcentajeGastosCuenta",
);

const bulkIncluirBancarioGastosCuenta = document.getElementById(
  "bulkIncluirBancarioGastosCuenta",
);

const bulkIncluirRealGastosCuenta = document.getElementById(
  "bulkIncluirRealGastosCuenta",
);

const aplicarBulkGastosCuentaBtn = document.getElementById(
  "aplicarBulkGastosCuentaBtn",
);
const eliminarBulkGastosCuentaBtn = document.getElementById(
  "eliminarBulkGastosCuentaBtn",
);
const bulkGastosCuentaError = document.getElementById("bulkGastosCuentaError");
const bulkGastosCuentaSuccess = document.getElementById(
  "bulkGastosCuentaSuccess",
);

const editarGastoCuentaModal = document.getElementById(
  "editarGastoCuentaModal",
);
const editarGastoCuentaForm = document.getElementById("editarGastoCuentaForm");
const editarGastoCuentaId = document.getElementById("editarGastoCuentaId");
const editarGastoCuentaFecha = document.getElementById(
  "editarGastoCuentaFecha",
);
const editarGastoCuentaDescripcion = document.getElementById(
  "editarGastoCuentaDescripcion",
);
const editarGastoCuentaFlujo = document.getElementById(
  "editarGastoCuentaFlujo",
);
const editarGastoCuentaPorcentaje = document.getElementById(
  "editarGastoCuentaPorcentaje",
);
const editarGastoCuentaEconomia = document.getElementById(
  "editarGastoCuentaEconomia",
);
const editarGastoCuentaCategoria = document.getElementById(
  "editarGastoCuentaCategoria",
);
const editarGastoCuentaError = document.getElementById(
  "editarGastoCuentaError",
);

const editarGastoCuentaIncluirBancario = document.getElementById(
  "editarGastoCuentaIncluirBancario",
);
const editarGastoCuentaIncluirReal = document.getElementById(
  "editarGastoCuentaIncluirReal",
);

let paginaActualGastosCuenta = 1;
let totalPaginasGastosCuenta = 1;

const prevGastosCuentaBtn = document.getElementById("prevGastosCuentaBtn");
const nextGastosCuentaBtn = document.getElementById("nextGastosCuentaBtn");
const gastosCuentaPaginaActual = document.getElementById(
  "gastosCuentaPaginaActual",
);

const verDesgloseBancarioBtn = document.getElementById(
  "verDesgloseBancarioBtn",
);
const verDesgloseRealBtn = document.getElementById("verDesgloseRealBtn");
const desgloseGastosCuentaSection = document.getElementById(
  "desgloseGastosCuentaSection",
);
const desgloseGastosCuentaTitulo = document.getElementById(
  "desgloseGastosCuentaTitulo",
);
const desgloseGastosCuentaBody = document.getElementById(
  "desgloseGastosCuentaBody",
);

const categoriaFiltroDesglose = document.getElementById(
  "categoriaFiltroDesglose",
);

const busquedaFiltroDesglose = document.getElementById(
  "busquedaFiltroDesglose",
);

const ordenDesgloseCuenta = document.getElementById("ordenDesgloseCuenta");

const filtrarDesgloseBtn = document.getElementById("filtrarDesgloseBtn");

const limpiarFiltroDesgloseBtn = document.getElementById(
  "limpiarFiltroDesgloseBtn",
);

const selectAllDesglose = document.getElementById("selectAllDesglose");
const eliminarSeleccionadosDesgloseBtn = document.getElementById(
  "eliminarSeleccionadosDesgloseBtn",
);

const bulkDesgloseError = document.getElementById("bulkDesgloseError");
const bulkDesgloseSuccess = document.getElementById("bulkDesgloseSuccess");
const bulkCategoriaDesglose = document.getElementById("bulkCategoriaDesglose");
const bulkPorcentajeDesglose = document.getElementById(
  "bulkPorcentajeDesglose",
);
const aplicarBulkDesgloseBtn = document.getElementById(
  "aplicarBulkDesgloseBtn",
);

const guardarSeleccionadosDesgloseBtn = document.getElementById(
  "guardarSeleccionadosDesgloseBtn",
);

const guardarOrdenDesgloseBtn = document.getElementById(
  "guardarOrdenDesgloseBtn",
);

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
    if (categoriaGastosCuenta.value)
      params.set("categoria", categoriaGastosCuenta.value);
    if (busquedaGastosCuenta?.value.trim()) {
      params.set("busqueda", busquedaGastosCuenta.value.trim());
    }

    const data = await apiRequest(
      `/gastos?${params.toString()}`,
      "GET",
      null,
      token,
    );
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
    if (categoriaGastosCuenta.value)
      params.set("categoria", categoriaGastosCuenta.value);
    if (busquedaGastosCuenta?.value.trim()) {
      params.set("busqueda", busquedaGastosCuenta.value.trim());
    }

    const data = await apiRequest(
      `/gastos?${params.toString()}`,
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

async function obtenerGastosTotalesCuentaFiltrados() {
  const token = getToken();
  if (!token) return [];

  let pagina = 1;
  let todos = [];
  let seguir = true;

  const { fechaDesde, fechaHasta } = getFiltrosTotalesCuenta();

  while (seguir) {
    const params = new URLSearchParams();
    params.set("cuenta", cuentaId);
    params.set("pagina", pagina);

    if (fechaDesde) params.set("fechaDesde", fechaDesde);
    if (fechaHasta) params.set("fechaHasta", fechaHasta);

    if (categoriaTotalesCuenta.value) {
      params.set("categoria", categoriaTotalesCuenta.value);
    }

    if (busquedaTotalesCuenta?.value.trim()) {
      params.set("busqueda", busquedaTotalesCuenta.value.trim());
    }

    const data = await apiRequest(
      `/gastos?${params.toString()}`,
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

function esTransferencia(gasto) {
  const nombreCategoria = String(gasto?.categoria?.nombre || "").toLowerCase();
  return nombreCategoria.includes("transf");
}

function renderResumenTotalesCuenta(gastos) {
  let gastoBancario = 0;
  let gastoReal = 0;
  let saldoBancario = 0;

  gastos.forEach((g) => {
    const flujo = Number(g.flujoBancario) || 0;
    const real = Number(g.economiaReal) || 0;

    saldoBancario += flujo;

    if (debeContarGastoBancario(g)) {
      gastoBancario += flujo;
    }

    if (debeContarGastoReal(g)) {
      gastoReal += real;
    }
  });

  document.getElementById("gastoBancarioTotal").textContent =
    formatMoney(gastoBancario);
  document.getElementById("gastoRealTotal").textContent =
    formatMoney(gastoReal);
  document.getElementById("saldoBancarioTotal").textContent =
    formatMoney(saldoBancario);
}

function obtenerGastosParaDesglose(tipo) {
  const categoriaFiltro = categoriaFiltroDesglose?.value || "";
  const busqueda = busquedaFiltroDesglose?.value.trim().toLowerCase() || "";

  const gastos = gastosCuentaTodos.filter((g) => {
    if (categoriaFiltro) {
      const categoriaId = g.categoria?._id || g.categoria;
      if (categoriaId !== categoriaFiltro) return false;
    }

    if (busqueda) {
      const descripcion = String(g.descripcion || "").toLowerCase();
      if (!descripcion.includes(busqueda)) return false;
    }

    if (tipo === "bancario") {
      return debeContarGastoBancario(g);
    }

    if (tipo === "real") {
      return debeContarGastoReal(g);
    }

    return false;
  });

  const orden = ordenDesgloseCuenta?.value || "manual";

  return gastos.sort((a, b) => {
    if (orden === "manual") {
      const ordenA = Number(a.ordenCuenta) || 0;
      const ordenB = Number(b.ordenCuenta) || 0;

      if (ordenA !== ordenB) return ordenA - ordenB;

      return new Date(a.fecha) - new Date(b.fecha);
    }

    if (orden === "fechaAsc") return new Date(a.fecha) - new Date(b.fecha);
    if (orden === "fechaDesc") return new Date(b.fecha) - new Date(a.fecha);

    if (orden === "gastoBancarioAsc") {
      return (Number(a.flujoBancario) || 0) - (Number(b.flujoBancario) || 0);
    }

    if (orden === "gastoBancarioDesc") {
      return (Number(b.flujoBancario) || 0) - (Number(a.flujoBancario) || 0);
    }

    if (orden === "gastoRealAsc") {
      return (Number(a.economiaReal) || 0) - (Number(b.economiaReal) || 0);
    }

    if (orden === "gastoRealDesc") {
      return (Number(b.economiaReal) || 0) - (Number(a.economiaReal) || 0);
    }

    if (orden === "descripcionAsc") {
      return String(a.descripcion || "").localeCompare(
        String(b.descripcion || ""),
      );
    }

    if (orden === "descripcionDesc") {
      return String(b.descripcion || "").localeCompare(
        String(a.descripcion || ""),
      );
    }

    return 0;
  });
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

  desgloseGastosCuentaBody.innerHTML = gastos
    .map((g) => {
      const monto =
        tipo === "bancario"
          ? Number(g.flujoBancario) || 0
          : Number(g.economiaReal) || 0;

      acumulado += monto;

      return `
      <tr data-id="${g._id}" draggable="true">
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
          <button type="button" onclick="removerGastoDelDesglose('${g._id}')">
  Remover del desglose
</button>
        </td>
      </tr>
    `;
    })
    .join("");

  habilitarDragAndDropDesgloseGastosCuenta();
}

function habilitarDragAndDropGastosCuenta() {
  const tbody = document.getElementById("gastosCuentaBody");
  if (!tbody) return;

  let draggedRow = null;

  tbody.querySelectorAll("tr").forEach((row) => {
    row.addEventListener("dragstart", () => {
      draggedRow = row;
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      draggedRow = null;

      sincronizarOrdenDesdeTabla();
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();

      const afterElement = getDragAfterElement(tbody, e.clientY);

      if (!draggedRow) return;

      if (afterElement == null) {
        tbody.appendChild(draggedRow);
      } else {
        tbody.insertBefore(draggedRow, afterElement);
      }
    });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll("tr:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return {
          offset,
          element: child,
        };
      }

      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

function sincronizarOrdenDesdeTabla() {
  const filas = [...document.querySelectorAll("#gastosCuentaBody tr[data-id]")];

  gastosCuentaCache = filas
    .map((fila) => gastosCuentaCache.find((g) => g._id === fila.dataset.id))
    .filter(Boolean);
}

function habilitarDragAndDropDesgloseGastosCuenta() {
  const tbody = document.getElementById("desgloseGastosCuentaBody");
  if (!tbody) return;

  let draggedRow = null;

  tbody.querySelectorAll("tr[data-id]").forEach((row) => {
    row.addEventListener("dragstart", () => {
      draggedRow = row;
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      draggedRow = null;

      sincronizarOrdenDesdeTablaDesglose();
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();

      const afterElement = getDragAfterElementDesglose(tbody, e.clientY);

      if (!draggedRow) return;

      if (afterElement == null) {
        tbody.appendChild(draggedRow);
      } else {
        tbody.insertBefore(draggedRow, afterElement);
      }
    });
  });
}

function getDragAfterElementDesglose(container, y) {
  const draggableElements = [
    ...container.querySelectorAll("tr[data-id]:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return {
          offset,
          element: child,
        };
      }

      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY },
  ).element;
}

function sincronizarOrdenDesdeTablaDesglose() {
  const filas = [
    ...document.querySelectorAll("#desgloseGastosCuentaBody tr[data-id]"),
  ];
  const idsOrdenados = filas.map((fila) => fila.dataset.id);

  const idsSet = new Set(idsOrdenados);

  const gastosOrdenados = idsOrdenados
    .map((id) => gastosCuentaTodos.find((g) => g._id === id))
    .filter(Boolean);

  const gastosRestantes = gastosCuentaTodos.filter((g) => !idsSet.has(g._id));

  gastosCuentaTodos = [...gastosOrdenados, ...gastosRestantes];

  gastosCuentaCache = idsOrdenados
    .map((id) => gastosCuentaCache.find((g) => g._id === id))
    .filter(Boolean)
    .concat(gastosCuentaCache.filter((g) => !idsSet.has(g._id)));
}

function getDesgloseSeleccionados() {
  const checkboxes = document.querySelectorAll(".desglose-checkbox:checked");
  const ids = Array.from(checkboxes).map((cb) => cb.dataset.id);

  return gastosCuentaTodos.filter((g) => ids.includes(g._id));
}

async function aplicarBulkDesglose() {
  const token = getToken();
  if (!token) return;

  const seleccionados = getDesgloseSeleccionados();

  const categoria = bulkCategoriaDesglose.value;
  const porcentajeRaw = bulkPorcentajeDesglose.value;

  const hayCategoria = categoria !== "";
  const hayPorcentaje = porcentajeRaw !== "";

  bulkDesgloseError.textContent = "";
  bulkDesgloseSuccess.textContent = "";

  if (!seleccionados.length) {
    bulkDesgloseError.textContent = "No hay gastos seleccionados.";
    return;
  }

  if (!hayCategoria && !hayPorcentaje) {
    bulkDesgloseError.textContent =
      "Seleccioná al menos un valor para aplicar.";
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
          nuevaEconomia = Number(formatMoney(gasto.economiaReal));
        } else {
          nuevoPorcentaje = Number(porcentajeRaw);
          nuevaEconomia = Number(
            (
              Number(formatMoney(gasto.flujoBancario)) *
              (nuevoPorcentaje / 100)
            ).toFixed(2),
          );
        }
      }

      await apiRequest(
        `/gastos/${gasto._id}`,
        "PATCH",
        {
          fecha: gasto.fecha,
          descripcion: gasto.descripcion,
          flujoBancario: Number(formatMoney(gasto.flujoBancario)),
          porcentajeEconomiaReal: nuevoPorcentaje,
          economiaReal: nuevaEconomia,
          categoria: hayCategoria
            ? categoria
            : gasto.categoria?._id || gasto.categoria,
          cuenta: gasto.cuenta?._id || gasto.cuenta || cuentaId,
          incluirEnGastoBancario: gasto.incluirEnGastoBancario,
          incluirEnGastoReal: gasto.incluirEnGastoReal,
        },
        token,
      );

      actualizados++;
    } catch {
      errores++;
    }
  }

  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();

  if (tipoDesgloseActual) {
    renderDesgloseGastosCuenta(tipoDesgloseActual);
  }

  if (actualizados > 0) {
    bulkDesgloseSuccess.textContent = `${actualizados} gasto(s) actualizados.`;
  }

  if (errores > 0) {
    bulkDesgloseError.textContent = `${errores} error(es) al actualizar.`;
  }
}

selectAllDesglose.addEventListener("change", (e) => {
  document.querySelectorAll(".desglose-checkbox").forEach((cb) => {
    cb.checked = e.target.checked;
  });
});

aplicarBulkDesgloseBtn?.addEventListener("click", aplicarBulkDesglose);

let tipoDesgloseActual = null;

eliminarSeleccionadosDesgloseBtn.addEventListener("click", async () => {
  const token = getToken();
  if (!token) return;

  const seleccionados = getDesgloseSeleccionados();

  if (!seleccionados.length) {
    bulkDesgloseError.textContent = "No hay gastos seleccionados.";
    return;
  }

  const confirmado = confirm(
    `¿Remover ${seleccionados.length} gasto(s) del desglose?`,
  );

  if (!confirmado) return;

  let removidos = 0;
  let errores = 0;

  for (const g of seleccionados) {
    const payload = {
      fecha: g.fecha,
      descripcion: g.descripcion,
      flujoBancario: Number(g.flujoBancario),
      economiaReal: Number(g.economiaReal),
      porcentajeEconomiaReal: Number(g.porcentajeEconomiaReal),
      categoria: g.categoria?._id || g.categoria,
      cuenta: g.cuenta?._id || g.cuenta || cuentaId,
      incluirEnGastoBancario: g.incluirEnGastoBancario,
      incluirEnGastoReal: g.incluirEnGastoReal,
    };

    if (tipoDesgloseActual === "bancario") {
      payload.incluirEnGastoBancario = false;
    }

    if (tipoDesgloseActual === "real") {
      payload.incluirEnGastoReal = false;
    }

    try {
      await apiRequest(`/gastos/${g._id}`, "PATCH", payload, token);
      removidos++;
    } catch {
      errores++;
    }
  }

  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();

  if (tipoDesgloseActual) {
    renderDesgloseGastosCuenta(tipoDesgloseActual);
  }

  if (removidos > 0) {
    bulkDesgloseSuccess.textContent = `${removidos} gasto(s) removidos del desglose.`;
  }

  if (errores > 0) {
    bulkDesgloseError.textContent = `${errores} error(es) al remover gastos.`;
  }
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
      const incluirEnGastoBancario =
        Number(g.flujoBancario) !== 0 ? g.incluirEnGastoBancario : false;

      const incluirEnGastoReal =
        Number(g.economiaReal) !== 0 ? g.incluirEnGastoReal : false;

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
          incluirEnGastoReal,
        },
        token,
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

  body.innerHTML = filas
    .map(
      (f) => `
    <tr>
      <td>${f.nombre}</td>
      <td>${formatMoney(f.total)}</td>
    </tr>
  `,
    )
    .join("");
}

async function cargarResumenYTotalesCuenta() {
  try {
    const gastosTotales = await obtenerGastosTotalesCuentaFiltrados();

    gastosCuentaTodos = gastosTotales;

    renderResumenTotalesCuenta(gastosTotales);
    renderTotalesCategoriasCuenta(gastosTotales);
  } catch (error) {
    console.error(error);
  }
}

async function cargarSoloTotalesCategoriasCuenta() {
  try {
    const gastos = await obtenerGastosTotalesCuentaFiltrados();
    renderTotalesCategoriasCuenta(gastos);
  } catch (error) {
    console.error(error);
  }
}

function renderGastosCuenta(gastos) {
  const body = document.getElementById("gastosCuentaBody");

  if (!gastos || gastos.length === 0) {
    body.innerHTML = `<tr><td colspan="10">No hay gastos</td></tr>`;
    return;
  }

  body.innerHTML = gastos
    .map((g) => {
      const readOnlyAttr = "";
      const porcentajeDisabledAttr =
        Number(g.flujoBancario) === 0 ? "disabled" : "";

      return `
      <tr data-id="${g._id}" draggable="true">
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

        <td class="combo-cell">
  <input
    type="text"
    class="row-categoria-search"
    placeholder="Buscar subcategoría"
    value="${getCategoriaNombreCuenta(g.categoria?._id || g.categoria || "")}"
  >

  <div class="row-categoria-results hidden"></div>

  <input
    type="hidden"
    class="row-categoria"
    value="${g.categoria?._id || g.categoria || ""}"
  >
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
    })
    .join("");

  attachGastosCuentaEvents();
  actualizarEstadoSelectAllGastosCuenta();
  habilitarDragAndDropGastosCuenta();
}
guardarOrdenGastosCuentaBtn?.addEventListener(
  "click",
  guardarOrdenGastosCuenta,
);

guardarOrdenDesgloseBtn?.addEventListener("click", guardarOrdenGastosCuenta);

async function guardarOrdenGastosCuenta() {
  const token = getToken();
  if (!token) return;

  bulkGastosCuentaError.textContent = "";
  bulkGastosCuentaSuccess.textContent = "";

  const gastosOrdenados = gastosCuentaCache.map((g) => ({
    id: g._id,
  }));

  try {
    await apiRequest(
      "/gastos/orden-cuenta",
      "PATCH",
      { gastos: gastosOrdenados },
      token,
    );

    bulkGastosCuentaSuccess.textContent = "Orden guardado correctamente.";
  } catch (error) {
    bulkGastosCuentaError.textContent =
      error.message || "Error al guardar el orden.";
  }
}

async function cargarCategoriasParaGastosCuenta() {
  const token = getToken();
  if (!token) return;

  const data = await apiRequest("/categorias", "GET", null, token);
  const categorias = getApiData(data);
  categoriasCuentaCache = categorias;

  bulkCategoriaGastosCuenta.innerHTML = `
    <option value="">No cambiar</option>
    ${categorias.map((c) => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
  if (bulkCategoriaDesglose) {
    bulkCategoriaDesglose.innerHTML = `
    <option value="">No cambiar</option>
    ${categorias.map((c) => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
  }
  if (categoriaFiltroDesglose) {
    categoriaFiltroDesglose.innerHTML = `
    <option value="">Todas</option>
    ${categorias.map((c) => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
  }
}

function buildCategoriaOptions(selectedValue = "") {
  return `
    <option value="">Seleccionar categoría</option>
    ${categoriasCuentaCache
      .map(
        (c) => `
      <option value="${c._id}" ${selectedValue === c._id ? "selected" : ""}>
        ${c.nombre}
      </option>
    `,
      )
      .join("")}
  `;
}

function getCategoriaNombreCuenta(id) {
  const categoria = categoriasCuentaCache.find((c) => c._id === id);
  return categoria?.nombre || "";
}

async function cargarGastosCuenta() {
  const token = getToken();
  if (!token) return;

  try {
    gastosCuentaCache = (await obtenerTodosLosGastosCuentaFiltrados()).map(
      (g) => ({
        ...g,
        selected: false,
      }),
    );

    aplicarOrdenGastosCuenta();

    renderGastosCuenta(gastosCuentaCache);
  } catch (error) {
    const body = document.getElementById("gastosCuentaBody");
    if (body) {
      body.innerHTML = `<tr><td colspan="10">${error.message || "Error al cargar gastos"}</td></tr>`;
    }
  }
}

function aplicarOrdenGastosCuenta() {
  const orden = ordenGastosCuenta?.value || "manual";

  gastosCuentaCache.sort((a, b) => {
    if (orden === "manual") {
      const ordenA = Number(a.ordenCuenta) || 0;
      const ordenB = Number(b.ordenCuenta) || 0;

      if (ordenA !== ordenB) return ordenA - ordenB;

      return new Date(b.fecha) - new Date(a.fecha);
    }

    if (orden === "fechaAsc") {
      return new Date(a.fecha) - new Date(b.fecha);
    }

    if (orden === "fechaDesc") {
      return new Date(b.fecha) - new Date(a.fecha);
    }

    if (orden === "gastoBancarioAsc") {
      return (Number(a.flujoBancario) || 0) - (Number(b.flujoBancario) || 0);
    }

    if (orden === "gastoBancarioDesc") {
      return (Number(b.flujoBancario) || 0) - (Number(a.flujoBancario) || 0);
    }

    if (orden === "gastoRealAsc") {
      return (Number(a.economiaReal) || 0) - (Number(b.economiaReal) || 0);
    }

    if (orden === "gastoRealDesc") {
      return (Number(b.economiaReal) || 0) - (Number(a.economiaReal) || 0);
    }

    if (orden === "descripcionAsc") {
      return String(a.descripcion || "").localeCompare(
        String(b.descripcion || ""),
      );
    }

    if (orden === "descripcionDesc") {
      return String(b.descripcion || "").localeCompare(
        String(a.descripcion || ""),
      );
    }

    return 0;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function attachGastosCuentaEvents() {
  const rows = document.querySelectorAll("#gastosCuentaBody tr");

  rows.forEach((row) => {
    const id = row.dataset.id;
    const gasto = gastosCuentaCache.find((g) => g._id === id);

    if (!gasto) return;

    const searchInput = row.querySelector(".row-categoria-search");
    const resultsBox = row.querySelector(".row-categoria-results");

    searchInput?.addEventListener("input", (e) => {
      const texto = e.target.value.trim().toLowerCase();

      if (!texto) {
        resultsBox.classList.add("hidden");
        return;
      }

      const resultados = categoriasCuentaCache
        .filter((c) => c.nombre.toLowerCase().includes(texto))
        .slice(0, 20);

      resultsBox.innerHTML = resultados.length
        ? resultados
            .map(
              (c) => `
                <button type="button" class="combo-option" data-id="${c._id}" data-name="${escapeHtml(c.nombre)}">
                  ${escapeHtml(c.nombre)}
                </button>
              `,
            )
            .join("")
        : `<div class="combo-empty">Sin resultados</div>`;

      resultsBox.classList.remove("hidden");
    });

    resultsBox?.addEventListener("click", (e) => {
      const option = e.target.closest(".combo-option");
      if (!option) return;

      gasto.categoria = option.dataset.id;
      searchInput.value = option.dataset.name;
      resultsBox.classList.add("hidden");
    });

    row.querySelector(".row-descripcion")?.addEventListener("input", (e) => {
      gasto.descripcion = e.target.value;
    });

    row.querySelector(".row-flujo")?.addEventListener("input", (e) => {
      gasto.flujoBancario = Number(e.target.value);

      if (Number(formatMoney(gasto.flujoBancario)) === 0) {
        gasto.incluirEnGastoBancario = false;
      }

      renderResumenTotalesCuenta(gastosCuentaCache);
    });

    row.querySelector(".row-porcentaje")?.addEventListener("input", (e) => {
      gasto.porcentajeEconomiaReal = Number(e.target.value);
    });

    row.querySelector(".row-economia")?.addEventListener("input", (e) => {
      gasto.economiaReal = formatMoney(Number(e.target.value));

      if (Number(formatMoney(gasto.economiaReal)) === 0) {
        gasto.incluirEnGastoReal = false;
      }

      renderResumenTotalesCuenta(gastosCuentaCache);
    });

    row.querySelector(".row-categoria")?.addEventListener("change", (e) => {
      gasto.categoria = e.target.value;
    });

    row
      .querySelector(".row-incluir-bancario")
      ?.addEventListener("change", (e) => {
        gasto.incluirEnGastoBancario =
          Number(formatMoney(gasto.flujoBancario)) !== 0
            ? e.target.checked
            : false;

        const gastoEnTodos = gastosCuentaTodos.find((g) => g._id === id);
        if (gastoEnTodos) {
          gastoEnTodos.incluirEnGastoBancario = gasto.incluirEnGastoBancario;
        }

        renderResumenTotalesCuenta(gastosCuentaTodos);
      });

    row.querySelector(".row-incluir-real")?.addEventListener("change", (e) => {
      gasto.incluirEnGastoReal =
        Number(formatMoney(gasto.economiaReal)) !== 0
          ? e.target.checked
          : false;

      const gastoEnTodos = gastosCuentaTodos.find((g) => g._id === id);
      if (gastoEnTodos) {
        gastoEnTodos.incluirEnGastoReal = gasto.incluirEnGastoReal;
      }

      renderResumenTotalesCuenta(gastosCuentaTodos);
    });

    row.querySelector(".save-row-btn")?.addEventListener("click", () => {
      guardarFilaGastoCuenta(id);
    });

    row.querySelector(".delete-row-btn")?.addEventListener("click", () => {
      eliminarGastoCuenta(id);
    });
  });
}

async function guardarFilaGastoCuenta(id) {
  const token = getToken();
  if (!token) return;

  const gasto = gastosCuentaCache.find((g) => g._id === id);

  if (!gasto) {
    bulkGastosCuentaError.textContent = "No se encontró el gasto a guardar.";
    return;
  }

  const incluirEnGastoBancario =
    Number(formatMoney(gasto.flujoBancario)) !== 0
      ? gasto.incluirEnGastoBancario
      : false;

  const incluirEnGastoReal =
    Number(formatMoney(gasto.economiaReal)) !== 0
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
        incluirEnGastoReal,
      },
      token,
    );

    await cargarGastosCuenta();
    await cargarResumenYTotalesCuenta();

    bulkGastosCuentaError.textContent = "";
    bulkGastosCuentaSuccess.textContent = "Gasto actualizado correctamente.";
  } catch (error) {
    bulkGastosCuentaError.textContent =
      error.message || "Error al actualizar gasto.";
  }
}

function actualizarEstadoSelectAllGastosCuenta() {
  updateSelectAllState(gastosCuentaCache, selectAllGastosCuenta);
}

selectAllGastosCuenta.addEventListener("change", (e) => {
  gastosCuentaCache.forEach((g) => {
    g.selected = e.target.checked;
  });
  renderGastosCuenta(gastosCuentaCache);
});

async function eliminarGastoCuenta(id) {
  const token = getToken();
  if (!token) return;

  const confirmado = confirm("¿Seguro que querés eliminar este gasto?");
  if (!confirmado) return;

  try {
    await apiRequest(`/gastos/${id}`, "DELETE", null, token);

    await cargarGastosCuenta();
    await cargarResumenYTotalesCuenta();
    await cargarSoloTotalesCategoriasCuenta();

    bulkGastosCuentaError.textContent = "";
    bulkGastosCuentaSuccess.textContent = "Gasto eliminado correctamente.";
  } catch (error) {
    bulkGastosCuentaError.textContent =
      error.message || "Error al eliminar gasto.";
  }
}

async function removerGastoDelDesglose(id) {
  const token = getToken();
  if (!token) return;

  const gasto = gastosCuentaTodos.find((g) => g._id === id);

  if (!gasto || !tipoDesgloseActual) {
    bulkDesgloseError.textContent = "No se encontró el gasto del desglose.";
    return;
  }

  const payload = {
    fecha: gasto.fecha,
    descripcion: gasto.descripcion,
    flujoBancario: Number(gasto.flujoBancario),
    economiaReal: Number(gasto.economiaReal),
    porcentajeEconomiaReal: Number(gasto.porcentajeEconomiaReal),
    categoria: gasto.categoria?._id || gasto.categoria,
    cuenta: gasto.cuenta?._id || gasto.cuenta || cuentaId,
    incluirEnGastoBancario: gasto.incluirEnGastoBancario,
    incluirEnGastoReal: gasto.incluirEnGastoReal,
  };

  if (tipoDesgloseActual === "bancario") {
    payload.incluirEnGastoBancario = false;
  }

  if (tipoDesgloseActual === "real") {
    payload.incluirEnGastoReal = false;
  }

  try {
    await apiRequest(`/gastos/${id}`, "PATCH", payload, token);

    await cargarGastosCuenta();
    await cargarResumenYTotalesCuenta();

    if (tipoDesgloseActual) {
      renderDesgloseGastosCuenta(tipoDesgloseActual);
    }

    bulkDesgloseError.textContent = "";
    bulkDesgloseSuccess.textContent = "Gasto removido del desglose.";
  } catch (error) {
    bulkDesgloseError.textContent =
      error.message || "Error al remover gasto del desglose.";
  }
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

  const confirmado = confirm(
    `¿Seguro que querés eliminar ${seleccionados.length} gasto(s)?`,
  );
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
  await cargarCategoriasModalEditar();

  const data = await apiRequest(`/gastos/${id}`, "GET", null, token);
  const gasto = getApiData(data, null);

  editarGastoCuentaId.value = gasto._id;
  editarGastoCuentaFecha.value = gasto.fecha
    ? new Date(gasto.fecha).toISOString().slice(0, 10)
    : "";
  editarGastoCuentaDescripcion.value = gasto.descripcion || "";
  editarGastoCuentaFlujo.value = gasto.flujoBancario ?? "";
  editarGastoCuentaPorcentaje.value = gasto.porcentajeEconomiaReal ?? 0;
  editarGastoCuentaEconomia.value = formatMoney(gasto.economiaReal) ?? 0;
  editarGastoCuentaCategoria.value =
    gasto.categoria?._id || gasto.categoria || "";

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
      fechaHasta: `${anioNum}-12-31`,
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
    fechaHasta: hasta,
  };
}

function getFiltrosGastosCuenta() {
  return buildDateRangeCuenta(
    modoFiltroGastosCuenta.value,
    mesGastosCuenta.value,
    anioGastosCuenta.value,
    desdeGastosCuenta.value,
    hastaGastosCuenta.value,
  );
}

function actualizarVisibilidadFiltrosTotalesCuenta() {
  if (modoFiltroTotalesCuenta.value === "mes") {
    grupoMesTotalesCuenta.style.display = "";
    grupoAnioTotalesCuenta.style.display = "";
    grupoDesdeTotalesCuenta.style.display = "none";
    grupoHastaTotalesCuenta.style.display = "none";
    return;
  }

  if (modoFiltroTotalesCuenta.value === "anio") {
    grupoMesTotalesCuenta.style.display = "none";
    grupoAnioTotalesCuenta.style.display = "";
    grupoDesdeTotalesCuenta.style.display = "none";
    grupoHastaTotalesCuenta.style.display = "none";
    return;
  }

  grupoMesTotalesCuenta.style.display = "none";
  grupoAnioTotalesCuenta.style.display = "none";
  grupoDesdeTotalesCuenta.style.display = "";
  grupoHastaTotalesCuenta.style.display = "";
}

function getFiltrosTotalesCuenta() {
  return buildDateRangeCuenta(
    modoFiltroTotalesCuenta.value,
    mesTotalesCuenta.value,
    anioTotalesCuenta.value,
    desdeTotalesCuenta.value,
    hastaTotalesCuenta.value,
  );
}

function resetFiltrosTotalesCuenta() {
  modoFiltroTotalesCuenta.value = "mes";
  mesTotalesCuenta.value = "1";
  anioTotalesCuenta.value = new Date().getFullYear();
  desdeTotalesCuenta.value = "";
  hastaTotalesCuenta.value = "";
  categoriaTotalesCuenta.value = "";
  busquedaTotalesCuenta.value = "";
  actualizarVisibilidadFiltrosTotalesCuenta();
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

  const options = `
    <option value="">Todas</option>
    ${categorias
      .map((c) => `<option value="${c._id}">${c.nombre}</option>`)
      .join("")}
  `;

  categoriaGastosCuenta.innerHTML = options;

  if (categoriaTotalesCuenta) {
    categoriaTotalesCuenta.innerHTML = options;
  }
}

async function cargarBancosModalCrearCuenta() {
  const token = getToken();
  if (!token || !crearCuentaBanco) return;

  const data = await apiRequest("/bancos", "GET", null, token);
  const bancos = getApiData(data);

  crearCuentaBanco.innerHTML = `
    <option value="">Seleccionar banco</option>
    ${bancos.map((b) => `<option value="${b._id}">${b.nombre}</option>`).join("")}
  `;
}

async function cargarCategoriasGrupoModalCrearCategoria() {
  const token = getToken();
  if (!token || !crearCategoriaGrupo) return;

  const data = await apiRequest("/categorias-grupo", "GET", null, token);
  const grupos = getApiData(data);

  crearCategoriaGrupo.innerHTML = `
    <option value="">Sin categoría principal</option>
    ${grupos.map((g) => `<option value="${g._id}">${g.nombre}</option>`).join("")}
  `;
}

async function cargarCategoriasModalCrearGasto() {
  const token = getToken();
  if (!token || !crearGastoCategoria) return;

  const data = await apiRequest("/categorias", "GET", null, token);
  const categorias = getApiData(data);

  crearGastoCategoria.innerHTML = `
    <option value="">Seleccionar subcategoría</option>
    ${categorias.map((c) => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
}

function actualizarEconomiaCrearGastoCuenta() {
  const flujo = Number(crearGastoFlujo.value);
  const porcentaje = Number(crearGastoPorcentaje.value);

  if (
    Number.isNaN(flujo) ||
    Number.isNaN(porcentaje) ||
    crearGastoFlujo.value === "" ||
    crearGastoPorcentaje.value === ""
  ) {
    crearGastoEconomia.value = "";
    return;
  }

  crearGastoEconomia.value = formatMoney(flujo * (porcentaje / 100));
}

async function cargarCategoriasModalEditar() {
  const token = getToken();
  if (!token) return;

  const data = await apiRequest("/categorias", "GET", null, token);
  const categorias = getApiData(data);

  const select = document.getElementById("editarGastoCuentaCategoria");

  if (!select) return;

  select.innerHTML = `
    <option value="">Seleccionar Subcategoría</option>
    ${categorias
      .map(
        (c) => `
      <option value="${c._id}">${c.nombre}</option>
    `,
      )
      .join("")}
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
  const incluirBancarioRaw = bulkIncluirBancarioGastosCuenta.value;
  const incluirRealRaw = bulkIncluirRealGastosCuenta.value;

  const hayCategoria = categoria !== "";
  const hayPorcentaje = porcentajeRaw !== "";
  const hayIncluirBancario = incluirBancarioRaw !== "";
  const hayIncluirReal = incluirRealRaw !== "";

  if (!seleccionados.length) {
    bulkGastosCuentaError.textContent = "No hay gastos seleccionados.";
    return;
  }

  if (
    !hayCategoria &&
    !hayPorcentaje &&
    !hayIncluirBancario &&
    !hayIncluirReal
  ) {
    bulkGastosCuentaError.textContent =
      "Seleccioná al menos un valor para aplicar.";
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
          nuevaEconomia = Number(formatMoney(gasto.economiaReal));
        } else {
          nuevoPorcentaje = Number(porcentajeRaw);
          nuevaEconomia = Number(
            (
              Number(formatMoney(gasto.flujoBancario)) *
              (nuevoPorcentaje / 100)
            ).toFixed(2),
          );
        }
      }

      let incluirEnGastoBancario = gasto.incluirEnGastoBancario;
      let incluirEnGastoReal = gasto.incluirEnGastoReal;

      if (hayIncluirBancario) {
        incluirEnGastoBancario = incluirBancarioRaw === "true";
      }

      if (hayIncluirReal) {
        incluirEnGastoReal = incluirRealRaw === "true";
      }

      if (Number(formatMoney(gasto.flujoBancario)) === 0) {
        incluirEnGastoBancario = false;
      }

      if (Number(formatMoney(nuevaEconomia)) === 0) {
        incluirEnGastoReal = false;
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
          categoria: hayCategoria
            ? categoria
            : gasto.categoria?._id || gasto.categoria,
          cuenta: cuentaId,
          incluirEnGastoBancario,
          incluirEnGastoReal,
        },
        token,
      );

      actualizados++;
    } catch {
      errores++;
    }
  }

  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();

  if (tipoDesgloseActual) {
    renderDesgloseGastosCuenta(tipoDesgloseActual);
  }

  if (actualizados > 0) {
    bulkGastosCuentaSuccess.textContent = `Se actualizaron ${actualizados} gasto(s).`;
  }

  if (errores > 0) {
    bulkGastosCuentaError.textContent = `No se pudieron actualizar ${errores} gasto(s).`;
  }
}

aplicarBulkGastosCuentaBtn.addEventListener("click", aplicarBulkGastosCuenta);
eliminarBulkGastosCuentaBtn.addEventListener(
  "click",
  eliminarGastosCuentaSeleccionados,
);

verDesgloseBancarioBtn.addEventListener("click", () => {
  tipoDesgloseActual = "bancario";
  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

verDesgloseRealBtn.addEventListener("click", () => {
  tipoDesgloseActual = "real";
  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

filtrarDesgloseBtn?.addEventListener("click", () => {
  if (!tipoDesgloseActual) return;
  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

limpiarFiltroDesgloseBtn?.addEventListener("click", () => {
  if (categoriaFiltroDesglose) categoriaFiltroDesglose.value = "";
  if (busquedaFiltroDesglose) busquedaFiltroDesglose.value = "";
  if (ordenDesgloseCuenta) ordenDesgloseCuenta.value = "manual";

  if (!tipoDesgloseActual) return;
  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

ordenDesgloseCuenta?.addEventListener("change", () => {
  if (!tipoDesgloseActual) return;
  renderDesgloseGastosCuenta(tipoDesgloseActual);
});

editarGastoCuentaFlujo.addEventListener(
  "input",
  actualizarEconomiaEditarGastoCuenta,
);
editarGastoCuentaPorcentaje.addEventListener(
  "input",
  actualizarEconomiaEditarGastoCuenta,
);

document.querySelectorAll("[data-open-modal]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const modalId = btn.dataset.openModal;
    const modal = document.getElementById(modalId);

    if (modalId === "crearCuentaModal") {
      await cargarBancosModalCrearCuenta();
    }

    if (modalId === "crearCategoriaModal") {
      await cargarCategoriasGrupoModalCrearCategoria();
    }

    if (modalId === "crearGastoModal") {
      await cargarCategoriasModalCrearGasto();
      crearGastoFecha.value = new Date().toISOString().slice(0, 10);
      crearGastoIncluirBancario.checked = true;
      crearGastoIncluirReal.checked = true;
      actualizarEconomiaCrearGastoCuenta();
    }

    openModal(modal);
  });
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

window.editarGastoCuenta = editarGastoCuenta;
window.eliminarGastoCuenta = eliminarGastoCuenta;
window.removerGastoDelDesglose = removerGastoDelDesglose;

crearBancoCuentaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  crearBancoError.textContent = "";

  try {
    await apiRequest(
      "/bancos",
      "POST",
      {
        nombre: crearBancoNombre.value.trim(),
      },
      token,
    );

    crearBancoCuentaForm.reset();
    closeModal(document.getElementById("crearBancoModal"));
  } catch (error) {
    crearBancoError.textContent = error.message || "Error al crear banco.";
  }
});

crearCuentaCuentaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  crearCuentaError.textContent = "";

  try {
    await apiRequest(
      "/cuentas",
      "POST",
      {
        nombre: crearCuentaNombre.value.trim(),
        banco: crearCuentaBanco.value,
      },
      token,
    );

    crearCuentaCuentaForm.reset();
    closeModal(document.getElementById("crearCuentaModal"));
  } catch (error) {
    crearCuentaError.textContent = error.message || "Error al crear cuenta.";
  }
});

crearCategoriaGrupoCuentaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  crearCategoriaGrupoError.textContent = "";

  try {
    await apiRequest(
      "/categorias-grupo",
      "POST",
      {
        nombre: crearCategoriaGrupoNombre.value.trim(),
      },
      token,
    );

    crearCategoriaGrupoCuentaForm.reset();
    closeModal(document.getElementById("crearCategoriaGrupoModal"));
  } catch (error) {
    crearCategoriaGrupoError.textContent =
      error.message || "Error al crear categoría principal.";
  }
});

crearCategoriaCuentaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  crearCategoriaError.textContent = "";

  try {
    await apiRequest(
      "/categorias",
      "POST",
      {
        nombre: crearCategoriaNombre.value.trim(),
        categoriaGrupo: crearCategoriaGrupo.value || null,
      },
      token,
    );

    crearCategoriaCuentaForm.reset();
    closeModal(document.getElementById("crearCategoriaModal"));

    await cargarCategoriasFiltroGastosCuenta();
    await cargarCategoriasParaGastosCuenta();
  } catch (error) {
    crearCategoriaError.textContent =
      error.message || "Error al crear subcategoría.";
  }
});

crearGastoFlujo?.addEventListener("input", actualizarEconomiaCrearGastoCuenta);
crearGastoPorcentaje?.addEventListener(
  "input",
  actualizarEconomiaCrearGastoCuenta,
);

crearGastoCuentaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  crearGastoError.textContent = "";

  const flujoBancario = Number(crearGastoFlujo.value);
  const porcentajeEconomiaReal = Number(crearGastoPorcentaje.value);
  const economiaReal = Number(crearGastoEconomia.value);

  try {
    await apiRequest(
      "/gastos",
      "POST",
      {
        fecha: crearGastoFecha.value,
        descripcion: crearGastoDescripcion.value.trim(),
        flujoBancario,
        porcentajeEconomiaReal,
        economiaReal,
        categoria: crearGastoCategoria.value,
        cuenta: cuentaId,
        incluirEnGastoBancario:
          flujoBancario !== 0 ? crearGastoIncluirBancario.checked : false,
        incluirEnGastoReal:
          economiaReal !== 0 ? crearGastoIncluirReal.checked : false,
      },
      token,
    );

    crearGastoCuentaForm.reset();
    closeModal(document.getElementById("crearGastoModal"));

    await cargarGastosCuenta();
    await cargarResumenYTotalesCuenta();
    await cargarSoloTotalesCategoriasCuenta();
  } catch (error) {
    crearGastoError.textContent = error.message || "Error al crear gasto.";
  }
});

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
    editarGastoCuentaError.textContent =
      "La descripción debe tener entre 5 y 500 caracteres.";
    return;
  }

  if (
    Number.isNaN(flujoBancario) ||
    Number.isNaN(porcentajeEconomiaReal) ||
    Number.isNaN(economiaReal)
  ) {
    editarGastoCuentaError.textContent =
      "Los valores numéricos no son válidos.";
    return;
  }

  if (porcentajeEconomiaReal < 0 || porcentajeEconomiaReal > 100) {
    editarGastoCuentaError.textContent =
      "El porcentaje debe estar entre 0 y 100.";
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
        cuenta: cuentaId,
        incluirEnGastoBancario:
          flujoBancario !== 0 ? crearGastoIncluirBancario.checked : false,
        incluirEnGastoReal:
          economiaReal !== 0 ? crearGastoIncluirReal.checked : false,
      },
      token,
    );

    closeModal(editarGastoCuentaModal);
    await cargarGastosCuenta();
  } catch (error) {
    editarGastoCuentaError.textContent =
      error.message || "Error al editar gasto.";
  }
});

modoFiltroGastosCuenta.addEventListener(
  "change",
  actualizarVisibilidadFiltrosGastosCuenta,
);

modoFiltroTotalesCuenta.addEventListener(
  "change",
  actualizarVisibilidadFiltrosTotalesCuenta,
);

filtrarTotalesCuentaBtn?.addEventListener("click", async () => {
  await cargarSoloTotalesCategoriasCuenta();
});

limpiarFiltroTotalesCuentaBtn?.addEventListener("click", async () => {
  resetFiltrosTotalesCuenta();
  await cargarSoloTotalesCategoriasCuenta();
});

categoriaTotalesCuenta.addEventListener("change", async () => {
  await cargarSoloTotalesCategoriasCuenta();
});

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

ordenGastosCuenta?.addEventListener("change", () => {
  aplicarOrdenGastosCuenta();
  renderGastosCuenta(gastosCuentaCache);

  if (tipoDesgloseActual) {
    renderDesgloseGastosCuenta(tipoDesgloseActual);
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  resetFiltrosGastosCuenta();
  resetFiltrosTotalesCuenta();
  await cargarCategoriasFiltroGastosCuenta();
  await cargarCategoriasParaGastosCuenta();
  totalPaginasGastosCuenta = await calcularTotalPaginasGastosCuenta();
  await cargarGastosCuenta();
  await cargarResumenYTotalesCuenta();
  await cargarSoloTotalesCategoriasCuenta();
});
