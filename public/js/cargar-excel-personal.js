requireAuth();
renderHeader({ title: "Cargar Excel Personal" });

const importButton = document.getElementById("importButton");
const fileInput = document.getElementById("fileInput");
const importError = document.getElementById("importError");
const importSuccess = document.getElementById("importSuccess");
const previewBody = document.getElementById("previewBody");
const crearTodosButton = document.getElementById("crearTodosButton");
const crearTodosError = document.getElementById("crearTodosError");
const crearTodosSuccess = document.getElementById("crearTodosSuccess");
const bulkCategoria = document.getElementById("bulkCategoria");
const bulkCuenta = document.getElementById("bulkCuenta");
const bulkPorcentaje = document.getElementById("bulkPorcentaje");
const aplicarTodosButton = document.getElementById("aplicarTodosButton");
const bulkError = document.getElementById("bulkError");
const bulkSuccess = document.getElementById("bulkSuccess");
const selectAllRows = document.getElementById("selectAllRows");
const eliminarSeleccionadosButton = document.getElementById(
  "eliminarSeleccionadosButton",
);
const nuevasCategoriasModal = document.getElementById("nuevasCategoriasModal");
const nuevasCategoriasList = document.getElementById("nuevasCategoriasList");
const nuevasCategoriasError = document.getElementById("nuevasCategoriasError");
const confirmarNuevasCategoriasBtn = document.getElementById(
  "confirmarNuevasCategoriasBtn",
);
const cancelarNuevasCategoriasBtn = document.getElementById(
  "cancelarNuevasCategoriasBtn",
);
const selectAllNuevasCategoriasBtn = document.getElementById(
  "selectAllNuevasCategoriasBtn",
);
const unselectAllNuevasCategoriasBtn = document.getElementById(
  "unselectAllNuevasCategoriasBtn",
);
const limpiarBulkButton = document.getElementById("limpiarBulkButton");
const bulkFecha = document.getElementById("bulkFecha");
const bulkDescripcion = document.getElementById("bulkDescripcion");
const bulkFlujo = document.getElementById("bulkFlujo");
const bulkEconomia = document.getElementById("bulkEconomia");
const vaciarTablaButton = document.getElementById("vaciarTablaButton");
const bulkIncluirGastoBancario = document.getElementById(
  "bulkIncluirGastoBancario",
);
const bulkIncluirGastoReal = document.getElementById("bulkIncluirGastoReal");
const editarSeleccionadosButton = document.getElementById(
  "editarSeleccionadosButton",
);

let categoriasCache = [];
let cuentasCache = [];
let importedRows = [];

vaciarTablaButton.addEventListener("click", vaciarTabla);

importButton.addEventListener("click", () => fileInput.click());
crearTodosButton.addEventListener("click", crearTodosLosGastos);
aplicarTodosButton.addEventListener("click", aplicarCambiosATodos);
editarSeleccionadosButton.addEventListener(
  "click",
  aplicarCambiosSeleccionados,
);
eliminarSeleccionadosButton.addEventListener("click", eliminarSeleccionados);
selectAllRows.addEventListener("change", (e) => {
  toggleSelectAllRows(e.target.checked);
});
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  importError.textContent = "";
  importSuccess.textContent = "";
  crearTodosError.textContent = "";
  crearTodosSuccess.textContent = "";

  try {
    await procesarArchivoExcelPersonal(file);
    importSuccess.textContent = `Archivo procesado. Se encontraron ${importedRows.length} filas válidas.`;
  } catch (error) {
    importError.textContent = error.message || "Error al procesar el archivo";
  } finally {
    fileInput.value = "";
  }
});
confirmarNuevasCategoriasBtn.addEventListener(
  "click",
  confirmarNuevasCategorias,
);
cancelarNuevasCategoriasBtn.addEventListener("click", cancelarNuevasCategorias);

selectAllNuevasCategoriasBtn.addEventListener("click", () => {
  nuevasCategoriasPendientes.forEach((item) => {
    item.selected = true;
  });
  renderNuevasCategoriasPendientes();
});

unselectAllNuevasCategoriasBtn.addEventListener("click", () => {
  nuevasCategoriasPendientes.forEach((item) => {
    item.selected = false;
  });
  renderNuevasCategoriasPendientes();
});
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

limpiarBulkButton.addEventListener("click", limpiarBulk);

