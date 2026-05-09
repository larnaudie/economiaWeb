const quickToken = getToken();

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
const modalCategoriaGrupo = document.getElementById("modalCategoriaGrupo");

const modalGastoFecha = document.getElementById("modalGastoFecha");
const modalGastoDescripcion = document.getElementById("modalGastoDescripcion");
const modalGastoFlujo = document.getElementById("modalGastoFlujo");
const modalGastoPorcentaje = document.getElementById("modalGastoPorcentaje");
const modalGastoEconomia = document.getElementById("modalGastoEconomia");
const modalGastoCategoria = document.getElementById("modalGastoCategoria");
const modalGastoCuenta = document.getElementById("modalGastoCuenta");
const modalGastoIncluirBancario = document.getElementById(
  "modalGastoIncluirBancario",
);
const modalGastoIncluirReal = document.getElementById("modalGastoIncluirReal");

const modalBancoError = document.getElementById("modalBancoError");
const modalCuentaError = document.getElementById("modalCuentaError");
const modalCategoriaError = document.getElementById("modalCategoriaError");
const modalGastoError = document.getElementById("modalGastoError");

const openCategoriaGrupoModalBtn = document.getElementById(
  "openCategoriaGrupoModal",
);
const categoriaGrupoModal = document.getElementById("categoriaGrupoModal");
const modalCategoriaGrupoForm = document.getElementById(
  "modalCategoriaGrupoForm",
);
const modalCategoriaGrupoNombre = document.getElementById(
  "modalCategoriaGrupoNombre",
);
const modalCategoriaGrupoError = document.getElementById(
  "modalCategoriaGrupoError",
);

let quickBancosCache = [];
let quickCuentasCache = [];
let quickCategoriasCache = [];
let quickCategoriasGrupoCache = [];

function quickOpenModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
}

function quickCloseModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
}

function quickGetAuthToken() {
  const token = getToken();

  if (!token) {
    window.location.href = "login.html";
    return null;
  }

  return token;
}

async function quickCargarRecursos() {
  const token = quickGetAuthToken();
  if (!token) return;

  const [bancos, cuentas, categorias, categoriasGrupo] = await Promise.all([
    apiRequest("/usuarios/me/bancos", "GET", null, token),
    apiRequest("/usuarios/me/cuentas", "GET", null, token),
    apiRequest("/usuarios/me/categorias", "GET", null, token),
    apiRequest("/categorias-grupo", "GET", null, token),
  ]);

  quickBancosCache = getApiData(bancos);
  quickCuentasCache = getApiData(cuentas);
  quickCategoriasCache = getApiData(categorias);
  quickCategoriasGrupoCache = getApiData(categoriasGrupo);
}

function quickRenderModalCuentaBancos() {
  if (!modalCuentaBanco) return;

  modalCuentaBanco.innerHTML =
    '<option value="">Seleccionar banco</option>' +
    quickBancosCache
      .map(
        (banco) =>
          `<option value="${banco._id}">${escapeHtml(banco.nombre)}</option>`,
      )
      .join("");
}

function quickRenderCategoriasGrupoSelect(selectedValue = "") {
  if (!modalCategoriaGrupo) return;

  modalCategoriaGrupo.innerHTML =
    '<option value="">Sin categoría principal</option>' +
    quickCategoriasGrupoCache
      .map(
        (grupo) => `
          <option value="${grupo._id}" ${selectedValue === grupo._id ? "selected" : ""}>
            ${escapeHtml(grupo.nombre)}
          </option>
        `,
      )
      .join("");
}

function quickRenderModalGastoSelects() {
  if (modalGastoCategoria) {
    modalGastoCategoria.innerHTML =
      '<option value="">Seleccionar categoría</option>' +
      quickCategoriasCache
        .map(
          (categoria) =>
            `<option value="${categoria._id}">${escapeHtml(categoria.nombre)}</option>`,
        )
        .join("");
  }

  if (modalGastoCuenta) {
    modalGastoCuenta.innerHTML =
      '<option value="">Seleccionar cuenta</option>' +
      quickCuentasCache
        .map(
          (cuenta) =>
            `<option value="${cuenta._id}">${escapeHtml(cuenta.nombre)}</option>`,
        )
        .join("");
  }
}

