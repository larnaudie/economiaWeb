requireAuth();
renderHeader({ title: "Cargar Excel" });

const importButton = document.getElementById("importButton");
const fileInput = document.getElementById("fileInput");
const importError = document.getElementById("importError");
const importSuccess = document.getElementById("importSuccess");
const previewBody = document.getElementById("previewBody");
const crearTodosButton = document.getElementById("crearTodosButton");
const crearTodosError = document.getElementById("crearTodosError");
const crearTodosSuccess = document.getElementById("crearTodosSuccess");
const bulkCategoria = document.getElementById("bulkCategoria");
//const bulkCategoriaSearch = document.getElementById("bulkCategoriaSearch");
const crearCategoriaDesdeBulkBtn = document.getElementById(
  "crearCategoriaDesdeBulkBtn",
);
const bulkCuenta = document.getElementById("bulkCuenta");
const bulkIncluirGastoBancario = document.getElementById(
  "bulkIncluirGastoBancario",
);
const bulkIncluirGastoReal = document.getElementById("bulkIncluirGastoReal");
const bulkPorcentaje = document.getElementById("bulkPorcentaje");
const aplicarTodosButton = document.getElementById("aplicarTodosButton");
const bulkError = document.getElementById("bulkError");
const bulkSuccess = document.getElementById("bulkSuccess");
const selectAllRows = document.getElementById("selectAllRows");
const eliminarSeleccionadosButton = document.getElementById(
  "eliminarSeleccionadosButton",
);
const bulkFecha = document.getElementById("bulkFecha");
const bulkDescripcion = document.getElementById("bulkDescripcion");
const bulkFlujo = document.getElementById("bulkFlujo");
const bulkEconomia = document.getElementById("bulkEconomia");
const vaciarTablaButton = document.getElementById("vaciarTablaButton");
const editarSeleccionadosButton = document.getElementById(
  "editarSeleccionadosButton",
);

let categoriasCache = [];
let cuentasCache = [];
let importedRows = [];

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
}

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

selectAllRows.addEventListener("change", (e) => {
  toggleSelectAllRows(e.target.checked);
});

importButton.addEventListener("click", () => {
  fileInput.click();
});
crearTodosButton.addEventListener("click", crearTodosLosGastos);
aplicarTodosButton.addEventListener("click", aplicarCambiosATodos);
eliminarSeleccionadosButton.addEventListener("click", eliminarSeleccionados);
vaciarTablaButton.addEventListener("click", vaciarTabla);
editarSeleccionadosButton.addEventListener(
  "click",
  aplicarCambiosSeleccionados,
);
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  importError.textContent = "";
  importSuccess.textContent = "";

  try {
    await procesarArchivoExcelNoPersonal(file);
    renderPreview();
    importSuccess.textContent = `Archivo procesado. Se encontraron ${importedRows.length} filas válidas.`;
  } catch (error) {
    importError.textContent = error.message || "Error al procesar el archivo";
  } finally {
    fileInput.value = "";
  }
});

document.querySelectorAll(".delete-row-btn").forEach((button) => {
  button.addEventListener("click", handleDeleteRow);
});

/*
bulkCategoriaSearch.addEventListener("input", () => {
  renderBulkCategorias(bulkCategoriaSearch.value);
});
*/
crearCategoriaDesdeBulkBtn.addEventListener("click", crearCategoriaDesdeBulk);