function resolverFlagsGastoPorCategoria(
  nombreCategoria,
  flujoBancario,
  economiaReal,
) {
  const nombre = String(nombreCategoria || "")
    .trim()
    .toLowerCase();

  const flujo = Number(flujoBancario) || 0;
  const real = Number(economiaReal) || 0;

  const esTransferencia =
    nombre.includes("transf") ||
    nombre.includes("traspaso") ||
    nombre.includes("balance mes anterior");

  const esBalanceSplit = nombre.includes("balance split");

  if (esTransferencia) {
    return {
      incluirEnGastoBancario: false,
      incluirEnGastoReal: false,
    };
  }

  if (esBalanceSplit) {
    return {
      incluirEnGastoBancario: false,
      incluirEnGastoReal: real < 0,
    };
  }

  return {
    incluirEnGastoBancario: flujo < 0,
    incluirEnGastoReal: real < 0,
  };
}

function limpiarBulk() {
  bulkFecha.value = "";
  bulkDescripcion.value = "";
  bulkFlujo.value = "";
  bulkEconomia.value = "";
  bulkCategoria.value = "";
  bulkCuenta.value = "";
  bulkPorcentaje.value = "";
  bulkIncluirGastoBancario.value = "";
  bulkIncluirGastoReal.value = "";

  bulkError.textContent = "";
  bulkSuccess.textContent = "Se limpiaron los cambios por lote.";
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
}

let nuevasCategoriasPendientes = [];

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
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

function normalizarTexto(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buscarCategoriaPorNombre(nombre) {
  const nombreNormalizado = normalizarTexto(nombre);
  return categoriasCache.find(
    (categoria) => normalizarTexto(categoria.nombre) === nombreNormalizado,
  );
}

async function crearCategoriaSiNoExiste(nombre) {
  const token = getToken();
  const limpio = String(nombre || "").trim();

  if (!limpio) return null;

  let existente = buscarCategoriaPorNombre(limpio);
  if (existente) return existente;

  const data = await apiRequest(
    "/categorias",
    "POST",
    { nombre: limpio },
    token,
  );
  await cargarCategorias();

  existente = buscarCategoriaPorNombre(limpio);
  return existente || data.categoria || null;
}

async function procesarArchivoExcelPersonal(file) {
  await Promise.all([cargarCategorias(), cargarCuentas()]);

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  if (!sheet) {
    throw new Error("No se encontró una hoja válida en el archivo.");
  }

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  importedRows = rows
    .map((row, index) => {
      const fechaRaw = row[0];
      const descripcionRaw = row[1];
      const flujoRaw = row[2];
      const economiaRaw = row[3];
      const categoriaRaw = row[4];

      const fecha = excelDateToISO(fechaRaw);
      const descripcion = String(descripcionRaw || "").trim();
      const flujoBancario = parseNumber(flujoRaw);
      const economiaReal = parseNumber(economiaRaw);
      const categoriaNombre = String(categoriaRaw || "").trim();

      const isEmptyRow =
        !fecha &&
        !descripcion &&
        flujoBancario == null &&
        economiaReal == null &&
        !categoriaNombre;

      if (isEmptyRow) return null;

      const esFilaTotal =
        !fecha &&
        !descripcion &&
        !categoriaNombre &&
        (flujoBancario != null || economiaReal != null);

      if (esFilaTotal) return null;

      const categoriaEncontrada = buscarCategoriaPorNombre(categoriaNombre);

      let porcentajeEconomiaReal = 0;
      let economiaFinal = economiaReal ?? 0;

      if (flujoBancario != null && flujoBancario !== 0) {
        if (economiaReal != null) {
          porcentajeEconomiaReal = Number(
            ((economiaReal / flujoBancario) * 100).toFixed(2),
          );
          economiaFinal = economiaReal;
        } else {
          porcentajeEconomiaReal = 0;
          economiaFinal = 0;
        }
      } else {
        porcentajeEconomiaReal = 0;
        economiaFinal = economiaReal ?? 0;
      }

      const flags = resolverFlagsGastoPorCategoria(
        categoriaNombre,
        flujoBancario ?? 0,
        economiaFinal ?? 0,
      );

      /*
            const incluirEnGastoBancario =
                Number(flujoBancario ?? 0) !== 0
                    ? flags.incluirEnGastoBancario
                    : false;

            const incluirEnGastoReal =
                Number(economiaFinal ?? 0) !== 0
                    ? flags.incluirEnGastoReal
                    : false;
                    */

      return {
        localId: `row-${Date.now()}-${index}`,
        fecha,
        descripcion,
        flujoBancario: flujoBancario ?? 0,
        porcentajeEconomiaReal,
        economiaReal: economiaFinal,
        categoria: categoriaEncontrada?._id || "",
        categoriaNombreOriginal: categoriaNombre,
        cuenta: "",
        incluirEnGastoBancario: flags.incluirEnGastoBancario,
        incluirEnGastoReal: flags.incluirEnGastoReal,
        selected: true,
        created: false,
      };
    })
    .filter(Boolean);

  detectarNuevasCategoriasPendientes();
}

function detectarNuevasCategoriasPendientes() {
  const unicas = [
    ...new Set(
      importedRows
        .map((row) => String(row.categoriaNombreOriginal || "").trim())
        .filter((nombre) => nombre && !buscarCategoriaPorNombre(nombre)),
    ),
  ];

  nuevasCategoriasPendientes = unicas.map((nombre) => ({
    nombre,
    selected: true,
  }));

  if (nuevasCategoriasPendientes.length > 0) {
    renderNuevasCategoriasPendientes();
    openModal(nuevasCategoriasModal);
  } else {
    renderPreview();
  }
}

function renderNuevasCategoriasPendientes() {
  if (!nuevasCategoriasPendientes.length) {
    nuevasCategoriasList.innerHTML = "<p>No hay nuevas categorías.</p>";
    return;
  }

  nuevasCategoriasList.innerHTML = nuevasCategoriasPendientes
    .map(
      (item, index) => `
      <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
        <input type="checkbox" class="nueva-categoria-checkbox" data-index="${index}" ${item.selected ? "checked" : ""}>
        <span>${escapeHtml(item.nombre)}</span>
      </label>
    `,
    )
    .join("");

  document.querySelectorAll(".nueva-categoria-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const index = Number(e.target.dataset.index);
      if (!Number.isNaN(index) && nuevasCategoriasPendientes[index]) {
        nuevasCategoriasPendientes[index].selected = e.target.checked;
      }
    });
  });
}

