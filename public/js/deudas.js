requireAuth();
renderHeader({ title: "Deudas" });;

const deudaForm = document.getElementById("deudaForm");
const deudasBody = document.getElementById("deudasBody");

const deudaError = document.getElementById("deudaError");
const deudaSuccess = document.getElementById("deudaSuccess");

const pagarCuotaForm = document.getElementById("pagarCuotaForm");
const deudaPagoSelect = document.getElementById("deudaPagoSelect");
const cuentaPagoSelect = document.getElementById("cuentaPagoSelect");
const categoriaPagoSelect = document.getElementById("categoriaPagoSelect");
const fechaPagoCuota = document.getElementById("fechaPagoCuota");

const pagoCuotaError = document.getElementById("pagoCuotaError");
const pagoCuotaSuccess = document.getElementById("pagoCuotaSuccess");

let deudasCache = [];

async function cargarDeudas() {
  const token = getToken();
  if (!token) return;

  try {
    const data = await apiRequest("/deudas", "GET", null, token);
    const deudas = getApiData(data);

    deudasCache = deudas;

    renderDeudas(deudas);
    cargarSelectDeudas(deudas);
  } catch (error) {
    deudasBody.innerHTML = `<tr><td colspan="6">${error.message}</td></tr>`;
  }
}

function renderDeudas(deudas) {
  if (!deudas.length) {
    deudasBody.innerHTML = `<tr><td colspan="7">No hay deudas</td></tr>`;
    return;
  }

  deudasBody.innerHTML = deudas.map(d => {
    const porcentaje = d.cuotasTotales > 0
      ? Math.round((d.cuotaActual / d.cuotasTotales) * 100)
      : 0;

    const saldoRestante = Math.max(
      0,
      Number(d.montoTotal) - (Number(d.montoCuota) * Number(d.cuotaActual))
    );

    return `
  <tr>
    <td>${d.descripcion}</td>
    <td>${Number(d.montoTotal).toFixed(2)}</td>
    <td>${Number(d.montoCuota).toFixed(2)}</td>
    <td>
      ${d.cuotaActual} / ${d.cuotasTotales}
      <br>
      <progress value="${porcentaje}" max="100"></progress>
      <small>${porcentaje}%</small>
    </td>
    <td>${saldoRestante.toFixed(2)}</td>
    <td>${d.activa ? "Activa" : "Finalizada"}</td>
        <td>
          <button onclick="eliminarDeuda('${d._id}')">Eliminar</button>
        </td>
      </tr>
    `;
  }).join("");
}

function cargarSelectDeudas(deudas) {
  deudaPagoSelect.innerHTML = `
    <option value="">Seleccionar deuda</option>
    ${deudas
      .filter(d => d.activa)
      .map(d => `<option value="${d._id}">${d.descripcion}</option>`)
      .join("")}
  `;
}

async function cargarCuentas() {
  const token = getToken();
  if (!token) return;

  const data = await apiRequest("/cuentas", "GET", null, token);
  const cuentas = getApiData(data);

  cuentaPagoSelect.innerHTML = `
    <option value="">Seleccionar cuenta</option>
    ${cuentas.map(c => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
}

async function cargarCategorias() {
  const token = getToken();
  if (!token) return;

  const data = await apiRequest("/categorias", "GET", null, token);
  const categorias = getApiData(data);

  categoriaPagoSelect.innerHTML = `
    <option value="">Seleccionar categoría</option>
    ${categorias.map(c => `<option value="${c._id}">${c.nombre}</option>`).join("")}
  `;
}

deudaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  deudaError.textContent = "";
  deudaSuccess.textContent = "";

  try {
    await apiRequest("/deudas", "POST", {
      descripcion: document.getElementById("descripcionDeuda").value,
      montoTotal: Number(document.getElementById("montoTotalDeuda").value),
      cuotasTotales: Number(document.getElementById("cuotasTotalesDeuda").value),
      montoCuota: Number(document.getElementById("montoCuotaDeuda").value),
      fechaInicio: document.getElementById("fechaInicioDeuda").value
    }, token);

    deudaSuccess.textContent = "Deuda creada correctamente";

    deudaForm.reset();
    await cargarDeudas();
  } catch (error) {
    deudaError.textContent = error.message;
  }
});

window.eliminarDeuda = async (id) => {
  const token = getToken();
  if (!token) return;

  const confirmado = confirm("¿Eliminar deuda?");
  if (!confirmado) return;

  await apiRequest(`/deudas/${id}`, "DELETE", null, token);
  await cargarDeudas();
};

pagarCuotaForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = getToken();
  if (!token) return;

  pagoCuotaError.textContent = "";
  pagoCuotaSuccess.textContent = "";

  try {
    await apiRequest(
      `/deudas/${deudaPagoSelect.value}/pagar-cuota`,
      "POST",
      {
        cuenta: cuentaPagoSelect.value,
        categoria: categoriaPagoSelect.value,
        fecha: fechaPagoCuota.value
      },
      token
    );

    pagoCuotaSuccess.textContent = "Cuota pagada correctamente";

    await cargarDeudas();
  } catch (error) {
    pagoCuotaError.textContent = error.message;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  fechaPagoCuota.value = new Date().toISOString().slice(0, 10);

  await cargarDeudas();
  await cargarCuentas();
  await cargarCategorias();
});