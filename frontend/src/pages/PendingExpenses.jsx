import { useCallback, useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { DeleteIconButton } from "../components/DeleteIconButton";
import { ExpenseForm } from "../components/ExpenseForm";
import { FacturaLink } from "../components/FacturaLink";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { PageLayout } from "../layout/PageLayout";
import {
  apiRequest,
  getApiData,
  getUser,
  logout,
  uploadApiFile,
} from "../services/api";
import { formatDate } from "../utils/formatters";

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

export function PendingExpenses({ onLogout }) {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkValues, setBulkValues] = useState({
    categoria: "",
    cuenta: "",
    porcentajeEconomiaReal: "",
  });
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const user = getUser();

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus({ type: "", title: "", message: "" });

    try {
      const [gastosResp, categoriasResp, cuentasResp] = await Promise.all([
        apiRequest("/gastos?estado=pendiente"),
        apiRequest("/categorias"),
        apiRequest("/cuentas"),
      ]);

      setGastos(normalizeItems(gastosResp));
      setCategorias(normalizeItems(categoriasResp));
      setCuentas(normalizeItems(cuentasResp));
      setSelectedIds(new Set());
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron cargar pendientes",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function handleEdit(payload) {
    if (!editingExpense?._id) return;
    const { facturaFile, ...gastoPayload } = payload;

    try {
      await apiRequest(`/gastos/${editingExpense._id}`, {
        method: "PATCH",
        body: gastoPayload,
      });

      if (facturaFile) {
        await uploadApiFile(
          `/gastos/${editingExpense._id}/factura`,
          "factura",
          facturaFile,
        );
      }

      setEditingExpense(null);
      setStatus({
        type: "success",
        title: "Gasto actualizado",
        message: "Si ya tiene todos los datos, quedo marcado como creado.",
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo actualizar",
        message: error.message,
      });
    }
  }

  async function handleDelete(gasto) {
    const confirmed = window.confirm(`Eliminar ${gasto.descripcion}?`);
    if (!confirmed) return;

    try {
      await apiRequest(`/gastos/${gasto._id}`, { method: "DELETE" });
      setStatus({
        type: "success",
        title: "Pendiente eliminado",
        message: "El gasto pendiente se elimino correctamente.",
      });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo eliminar",
        message: error.message,
      });
    }
  }

  function toggleSelected(id) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllSelected(checked) {
    setSelectedIds(checked ? new Set(gastos.map((gasto) => gasto._id)) : new Set());
  }

  function updateBulkField(field, value) {
    setBulkValues((current) => ({ ...current, [field]: value }));
  }

  async function applyBulkChanges() {
    const selectedExpenses = gastos.filter((gasto) => selectedIds.has(gasto._id));

    if (!selectedExpenses.length) {
      setStatus({
        type: "error",
        title: "Sin seleccion",
        message: "Selecciona al menos un gasto pendiente.",
      });
      return;
    }

    const hasCategoria = bulkValues.categoria !== "";
    const hasCuenta = bulkValues.cuenta !== "";
    const hasPorcentaje = bulkValues.porcentajeEconomiaReal !== "";

    if (!hasCategoria && !hasCuenta && !hasPorcentaje) {
      setStatus({
        type: "error",
        title: "Sin cambios",
        message: "Elige categoria, cuenta o porcentaje para aplicar.",
      });
      return;
    }

    const porcentaje = hasPorcentaje
      ? Number(bulkValues.porcentajeEconomiaReal)
      : null;

    if (
      hasPorcentaje &&
      (Number.isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100)
    ) {
      setStatus({
        type: "error",
        title: "Porcentaje invalido",
        message: "El porcentaje debe estar entre 0 y 100.",
      });
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const gasto of selectedExpenses) {
      try {
        const body = {};

        if (hasCategoria) body.categoria = bulkValues.categoria;
        if (hasCuenta) body.cuenta = bulkValues.cuenta;
        if (hasPorcentaje) {
          body.porcentajeEconomiaReal = porcentaje;

          if (gasto.flujoBancario !== null && gasto.flujoBancario !== undefined) {
            const nextFlow = Number(gasto.flujoBancario || 0);
            body.economiaReal = Number((nextFlow * (porcentaje / 100)).toFixed(2));
          }
        }

        await apiRequest(`/gastos/${gasto._id}`, {
          method: "PATCH",
          body,
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
    setBulkValues({ categoria: "", cuenta: "", porcentajeEconomiaReal: "" });
    await loadData();
  }

  async function deleteSelected() {
    const selectedExpenses = gastos.filter((gasto) => selectedIds.has(gasto._id));

    if (!selectedExpenses.length) {
      setStatus({
        type: "error",
        title: "Sin seleccion",
        message: "Selecciona al menos un gasto pendiente.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Eliminar ${selectedExpenses.length} gasto(s) pendiente(s)?`,
    );
    if (!confirmed) return;

    let deleted = 0;
    let failed = 0;

    for (const gasto of selectedExpenses) {
      try {
        await apiRequest(`/gastos/${gasto._id}`, { method: "DELETE" });
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
    await loadData();
  }

  const columns = [
    {
      key: "select",
      header: (
        <input
          aria-label="Seleccionar todos los pendientes"
          checked={gastos.length > 0 && selectedIds.size === gastos.length}
          onChange={(event) => toggleAllSelected(event.target.checked)}
          type="checkbox"
        />
      ),
      render: (gasto) => (
        <input
          aria-label={`Seleccionar ${gasto.descripcion || "pendiente"}`}
          checked={selectedIds.has(gasto._id)}
          onChange={() => toggleSelected(gasto._id)}
          type="checkbox"
        />
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (gasto) => formatDate(gasto.fecha),
    },
    {
      key: "descripcion",
      header: "Descripcion",
      render: (gasto) => gasto.descripcion || "N/A",
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
          <Button onClick={() => setEditingExpense(gasto)} variant="secondary">
            Completar
          </Button>
          <DeleteIconButton onClick={() => handleDelete(gasto)} />
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
      subtitle="Completa los gastos cargados rapido cuando tengas los datos contables."
      title="Gastos Pendientes"
      user={user}
    >
      {status.message ? (
        <Alert message={status.message} title={status.title} tone={status.type} />
      ) : null}

      <Card className="expenses-table-card" title="Edicion multiple">
        <div className="bulk-actions">
          <FormField id="pendingBulkCategoria" label="Categoria">
            <select
              id="pendingBulkCategoria"
              onChange={(event) => updateBulkField("categoria", event.target.value)}
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

          <FormField id="pendingBulkCuenta" label="Cuenta">
            <select
              id="pendingBulkCuenta"
              onChange={(event) => updateBulkField("cuenta", event.target.value)}
              value={bulkValues.cuenta}
            >
              <option value="">No cambiar</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="pendingBulkPorcentaje" label="Porcentaje real">
            <input
              id="pendingBulkPorcentaje"
              max="100"
              min="0"
              onChange={(event) =>
                updateBulkField("porcentajeEconomiaReal", event.target.value)
              }
              placeholder="No cambiar"
              step="0.01"
              type="number"
              value={bulkValues.porcentajeEconomiaReal}
            />
          </FormField>

          <div className="button-row expense-filter-actions">
            <Button onClick={applyBulkChanges} variant="secondary">
              Aplicar a seleccionados
            </Button>
            <Button onClick={deleteSelected} variant="danger">
              Eliminar seleccionados
            </Button>
          </div>
        </div>
        <p className="selection-note">
          Seleccionados en esta pagina: {selectedIds.size}
        </p>
      </Card>

      <Card title="Pendientes por completar">
        {loading ? (
          <p className="empty-state">Cargando gastos pendientes...</p>
        ) : gastos.length ? (
          <DataTable
            columns={columns}
            emptyMessage="Estas al dia!"
            items={gastos}
            rowKey={(gasto) => gasto._id}
          />
        ) : (
          <div className="all-clear-state">
            <strong>Estas al dia!</strong>
            <span>No tenes gastos pendientes por completar.</span>
          </div>
        )}
      </Card>

      <Modal
        onClose={() => setEditingExpense(null)}
        open={Boolean(editingExpense)}
        title="Completar gasto pendiente"
      >
        <ExpenseForm
          categorias={categorias}
          cuentas={cuentas}
          expense={editingExpense}
          onCancel={() => setEditingExpense(null)}
          onSubmit={handleEdit}
          requireAccounting
          submitLabel="Guardar y completar"
        />
      </Modal>
    </PageLayout>
  );
}
