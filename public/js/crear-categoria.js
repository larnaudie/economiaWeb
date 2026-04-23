requireAuth();

const token = getToken();

const logoutButton = document.getElementById("logoutButton");
const gestionError = document.getElementById("gestionError");

const selectAllCategorias = document.getElementById("selectAllCategorias");
const eliminarCategoriasSeleccionadasBtn = document.getElementById("eliminarCategoriasSeleccionadasBtn");
const bulkCategoriasError = document.getElementById("bulkCategoriasError");
const bulkCategoriasSuccess = document.getElementById("bulkCategoriasSuccess");

const openCategoriaModalBtn = document.getElementById("openCategoriaModal");
const categoriaModal = document.getElementById("categoriaModal");
const modalCategoriaForm = document.getElementById("modalCategoriaForm");
const modalCategoriaNombre = document.getElementById("modalCategoriaNombre");
const modalCategoriaError = document.getElementById("modalCategoriaError");

let categoriasCache = [];

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

function attachCategoriaEvents() {
  document.querySelectorAll(".categoria-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const categoria = categoriasCache.find(c => c._id === id);
      if (categoria) categoria.selected = e.target.checked;
      actualizarEstadoSelectAll(categoriasCache, selectAllCategorias);
    });
  });
}

async function cargarCategorias() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const data = await apiRequest("/categorias", "GET", null, authToken);

    categoriasCache = (data.categorias || []).map(categoria => ({
      ...categoria,
      selected: false
    }));

    renderList("categoriasList", categoriasCache, categoria => `
      <tr>
        <td>
          <input type="checkbox" class="categoria-checkbox" data-id="${categoria._id}" ${categoria.selected ? "checked" : ""}>
        </td>
        <td>${categoria.nombre}</td>
        <td>
          <button type="button" onclick="editarCategoria('${categoria._id}', '${escapeQuotes(categoria.nombre)}')">Editar</button>
          <button type="button" onclick="eliminarCategoria('${categoria._id}')">Eliminar</button>
        </td>
      </tr>
    `);

    actualizarEstadoSelectAll(categoriasCache, selectAllCategorias);
    attachCategoriaEvents();
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar las categorías";
  }
}

async function editarCategoria(id, nombreActual) {
  const authToken = getAuthToken();
  if (!authToken) return;

  const nuevoNombre = prompt("Nuevo nombre de la categoría:", nombreActual);
  if (!nuevoNombre || !nuevoNombre.trim()) return;

  try {
    await apiRequest(`/categorias/${id}`, "PATCH", { nombre: nuevoNombre.trim() }, authToken);
    await cargarCategorias();
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
    await cargarCategorias();
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

  await cargarCategorias();

  if (eliminadas > 0) {
    bulkCategoriasSuccess.textContent = `Se eliminaron ${eliminadas} categoría(s).`;
  }

  if (errores > 0) {
    bulkCategoriasError.textContent = `No se pudieron eliminar ${errores} categoría(s).`;
  }
}

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
    await cargarCategorias();
  } catch (error) {
    modalCategoriaError.textContent = error.message || "Error al crear categoría";
  }
});

openCategoriaModalBtn.addEventListener("click", () => {
  modalCategoriaError.textContent = "";
  openModal(categoriaModal);
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

selectAllCategorias.addEventListener("change", (e) => {
  toggleSelectAll(categoriasCache, e.target.checked);

  renderList("categoriasList", categoriasCache, categoria => `
    <tr>
      <td>
        <input type="checkbox" class="categoria-checkbox" data-id="${categoria._id}" ${categoria.selected ? "checked" : ""}>
      </td>
      <td>${categoria.nombre}</td>
      <td>
        <button type="button" onclick="editarCategoria('${categoria._id}', '${escapeQuotes(categoria.nombre)}')">Editar</button>
        <button type="button" onclick="eliminarCategoria('${categoria._id}')">Eliminar</button>
      </td>
    </tr>
  `);

  attachCategoriaEvents();
  actualizarEstadoSelectAll(categoriasCache, selectAllCategorias);
});

eliminarCategoriasSeleccionadasBtn.addEventListener("click", eliminarCategoriasSeleccionadas);
logoutButton.addEventListener("click", logout);

window.editarCategoria = editarCategoria;
window.eliminarCategoria = eliminarCategoria;

document.addEventListener("DOMContentLoaded", async () => {
  await cargarCategorias();
});