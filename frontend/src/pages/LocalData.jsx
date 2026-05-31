import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { PageLayout } from "../layout/PageLayout";
import { getUser, logout } from "../services/api";
import {
  cleanupDuplicateLocalExpenses,
  cleanupDuplicateLocalNamedRecords,
  ensureLocalDatabase,
  getLocalItem,
  getLocalSyncSummary,
  getSyncQueue,
  resetLocalDatabase,
  undoSyncOperation,
} from "../services/localDb";
import { showToast } from "../utils/toast";

const readableResources = new Set([
  "bancos",
  "cuentas",
  "categorias",
  "categoriasGrupo",
  "gastos",
  "deudas",
  "tarjetasCredito",
  "resumenesTarjeta",
  "movimientosTarjeta",
]);

const resourceLabels = {
  bancos: "Banco",
  cuentas: "Cuenta",
  categorias: "Subcategoria",
  categoriasGrupo: "Categoria principal",
  gastos: "Gasto",
  deudas: "Deuda",
  tarjetasCredito: "Tarjeta de credito",
  resumenesTarjeta: "Resumen de tarjeta",
  movimientosTarjeta: "Movimiento de tarjeta",
  tarjetaImportaciones: "Importacion de resumen",
};

const methodLabels = {
  POST: "Crear",
  PATCH: "Editar",
  PUT: "Actualizar",
  DELETE: "Eliminar",
  UPLOAD: "Subir archivo",
  UPLOAD_CARD_EXCEL: "Importar resumen",
};

const initialSummary = {
  lastSyncAt: null,
  localDbReady: false,
  pendingCount: 0,
};

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-UY", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatLastSync(value) {
  return value ? formatDateTime(value) : "Nunca sincronizado";
}

function getOperationName(operation, item) {
  return (
    item?.nombre ||
    item?.descripcion ||
    item?.detalle ||
    operation.fileName ||
    operation.itemLocalId ||
    operation.localId ||
    "N/A"
  );
}

async function hydrateOperation(operation) {
  if (!operation.resource || !operation.itemLocalId) {
    return { ...operation, item: null };
  }

  if (!readableResources.has(operation.resource)) {
    return { ...operation, item: null };
  }

  try {
    const item = await getLocalItem(operation.resource, operation.itemLocalId);
    return { ...operation, item: item || null };
  } catch {
    return { ...operation, item: null };
  }
}

