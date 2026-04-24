requireAuth();

const logoutButton = document.getElementById("logoutButton");
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
const bulkIncluirGastoBancario = document.getElementById("bulkIncluirGastoBancario");
const bulkIncluirGastoReal = document.getElementById("bulkIncluirGastoReal");
const bulkPorcentaje = document.getElementById("bulkPorcentaje");
const aplicarTodosButton = document.getElementById("aplicarTodosButton");
const bulkError = document.getElementById("bulkError");
const bulkSuccess = document.getElementById("bulkSuccess");
const selectAllRows = document.getElementById("selectAllRows");
const eliminarSeleccionadosButton = document.getElementById("eliminarSeleccionadosButton");
const bulkFecha = document.getElementById("bulkFecha");
const bulkDescripcion = document.getElementById("bulkDescripcion");
const bulkFlujo = document.getElementById("bulkFlujo");
const bulkEconomia = document.getElementById("bulkEconomia");
const vaciarTablaButton = document.getElementById("vaciarTablaButton");

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
logoutButton.addEventListener("click", logout);
importButton.addEventListener("click", () => {
    fileInput.click();
});
crearTodosButton.addEventListener("click", crearTodosLosGastos);
aplicarTodosButton.addEventListener("click", aplicarCambiosATodos);
eliminarSeleccionadosButton.addEventListener("click", eliminarSeleccionados);
vaciarTablaButton.addEventListener("click", vaciarTabla);
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
    if (value == null || value === "") return null;

    if (typeof value === "number") return value;

    if (typeof value === "string") {
        const normalized = value
            .trim()
            .replace(/\./g, "")
            .replace(",", ".");

        const num = Number(normalized);
        return Number.isNaN(num) ? null : num;
    }

    return null;
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
    categoriasCache = data.categorias || [];
    renderBulkCategorias();
}

async function cargarCuentas() {
    const token = getToken();
    const data = await apiRequest("/cuentas", "GET", null, token);
    cuentasCache = data.cuentas || [];
    renderBulkCuentas();
}

function resolverFlagsGastoPorCategoria(nombreCategoria) {
    const nombre = String(nombreCategoria || "").trim().toLowerCase();

    const esTransf = nombre.includes("transf");
    const esAhorro = nombre.includes("ahorro");

    const excluir = esTransf || esAhorro;

    return {
        incluirEnGastoBancario: !excluir,
        incluirEnGastoReal: !excluir
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

    const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: ""
    });

    const sliced = rows.slice(15);

    importedRows = sliced
        .map((row, index) => {
            const fechaRaw = row[1];
            const descripcionRaw = row[3];
            const gRaw = row[6];
            const iRaw = row[8];

            const fecha = excelDateToISO(fechaRaw);
            const descripcion = String(descripcionRaw || "").trim();
            const flujoBancario = buildFlujo(gRaw, iRaw);

            const isEmptyRow =
                !fecha &&
                !descripcion &&
                (flujoBancario == null || flujoBancario === 0);

            if (isEmptyRow) return null;

            const porcentajeEconomiaReal = 100;
            const economiaReal = flujoBancario
                ? Number(flujoBancario.toFixed(2))
                : 0;

            return {
                localId: `row-${Date.now()}-${index}`,
                fecha,
                descripcion,
                flujoBancario: flujoBancario ?? 0,
                porcentajeEconomiaReal,
                economiaReal,
                categoria: "",
                cuenta: "",
                incluirEnGastoBancario: true,
                incluirEnGastoReal: true,
                selected: true,
                isEditing: false,
                created: false
            };
        })
        .filter(Boolean);

    renderPreview();
}

function categoriasOptions(selectedValue = "") {
    let options = '<option value="">Seleccionar categoría</option>';

    options += categoriasCache
        .map((categoria) => `
      <option value="${categoria._id}" ${selectedValue === categoria._id ? "selected" : ""}>
        ${categoria.nombre}
      </option>
    `)
        .join("");

    return options;
}