async function confirmarNuevasCategorias() {
  nuevasCategoriasError.textContent = "";

  try {
    const seleccionadas = nuevasCategoriasPendientes.filter(
      (item) => item.selected,
    );

    for (const item of seleccionadas) {
      await crearCategoriaSiNoExiste(item.nombre);
    }

    await cargarCategorias();

    importedRows.forEach((row) => {
      if (!row.categoria && row.categoriaNombreOriginal) {
        const categoriaEncontrada = buscarCategoriaPorNombre(
          row.categoriaNombreOriginal,
        );
        if (categoriaEncontrada?._id) {
          row.categoria = categoriaEncontrada._id;
        }
      }
    });

    closeModal(nuevasCategoriasModal);
    renderPreview();
  } catch (error) {
    nuevasCategoriasError.textContent =
      error.message || "Error al crear las nuevas categorías.";
  }
}

function cancelarNuevasCategorias() {
  closeModal(nuevasCategoriasModal);
  renderPreview();
}

function categoriasOptions(selectedValue = "") {
  let options = '<option value="">Seleccionar categoría</option>';

  options += categoriasCache
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

          <td>
            <select class="row-categoria">
              ${categoriasOptions(row.categoria)}
            </select>
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

      const flujo = Number(e.target.value);

      if (flujo === 0) {
        updateRow(localId, "porcentajeEconomiaReal", 0);
      }

      recalcularEconomiaRow(localId);
      renderPreview();
    });

    rowElement
      .querySelector(".row-porcentaje")
      ?.addEventListener("input", (e) => {
        const row = importedRows.find((item) => item.localId === localId);
        if (!row) return;

        const flujo = Number(row.flujoBancario);

        if (flujo === 0) {
          updateRow(localId, "porcentajeEconomiaReal", 0);
          e.target.value = 0;
          return;
        }

        updateRow(localId, "porcentajeEconomiaReal", e.target.value);
        recalcularEconomiaRow(localId);
      });

    rowElement
      .querySelector(".row-economia")
      ?.addEventListener("input", (e) => {
        const row = importedRows.find((item) => item.localId === localId);
        if (!row) return;

        const flujo = Number(row.flujoBancario);
        const nuevoValor = Number(e.target.value);

        if (flujo === 0) {
          updateRow(
            localId,
            "economiaReal",
            Number.isNaN(nuevoValor) ? 0 : nuevoValor,
          );
          updateRow(localId, "porcentajeEconomiaReal", 0);

          const porcentajeInput = rowElement.querySelector(".row-porcentaje");
          if (porcentajeInput) {
            porcentajeInput.value = 0;
          }
        }
      });

    rowElement
      .querySelector(".row-categoria")
      ?.addEventListener("change", (e) => {
        updateRow(localId, "categoria", e.target.value);
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

  if (Number.isNaN(flujo)) {
    row.economiaReal = 0;
  } else if (flujo === 0) {
    row.porcentajeEconomiaReal = 0;
    row.economiaReal = Number(row.economiaReal) || 0;
  } else if (Number.isNaN(porcentaje)) {
    row.economiaReal = 0;
  } else {
    row.economiaReal = Number((flujo * (porcentaje / 100)).toFixed(2));
  }

  const rowElement = document.querySelector(`tr[data-id="${localId}"]`);
  const economiaInput = rowElement?.querySelector(".row-economia");
  const porcentajeInput = rowElement?.querySelector(".row-porcentaje");

  if (economiaInput) {
    economiaInput.value = row.economiaReal;
  }

  if (porcentajeInput && flujo === 0) {
    porcentajeInput.value = 0;
  }
}

function validarFilaParaCrear(row) {
  const fecha = row.fecha;
  const descripcion = String(row.descripcion || "").trim();
  const flujoBancario = Number(row.flujoBancario);
  const porcentajeEconomiaReal = Number(row.porcentajeEconomiaReal);
  const economiaReal = Number(row.economiaReal);
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
  if (!cuenta) return "Seleccioná una cuenta.";

  return null;
}

async function handleConfirmRow(event) {
  const localId = event.target.dataset.id;
  const row = importedRows.find((item) => item.localId === localId);
  if (!row || row.created) return;

  const rowElement = document.querySelector(`tr[data-id="${localId}"]`);
  const errorEl = rowElement?.querySelector(".row-error");
  if (errorEl) errorEl.textContent = "";

  const validationError = validarFilaParaCrear(row);
  if (validationError) {
    if (errorEl) errorEl.textContent = validationError;
    return;
  }

  try {
    const token = getToken();

    let categoriaId = row.categoria;

    if (!categoriaId) {
      const categoriaCreada = await crearCategoriaSiNoExiste(
        row.categoriaNombreOriginal,
      );
      if (!categoriaCreada?._id) {
        throw new Error("No se pudo resolver ni crear la categoría.");
      }
      categoriaId = categoriaCreada._id;
      row.categoria = categoriaId;
    }

    await apiRequest(
      "/gastos",
      "POST",
      {
        fecha: row.fecha,
        descripcion: String(row.descripcion || "").trim(),
        flujoBancario: Number(row.flujoBancario),
        economiaReal: Number(row.economiaReal),
        porcentajeEconomiaReal: Number(row.porcentajeEconomiaReal),
        categoria: categoriaId,
        cuenta: row.cuenta,
        incluirEnGastoBancario: row.incluirEnGastoBancario,
        incluirEnGastoReal: row.incluirEnGastoReal,
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

    try {
      let categoriaId = row.categoria;

      if (!categoriaId) {
        const categoriaCreada = await crearCategoriaSiNoExiste(
          row.categoriaNombreOriginal,
        );
        if (!categoriaCreada?._id) {
          throw new Error("No se pudo resolver ni crear la categoría.");
        }
        categoriaId = categoriaCreada._id;
        row.categoria = categoriaId;
      }

      await apiRequest(
        "/gastos",
        "POST",
        {
          fecha: row.fecha,
          descripcion: String(row.descripcion || "").trim(),
          flujoBancario: Number(row.flujoBancario),
          economiaReal: Number(row.economiaReal),
          porcentajeEconomiaReal: Number(row.porcentajeEconomiaReal),
          categoria: categoriaId,
          cuenta: row.cuenta,
          incluirEnGastoBancario: row.incluirEnGastoBancario,
          incluirEnGastoReal: row.incluirEnGastoReal,
        },
        token,
      );

      row.created = true;
      row.isEditing = false;
      row.selected = false;
      creados++;
    } catch {
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

function renderBulkCategorias() {
  bulkCategoria.innerHTML = '<option value="">No cambiar</option>';

  bulkCategoria.innerHTML += categoriasCache
    .map(
      (categoria) =>
        `<option value="${categoria._id}">${categoria.nombre}</option>`,
    )
    .join("");
}

function renderBulkCuentas() {
  bulkCuenta.innerHTML = '<option value="">No cambiar</option>';

  bulkCuenta.innerHTML += cuentasCache
    .map((cuenta) => `<option value="${cuenta._id}">${cuenta.nombre}</option>`)
    .join("");
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

  const confirmado = confirm(
    `¿Seguro que querés eliminar ${seleccionados.length} fila(s) seleccionada(s)?`,
  );
  if (!confirmado) return;

  importedRows = importedRows.filter((row) => row.created || !row.selected);
  renderPreview();
  bulkSuccess.textContent = `Se eliminaron ${seleccionados.length} filas seleccionadas.`;
}