function quickActualizarEconomiaModalGasto() {
  if (!modalGastoFlujo || !modalGastoPorcentaje || !modalGastoEconomia) return;

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

openBancoModalBtn?.addEventListener("click", () => {
  if (modalBancoError) modalBancoError.textContent = "";
  quickOpenModal(bancoModal);
});

openCuentaModalBtn?.addEventListener("click", async () => {
  if (modalCuentaError) modalCuentaError.textContent = "";
  await quickCargarRecursos();
  quickRenderModalCuentaBancos();
  quickOpenModal(cuentaModal);
});

openCategoriaGrupoModalBtn?.addEventListener("click", () => {
  if (modalCategoriaGrupoError) modalCategoriaGrupoError.textContent = "";
  modalCategoriaGrupoForm?.reset();
  quickOpenModal(categoriaGrupoModal);
});

openCategoriaModalBtn?.addEventListener("click", async () => {
  if (modalCategoriaError) modalCategoriaError.textContent = "";
  delete modalCategoriaForm?.dataset.editingId;
  modalCategoriaForm?.reset();

  await quickCargarRecursos();
  quickRenderCategoriasGrupoSelect();

  quickOpenModal(categoriaModal);
});

openGastoModalBtn?.addEventListener("click", async () => {
  if (modalGastoError) modalGastoError.textContent = "";

  await quickCargarRecursos();
  quickRenderModalGastoSelects();

  if (modalGastoFecha)
    modalGastoFecha.value = new Date().toISOString().slice(0, 10);
  if (modalGastoPorcentaje) modalGastoPorcentaje.value = 100;
  if (modalGastoIncluirBancario) modalGastoIncluirBancario.checked = true;
  if (modalGastoIncluirReal) modalGastoIncluirReal.checked = true;

  quickActualizarEconomiaModalGasto();
  quickOpenModal(gastoModal);
});

modalGastoFlujo?.addEventListener("input", quickActualizarEconomiaModalGasto);
modalGastoPorcentaje?.addEventListener(
  "input",
  quickActualizarEconomiaModalGasto,
);

modalBancoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = quickGetAuthToken();
  if (!token) return;

  modalBancoError.textContent = "";

  const nombre = modalBancoNombre.value.trim();

  if (!nombre) {
    modalBancoError.textContent = "El nombre es obligatorio.";
    return;
  }

  try {
    await apiRequest("/bancos", "POST", { nombre }, token);

    modalBancoForm.reset();
    quickCloseModal(bancoModal);

    window.dispatchEvent(new CustomEvent("quickActions:changed"));
  } catch (error) {
    modalBancoError.textContent = error.message || "Error al crear banco";
  }
});

modalCuentaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = quickGetAuthToken();
  if (!token) return;

  modalCuentaError.textContent = "";

  const nombre = modalCuentaNombre.value.trim();
  const banco = modalCuentaBanco.value;

  if (!nombre || !banco) {
    modalCuentaError.textContent = "Todos los campos son obligatorios.";
    return;
  }

  try {
    await apiRequest("/cuentas", "POST", { nombre, banco }, token);

    modalCuentaForm.reset();
    quickCloseModal(cuentaModal);

    window.dispatchEvent(new CustomEvent("quickActions:changed"));
  } catch (error) {
    modalCuentaError.textContent = error.message || "Error al crear cuenta";
  }
});

modalCategoriaGrupoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = quickGetAuthToken();
  if (!token) return;

  modalCategoriaGrupoError.textContent = "";

  const nombre = modalCategoriaGrupoNombre.value.trim();

  if (!nombre) {
    modalCategoriaGrupoError.textContent = "El nombre es obligatorio.";
    return;
  }

  try {
    await apiRequest("/categorias-grupo", "POST", { nombre }, token);

    modalCategoriaGrupoForm.reset();
    quickCloseModal(categoriaGrupoModal);

    window.dispatchEvent(new CustomEvent("quickActions:changed"));
  } catch (error) {
    modalCategoriaGrupoError.textContent =
      error.message || "Error al crear categoría principal.";
  }
});

modalCategoriaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = quickGetAuthToken();
  if (!token) return;

  modalCategoriaError.textContent = "";

  const nombre = modalCategoriaNombre.value.trim();

  if (!nombre) {
    modalCategoriaError.textContent = "El nombre es obligatorio.";
    return;
  }

  const payload = {
    nombre,
    categoriaGrupo: modalCategoriaGrupo.value || null,
  };

  try {
    const editingId = modalCategoriaForm.dataset.editingId;

    if (editingId) {
      await apiRequest(`/categorias/${editingId}`, "PATCH", payload, token);
      delete modalCategoriaForm.dataset.editingId;
    } else {
      await apiRequest("/categorias", "POST", payload, token);
    }

    modalCategoriaForm.reset();
    quickRenderCategoriasGrupoSelect();
    quickCloseModal(categoriaModal);

    window.dispatchEvent(new CustomEvent("quickActions:changed"));
  } catch (error) {
    modalCategoriaError.textContent =
      error.message || "Error al guardar subcategoría";
  }
});

modalGastoForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = quickGetAuthToken();
  if (!token) return;

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
    modalGastoError.textContent =
      "La descripción debe tener entre 5 y 500 caracteres.";
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
        incluirEnGastoBancario:
          Number(flujoBancario) !== 0 && modalGastoIncluirBancario.checked,
        incluirEnGastoReal:
          Number(economiaReal) !== 0 && modalGastoIncluirReal.checked,
      },
      token,
    );

    modalGastoForm.reset();
    if (modalGastoPorcentaje) modalGastoPorcentaje.value = 100;
    if (modalGastoEconomia) modalGastoEconomia.value = "";

    quickCloseModal(gastoModal);

    window.dispatchEvent(new CustomEvent("quickActions:changed"));
  } catch (error) {
    modalGastoError.textContent = error.message || "Error al crear gasto";
  }
});

document.querySelectorAll(".close-modal").forEach((btn) => {
  btn.addEventListener("click", () => {
    const modalId = btn.dataset.close;
    const modal = document.getElementById(modalId);
    quickCloseModal(modal);
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    quickCloseModal(e.target);
  }
});
