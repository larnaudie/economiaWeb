requireAuth();

const user = getUser();
const userNameElement = document.getElementById("userName");

if (userNameElement && user?.username) {
  userNameElement.textContent = user.username;
}

const bancoSeleccionado = document.getElementById("bancoSeleccionado");
const cuentasContainer = document.getElementById("cuentasContainer");

function toggleMenu() {
  const navMenu = document.getElementById("navMenu");
  if (navMenu) {
    navMenu.classList.toggle("show");
  }
}

async function cargarBancos() {
  const token = getToken();
  if (!token || !bancoSeleccionado) return;

  try {
    const data = await apiRequest("/bancos", "GET", null, token);
    const bancos = data.bancos || [];

    bancoSeleccionado.innerHTML = `
      <option value="">Seleccionar banco</option>
      ${bancos.map((banco) => `
        <option value="${banco._id}">${banco.nombre}</option>
      `).join("")}
    `;
  } catch (error) {
    console.error("Error al cargar bancos:", error);

    if (cuentasContainer) {
      cuentasContainer.innerHTML = "<p>Error al cargar bancos.</p>";
    }
  }
}

async function cargarCuentasPorBanco(bancoId) {
  const token = getToken();
  if (!token || !cuentasContainer) return;

  if (!bancoId) {
    cuentasContainer.innerHTML = "<p>Seleccioná un banco para ver sus cuentas.</p>";
    return;
  }

  try {
    const data = await apiRequest(`/cuentas?banco=${bancoId}`, "GET", null, token);
    const cuentas = data.cuentas || [];

    if (!cuentas.length) {
      cuentasContainer.innerHTML = "<p>No hay cuentas para este banco.</p>";
      return;
    }

    cuentasContainer.innerHTML = cuentas.map((cuenta) => `
      <div class="cuenta-card" onclick="irAGastosCuenta('${cuenta._id}')">
        <h3>${cuenta.nombre}</h3>
        <p>${cuenta.banco?.nombre || ""}</p>
      </div>
    `).join("");
  } catch (error) {
    console.error("Error al cargar cuentas:", error);
    cuentasContainer.innerHTML = "<p>Error al cargar las cuentas del banco.</p>";
  }
}

function irAGastosCuenta(cuentaId) {
  if (!cuentaId) return;
  window.location.href = `gastos-cuenta.html?cuenta=${cuentaId}`;
}

if (bancoSeleccionado) {
  bancoSeleccionado.addEventListener("change", async () => {
    await cargarCuentasPorBanco(bancoSeleccionado.value);
  });
}

window.toggleMenu = toggleMenu;
window.irAGastosCuenta = irAGastosCuenta;

document.addEventListener("DOMContentLoaded", async () => {
  await cargarBancos();
});