async function crearCategoriaDesdeBulk() {
  const token = getToken();
  if (!token) return;

  const crearCategoriaError = document.getElementById("crearCategoriaError");
  const crearCategoriaSuccess = document.getElementById(
    "crearCategoriaSuccess",
  );

  crearCategoriaError.textContent = "";
  crearCategoriaSuccess.textContent = "";

  const crearCategoriaNombre = document.getElementById("crearCategoriaNombre");
  const nombre = String(crearCategoriaNombre?.value || "").trim();

  if (!nombre || nombre.length < 2) {
    crearCategoriaError.textContent =
      "Escribí un nombre válido para crear una subcategoría.";
    return;
  }

  const existente = categoriasCache.find(
    (c) => c.nombre.toLowerCase() === nombre.toLowerCase(),
  );

  if (existente) {
    bulkCategoria.value = existente._id;
    crearCategoriaSuccess.textContent =
      "La subcategoría ya existía y fue seleccionada.";
    return;
  }

  try {
    await apiRequest(
      "/categorias",
      "POST",
      {
        nombre,
        categoriaGrupo: null,
      },
      token,
    );

    const categoriasSeleccionadasPorFila = importedRows.map((row) => ({
      localId: row.localId,
      categoria: row.categoria,
    }));

    await cargarCategorias();

    categoriasSeleccionadasPorFila.forEach((item) => {
      const row = importedRows.find((r) => r.localId === item.localId);
      if (row) {
        row.categoria = item.categoria;
      }
    });

    const encontrada = categoriasCache.find(
      (c) => c.nombre.toLowerCase() === nombre.toLowerCase(),
    );

    if (encontrada) {
      bulkCategoria.value = encontrada._id;
    }

    crearCategoriaNombre.value = "";
    renderPreview();

    crearCategoriaSuccess.textContent = "Subcategoría creada correctamente.";
  } catch (error) {
    bulkError.textContent = error.message || "Error al crear subcategoría.";
  }
}

