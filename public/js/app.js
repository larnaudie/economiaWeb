requireAuth();
renderHeader({ title: "Economía Web" });

const bancoSeleccionado = document.getElementById("bancoSeleccionado");
const cuentasContainer = document.getElementById("cuentasContainer");

async function cargarBancos() {
  const token = getToken();
  if (!token || !bancoSeleccionado) return null;

  try {
    const data = await apiRequest("/bancos", "GET", null, token);
    const bancos = getApiData(data);

    console.log("Respuesta bancos:", data);
    bancoSeleccionado.innerHTML = `
  <option value="">Seleccionar banco</option>
  ${bancos
    .map(
      (banco) => `
    <option value="${banco._id}">${escapeHtml(banco.nombre)}</option>
  `,
    )
    .join("")}
`;

    if (!bancos.length) {
      if (cuentasContainer) {
        cuentasContainer.innerHTML = "<p>No hay bancos creados.</p>";
      }
      return null;
    }

    return bancos[0]._id;
  } catch (error) {
    console.error("Error al cargar bancos:", error);
    alert(error.message || "Error desconocido al cargar bancos");

    if (cuentasContainer) {
      cuentasContainer.innerHTML = "<p>Error al cargar bancos.</p>";
    }

    return null;
  }
}

async function cargarCuentasPorBanco(bancoId) {
  const token = getToken();
  if (!token || !cuentasContainer) return;

  if (!bancoId) {
    cuentasContainer.innerHTML =
      "<p>Seleccioná un banco para ver sus cuentas.</p>";
    return;
  }

  try {
    const data = await apiRequest(
      `/usuarios/me/cuentas?banco=${bancoId}`,
      "GET",
      null,
      token,
    );
    const cuentas = getApiData(data);

    console.log("Cuentas recibidas:", cuentas);

    if (!Array.isArray(cuentas)) {
      cuentasContainer.innerHTML =
        "<p>Error: la respuesta de cuentas no es un array.</p>";
      return;
    }

    if (!cuentas.length) {
      cuentasContainer.innerHTML = "<p>No hay cuentas para este banco.</p>";
      return;
    }

    cuentasContainer.innerHTML = cuentas
      .map(
        (cuenta) => `
      <div class="cuenta-card" data-cuenta-id="${cuenta._id}">
        <h3>${escapeHtml(cuenta.nombre)}</h3>
<p>${escapeHtml(cuenta.banco?.nombre || "")}</p>
      </div>
    `,
      )
      .join("");

    document.querySelectorAll(".cuenta-card").forEach((card) => {
      card.addEventListener("click", () => {
        irAGastosCuenta(card.dataset.cuentaId);
      });
    });
  } catch (error) {
    console.error("Error al cargar cuentas:", error);
    cuentasContainer.innerHTML = `<p>${escapeHtml(error.message || "Error al cargar las cuentas del banco.")}</p>`;
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

window.irAGastosCuenta = irAGastosCuenta;

document.addEventListener("DOMContentLoaded", async () => {
  const primerBancoId = await cargarBancos();

  if (primerBancoId) {
    bancoSeleccionado.value = primerBancoId;
    await cargarCuentasPorBanco(primerBancoId);
  }
});
