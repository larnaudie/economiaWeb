requireAuth();
renderHeader({ title: "Categorías Principales" });

const token = getToken();

const openCategoriaGrupoModalBtn = document.getElementById("openCategoriaGrupoModal");
const categoriaGrupoModal = document.getElementById("categoriaGrupoModal");
const categoriaGrupoForm = document.getElementById("categoriaGrupoForm");
const categoriaGrupoId = document.getElementById("categoriaGrupoId");
const categoriaGrupoNombre = document.getElementById("categoriaGrupoNombre");
const categoriaGrupoModalTitle = document.getElementById("categoriaGrupoModalTitle");

const categoriasGrupoList = document.getElementById("categoriasGrupoList");
const categoriaGrupoError = document.getElementById("categoriaGrupoError");
const categoriaGrupoSuccess = document.getElementById("categoriaGrupoSuccess");
const categoriaGrupoModalError = document.getElementById("categoriaGrupoModalError");

let categoriasGrupoCache = [];

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add("hidden");
}

function limpiarModalCategoriaGrupo() {
  categoriaGrupoId.value = "";
  categoriaGrupoNombre.value = "";
  categoriaGrupoModalError.textContent = "";
  categoriaGrupoModalTitle.textContent = "Nueva Categoría Principal";
}

async function cargarCategoriasGrupo() {
  categoriaGrupoError.textContent = "";

  try {
    const data = await apiRequest("/categorias-grupo", "GET", null, token);
    categoriasGrupoCache = getApiData(data);

    renderCategoriasGrupo();
  } catch (error) {
    categoriaGrupoError.textContent = error.message || "Error al cargar categorías principales.";
  }
}

function renderCategoriasGrupo() {
  renderTableRows({
    containerId: "categoriasGrupoList",
    items: categoriasGrupoCache,
    colspan: 2,
    renderItem: categoriaGrupo => `
      <tr>
        <td>${categoriaGrupo.nombre}</td>
        <td>
          <button type="button" onclick="editarCategoriaGrupo('${categoriaGrupo._id}')">Editar</button>
          <button type="button" onclick="eliminarCategoriaGrupo('${categoriaGrupo._id}')">Eliminar</button>
        </td>
      </tr>
    `
  });
}

function editarCategoriaGrupo(id) {
  const categoriaGrupo = categoriasGrupoCache.find(item => item._id === id);
  if (!categoriaGrupo) return;

  categoriaGrupoId.value = categoriaGrupo._id;
  categoriaGrupoNombre.value = categoriaGrupo.nombre;
  categoriaGrupoModalTitle.textContent = "Editar Categoría Principal";
  categoriaGrupoModalError.textContent = "";

  openModal(categoriaGrupoModal);
}

async function eliminarCategoriaGrupo(id) {
  const confirmado = confirm("¿Seguro que querés eliminar esta categoría principal?");
  if (!confirmado) return;

  categoriaGrupoError.textContent = "";
  categoriaGrupoSuccess.textContent = "";

  try {
    await apiRequest(`/categorias-grupo/${id}`, "DELETE", null, token);
    categoriaGrupoSuccess.textContent = "Categoría principal eliminada.";
    await cargarCategoriasGrupo();
  } catch (error) {
    categoriaGrupoError.textContent = error.message || "Error al eliminar categoría principal.";
  }
}

categoriaGrupoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  categoriaGrupoModalError.textContent = "";
  categoriaGrupoSuccess.textContent = "";

  const id = categoriaGrupoId.value;
  const nombre = categoriaGrupoNombre.value.trim();

  if (!nombre) {
    categoriaGrupoModalError.textContent = "El nombre es obligatorio.";
    return;
  }

  try {
    if (id) {
      await apiRequest(`/categorias-grupo/${id}`, "PATCH", { nombre }, token);
      categoriaGrupoSuccess.textContent = "Categoría principal actualizada.";
    } else {
      await apiRequest("/categorias-grupo", "POST", { nombre }, token);
      categoriaGrupoSuccess.textContent = "Categoría principal creada.";
    }

    closeModal(categoriaGrupoModal);
    limpiarModalCategoriaGrupo();
    await cargarCategoriasGrupo();
  } catch (error) {
    categoriaGrupoModalError.textContent = error.message || "Error al guardar categoría principal.";
  }
});

openCategoriaGrupoModalBtn.addEventListener("click", () => {
  limpiarModalCategoriaGrupo();
  openModal(categoriaGrupoModal);
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

document.addEventListener("DOMContentLoaded", cargarCategoriasGrupo);