function cuentasOptions(selectedValue = "") {
    let options = '<option value="">Seleccionar cuenta</option>';

    options += cuentasCache
        .map((cuenta) => `
      <option value="${cuenta._id}" ${selectedValue === cuenta._id ? "selected" : ""}>
        ${cuenta.nombre}
      </option>
    `)
        .join("");

    return options;
}

function renderPreview() {
    if (!importedRows.length) {
        previewBody.innerHTML = `
      <tr>
        <td colspan="9">Todavía no hay datos importados.</td>
      </tr>
    `;
        return;
    }

    previewBody.innerHTML = importedRows
        .map((row) => {
            const readOnlyAttr = row.isEditing ? "" : "readonly";

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
            <input type="date" class="row-fecha"
              value="${row.fecha || ""}" ${readOnlyAttr}>
          </td>

          <td>
            <textarea class="row-descripcion" maxlength="500" ${readOnlyAttr}>${escapeHtml(row.descripcion)}</textarea>
          </td>

          <td>
            <input type="number" class="row-flujo" step="0.01"
              value="${row.flujoBancario ?? 0}" ${readOnlyAttr}>
          </td>

          <td>
            <input type="number" class="row-porcentaje"
              step="0.01" min="0" max="100"
              value="${row.porcentajeEconomiaReal ?? 100}">
          </td>

          <td>
            <input type="number" class="row-economia"
              step="0.01"
              value="${row.economiaReal ?? 0}"
              readonly>
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
  <button type="button"
    class="edit-row-btn"
    data-id="${row.localId}"
    ${row.created ? "disabled" : ""}>
    ${row.isEditing ? "Bloquear" : "Editar"}
  </button>

  <button type="button"
    class="confirm-row-btn"
    data-id="${row.localId}"
    ${row.created ? "disabled" : ""}>
    ${row.created ? "Creado" : "Confirmar"}
  </button>

  <button type="button"
    class="delete-row-btn"
    data-id="${row.localId}"
    ${row.created ? "disabled" : ""}>
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
    document.querySelectorAll(".edit-row-btn").forEach((button) => {
        button.addEventListener("click", handleToggleEdit);
    });

    document.querySelectorAll(".confirm-row-btn").forEach((button) => {
        button.addEventListener("click", handleConfirmRow);
    });

    document.querySelectorAll(".delete-row-btn").forEach((button) => {
        button.addEventListener("click", handleDeleteRow);
    });

    document.querySelectorAll("#previewBody tr").forEach((rowElement) => {
        const localId = rowElement.dataset.id;

        rowElement.querySelector(".row-selected")?.addEventListener("change", (e) => {
            updateRow(localId, "selected", e.target.checked);
            actualizarEstadoSelectAll();
        });

        rowElement.querySelector(".row-fecha")?.addEventListener("input", (e) => {
            updateRow(localId, "fecha", e.target.value);
        });

        rowElement.querySelector(".row-descripcion")?.addEventListener("input", (e) => {
            updateRow(localId, "descripcion", e.target.value);
        });

        rowElement.querySelector(".row-flujo")?.addEventListener("input", (e) => {
            updateRow(localId, "flujoBancario", e.target.value);
            recalcularEconomiaRow(localId);
        });

        rowElement.querySelector(".row-porcentaje")?.addEventListener("input", (e) => {
            updateRow(localId, "porcentajeEconomiaReal", e.target.value);
            recalcularEconomiaRow(localId);
        });

        rowElement.querySelector(".row-categoria")?.addEventListener("change", (e) => {
            updateRow(localId, "categoria", e.target.value);
        });

        rowElement.querySelector(".row-cuenta")?.addEventListener("change", (e) => {
            updateRow(localId, "cuenta", e.target.value);
        });
        rowElement.querySelector(".row-incluir-bancario")?.addEventListener("change", (e) => {
            updateRow(localId, "incluirEnGastoBancario", e.target.checked);
        });

        rowElement.querySelector(".row-incluir-real")?.addEventListener("change", (e) => {
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

function handleToggleEdit(event) {
    const localId = event.target.dataset.id;
    const row = importedRows.find((item) => item.localId === localId);
    if (!row || row.created) return;

    row.isEditing = !row.isEditing;
    renderPreview();
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
                incluirEnGastoBancario: row.incluirEnGastoBancario,
                incluirEnGastoReal: row.incluirEnGastoReal
            },
            token
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
    if (!descripcion || descripcion.length < 2) return "La descripción debe tener al menos 2 caracteres.";
    if (descripcion.length > 500) return "La descripción no puede tener más de 500 caracteres.";
    if (Number.isNaN(flujoBancario)) return "El flujo bancario debe ser válido.";
    if (Number.isNaN(porcentajeEconomiaReal) || porcentajeEconomiaReal < 0 || porcentajeEconomiaReal > 100) {
        return "El porcentaje de economía real debe estar entre 0 y 100.";
    }
    if (Number.isNaN(economiaReal)) return "La economía real calculada no es válida.";
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
        crearTodosError.textContent = "No hay filas seleccionadas pendientes para crear.";
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
                    incluirEnGastoBancario: row.incluirEnGastoBancario,
                    incluirEnGastoReal: row.incluirEnGastoReal
                },
                token
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

function renderBulkCategorias() {
    bulkCategoria.innerHTML = '<option value="">No cambiar</option>';

    bulkCategoria.innerHTML += categoriasCache
        .map((categoria) => `<option value="${categoria._id}">${categoria.nombre}</option>`)
        .join("");
}

function renderBulkCuentas() {
    bulkCuenta.innerHTML = '<option value="">No cambiar</option>';

    bulkCuenta.innerHTML += cuentasCache
        .map((cuenta) => `<option value="${cuenta._id}">${cuenta.nombre}</option>`)
        .join("");
}

function aplicarCambiosATodos() {
    bulkError.textContent = "";
    bulkSuccess.textContent = "";

    const categoria = bulkCategoria.value;
    const cuenta = bulkCuenta.value;
    const porcentajeRaw = bulkPorcentaje.value;

    const incluirBancarioRaw = bulkIncluirGastoBancario.value;
    const incluirRealRaw = bulkIncluirGastoReal.value;

    const hayCategoria = categoria !== "";
    const hayCuenta = cuenta !== "";
    const hayPorcentaje = porcentajeRaw !== "";
    const hayIncluirBancario = incluirBancarioRaw !== "";
    const hayIncluirReal = incluirRealRaw !== "";

    if (
        !hayCategoria &&
        !hayCuenta &&
        !hayPorcentaje &&
        !hayIncluirBancario &&
        !hayIncluirReal
    ) {
        bulkError.textContent = "Seleccioná al menos un valor para aplicar.";
        return;
    }

    if (hayPorcentaje) {
        const porcentaje = Number(porcentajeRaw);

        if (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
            bulkError.textContent = "El porcentaje debe estar entre 0 y 100.";
            return;
        }
    }

    let filasActualizadas = 0;

    importedRows.forEach((row) => {
        if (row.created || !row.selected) return;

        if (hayCategoria) {
            row.categoria = categoria;
        }

        if (hayCuenta) {
            row.cuenta = cuenta;
        }

        if (hayPorcentaje) {
            row.porcentajeEconomiaReal = Number(porcentajeRaw);

            if (Number(row.flujoBancario) === 0) {
                row.porcentajeEconomiaReal = 0;
            } else {
                row.economiaReal = Number(
                    (Number(row.flujoBancario) * (Number(porcentajeRaw) / 100)).toFixed(2)
                );
            }
        }

        if (hayIncluirBancario) {
            row.incluirEnGastoBancario = incluirBancarioRaw === "true";
        }

        if (hayIncluirReal) {
            row.incluirEnGastoReal = incluirRealRaw === "true";
        }

        filasActualizadas++;
    });

    renderPreview();
    bulkSuccess.textContent = `Se aplicaron cambios a ${filasActualizadas} filas.`;
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

    const seleccionados = importedRows.filter((row) => row.selected && !row.created);

    if (!seleccionados.length) {
        bulkError.textContent = "No hay filas seleccionadas para eliminar.";
        return;
    }

    importedRows = importedRows.filter((row) => row.created || !row.selected);

    renderPreview();
    bulkSuccess.textContent = `Se eliminaron ${seleccionados.length} filas seleccionadas.`;
}