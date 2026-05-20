import { useCallback, useEffect, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { QuickActions } from "../components/QuickActions";
import { PageLayout } from "../layout/PageLayout";
import { apiRequest, getApiData, getUser, logout } from "../services/api";
import { buildQuickActions } from "../utils/quickActions";

const entityConfig = {
  bancos: {
    title: "Bancos",
    singular: "Banco",
    endpoint: "/bancos",
  },
  cuentas: {
    title: "Cuentas",
    singular: "Cuenta",
    endpoint: "/cuentas",
  },
  categoriasGrupo: {
    title: "Categorias Principales",
    singular: "Categoria Principal",
    endpoint: "/categorias-grupo",
  },
  categorias: {
    title: "Subcategorias",
    singular: "Subcategoria",
    endpoint: "/categorias",
  },
};

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

function navigateToExpenses() {
  window.location.assign("#/gastos");
}

export function Creations({ onLogout }) {
  const [activeEntity, setActiveEntity] = useState("bancos");
  const [bancos, setBancos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [categoriasGrupo, setCategoriasGrupo] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalState, setModalState] = useState({ mode: "", item: null });
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const user = getUser();

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatus({ type: "", title: "", message: "" });

    try {
      const [bancosResp, cuentasResp, gruposResp, categoriasResp] =
        await Promise.all([
          apiRequest("/bancos"),
          apiRequest("/cuentas"),
          apiRequest("/categorias-grupo"),
          apiRequest("/categorias"),
        ]);

      setBancos(normalizeItems(bancosResp));
      setCuentas(normalizeItems(cuentasResp));
      setCategoriasGrupo(normalizeItems(gruposResp));
      setCategorias(normalizeItems(categoriasResp));
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron cargar creaciones",
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

  const itemsByEntity = {
    bancos,
    cuentas,
    categoriasGrupo,
    categorias,
  };

  const activeConfig = entityConfig[activeEntity];
  const activeItems = itemsByEntity[activeEntity];
  const quickActions = buildQuickActions(
    {
      gasto: navigateToExpenses,
      categoriasGrupo: () => {
        setActiveEntity("categoriasGrupo");
        setModalState({ mode: "create", item: null });
      },
      categorias: () => {
        setActiveEntity("categorias");
        setModalState({ mode: "create", item: null });
      },
      bancos: () => {
        setActiveEntity("bancos");
        setModalState({ mode: "create", item: null });
      },
      cuentas: () => {
        setActiveEntity("cuentas");
        setModalState({ mode: "create", item: null });
      },
    },
    { activeKey: activeEntity },
  );

  const columns = buildColumns({
    entity: activeEntity,
    onEdit: (item) => setModalState({ mode: "edit", item }),
    onDelete: handleDelete,
  });

  async function handleSubmit(payload) {
    const isEdit = modalState.mode === "edit";
    const endpoint = isEdit
      ? `${activeConfig.endpoint}/${modalState.item._id}`
      : activeConfig.endpoint;

    try {
      await apiRequest(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        body: payload,
      });

      setStatus({
        type: "success",
        title: isEdit ? "Actualizado" : "Creado",
        message: `${activeConfig.singular} guardado correctamente.`,
      });
      setModalState({ mode: "", item: null });
      await loadData();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo guardar",
        message: error.message,
      });
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Eliminar ${item.nombre}?`);
    if (!confirmed) return;

    try {
      await apiRequest(`${activeConfig.endpoint}/${item._id}`, {
        method: "DELETE",
      });
      setStatus({
        type: "success",
        title: "Eliminado",
        message: `${activeConfig.singular} eliminado correctamente.`,
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

  return (
    <PageLayout
      onLogout={() => {
        logout();
        onLogout?.();
      }}
      subtitle="Bancos, cuentas, categorias principales y subcategorias en una sola pantalla."
      title="Gestionar Creaciones"
      user={user}
    >
      {status.message ? (
        <Alert
          message={status.message}
          title={status.title}
          tone={status.type}
        />
      ) : null}

      <section className="metric-grid metric-grid-wide">
        <MetricCard label="Bancos" value={bancos.length} />
        <MetricCard label="Cuentas" value={cuentas.length} />
        <MetricCard label="Categorias principales" value={categoriasGrupo.length} />
        <MetricCard label="Subcategorias" value={categorias.length} />
      </section>

      <QuickActions actions={quickActions} title="Creaciones rapidas" />

      <Card title="Administrar">
        <div className="tabs-row" role="tablist">
          <button
            className="tab-button"
            onClick={navigateToExpenses}
            type="button"
          >
            Gastos
          </button>
          {Object.entries(entityConfig).map(([key, config]) => (
            <button
              aria-selected={activeEntity === key}
              className={`tab-button ${activeEntity === key ? "active" : ""}`}
              key={key}
              onClick={() => setActiveEntity(key)}
              role="tab"
              type="button"
            >
              {config.title}
            </button>
          ))}
        </div>

        <div className="section-toolbar">
          <div>
            <h2>{activeConfig.title}</h2>
            <p>
              {loading
                ? "Actualizando datos..."
                : `${activeItems.length} elemento(s) cargado(s).`}
            </p>
          </div>
          <Button onClick={() => setModalState({ mode: "create", item: null })}>
            Crear {activeConfig.singular}
          </Button>
        </div>

        <DataTable
          columns={columns}
          emptyMessage={`No hay ${activeConfig.title.toLowerCase()} cargados.`}
          items={activeItems}
          rowKey={(item) => item._id}
        />
      </Card>

      <Modal
        onClose={() => setModalState({ mode: "", item: null })}
        open={Boolean(modalState.mode)}
        title={`${modalState.mode === "edit" ? "Editar" : "Crear"} ${activeConfig.singular}`}
      >
        <CreationForm
          bancos={bancos}
          categoriasGrupo={categoriasGrupo}
          entity={activeEntity}
          item={modalState.item}
          onCancel={() => setModalState({ mode: "", item: null })}
          onSubmit={handleSubmit}
        />
      </Modal>
    </PageLayout>
  );
}

function buildColumns({ entity, onEdit, onDelete }) {
  const baseColumns = [
    {
      key: "nombre",
      header: "Nombre",
      render: (item) => item.nombre,
    },
  ];

  if (entity === "cuentas") {
    baseColumns.push({
      key: "banco",
      header: "Banco",
      render: (item) => item.banco?.nombre || "N/A",
    });
  }

  if (entity === "categorias") {
    baseColumns.push({
      key: "grupo",
      header: "Categoria principal",
      render: (item) => item.categoriaGrupo?.nombre || "Sin categoria principal",
    });
  }

  baseColumns.push({
    key: "acciones",
    header: "Acciones",
    render: (item) => (
      <div className="table-actions">
        <Button onClick={() => onEdit(item)} variant="secondary">
          Editar
        </Button>
        <Button onClick={() => onDelete(item)} variant="danger">
          Eliminar
        </Button>
      </div>
    ),
  });

  return baseColumns;
}

function CreationForm({
  bancos,
  categoriasGrupo,
  entity,
  item,
  onCancel,
  onSubmit,
}) {
  const [nombre, setNombre] = useState(() => item?.nombre || "");
  const [banco, setBanco] = useState(() => item?.banco?._id || item?.banco || "");
  const [categoriaGrupo, setCategoriaGrupo] = useState(
    () => item?.categoriaGrupo?._id || item?.categoriaGrupo || "",
  );

  function handleSubmit(event) {
    event.preventDefault();

    const payload = { nombre: nombre.trim() };

    if (entity === "cuentas") {
      payload.banco = banco;
    }

    if (entity === "categorias") {
      payload.categoriaGrupo = categoriaGrupo || null;
    }

    onSubmit(payload);
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <FormField id="creationNombre" label="Nombre">
        <input
          id="creationNombre"
          minLength="2"
          onChange={(event) => setNombre(event.target.value)}
          required
          value={nombre}
        />
      </FormField>

      {entity === "cuentas" ? (
        <FormField id="creationBanco" label="Banco">
          <select
            id="creationBanco"
            onChange={(event) => setBanco(event.target.value)}
            required
            value={banco}
          >
            <option value="">Seleccionar banco</option>
            {bancos.map((itemBanco) => (
              <option key={itemBanco._id} value={itemBanco._id}>
                {itemBanco.nombre}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      {entity === "categorias" ? (
        <FormField id="creationCategoriaGrupo" label="Categoria principal">
          <select
            id="creationCategoriaGrupo"
            onChange={(event) => setCategoriaGrupo(event.target.value)}
            value={categoriaGrupo}
          >
            <option value="">Sin categoria principal</option>
            {categoriasGrupo.map((grupo) => (
              <option key={grupo._id} value={grupo._id}>
                {grupo.nombre}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      <div className="button-row button-row-end">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
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