export function LocalData({ onLogout }) {
  const [summary, setSummary] = useState(initialSummary);
  const [queue, setQueue] = useState([]);
  const [selectedOperations, setSelectedOperations] = useState([]);
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const user = getUser();

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus({ type: "", title: "", message: "" });

    try {
      await ensureLocalDatabase();
      const [nextSummary, operations] = await Promise.all([
        getLocalSyncSummary(),
        getSyncQueue(),
      ]);
      const hydrated = await Promise.all(
        operations
          .slice()
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .map(hydrateOperation),
      );

      setSummary(nextSummary);
      setQueue(hydrated);
      setSelectedOperations((current) =>
        current.filter((operationId) =>
          hydrated.some((operation) => operation.localId === operationId),
        ),
      );
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo leer IndexedDB",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleUndo(operation) {
    const label = `${methodLabels[operation.method] || operation.method} ${
      resourceLabels[operation.resource] || operation.resource || ""
    }`.trim();

    if (!window.confirm(`Deshacer ${label}?`)) return;

    try {
      const result = await undoSyncOperation(operation.localId);
      await loadData();

      showToast({
        title: result.undone ? "Deshecho" : "No se pudo deshacer",
        message: result.message,
        type: result.undone ? "success" : "warning",
      });

      if (!result.undone) {
        setStatus({
          type: "warning",
          title: "No se pudo deshacer",
          message: result.message,
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo deshacer",
        message: error.message,
      });
      showToast({
        title: "No se pudo deshacer",
        message: error.message,
        type: "error",
      });
    }
  }

  function toggleOperation(operationId) {
    setSelectedOperations((current) =>
      current.includes(operationId)
        ? current.filter((item) => item !== operationId)
        : [...current, operationId],
    );
  }

  function toggleAllOperations() {
    setSelectedOperations((current) =>
      current.length === queue.length ? [] : queue.map((operation) => operation.localId),
    );
  }

  async function handleUndoSelected() {
    if (!selectedOperations.length) return;

    if (!window.confirm(`Deshacer ${selectedOperations.length} operacion(es) local(es)?`)) {
      return;
    }

    setLoading(true);
    let undone = 0;
    const failedMessages = [];

    try {
      for (const operationId of selectedOperations) {
        const result = await undoSyncOperation(operationId);
        if (result.undone) {
          undone++;
        } else {
          failedMessages.push(result.message);
        }
      }

      setSelectedOperations([]);
      await loadData();

      showToast({
        title: undone ? "Deshecho" : "No se pudo deshacer",
        message: failedMessages.length
          ? `${undone} deshecha(s). ${failedMessages.length} con error.`
          : `${undone} operacion(es) local(es) deshecha(s).`,
        type: failedMessages.length ? "warning" : "success",
      });

      if (failedMessages.length) {
        setStatus({
          type: "warning",
          title: "Algunas operaciones no se pudieron deshacer",
          message: failedMessages[0],
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo deshacer",
        message: error.message,
      });
      showToast({
        title: "No se pudo deshacer",
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCleanupDuplicates() {
    if (!window.confirm("Limpiar duplicados locales? Se conservara uno por grupo.")) {
      return;
    }

    setLoading(true);
    try {
      const [expensesResult, namedResult] = await Promise.all([
        cleanupDuplicateLocalExpenses(),
        cleanupDuplicateLocalNamedRecords(),
      ]);
      const removed = (expensesResult.removed || 0) + (namedResult.removed || 0);
      const groups = (expensesResult.groups || 0) + (namedResult.groups || 0);
      await loadData();
      showToast({
        title: removed ? "Duplicados limpiados" : "Sin duplicados",
        message: removed
          ? `Se eliminaron ${removed} duplicado(s) en ${groups} grupo(s).`
          : "No se encontraron duplicados locales.",
        type: removed ? "success" : "info",
      });
      setStatus({
        type: removed ? "success" : "warning",
        title: removed ? "Duplicados limpiados" : "Sin duplicados",
        message: removed
          ? `Se eliminaron ${removed} duplicado(s) locales.`
          : "No se encontraron duplicados locales.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron limpiar duplicados",
        message: error.message,
      });
      showToast({
        title: "No se pudieron limpiar duplicados",
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetLocalDatabase() {
    const confirmed = window.confirm(
      "Esto borra los datos locales de este navegador y vuelve a cargar desde Mongo/API al recargar. Si tenes cambios sin sincronizar se perderan. Continuar?",
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await resetLocalDatabase();
      showToast({
        title: "Base local recreada",
        message: "Se borraron los datos locales. Recargando la app...",
        type: "success",
      });
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo recrear la base local",
        message: error.message,
      });
      showToast({
        title: "No se pudo recrear",
        message: error.message,
        type: "error",
      });
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0);

    function handleLocalChange() {
      loadData();
    }

    window.addEventListener("local-sync-change", handleLocalChange);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("local-sync-change", handleLocalChange);
    };
  }, [loadData]);

  const columns = useMemo(
    () => [
      {
        key: "select",
        header: (
          <input
            aria-label="Seleccionar todos los pendientes"
            checked={queue.length > 0 && selectedOperations.length === queue.length}
            onChange={toggleAllOperations}
            type="checkbox"
          />
        ),
        render: (operation) => (
          <input
            aria-label={`Seleccionar ${getOperationName(operation, operation.item)}`}
            checked={selectedOperations.includes(operation.localId)}
            onChange={() => toggleOperation(operation.localId)}
            type="checkbox"
          />
        ),
      },
      {
        key: "createdAt",
        header: "Fecha",
        render: (operation) => formatDateTime(operation.createdAt),
      },
      {
        key: "method",
        header: "Operacion",
        render: (operation) =>
          methodLabels[operation.method] || operation.method || "Pendiente",
      },
      {
        key: "resource",
        header: "Tipo",
        render: (operation) =>
          resourceLabels[operation.resource] || operation.resource || "N/A",
      },
      {
        key: "record",
        header: "Registro",
        render: (operation) => getOperationName(operation, operation.item),
      },
      {
        key: "actions",
        header: "Acciones",
        render: (operation) => (
          <Button onClick={() => handleUndo(operation)} variant="secondary">
            Deshacer
          </Button>
        ),
      },
    ],
    [queue, selectedOperations],
  );

  return (
    <PageLayout
      onLogout={() => {
        logout();
        onLogout?.();
      }}
      subtitle="Revisa las operaciones guardadas en IndexedDB que todavia no subieron a la nube."
      title="Datos Guardados Localmente"
      user={user}
    >
      {status.message ? (
        <Alert message={status.message} title={status.title} tone={status.type} />
      ) : null}

      <section className="metric-grid metric-grid-wide">
        <article className="metric">
          <strong>{summary.pendingCount}</strong>
          <span>Pendientes locales</span>
        </article>
        <article className="metric">
          <strong>{formatLastSync(summary.lastSyncAt)}</strong>
          <span>Ultimo sync</span>
        </article>
        <article className="metric">
          <strong>{summary.localDbReady ? "Lista" : "Preparando"}</strong>
          <span>Base local</span>
        </article>
      </section>

      <Card title="Pendientes en IndexedDB">
        <div className="local-data-toolbar">
          <p>
            Estas son las acciones que la app guarda localmente hasta que pulses
            Sync nube.
          </p>
          <div className="inline-actions">
            <Button
              disabled={!selectedOperations.length || loading}
              onClick={handleUndoSelected}
              variant="danger"
            >
              Deshacer seleccionados
            </Button>
            <Button
              disabled={loading}
              onClick={handleCleanupDuplicates}
              variant="secondary"
            >
              Limpiar duplicados
            </Button>
            <Button
              disabled={loading}
              onClick={handleResetLocalDatabase}
              variant="danger"
            >
              Borrar y recargar base local
            </Button>
            <Button onClick={loadData} variant="secondary">
              Actualizar
            </Button>
          </div>
        </div>

        {queue.length ? (
          <p className="muted-text">
            Seleccionados: {selectedOperations.length}
          </p>
        ) : null}

        {loading ? (
          <p className="empty-state">Leyendo datos locales...</p>
        ) : queue.length ? (
          <DataTable
            columns={columns}
            emptyMessage="No hay pendientes locales."
            items={queue}
            rowKey={(operation) => operation.localId}
          />
        ) : (
          <div className="all-clear-state">
            <strong>No hay pendientes locales.</strong>
            <span>Todo lo guardado en este navegador ya fue sincronizado.</span>
          </div>
        )}
      </Card>
    </PageLayout>
  );
}
