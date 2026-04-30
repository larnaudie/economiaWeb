function formatFechaUTC(fecha) {
  if (!fecha) return "N/A";

  const d = new Date(fecha);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function fechaInputValueUTC(fecha) {
  if (!fecha) return "";

  const d = new Date(fecha);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function escapeQuotes(value) {
  return String(value ?? "").replace(/'/g, "\\'");
}

function calcularEconomiaReal(flujo, porcentaje) {
  const flujoNum = Number(flujo);
  const porcentajeNum = Number(porcentaje);

  if (Number.isNaN(flujoNum) || Number.isNaN(porcentajeNum)) {
    return "";
  }

  return (flujoNum * (porcentajeNum / 100)).toFixed(2);
}

function getApiData(response, fallback = []) {
  if (!response) return fallback;

  if (response.data !== undefined) {
    return response.data;
  }

  return fallback;
}

function renderTableRows({ containerId, items, emptyMessage = "No hay elementos registrados.", colspan = 1, renderItem }) {
  const container = document.getElementById(containerId);

  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `<tr><td colspan="${colspan}">${emptyMessage}</td></tr>`;
    return;
  }

  container.innerHTML = items.map(renderItem).join("");
}

function getSelectedItems(items) {
  return items.filter(item => item.selected);
}

function toggleItemsSelection(items, checked, filterFn = () => true) {
  items.forEach(item => {
    if (filterFn(item)) {
      item.selected = checked;
    }
  });
}

function updateSelectAllState(items, checkbox, filterFn = () => true) {
  if (!checkbox) return;

  const visibles = items.filter(filterFn);

  if (!visibles.length) {
    checkbox.checked = false;
    checkbox.indeterminate = false;
    return;
  }

  const seleccionados = visibles.filter(item => item.selected);

  checkbox.checked = seleccionados.length === visibles.length;
  checkbox.indeterminate =
    seleccionados.length > 0 && seleccionados.length < visibles.length;
}

function formatMoney(value) {
  const num = Number(value) || 0;
  return num.toFixed(2);
}