function excelDateToISO(value) {
  if (value == null || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return "";
    const yyyy = String(parsed.y).padStart(4, "0");
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const dd = String(match[1]).padStart(2, "0");
      const mm = String(match[2]).padStart(2, "0");
      const yyyy = match[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    const date = new Date(trimmed);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return "";
}

function parseNumber(value) {
  return parseMoneyValue(value);
}

function buildFlujo(gValue, iValue) {
  const g = parseNumber(gValue);
  const i = parseNumber(iValue);

  if (g != null && i != null) return g + i;
  if (g != null) return g;
  if (i != null) return i;
  return null;
}

async function cargarCategorias() {
  const token = getToken();
  const data = await apiRequest("/categorias", "GET", null, token);
  categoriasCache = getApiData(data);
  renderBulkCategorias();
}

async function cargarCuentas() {
  const token = getToken();
  const data = await apiRequest("/cuentas", "GET", null, token);
  cuentasCache = getApiData(data);
  renderBulkCuentas();
}

function resolverFlagsGastoPorCategoria(
  nombreCategoria,
  flujoBancario,
  economiaReal,
) {
  const flujo = Number(flujoBancario) || 0;
  const real = Number(economiaReal) || 0;

  return {
    incluirEnGastoBancario: flujo !== 0,
    incluirEnGastoReal: real !== 0,
  };
}

async function procesarArchivoExcelNoPersonal(file) {
  await Promise.all([cargarCategorias(), cargarCuentas()]);

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    throw new Error("No se encontró una hoja válida en el archivo.");
  }

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const filas = [];

  for (let rowIndex = 15; rowIndex <= range.e.r; rowIndex++) {
    const excelRowNumber = rowIndex + 1;

    const fechaRaw = sheet[`B${excelRowNumber}`]?.v ?? "";
    const descripcionRaw = sheet[`D${excelRowNumber}`]?.v ?? "";
    const gRaw = sheet[`G${excelRowNumber}`]?.v ?? "";
    const iRaw = sheet[`I${excelRowNumber}`]?.v ?? "";

    const fecha = excelDateToISO(fechaRaw);
    const descripcion = String(descripcionRaw || "").trim();
    const flujoBancario = buildFlujo(gRaw, iRaw);

    const isEmptyRow =
      !fecha && !descripcion && (flujoBancario == null || flujoBancario === 0);

    if (isEmptyRow) continue;

    const porcentajeEconomiaReal = 100;
    const economiaReal = flujoBancario ? Number(flujoBancario.toFixed(2)) : 0;
    const flags = resolverFlagsGastoPorCategoria(descripcion);
    filas.push({
      localId: `row-${Date.now()}-${rowIndex}`,
      fecha,
      descripcion,
      flujoBancario: flujoBancario ?? 0,
      porcentajeEconomiaReal,
      economiaReal,
      categoria: "",
      cuenta: "",
      incluirEnGastoBancario: flags.incluirEnGastoBancario,
      incluirEnGastoReal: flags.incluirEnGastoReal,
      selected: true,
      created: false,
    });
  }

  importedRows = filas;
  renderPreview();
}

function categoriasOptions(selectedValue = "", filtro = "") {
  let options = '<option value="">Seleccionar categoría</option>';

  const texto = filtro.trim().toLowerCase();

  options += categoriasCache
    .filter((categoria) => categoria.nombre.toLowerCase().includes(texto))
    .map(
      (categoria) => `
      <option value="${categoria._id}" ${selectedValue === categoria._id ? "selected" : ""}>
        ${categoria.nombre}
      </option>
    `,
    )
    .join("");

  return options;
}

function cuentasOptions(selectedValue = "") {
  let options = '<option value="">Seleccionar cuenta</option>';

  options += cuentasCache
    .map(
      (cuenta) => `
      <option value="${cuenta._id}" ${selectedValue === cuenta._id ? "selected" : ""}>
        ${cuenta.nombre}
      </option>
    `,
    )
    .join("");

  return options;
}

function getCategoriaNombre(id) {
  const categoria = categoriasCache.find((c) => c._id === id);
  return categoria?.nombre || "";
}

function renderPreview() {
  if (!importedRows.length) {
    previewBody.innerHTML = `
      <tr>
        <td colspan="11">Todavía no hay datos importados.</td>
      </tr>
    `;
    return;
  }

  previewBody.innerHTML = importedRows
    .map((row) => {
      const economiaReadonlyAttr =
        Number(row.flujoBancario) === 0 ? "" : "readonly";
      const porcentajeDisabledAttr =
        Number(row.flujoBancario) === 0 ? "disabled" : "";

      return `
        <tr data-id="${row.localId}">
          <td>
            <input
              type="checkbox"
              class="row-selected"
              ${row.selected ? "checked" : ""}
              ${row.created ? "disabled" : ""}
            >
          </td>

          <td>
           <input type="date" class="row-fecha" value="${row.fecha || ""}" ${row.created ? "disabled" : ""}>
          </td>

          <td>
            <textarea class="row-descripcion" maxlength="500" ${row.created ? "disabled" : ""}>${escapeHtml(row.descripcion)}</textarea>
          </td>

          <td>
            <input type="number" class="row-flujo" step="0.01" value="${row.flujoBancario ?? 0}" ${row.created ? "disabled" : ""}>
          </td>

          <td>
            <input type="number" class="row-porcentaje" step="0.01" min="0" max="100"
  value="${row.porcentajeEconomiaReal ?? 0}" ${porcentajeDisabledAttr}>
          </td>

          <td>
            <input type="number" class="row-economia" step="0.01"
  value="${row.economiaReal ?? 0}" ${economiaReadonlyAttr}>
          </td>

          <td class="combo-cell">
  <input
    type="text"
    class="row-categoria-search"
    data-id="${row.localId}"
    placeholder="Buscar subcategoría"
    value="${escapeHtml(getCategoriaNombre(row.categoria))}"
    ${row.created ? "disabled" : ""}
  >

  <div class="row-categoria-results hidden"></div>

  <input type="hidden" class="row-categoria" value="${row.categoria || ""}">
</td>

          <td>
            <select class="row-cuenta">
              ${cuentasOptions(row.cuenta)}
            </select>
          </td>

          <td>
  <input type="checkbox" class="row-incluir-bancario" ${row.incluirEnGastoBancario ? "checked" : ""}>
</td>

<td>
  <input type="checkbox" class="row-incluir-real" ${row.incluirEnGastoReal ? "checked" : ""}>
</td>

          <td>
            <div class="inline-group">

              <button type="button" class="confirm-row-btn" data-id="${row.localId}" ${row.created ? "disabled" : ""}>
                ${row.created ? "Creado" : "Confirmar"}
              </button>

              <button type="button" class="delete-row-btn" data-id="${row.localId}" ${row.created ? "disabled" : ""}>
                Eliminar
              </button>
            </div>

            <div class="error row-error" style="margin-top:0.5rem;"></div>
          </td>
        </tr>
      `;
    })
    .join("");

  actualizarEstadoSelectAll();
  attachRowEvents();
}

function attachRowEvents() {
  document.querySelectorAll(".confirm-row-btn").forEach((button) => {
    button.addEventListener("click", handleConfirmRow);
  });

  document.querySelectorAll(".delete-row-btn").forEach((button) => {
    button.addEventListener("click", handleDeleteRow);
  });

  document.querySelectorAll("#previewBody tr").forEach((rowElement) => {
    const localId = rowElement.dataset.id;

    rowElement
      .querySelector(".row-selected")
      ?.addEventListener("change", (e) => {
        updateRow(localId, "selected", e.target.checked);
        actualizarEstadoSelectAll();
      });

    rowElement.querySelector(".row-fecha")?.addEventListener("input", (e) => {
      updateRow(localId, "fecha", e.target.value);
    });

    rowElement
      .querySelector(".row-descripcion")
      ?.addEventListener("input", (e) => {
        updateRow(localId, "descripcion", e.target.value);
      });

    rowElement.querySelector(".row-flujo")?.addEventListener("input", (e) => {
      updateRow(localId, "flujoBancario", e.target.value);
      recalcularEconomiaRow(localId);
    });

    rowElement
      .querySelector(".row-porcentaje")
      ?.addEventListener("input", (e) => {
        updateRow(localId, "porcentajeEconomiaReal", e.target.value);
        recalcularEconomiaRow(localId);
      });

    const searchInput = rowElement.querySelector(".row-categoria-search");
    const resultsBox = rowElement.querySelector(".row-categoria-results");

    searchInput?.addEventListener("input", (e) => {
      const texto = e.target.value.trim().toLowerCase();
      updateRow(localId, "categoria", "");

      if (!texto) {
        resultsBox.classList.add("hidden");
        return;
      }

      const resultados = categoriasCache
        .filter((c) => c.nombre.toLowerCase().includes(texto))
        .slice(0, 20);

      if (!resultados.length) {
        resultsBox.innerHTML = `<div class="combo-empty">Sin resultados</div>`;
      } else {
        resultsBox.innerHTML = resultados
          .map(
            (c) => `
            <button type="button" class="combo-option"
                data-id="${c._id}"
                data-name="${escapeHtml(c.nombre)}">
                ${escapeHtml(c.nombre)}
            </button>
        `,
          )
          .join("");
      }

      resultsBox.classList.remove("hidden");
    });

    resultsBox?.addEventListener("click", (e) => {
      const option = e.target.closest(".combo-option");
      if (!option) return;

      updateRow(localId, "categoria", option.dataset.id);
      searchInput.value = option.dataset.name;
      resultsBox.classList.add("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!rowElement.contains(e.target)) {
        resultsBox.classList.add("hidden");
      }
    });

    rowElement.querySelector(".row-cuenta")?.addEventListener("change", (e) => {
      updateRow(localId, "cuenta", e.target.value);
    });
    rowElement
      .querySelector(".row-incluir-bancario")
      ?.addEventListener("change", (e) => {
        updateRow(localId, "incluirEnGastoBancario", e.target.checked);
      });

    rowElement
      .querySelector(".row-incluir-real")
      ?.addEventListener("change", (e) => {
        updateRow(localId, "incluirEnGastoReal", e.target.checked);
      });
  });
}

function updateRow(localId, field, value) {
  const row = importedRows.find((item) => item.localId === localId);
  if (!row) return;
  row[field] = value;
}

function recalcularEconomiaRow(localId) {
  const row = importedRows.find((item) => item.localId === localId);
  if (!row) return;

  const flujo = Number(row.flujoBancario);
  const porcentaje = Number(row.porcentajeEconomiaReal);

  if (Number.isNaN(flujo) || Number.isNaN(porcentaje)) {
    row.economiaReal = 0;
  } else {
    row.economiaReal = Number((flujo * (porcentaje / 100)).toFixed(2));
  }

  const rowElement = document.querySelector(`tr[data-id="${localId}"]`);
  const economiaInput = rowElement?.querySelector(".row-economia");

  if (economiaInput) {
    economiaInput.value = row.economiaReal;
  }
}

async function handleConfirmRow(event) {
  const localId = event.target.dataset.id;
  const row = importedRows.find((item) => item.localId === localId);
  if (!row || row.created) return;

  const rowElement = document.querySelector(`tr[data-id="${localId}"]`);
  const errorEl = rowElement?.querySelector(".row-error");
  if (errorEl) errorEl.textContent = "";

  const fecha = row.fecha;
  const descripcion = String(row.descripcion || "").trim();
  const flujoBancario = Number(row.flujoBancario);
  const porcentajeEconomiaReal = Number(row.porcentajeEconomiaReal);
  const economiaReal = Number(row.economiaReal);
  const categoria = row.categoria;
  const cuenta = row.cuenta;

  const validationError = validarFilaParaCrear(row);
  if (validationError) {
    if (errorEl) errorEl.textContent = validationError;
    return;
  }

  try {
    const token = getToken();

    const incluirEnGastoBancario =
      Number(row.flujoBancario) !== 0 ? row.incluirEnGastoBancario : false;

    const incluirEnGastoReal =
      Number(row.economiaReal) !== 0 ? row.incluirEnGastoReal : false;

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
        incluirEnGastoBancario,
        incluirEnGastoReal,
      },
      token,
    );

    row.created = true;
    row.isEditing = false;
    row.selected = false;
    renderPreview();
  } catch (error) {
    if (errorEl) {
      errorEl.textContent = error.message || "Error al crear el gasto.";
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validarFilaParaCrear(row) {
  const fecha = row.fecha;
  const descripcion = String(row.descripcion || "").trim();
  const flujoBancario = Number(row.flujoBancario);
  const porcentajeEconomiaReal = Number(row.porcentajeEconomiaReal);
  const economiaReal = Number(row.economiaReal);
  const categoria = row.categoria;
  const cuenta = row.cuenta;

  if (!fecha) return "La fecha es obligatoria.";
  if (!descripcion || descripcion.length < 2)
    return "La descripción debe tener al menos 2 caracteres.";
  if (descripcion.length > 500)
    return "La descripción no puede tener más de 500 caracteres.";
  if (Number.isNaN(flujoBancario)) return "El flujo bancario debe ser válido.";
  if (
    Number.isNaN(porcentajeEconomiaReal) ||
    porcentajeEconomiaReal < 0 ||
    porcentajeEconomiaReal > 100
  ) {
    return "El porcentaje de economía real debe estar entre 0 y 100.";
  }
  if (Number.isNaN(economiaReal))
    return "La economía real calculada no es válida.";
  if (!categoria) return "Seleccioná una categoría.";
  if (!cuenta) return "Seleccioná una cuenta.";

  return null;
}

async function crearTodosLosGastos() {
  const token = getToken();
  if (!token) return;

  crearTodosError.textContent = "";
  crearTodosSuccess.textContent = "";

  const pendientes = importedRows.filter((row) => !row.created && row.selected);

  if (!pendientes.length) {
    crearTodosError.textContent =
      "No hay filas seleccionadas pendientes para crear.";
    return;
  }

  let creados = 0;
  let errores = 0;

  for (const row of pendientes) {
    const validationError = validarFilaParaCrear(row);

    if (validationError) {
      errores++;
      continue;
    }

    const incluirEnGastoBancario =
      Number(row.flujoBancario) !== 0 ? row.incluirEnGastoBancario : false;

    const incluirEnGastoReal =
      Number(row.economiaReal) !== 0 ? row.incluirEnGastoReal : false;

    try {
      await apiRequest(
        "/gastos",
        "POST",
        {
          fecha: row.fecha,
          descripcion: String(row.descripcion || "").trim(),
          flujoBancario: Number(row.flujoBancario),
          economiaReal: Number(row.economiaReal),
          porcentajeEconomiaReal: Number(row.porcentajeEconomiaReal),
          categoria: row.categoria,
          cuenta: row.cuenta,
          incluirEnGastoBancario,
          incluirEnGastoReal,
        },
        token,
      );

      row.created = true;
      row.isEditing = false;
      row.selected = false;
      creados++;
    } catch (error) {
      errores++;
    }
  }

  renderPreview();

  if (creados > 0) {
    crearTodosSuccess.textContent = `Se crearon ${creados} gastos correctamente.`;
  }

  if (errores > 0) {
    crearTodosError.textContent = `No se pudieron crear ${errores} filas. Revisá las pendientes.`;
  }
}

function renderBulkCategorias(filtro = "") {
  const texto = filtro.trim().toLowerCase();

  const categoriasFiltradas = categoriasCache.filter((categoria) =>
    categoria.nombre.toLowerCase().includes(texto),
  );

  bulkCategoria.innerHTML = '<option value="">No cambiar</option>';

  bulkCategoria.innerHTML += categoriasFiltradas
    .map(
      (categoria) => `
            <option value="${categoria._id}">
                ${categoria.nombre}
            </option>
        `,
    )
    .join("");
}

function renderBulkCuentas() {
  bulkCuenta.innerHTML = '<option value="">No cambiar</option>';

  bulkCuenta.innerHTML += cuentasCache
    .map((cuenta) => `<option value="${cuenta._id}">${cuenta.nombre}</option>`)
    .join("");
}

function editarSeleccionados() {
  let afectados = 0;

  importedRows.forEach((row) => {
    if (!row.created && row.selected) {
      row.isEditing = true;
      afectados++;
    }
  });

  renderPreview();

  bulkError.textContent = "";
  bulkSuccess.textContent = afectados
    ? `Se habilitó edición para ${afectados} fila(s).`
    : "No hay filas seleccionadas para editar.";
}

function aplicarCambiosSeleccionados() {
  aplicarCambiosBulk({
    soloSeleccionados: true,
    mensajeVacio: "No hay filas seleccionadas.",
  });
}

function aplicarCambiosATodos() {
  aplicarCambiosBulk({
    soloSeleccionados: false,
    mensajeVacio: "No hay filas pendientes para editar.",
  });
}

function aplicarCambiosBulk({ soloSeleccionados, mensajeVacio }) {
  bulkError.textContent = "";
  bulkSuccess.textContent = "";

  const fecha = bulkFecha.value;
  const descripcion = bulkDescripcion.value.trim();
  const flujoRaw = bulkFlujo.value;
  const economiaRaw = bulkEconomia.value;
  const categoria = bulkCategoria.value;
  const cuenta = bulkCuenta.value;
  const porcentajeRaw = bulkPorcentaje.value;
  const incluirBancarioRaw = bulkIncluirGastoBancario.value;
  const incluirRealRaw = bulkIncluirGastoReal.value;

  const hayFecha = fecha !== "";
  const hayDescripcion = descripcion !== "";
  const hayFlujo = flujoRaw !== "";
  const hayEconomia = economiaRaw !== "";
  const hayCategoria = categoria !== "";
  const hayCuenta = cuenta !== "";
  const hayPorcentaje = porcentajeRaw !== "";
  const hayIncluirBancario = incluirBancarioRaw !== "";
  const hayIncluirReal = incluirRealRaw !== "";

  if (
    !hayFecha &&
    !hayDescripcion &&
    !hayFlujo &&
    !hayEconomia &&
    !hayCategoria &&
    !hayCuenta &&
    !hayPorcentaje &&
    !hayIncluirBancario &&
    !hayIncluirReal
  ) {
    bulkError.textContent = "Seleccioná al menos un valor para aplicar.";
    return;
  }

  if (hayFlujo && Number.isNaN(Number(flujoRaw))) {
    bulkError.textContent = "El gasto bancario debe ser válido.";
    return;
  }

  if (hayEconomia && Number.isNaN(Number(economiaRaw))) {
    bulkError.textContent = "El gasto real debe ser válido.";
    return;
  }

  if (hayPorcentaje) {
    const porcentaje = Number(porcentajeRaw);

    if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      bulkError.textContent = "El porcentaje debe estar entre 0 y 100.";
      return;
    }
  }

  const filasObjetivo = importedRows.filter((row) => {
    if (row.created) return false;
    if (soloSeleccionados) return row.selected === true;
    return true;
  });

  if (!filasObjetivo.length) {
    bulkError.textContent = mensajeVacio;
    return;
  }

  let filasActualizadas = 0;

  filasObjetivo.forEach((row) => {
    if (hayFecha) row.fecha = fecha;
    if (hayDescripcion) row.descripcion = descripcion;
    if (hayCategoria) row.categoria = categoria;
    if (hayCuenta) row.cuenta = cuenta;

    if (hayFlujo) {
      row.flujoBancario = Number(flujoRaw);
    }

    if (hayPorcentaje) {
      row.porcentajeEconomiaReal = Number(porcentajeRaw);
    }

    if (hayEconomia) {
      row.economiaReal = Number(economiaRaw);
    } else {
      const flujo = Number(row.flujoBancario);
      const porcentaje = Number(row.porcentajeEconomiaReal);

      if (flujo === 0) {
        row.porcentajeEconomiaReal = 0;
        row.economiaReal = Number(row.economiaReal) || 0;
      } else if (!Number.isNaN(flujo) && !Number.isNaN(porcentaje)) {
        row.economiaReal = Number((flujo * (porcentaje / 100)).toFixed(2));
      }
    }

    if (hayIncluirBancario) {
      row.incluirEnGastoBancario =
        Number(row.flujoBancario) !== 0 ? incluirBancarioRaw === "true" : false;
    }

    if (hayIncluirReal) {
      row.incluirEnGastoReal =
        Number(row.economiaReal) !== 0 ? incluirRealRaw === "true" : false;
    }

    if (Number(row.flujoBancario) === 0) {
      row.incluirEnGastoBancario = false;
    }

    if (Number(row.economiaReal) === 0) {
      row.incluirEnGastoReal = false;
    }

    filasActualizadas++;
  });

  renderPreview();

  bulkSuccess.textContent = soloSeleccionados
    ? `Se editaron ${filasActualizadas} fila(s) seleccionada(s).`
    : `Se aplicaron cambios a ${filasActualizadas} fila(s).`;
}

function vaciarTabla() {
  bulkError.textContent = "";
  bulkSuccess.textContent = "";
  crearTodosError.textContent = "";
  crearTodosSuccess.textContent = "";
  importError.textContent = "";
  importSuccess.textContent = "";

  if (!importedRows.length) {
    bulkError.textContent = "No hay filas para vaciar.";
    return;
  }

  const confirmado = confirm("¿Seguro que querés vaciar toda la tabla?");
  if (!confirmado) return;

  importedRows = [];
  renderPreview();
  bulkSuccess.textContent = "La tabla fue vaciada.";
}

function actualizarEstadoSelectAll() {
  const pendientes = importedRows.filter((row) => !row.created);

  if (!pendientes.length) {
    selectAllRows.checked = false;
    selectAllRows.indeterminate = false;
    return;
  }

  const seleccionados = pendientes.filter((row) => row.selected);

  if (seleccionados.length === 0) {
    selectAllRows.checked = false;
    selectAllRows.indeterminate = false;
    return;
  }

  if (seleccionados.length === pendientes.length) {
    selectAllRows.checked = true;
    selectAllRows.indeterminate = false;
    return;
  }

  selectAllRows.checked = false;
  selectAllRows.indeterminate = true;
}

function toggleSelectAllRows(isChecked) {
  importedRows.forEach((row) => {
    if (!row.created) {
      row.selected = isChecked;
    }
  });

  renderPreview();
}

function handleDeleteRow(event) {
  const localId = event.target.dataset.id;

  importedRows = importedRows.filter((row) => row.localId !== localId);

  bulkError.textContent = "";
  bulkSuccess.textContent = "";
  renderPreview();
}

function eliminarSeleccionados() {
  bulkError.textContent = "";
  bulkSuccess.textContent = "";

  const seleccionados = importedRows.filter(
    (row) => row.selected && !row.created,
  );

  if (!seleccionados.length) {
    bulkError.textContent = "No hay filas seleccionadas para eliminar.";
    return;
  }

  importedRows = importedRows.filter((row) => row.created || !row.selected);

  renderPreview();
  bulkSuccess.textContent = `Se eliminaron ${seleccionados.length} filas seleccionadas.`;
}
