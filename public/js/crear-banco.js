requireAuth();

const token = getToken();

const logoutButton = document.getElementById("logoutButton");
const gestionError = document.getElementById("gestionError");

const selectAllBancos = document.getElementById("selectAllBancos");
const eliminarBancosSeleccionadosBtn = document.getElementById("eliminarBancosSeleccionadosBtn");
const bulkBancosError = document.getElementById("bulkBancosError");
const bulkBancosSuccess = document.getElementById("bulkBancosSuccess");

const openBancoModalBtn = document.getElementById("openBancoModal");
const bancoModal = document.getElementById("bancoModal");
const modalBancoForm = document.getElementById("modalBancoForm");
const modalBancoNombre = document.getElementById("modalBancoNombre");
const modalBancoError = document.getElementById("modalBancoError");

let bancosCache = [];

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
    container.innerHTML = '<tr><td colspan="3">No hay elementos registrados.</td></tr>';
    return;
  }

  container.innerHTML = items.map(renderItem).join("");
}

function escapeQuotes(value) {
  return String(value).replace(/'/g, "\\'");
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

function attachBancoEvents() {
  document.querySelectorAll(".banco-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const banco = bancosCache.find(b => b._id === id);
      if (banco) banco.selected = e.target.checked;
      actualizarEstadoSelectAll(bancosCache, selectAllBancos);
    });
  });
}

async function cargarBancos() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const data = await apiRequest("/bancos", "GET", null, authToken);

    bancosCache = (data.bancos || []).map(banco => ({
      ...banco,
      selected: false
    }));

    renderList("bancosList", bancosCache, banco => `
      <tr>
        <td>
          <input type="checkbox" class="banco-checkbox" data-id="${banco._id}" ${banco.selected ? "checked" : ""}>
        </td>
        <td>${banco.nombre}</td>
        <td>
          <button type="button" onclick="editarBanco('${banco._id}', '${escapeQuotes(banco.nombre)}')">Editar</button>
          <button type="button" onclick="eliminarBanco('${banco._id}')">Eliminar</button>
        </td>
      </tr>
    `);

    actualizarEstadoSelectAll(bancosCache, selectAllBancos);
    attachBancoEvents();
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar los bancos";
  }
}

async function editarBanco(id, nombreActual) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const nuevoNombre = prompt("Nuevo nombre del banco:", nombreActual);
  if (!nuevoNombre || !nuevoNombre.trim()) return;

  try {
    await apiRequest(`/bancos/${id}`, "PATCH", { nombre: nuevoNombre.trim() }, authToken);
    await cargarBancos();
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
    await cargarBancos();
  } catch (error) {
    gestionError.textContent = error.message || "Error al eliminar banco";
  }
}

async function eliminarBancosSeleccionados() {
  const authToken = getAuthToken();
  if (!authToken) return;

  bulkBancosError.textContent = "";
  bulkBancosSuccess.textContent = "";

  const seleccionados = bancosCache.filter(banco => banco.selected);

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

  await cargarBancos();

  if (eliminados > 0) {
    bulkBancosSuccess.textContent = `Se eliminaron ${eliminados} banco(s).`;
  }

  if (errores > 0) {
    bulkBancosError.textContent = `No se pudieron eliminar ${errores} banco(s).`;
  }
}

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
    await cargarBancos();
  } catch (error) {
    modalBancoError.textContent = error.message || "Error al crear banco";
  }
});

openBancoModalBtn.addEventListener("click", () => {
  modalBancoError.textContent = "";
  openModal(bancoModal);
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

selectAllBancos.addEventListener("change", (e) => {
  toggleSelectAll(bancosCache, e.target.checked);

  renderList("bancosList", bancosCache, banco => `
    <tr>
      <td>
        <input type="checkbox" class="banco-checkbox" data-id="${banco._id}" ${banco.selected ? "checked" : ""}>
      </td>
      <td>${banco.nombre}</td>
      <td>
        <button type="button" onclick="editarBanco('${banco._id}', '${escapeQuotes(banco.nombre)}')">Editar</button>
        <button type="button" onclick="eliminarBanco('${banco._id}')">Eliminar</button>
      </td>
    </tr>
  `);

  attachBancoEvents();
  actualizarEstadoSelectAll(bancosCache, selectAllBancos);
});

eliminarBancosSeleccionadosBtn.addEventListener("click", eliminarBancosSeleccionados);
logoutButton.addEventListener("click", logout);

window.editarBanco = editarBanco;
window.eliminarBanco = eliminarBanco;

document.addEventListener("DOMContentLoaded", async () => {
  await cargarBancos();
});