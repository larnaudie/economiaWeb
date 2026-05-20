import { useCallback, useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { ExpenseForm } from "../components/ExpenseForm";
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

  const columns = [
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
      render: (gasto) =>
        gasto.facturaUrl ? (
          <a
            className="text-link table-link"
            href={gasto.facturaUrl}
            rel="noreferrer"
            target="_blank"
          >
            Ver
          </a>
        ) : (
          "N/A"
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (gasto) => (
        <div className="table-actions">
          <Button onClick={() => setEditingExpense(gasto)} variant="secondary">
            Completar
          </Button>
          <Button onClick={() => handleDelete(gasto)} variant="danger">
            Eliminar
          </Button>
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
          submitLabel="Guardar y completar"
        />
      </Modal>
    </PageLayout>
  );
}
