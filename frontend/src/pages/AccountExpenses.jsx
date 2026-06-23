import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { EditIconButton } from "../components/EditIconButton";
import { ExpenseForm } from "../components/ExpenseForm";
import { FacturaLink } from "../components/FacturaLink";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { PeriodFilter } from "../components/PeriodFilter";
import { PageLayout } from "../layout/PageLayout";
import {
  apiRequest,
  getApiData,
  getUser,
  logout,
  uploadApiFile,
} from "../services/api";
import { parseBankSheet } from "../utils/bankExcelParser";
import { formatCurrency, formatDate } from "../utils/formatters";
import { buildDateRange, currentMonthPeriod } from "../utils/periodFilters";
import { showToast } from "../utils/toast";

const ACCOUNT_COMPARE_DIFFS_KEY = "accountExcelComparisonDiffs";
const ACCOUNT_DUPLICATE_OMISSIONS_KEY = "accountDuplicateOmissions";

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

function currentAccountFilters() {
  return {
    ...currentMonthPeriod(),
    categoria: "",
    search: "",
  };
}

function idValue(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value._id === "string") return value._id;
  return null;
}

function normalizeExpensePayload(payload, fallbackCuenta) {
  return {
    ...payload,
    categoria: idValue(payload.categoria),
    cuenta: idValue(payload.cuenta) || fallbackCuenta || null,
  };
}

function normalizeCompareText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function amountKey(value) {
  return String(Math.round(Number(value || 0) * 100));
}

function dateKey(value) {
  return String(value || "").slice(0, 10);
}

function comparisonKey(item) {
  return [
    dateKey(item.fecha),
    amountKey(item.flujoBancario),
    normalizeCompareText(item.descripcion),
  ].join("|");
}

function duplicateKey(item) {
  return [
    dateKey(item.fecha).slice(0, 7),
    amountKey(item.flujoBancario),
    normalizeCompareText(item.descripcion),
  ].join("|");
}

