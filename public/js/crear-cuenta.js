requireAuth();
renderHeader({ title: "Crear Cuenta" });;

const token = getToken();

  
const gestionError = document.getElementById("gestionError");

const selectAllCuentas = document.getElementById("selectAllCuentas");
const bulkCuentaBanco = document.getElementById("bulkCuentaBanco");
const aplicarBulkCuentasBtn = document.getElementById("aplicarBulkCuentasBtn");
const eliminarCuentasSeleccionadasBtn = document.getElementById("eliminarCuentasSeleccionadasBtn");
const bulkCuentasError = document.getElementById("bulkCuentasError");
const bulkCuentasSuccess = document.getElementById("bulkCuentasSuccess");

const openCuentaModalBtn = document.getElementById("openCuentaModal");
const cuentaModal = document.getElementById("cuentaModal");
const modalCuentaForm = document.getElementById("modalCuentaForm");
const modalCuentaNombre = document.getElementById("modalCuentaNombre");
const modalCuentaBanco = document.getElementById("modalCuentaBanco");
const modalCuentaError = document.getElementById("modalCuentaError");

let bancosCache = [];
let cuentasCache = [];

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
    container.innerHTML = '<tr><td colspan="4">No hay elementos registrados.</td></tr>';
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

function renderBancosEnSelects() {
  const options = '<option value="">Seleccionar banco</option>' +
    bancosCache.map(banco => `<option value="${banco._id}">${banco.nombre}</option>`).join("");

  modalCuentaBanco.innerHTML = options;

  bulkCuentaBanco.innerHTML =
    '<option value="">No cambiar</option>' +
    bancosCache.map(banco => `<option value="${banco._id}">${banco.nombre}</option>`).join("");
}

function attachCuentaEvents() {
  document.querySelectorAll(".cuenta-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const cuenta = cuentasCache.find(c => c._id === id);
      if (cuenta) cuenta.selected = e.target.checked;
      actualizarEstadoSelectAll(cuentasCache, selectAllCuentas);
    });
  });
}

async function cargarBancos() {
  const authToken = getAuthToken();
  if (!authToken) return;

  const data = await apiRequest("/bancos", "GET", null, authToken);
  bancosCache = getApiData(data);
  renderBancosEnSelects();
}

async function cargarCuentas() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const data = await apiRequest("/cuentas", "GET", null, authToken);

    cuentasCache = getApiData(data).map(cuenta => ({
      ...cuenta,
      selected: false
    }));

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

    actualizarEstadoSelectAll(cuentasCache, selectAllCuentas);
    attachCuentaEvents();
  } catch (error) {
    gestionError.textContent = error.message || "Error al cargar las cuentas";
  }
}

async function editarCuenta(id, nombreActual, bancoActual) {
  const authToken = getAuthToken();
  if (!authToken) return;

  await cargarBancos();

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

    await cargarCuentas();
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
    await cargarCuentas();
  } catch (error) {
    gestionError.textContent = error.message || "Error al eliminar cuenta";
  }
}

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

  await cargarCuentas();
  await cargarBancos();

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

  await cargarCuentas();
  await cargarBancos();

  if (eliminadas > 0) {
    bulkCuentasSuccess.textContent = `Se eliminaron ${eliminadas} cuenta(s).`;
  }

  if (errores > 0) {
    bulkCuentasError.textContent = `No se pudieron eliminar ${errores} cuenta(s).`;
  }
}

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
    await cargarCuentas();
    await cargarBancos();
  } catch (error) {
    modalCuentaError.textContent = error.message || "Error al crear cuenta";
  }
});

openCuentaModalBtn.addEventListener("click", async () => {
  modalCuentaError.textContent = "";
  await cargarBancos();
  openModal(cuentaModal);
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

selectAllCuentas.addEventListener("change", (e) => {
  toggleSelectAll(cuentasCache, e.target.checked);

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
        <button type="button" onclick="editarCuenta('${cuenta._id}', '${escapeQuotes(cuenta.nombre)}', '${cuenta.banco?._id || cuenta.banco || ""}')">Editar</button>
        <button type="button" onclick="eliminarCuenta('${cuenta._id}')">Eliminar</button>
      </td>
    </tr>
  `
  });

  attachCuentaEvents();
  actualizarEstadoSelectAll(cuentasCache, selectAllCuentas);
});

aplicarBulkCuentasBtn.addEventListener("click", aplicarBulkCuentas);
eliminarCuentasSeleccionadasBtn.addEventListener("click", eliminarCuentasSeleccionadas);
 

window.editarCuenta = editarCuenta;
window.eliminarCuenta = eliminarCuenta;

document.addEventListener("DOMContentLoaded", async () => {
  await cargarBancos();
  await cargarCuentas();
});