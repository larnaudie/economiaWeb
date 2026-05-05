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

const ordenCategoriasGrupo = document.getElementById("ordenCategoriasGrupo");

let categoriasGrupoCache = [];
let categoriasCache = [];

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

function renderCategoriasGrupoTabla() {
  if (!categoriasGrupoList) return;

  const grupos = categoriasGrupoCache.map((grupo) => {
    const subcategorias = categoriasCache.filter((categoria) => {
      const grupoId = categoria.categoriaGrupo?._id || categoria.categoriaGrupo;
      return grupoId === grupo._id;
    });

    return {
      ...grupo,
      subcategorias,
    };
  });

  const orden = ordenCategoriasGrupo?.value || "nombreAsc";

  grupos.sort((a, b) => {
    if (orden === "nombreAsc") {
      return String(a.nombre || "").localeCompare(String(b.nombre || ""));
    }

    if (orden === "nombreDesc") {
      return String(b.nombre || "").localeCompare(String(a.nombre || ""));
    }

    if (orden === "cantidadSubcategoriasDesc") {
      return b.subcategorias.length - a.subcategorias.length;
    }

    if (orden === "cantidadSubcategoriasAsc") {
      return a.subcategorias.length - b.subcategorias.length;
    }

    return 0;
  });

  if (!grupos.length) {
    categoriasGrupoList.innerHTML = `
      <tr>
        <td colspan="3">No hay categorías principales registradas.</td>
      </tr>
    `;
    return;
  }

  categoriasGrupoList.innerHTML = grupos
    .map((grupo) => {
      const filasSubcategorias = grupo.subcategorias.length
        ? grupo.subcategorias
            .map(
              (subcategoria) => `
                <tr>
                  <td></td>
                  <td>↳ ${subcategoria.nombre}</td>
                  <td></td>
                </tr>
              `,
            )
            .join("")
        : `
          <tr>
            <td></td>
            <td>Sin subcategorías</td>
            <td></td>
          </tr>
        `;

      return `
        <tr>
          <td><strong>${grupo.nombre}</strong></td>
          <td><strong>Subcategorías asociadas</strong></td>
          <td><strong>${grupo.subcategorias.length}</strong></td>
        </tr>

        ${filasSubcategorias}
      `;
    })
    .join("");
}


async function cargarCategoriasGrupo() {
  categoriaGrupoError.textContent = "";

  try {
    const [grupos, categorias] = await Promise.all([
      apiRequest("/categorias-grupo", "GET", null, token),
      apiRequest("/categorias", "GET", null, token),
    ]);

    categoriasGrupoCache = getApiData(grupos);
    categoriasCache = getApiData(categorias);

    renderCategoriasGrupoTabla();
  } catch (error) {
    categoriaGrupoError.textContent =
      error.message || "Error al cargar categorías principales.";
  }
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


ordenCategoriasGrupo?.addEventListener("change", () => {
  renderCategoriasGrupoTabla();
});

document.addEventListener("DOMContentLoaded", cargarCategoriasGrupo);