export function AccountExpenses({ initialCuentaId = "", onLogout }) {
  const compareFileInputRef = useRef(null);
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [selectedCuenta, setSelectedCuenta] = useState("");
  const [filters, setFilters] = useState(currentAccountFilters);
  const [appliedFilters, setAppliedFilters] = useState(currentAccountFilters);
  const [tableFilters, setTableFilters] = useState({
    search: "",
    categoria: "",
    amount: "",
    onlyDuplicates: false,
  });
  const [omittedDuplicateKeys, setOmittedDuplicateKeys] = useState(() => new Set());
  const [gastos, setGastos] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [draggedId, setDraggedId] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState({
    categoria: "",
    cuenta: "",
    porcentajeEconomiaReal: "",
    incluirEnGastoBancario: "",
    incluirEnGastoReal: "",
  });
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState({
    differences: [],
    totalExcelRows: 0,
  });
  const [comparingExcel, setComparingExcel] = useState(false);
  const user = getUser();
  const selectedCuentaData = useMemo(
    () => cuentas.find((cuenta) => cuenta._id === selectedCuenta) || null,
    [cuentas, selectedCuenta],
  );
  const isCreditCardAccount = selectedCuentaData?.tipo === "tarjeta_credito";

  const loadResources = useCallback(async () => {
    const [cuentasResp, categoriasResp] = await Promise.all([
      apiRequest("/cuentas"),
      apiRequest("/categorias"),
    ]);

    const cuentasData = normalizeItems(cuentasResp);
    setCuentas(cuentasData);
    setCategorias(normalizeItems(categoriasResp));

    setSelectedCuenta((current) => {
      if (current) return current;
      const initialExists = cuentasData.some((cuenta) => cuenta._id === initialCuentaId);
      return initialExists ? initialCuentaId : cuentasData[0]?._id || "";
    });
  }, [initialCuentaId]);

  const loadExpenses = useCallback(
    async (cuentaId = selectedCuenta, nextFilters = appliedFilters) => {
      if (!cuentaId) return;

      setLoading(true);
      setStatus({ type: "", title: "", message: "" });

      try {
        const { fechaDesde, fechaHasta } = buildDateRange(nextFilters);
        const params = new URLSearchParams();
        params.set("cuenta", cuentaId);
        if (fechaDesde) params.set("fechaDesde", fechaDesde);
        if (fechaHasta) params.set("fechaHasta", fechaHasta);
        if (nextFilters.categoria) params.set("categoria", nextFilters.categoria);
        if (nextFilters.search.trim()) params.set("busqueda", nextFilters.search.trim());

        const response = await apiRequest(`/gastos?${params.toString()}`);
        const items = normalizeItems(response);
        setGastos(items);
        setSelectedIds(new Set());
        setComparison({ differences: [], totalExcelRows: 0 });
      } catch (error) {
        setStatus({
          type: "error",
          title: "No se pudieron cargar gastos",
          message: error.message,
        });
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, selectedCuenta],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        await loadResources();
      } catch (error) {
        setStatus({
          type: "error",
          title: "No se pudieron cargar recursos",
          message: error.message,
        });
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadResources]);

  useEffect(() => {
    if (!selectedCuenta) return;
    const timeoutId = window.setTimeout(() => loadExpenses(selectedCuenta, appliedFilters), 0);
    return () => window.clearTimeout(timeoutId);
  }, [appliedFilters, loadExpenses, selectedCuenta]);

  const totals = useMemo(() => {
    return gastos
      .reduce(
        (acc, gasto) => {
          const flujo = Number(gasto.flujoBancario || 0);
          const real = Number(gasto.economiaReal || 0);
          if (isCreditCardAccount || gasto.estado !== "pendiente") {
            acc.saldo += flujo;
          }
          if (gasto.estado === "pendiente") return acc;
          if (gasto.incluirEnGastoBancario !== false && flujo < 0) acc.bancario += flujo;
          if (gasto.incluirEnGastoReal !== false && real < 0) acc.real += real;
          return acc;
        },
        { bancario: 0, real: 0, saldo: 0 },
      );
  }, [gastos, isCreditCardAccount]);

  const categoryTotals = useMemo(() => {
    const map = new Map();
    gastos.filter((gasto) => gasto.estado !== "pendiente").forEach((gasto) => {
      if (gasto.incluirEnGastoReal === false) return;
      const key = gasto.categoria?.nombre || "Sin categoria";
      map.set(key, (map.get(key) || 0) + Math.abs(Number(gasto.economiaReal || 0)));
    });
    return Array.from(map.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total);
  }, [gastos]);

  const duplicateGroups = useMemo(() => {
    const map = new Map();

    gastos.forEach((gasto) => {
      if (gasto.gastoRepetidoConfirmado) return;
      const normalizedDescription = normalizeCompareText(gasto.descripcion);
      if (!normalizedDescription) return;
      const key = duplicateKey(gasto);
      map.set(key, [...(map.get(key) || []), gasto]);
    });

    return Array.from(map.values())
      .filter((group) => group.length > 1 && !omittedDuplicateKeys.has(duplicateKey(group[0])))
      .sort((a, b) => b.length - a.length);
  }, [gastos, omittedDuplicateKeys]);

  const duplicateIds = useMemo(() => {
    const ids = new Set();
    duplicateGroups.forEach((group) => {
      group.forEach((gasto) => ids.add(gasto._id));
    });
    return ids;
  }, [duplicateGroups]);

  const visibleGastos = useMemo(() => {
    const search = normalizeCompareText(tableFilters.search);
    const amount = tableFilters.amount.trim();
    const amountFilter = amount ? amountKey(amount.replace(",", ".")) : "";

    return gastos.filter((gasto) => {
      if (search && !normalizeCompareText(gasto.descripcion).includes(search)) return false;
      if (tableFilters.categoria && idValue(gasto.categoria) !== tableFilters.categoria) {
        return false;
      }
      if (amountFilter && amountKey(gasto.flujoBancario) !== amountFilter) return false;
      if (tableFilters.onlyDuplicates && !duplicateIds.has(gasto._id)) return false;
      return true;
    });
  }, [duplicateIds, gastos, tableFilters]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function resetFilters() {
    const next = currentAccountFilters();
    setFilters(next);
    setAppliedFilters(next);
  }

  function updateTableFilter(field, value) {
    setTableFilters((current) => ({ ...current, [field]: value }));
  }

  function duplicateOmissionsStorageKey() {
    return `${ACCOUNT_DUPLICATE_OMISSIONS_KEY}:${user?.id || "anon"}:${selectedCuenta || "all"}`;
  }

  function persistOmittedDuplicateKeys(nextKeys) {
    window.localStorage.setItem(
      duplicateOmissionsStorageKey(),
      JSON.stringify(Array.from(nextKeys)),
    );
  }

  function resetTableFilters() {
    setTableFilters({
      search: "",
      categoria: "",
      amount: "",
      onlyDuplicates: false,
    });
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllSelected(checked) {
    setSelectedIds(checked ? new Set(visibleGastos.map((gasto) => gasto._id)) : new Set());
  }

  function selectDuplicateCandidates() {
    const candidates = [];
    duplicateGroups.forEach((group) => {
      candidates.push(...group.slice(1).map((gasto) => gasto._id));
    });
    setSelectedIds(new Set(candidates));
  }

  useEffect(() => {
    if (!selectedCuenta) {
      setOmittedDuplicateKeys(new Set());
      return;
    }

    try {
      const stored = JSON.parse(
        window.localStorage.getItem(duplicateOmissionsStorageKey()) || "[]",
      );
      setOmittedDuplicateKeys(new Set(Array.isArray(stored) ? stored : []));
    } catch {
      setOmittedDuplicateKeys(new Set());
    }
  }, [selectedCuenta, user?.id]);

  async function handleCreate(payload) {
    const { facturaFile, ...gastoPayload } = payload;

    try {
      const response = await apiRequest("/gastos", {
        method: "POST",
        body: { ...gastoPayload, cuenta: selectedCuenta },
      });
      const created = getApiData(response);

      if (facturaFile && created?._id) {
        await uploadApiFile(`/gastos/${created._id}/factura`, "factura", facturaFile);
      }

      setIsCreateOpen(false);
      setStatus({ type: "success", title: "Gasto creado", message: "Se guardo correctamente." });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({ type: "error", title: "No se pudo crear", message: error.message });
    }
  }

  async function handleEdit(payload) {
    if (!editingExpense?._id) return;
    const { facturaFile, ...gastoPayload } = payload;

    try {
      await apiRequest(`/gastos/${editingExpense._id}`, {
        method: "PATCH",
        body: normalizeExpensePayload(
          { ...gastoPayload, cuenta: selectedCuenta },
          selectedCuenta,
        ),
      });

      if (facturaFile) {
        await uploadApiFile(
          `/gastos/${editingExpense._id}/factura`,
          "factura",
          facturaFile,
        );
      }

      setEditingExpense(null);
      setStatus({ type: "success", title: "Gasto actualizado", message: "Se guardo correctamente." });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({ type: "error", title: "No se pudo editar", message: error.message });
    }
  }

  async function deleteExpense(gasto) {
    let deleteLinkedCardMovement = false;
    const isCardExpense = gasto.origen === "tarjeta_credito" || gasto.movimientoTarjeta;
    const confirmed = isCardExpense
      ? window.confirm(
          `Estas borrando ${gasto.descripcion} que esta asociado a una tarjeta. Aceptar: eliminar gasto en cuenta y tarjeta. Cancelar: elegir si borrarlo solo en cuenta.`,
        )
      : window.confirm(`Eliminar ${gasto.descripcion}?`);

    if (isCardExpense && confirmed) {
      deleteLinkedCardMovement = true;
    }

    if (isCardExpense && !confirmed) {
      const onlyAccount = window.confirm(
        "Queres eliminar el gasto solo en cuenta y conservar el movimiento en Tarjetas?",
      );
      if (!onlyAccount) return;
      await deleteMany([gasto], { deleteLinkedCardMovement: false });
      return;
    }

    if (!confirmed) return;
    await deleteMany([gasto], { deleteLinkedCardMovement });
  }

  async function deleteMany(items, options = {}) {
    let deleted = 0;
    let failed = 0;

    for (const gasto of items) {
      try {
        await apiRequest(`/gastos/${gasto._id}`, {
          method: "DELETE",
          body: {
            eliminarMovimientoTarjeta: options.deleteLinkedCardMovement === true,
          },
        });
        deleted++;
      } catch {
        failed++;
      }
    }

    setStatus({
      type: failed ? "warning" : "success",
      title: "Eliminacion finalizada",
      message: `Eliminados: ${deleted}. Errores: ${failed}.`,
    });
    await loadExpenses(selectedCuenta, appliedFilters);
  }

  async function deleteSelected() {
    const selected = gastos.filter((gasto) => selectedIds.has(gasto._id));
    if (!selected.length) {
      setStatus({ type: "error", title: "Sin seleccion", message: "Selecciona al menos un gasto." });
      return;
    }

    const confirmed = window.confirm(`Eliminar ${selected.length} gasto(s)?`);
    if (!confirmed) return;
    await deleteMany(selected);
  }

  async function applyBulkChanges() {
    const selected = gastos.filter((gasto) => selectedIds.has(gasto._id));
    if (!selected.length) {
      setStatus({ type: "error", title: "Sin seleccion", message: "Selecciona al menos un gasto." });
      return;
    }

    const hasChange = Object.values(bulkValues).some((value) => value !== "");
    if (!hasChange) {
      setStatus({ type: "error", title: "Sin cambios", message: "Elige algun valor para aplicar." });
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const gasto of selected) {
      try {
        const percentage =
          bulkValues.porcentajeEconomiaReal === ""
            ? Number(gasto.porcentajeEconomiaReal || 0)
            : Number(bulkValues.porcentajeEconomiaReal);
        const flow = Number(gasto.flujoBancario || 0);
        const real = Number((flow * (percentage / 100)).toFixed(2));

        await apiRequest(`/gastos/${gasto._id}`, {
          method: "PATCH",
          body: normalizeExpensePayload({
            fecha: gasto.fecha,
            descripcion: gasto.descripcion,
            flujoBancario: flow,
            porcentajeEconomiaReal: percentage,
            economiaReal: real,
            categoria: bulkValues.categoria || gasto.categoria?._id || gasto.categoria,
            cuenta: bulkValues.cuenta || selectedCuenta,
            incluirEnGastoBancario:
              bulkValues.incluirEnGastoBancario === ""
                ? gasto.incluirEnGastoBancario !== false
                : bulkValues.incluirEnGastoBancario === "true",
            incluirEnGastoReal:
              bulkValues.incluirEnGastoReal === ""
                ? gasto.incluirEnGastoReal !== false
                : bulkValues.incluirEnGastoReal === "true",
          }, selectedCuenta),
        });
        updated++;
      } catch {
        failed++;
      }
    }

    setStatus({
      type: failed ? "warning" : "success",
      title: "Cambios aplicados",
      message: `Actualizados: ${updated}. Errores: ${failed}.`,
    });
    await loadExpenses(selectedCuenta, appliedFilters);
  }

  async function moveExpenseToAccount(gasto, cuentaId) {
    if (!gasto?._id || !cuentaId || cuentaId === selectedCuenta) return;

    try {
      await apiRequest(`/gastos/${gasto._id}`, {
        method: "PATCH",
        body: normalizeExpensePayload({
          fecha: gasto.fecha,
          descripcion: gasto.descripcion,
          flujoBancario: gasto.flujoBancario,
          economiaReal: gasto.economiaReal,
          porcentajeEconomiaReal: gasto.porcentajeEconomiaReal,
          categoria: gasto.categoria?._id || gasto.categoria,
          cuenta: cuentaId,
          incluirEnGastoBancario: gasto.incluirEnGastoBancario !== false,
          incluirEnGastoReal: gasto.incluirEnGastoReal !== false,
        }, cuentaId),
      });

      setStatus({
        type: "success",
        title: "Gasto movido",
        message: "El gasto se movio a la cuenta seleccionada.",
      });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo mover",
        message: error.message,
      });
    }
  }

  async function updateExpenseInclusion(gasto, field, checked) {
    if (!gasto?._id) return;

    try {
      await apiRequest(`/gastos/${gasto._id}`, {
        method: "PATCH",
        body: normalizeExpensePayload({
          fecha: gasto.fecha,
          descripcion: gasto.descripcion,
          flujoBancario: gasto.flujoBancario,
          economiaReal: gasto.economiaReal,
          porcentajeEconomiaReal: gasto.porcentajeEconomiaReal,
          categoria: gasto.categoria?._id || gasto.categoria,
          cuenta: gasto.cuenta?._id || gasto.cuenta || selectedCuenta,
          incluirEnGastoBancario:
            field === "bancario" ? checked : gasto.incluirEnGastoBancario !== false,
          incluirEnGastoReal:
            field === "real" ? checked : gasto.incluirEnGastoReal !== false,
        }, selectedCuenta),
      });

      setStatus({
        type: "success",
        title: "Gasto actualizado",
        message: "La inclusion del gasto se actualizo correctamente.",
      });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo actualizar",
        message: error.message,
      });
    }
  }

  async function confirmDuplicateGroup(group) {
    const groupKey = duplicateKey(group[0]);
    setOmittedDuplicateKeys((current) => {
      const next = new Set(current);
      next.add(groupKey);
      persistOmittedDuplicateKeys(next);
      return next;
    });

    let updated = 0;
    let failed = 0;

    for (const gasto of group) {
      try {
        await apiRequest(`/gastos/${gasto._id}`, {
          method: "PATCH",
          body: {
            gastoRepetidoConfirmado: true,
          },
        });
        updated++;
      } catch {
        failed++;
      }
    }

    setStatus({
      type: failed ? "warning" : "success",
      title: "Duplicado omitido",
      message: failed
        ? `El aviso se oculto localmente. Guardados en nube: ${updated}. Errores: ${failed}.`
        : "Este grupo ya no aparecera como posible duplicado.",
    });
    await loadExpenses(selectedCuenta, appliedFilters);
  }

  function reorderExpenses(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setGastos((current) => {
      const sourceIndex = current.findIndex((gasto) => gasto._id === sourceId);
      const targetIndex = current.findIndex((gasto) => gasto._id === targetId);

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function saveOrder() {
    try {
      await apiRequest("/gastos/orden-cuenta", {
        method: "PATCH",
        body: {
          gastos: gastos.map((gasto) => ({ id: gasto._id })),
        },
      });

      setStatus({
        type: "success",
        title: "Orden guardado",
        message: "El orden manual de los gastos visibles se guardo correctamente.",
      });
      await loadExpenses(selectedCuenta, appliedFilters);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo guardar orden",
        message: error.message,
      });
    }
  }

  function findExcelDifferences(parsedRows) {
    const visibleCounts = new Map();

    gastos.forEach((gasto) => {
      const key = comparisonKey(gasto);
      visibleCounts.set(key, (visibleCounts.get(key) || 0) + 1);
    });

    return parsedRows.filter((row) => {
      const key = comparisonKey(row);
      const available = visibleCounts.get(key) || 0;
      if (available > 0) {
        visibleCounts.set(key, available - 1);
        return false;
      }
      return true;
    });
  }

  async function handleCompareFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setComparingExcel(true);
    setStatus({ type: "", title: "", message: "" });

    try {
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("No se encontro una hoja valida.");

      const parsedRows = parseBankSheet(sheet, XLSX).map((row, index) => ({
        ...row,
        cuenta: selectedCuenta,
        localId: `comparison-${Date.now()}-${index}`,
      }));
      const differences = findExcelDifferences(parsedRows);

      setComparison({
        differences,
        totalExcelRows: parsedRows.length,
      });

      showToast({
        title: differences.length ? "Diferencias detectadas" : "Todo al dia",
        message: differences.length
          ? `Se detectaron ${differences.length} gasto(s) que no estan visibles.`
          : "No se detectaron diferencias contra los gastos visibles.",
        type: differences.length ? "warning" : "success",
      });
    } catch (error) {
      setComparison({ differences: [], totalExcelRows: 0 });
      setStatus({
        type: "error",
        title: "No se pudo comparar Excel",
        message: error.message,
      });
      showToast({
        title: "No se pudo comparar",
        message: error.message,
        type: "error",
      });
    } finally {
      setComparingExcel(false);
      event.target.value = "";
    }
  }

  function openDifferencesInImport() {
    if (!comparison.differences.length) return;

    window.sessionStorage.setItem(
      ACCOUNT_COMPARE_DIFFS_KEY,
      JSON.stringify({
        cuenta: selectedCuenta,
        rows: comparison.differences,
        source: "gastos-cuenta",
      }),
    );
    window.location.hash = "#/importar-excel";
  }

  const columns = [
    {
      key: "select",
      header: (
        <input
          checked={visibleGastos.length > 0 && visibleGastos.every((gasto) => selectedIds.has(gasto._id))}
          onChange={(event) => toggleAllSelected(event.target.checked)}
          type="checkbox"
        />
      ),
      render: (gasto) => (
        <input
          checked={selectedIds.has(gasto._id)}
          onChange={() => toggleSelected(gasto._id)}
          type="checkbox"
        />
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (gasto) => (
        <span className={`status-pill status-${gasto.estado || "creado"}`}>
          {gasto.estado === "pendiente" ? "Pendiente" : "Creado"}
        </span>
      ),
    },
    { key: "fecha", header: "Fecha", render: (gasto) => formatDate(gasto.fecha) },
    { key: "descripcion", header: "Descripcion", render: (gasto) => gasto.descripcion || "N/A" },
    { key: "bancario", header: "Bancario", render: (gasto) => formatCurrency(gasto.flujoBancario) },
    { key: "real", header: "Real", render: (gasto) => formatCurrency(gasto.economiaReal) },
    { key: "categoria", header: "Categoria", render: (gasto) => gasto.categoria?.nombre || "N/A" },
    {
      key: "incluir",
      header: "Incluir",
      render: (gasto) => (
        <div className="table-include-controls">
          <label>
            <input
              checked={gasto.incluirEnGastoBancario !== false}
              onChange={(event) =>
                updateExpenseInclusion(gasto, "bancario", event.target.checked)
              }
              type="checkbox"
            />
            <span>Bancario</span>
          </label>
          <label>
            <input
              checked={gasto.incluirEnGastoReal !== false}
              onChange={(event) =>
                updateExpenseInclusion(gasto, "real", event.target.checked)
              }
              type="checkbox"
            />
            <span>Real</span>
          </label>
        </div>
      ),
    },
    {
      key: "mover",
      header: "Mover",
      render: (gasto) => (
        <select
          className="table-select"
          onChange={(event) => moveExpenseToAccount(gasto, event.target.value)}
          value=""
        >
          <option value="">Mover a...</option>
          {cuentas
            .filter((cuenta) => cuenta._id !== selectedCuenta)
            .map((cuenta) => (
              <option key={cuenta._id} value={cuenta._id}>
                {cuenta.nombre}
              </option>
            ))}
        </select>
      ),
    },
    {
      key: "factura",
      header: "Factura",
      render: (gasto) => <FacturaLink url={gasto.facturaUrl} />,
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (gasto) => (
        <div className="table-actions">
          <EditIconButton onClick={() => setEditingExpense(gasto)} />
          <DeleteIconButton onClick={() => deleteExpense(gasto)} />
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      onLogout={() => {
        logout();
        onLogout?.();
      }}
      subtitle="Vista de gastos filtrada por cuenta, con totales y edicion multiple."
      title="Gastos por Cuenta"
      user={user}
    >
      {status.message ? (
        <Alert message={status.message} title={status.title} tone={status.type} />
      ) : null}

      <Card title="Cuenta">
        <div className="form-grid">
          <FormField id="accountExpenseCuenta" label="Cuenta">
            <select
              id="accountExpenseCuenta"
              onChange={(event) => setSelectedCuenta(event.target.value)}
              value={selectedCuenta}
            >
              <option value="">Seleccionar cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <div className="button-row">
            <Button disabled={!selectedCuenta} onClick={() => setIsCreateOpen(true)}>
              Crear gasto en cuenta
            </Button>
          </div>
        </div>
      </Card>

      <section className="metric-grid metric-grid-wide">
        <MetricCard label="Gasto bancario" value={formatCurrency(Math.abs(totals.bancario))} />
        <MetricCard label="Gasto real" value={formatCurrency(Math.abs(totals.real))} />
        <MetricCard
          label={isCreditCardAccount ? "Saldo tarjeta" : "Saldo bancario"}
          value={formatCurrency(totals.saldo)}
        />
        <MetricCard label="Gastos visibles" value={gastos.length} />
      </section>

      <section className="dashboard-grid dashboard-grid-spaced">
        <Card title="Filtros">
          <form className="expense-filters" onSubmit={applyFilters}>
            <PeriodFilter
              filters={filters}
              idPrefix="accountFilter"
              onChange={updateFilter}
            />
            <FormField id="accountFilterCategoria" label="Categoria">
              <select
                id="accountFilterCategoria"
                onChange={(event) => updateFilter("categoria", event.target.value)}
                value={filters.categoria}
              >
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria._id} value={categoria._id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="accountFilterSearch" label="Buscar">
              <input
                id="accountFilterSearch"
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Descripcion"
                value={filters.search}
              />
            </FormField>
            <div className="button-row expense-filter-actions">
              <Button disabled={loading || !selectedCuenta} type="submit">
                {loading ? "Cargando..." : "Aplicar"}
              </Button>
              <Button onClick={resetFilters} variant="secondary">
                Limpiar
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Totales por categoria">
          <div className="ranked-list">
            {categoryTotals.length ? (
              categoryTotals.map((item) => (
                <article className="ranked-item" key={item.nombre}>
                  <span>{item.nombre}</span>
                  <strong>{formatCurrency(item.total)}</strong>
                </article>
              ))
            ) : (
              <p className="empty-state">No hay datos.</p>
            )}
          </div>
        </Card>
      </section>

      <Card className="expenses-table-card" title="Comprobar con Excel">
        <div className="local-data-toolbar">
          <div>
            <strong>Quieres comprobar si tus gastos estan al dia?</strong>
            <p>
              Importa tu Excel bancario y lo comparo contra los gastos visibles
              de esta cuenta y filtro.
            </p>
          </div>
          <div className="inline-actions">
            <Button
              disabled={!selectedCuenta || comparingExcel}
              onClick={() => compareFileInputRef.current?.click()}
              variant="secondary"
            >
              {comparingExcel ? "Comparando..." : "Importar Excel"}
            </Button>
            <input
              accept=".csv,.xlsx,.xls"
              hidden
              onChange={handleCompareFileChange}
              ref={compareFileInputRef}
              type="file"
            />
          </div>
        </div>

        {comparison.totalExcelRows ? (
          <div className="comparison-result">
            <span>
              Excel leido: {comparison.totalExcelRows} movimiento(s). Gastos
              visibles: {gastos.length}.
            </span>
            {comparison.differences.length ? (
              <Button onClick={openDifferencesInImport} variant="warning">
                Diferencias detectadas: {comparison.differences.length}. Deseas
                agregarlas?
              </Button>
            ) : (
              <strong>Estas al dia!</strong>
            )}
          </div>
        ) : (
          <p className="muted-text">
            La comparacion busca coincidencias por fecha, descripcion y monto
            bancario.
          </p>
        )}
      </Card>

      <Card className="expenses-table-card" title="Filtrar tabla visible">
        <div className="table-filter-grid">
          <FormField id="visibleExpenseSearch" label="Descripcion">
            <input
              id="visibleExpenseSearch"
              onChange={(event) => updateTableFilter("search", event.target.value)}
              placeholder="Ej: Uber, Tata, Pago tarjeta"
              value={tableFilters.search}
            />
          </FormField>
          <FormField id="visibleExpenseAmount" label="Monto bancario">
            <input
              id="visibleExpenseAmount"
              onChange={(event) => updateTableFilter("amount", event.target.value)}
              placeholder="Ej: -120 o 410,12"
              value={tableFilters.amount}
            />
          </FormField>
          <FormField id="visibleExpenseCategory" label="Categoria">
            <select
              id="visibleExpenseCategory"
              onChange={(event) => updateTableFilter("categoria", event.target.value)}
              value={tableFilters.categoria}
            >
              <option value="">Todas</option>
              {categorias.map((categoria) => (
                <option key={categoria._id} value={categoria._id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <label className="table-filter-check">
            <input
              checked={tableFilters.onlyDuplicates}
              onChange={(event) => updateTableFilter("onlyDuplicates", event.target.checked)}
              type="checkbox"
            />
            Ver solo posibles duplicados
          </label>
        </div>
        <div className="button-row">
          <Button onClick={resetTableFilters} variant="secondary">
            Limpiar filtro de tabla
          </Button>
        </div>
        <p className="selection-note">
          Mostrando {visibleGastos.length} de {gastos.length} gasto(s) visibles por cuenta.
        </p>
      </Card>

      <Card className="expenses-table-card" title="Posibles duplicados">
        {duplicateGroups.length ? (
          <div className="duplicate-review">
            <div className="local-data-toolbar">
              <div>
                <strong>{duplicateGroups.length} grupo(s) para revisar</strong>
                <p>
                  La busqueda no usa fecha: compara descripcion normalizada y monto
                  bancario. Te muestra todas las coincidencias para decidir.
                </p>
              </div>
              <div className="inline-actions">
                <Button onClick={() => updateTableFilter("onlyDuplicates", true)} variant="secondary">
                  Ver en tabla
                </Button>
                <Button onClick={selectDuplicateCandidates} variant="warning">
                  Seleccionar repetidos
                </Button>
              </div>
            </div>
            {duplicateGroups.map((group) => (
              <article className="duplicate-group" key={duplicateKey(group[0])}>
                <header>
                  <strong>{group[0].descripcion}</strong>
                  <span>
                    {dateKey(group[0].fecha).slice(0, 7)} · {formatCurrency(group[0].flujoBancario)} · {group.length} coincidencias
                  </span>
                </header>
                <div className="duplicate-items">
                  {group.map((gasto) => (
                    <div className="duplicate-item" key={gasto._id}>
                      <span>{formatDate(gasto.fecha)}</span>
                      <span>{gasto.categoria?.nombre || "Sin categoria"}</span>
                      <strong>{formatCurrency(gasto.flujoBancario)}</strong>
                      <div className="table-actions">
                        <EditIconButton onClick={() => setEditingExpense(gasto)} />
                        <DeleteIconButton onClick={() => deleteExpense(gasto)} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="button-row button-row-end duplicate-actions">
                  <Button onClick={() => confirmDuplicateGroup(group)} variant="secondary">
                    Omitir este aviso
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            No encontre coincidencias por descripcion y monto bancario en la vista actual.
          </p>
        )}
      </Card>

      <Card className="expenses-table-card" title="Edicion Multiple">
        <div className="bulk-actions">
          <FormField id="accountBulkCategoria" label="Categoria">
            <select
              id="accountBulkCategoria"
              onChange={(event) =>
                setBulkValues((current) => ({ ...current, categoria: event.target.value }))
              }
              value={bulkValues.categoria}
            >
              <option value="">No cambiar</option>
              {categorias.map((categoria) => (
                <option key={categoria._id} value={categoria._id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="accountBulkPorcentaje" label="Porcentaje real">
            <input
              id="accountBulkPorcentaje"
              onChange={(event) =>
                setBulkValues((current) => ({
                  ...current,
                  porcentajeEconomiaReal: event.target.value,
                }))
              }
              placeholder="No cambiar"
              type="number"
              value={bulkValues.porcentajeEconomiaReal}
            />
          </FormField>
          <FormField id="accountBulkCuenta" label="Mover a cuenta">
            <select
              id="accountBulkCuenta"
              onChange={(event) =>
                setBulkValues((current) => ({ ...current, cuenta: event.target.value }))
              }
              value={bulkValues.cuenta}
            >
              <option value="">No mover</option>
              {cuentas
                .filter((cuenta) => cuenta._id !== selectedCuenta)
                .map((cuenta) => (
                  <option key={cuenta._id} value={cuenta._id}>
                    {cuenta.nombre}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField id="accountBulkBancario" label="Incluir bancario">
            <select
              id="accountBulkBancario"
              onChange={(event) =>
                setBulkValues((current) => ({
                  ...current,
                  incluirEnGastoBancario: event.target.value,
                }))
              }
              value={bulkValues.incluirEnGastoBancario}
            >
              <option value="">No cambiar</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </FormField>
          <FormField id="accountBulkReal" label="Incluir real">
            <select
              id="accountBulkReal"
              onChange={(event) =>
                setBulkValues((current) => ({
                  ...current,
                  incluirEnGastoReal: event.target.value,
                }))
              }
              value={bulkValues.incluirEnGastoReal}
            >
              <option value="">No cambiar</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </FormField>
        </div>
        <div className="button-row">
          <Button onClick={applyBulkChanges} variant="secondary">
            Aplicar seleccionados
          </Button>
          <Button onClick={saveOrder} variant="secondary">
            Guardar orden visible
          </Button>
          <Button onClick={deleteSelected} variant="danger">
            Eliminar seleccionados
          </Button>
        </div>
        <p className="selection-note">Seleccionados: {selectedIds.size}</p>
      </Card>

      <Card className="expenses-table-card continuous-table-card" title="Gastos">
        <div className="continuous-table">
          <DataTable
            columns={columns}
            emptyMessage="No hay gastos para esta cuenta/filtro."
            getRowProps={(gasto) => ({
              className: draggedId === gasto._id ? "dragging-row" : "",
              draggable: true,
              onDragOver: (event) => event.preventDefault(),
              onDragStart: () => setDraggedId(gasto._id),
              onDrop: () => {
                reorderExpenses(draggedId, gasto._id);
                setDraggedId("");
              },
              onDragEnd: () => setDraggedId(""),
            })}
            items={visibleGastos}
            rowKey={(gasto) => gasto._id}
          />
        </div>
      </Card>

      <Modal
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen}
        title="Crear gasto en cuenta"
      >
        <ExpenseForm
          categorias={categorias}
          cuentas={cuentas.filter((cuenta) => cuenta._id === selectedCuenta)}
          onCancel={() => setIsCreateOpen(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        onClose={() => setEditingExpense(null)}
        open={Boolean(editingExpense)}
        title="Editar gasto"
      >
        <ExpenseForm
          categorias={categorias}
          cuentas={cuentas.filter((cuenta) => cuenta._id === selectedCuenta)}
          expense={editingExpense}
          onCancel={() => setEditingExpense(null)}
          onSubmit={handleEdit}
          submitLabel="Guardar cambios"
        />
      </Modal>
    </PageLayout>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
