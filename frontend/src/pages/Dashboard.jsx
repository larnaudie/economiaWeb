import { useEffect, useMemo, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ComparisonBars, MiniBarChart, MonthlyBars } from "../components/Charts";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { PeriodFilter } from "../components/PeriodFilter";
import { QuickActions } from "../components/QuickActions";
import { PageLayout } from "../layout/PageLayout";
import { apiRequest, getApiData, getToken, getUser, logout } from "../services/api";
import { formatCurrency } from "../utils/formatters";
import { buildDateRange, currentMonthPeriod } from "../utils/periodFilters";

const initialStatus = {
  type: "",
  title: "",
  message: "",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

async function fetchAllExpenses() {
  let page = 1;
  let all = [];
  let keepGoing = true;

  while (keepGoing) {
    const response = await apiRequest(`/gastos?pagina=${page}`);
    const items = normalizeItems(response);
    all = [...all, ...items];
    keepGoing = items.length === 20;
    page++;
  }

  return all;
}

export function Dashboard({ authVersion, onLogout }) {
  const [activeModal, setActiveModal] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [loadingResources, setLoadingResources] = useState(false);
  const [bancos, setBancos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriasGrupo, setCategoriasGrupo] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [selectedBanco, setSelectedBanco] = useState("");
  const [selectedCuenta, setSelectedCuenta] = useState("");
  const [categoryGrouping, setCategoryGrouping] = useState("subcategoria");
  const [periodFilters, setPeriodFilters] = useState(currentMonthPeriod);
  const [pendingCount, setPendingCount] = useState(0);

  const hasToken = Boolean(getToken());
  const user = getUser();

  async function loadResources() {
    if (!getToken()) return;

    setLoadingResources(true);
    try {
      const [
        bancosResp,
        cuentasResp,
        categoriasResp,
        gruposResp,
        deudasResp,
      ] = await Promise.all([
          apiRequest("/usuarios/me/bancos"),
          apiRequest("/usuarios/me/cuentas"),
          apiRequest("/usuarios/me/categorias"),
          apiRequest("/categorias-grupo"),
          apiRequest("/deudas"),
        ]);

      setBancos(normalizeItems(bancosResp));
      setCuentas(normalizeItems(cuentasResp));
      setCategorias(normalizeItems(categoriasResp));
      setCategoriasGrupo(normalizeItems(gruposResp));
      const gastosData = await fetchAllExpenses();
      setGastos(gastosData);
      setDeudas(normalizeItems(deudasResp));
      setPendingCount(gastosData.filter((gasto) => gasto.estado === "pendiente").length);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudieron cargar datos",
        message: error.message,
      });
    } finally {
      setLoadingResources(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadResources();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authVersion]);

  async function handleCreate(endpoint, payload, successMessage) {
    setStatus(initialStatus);

    try {
      await apiRequest(endpoint, {
        method: "POST",
        body: payload,
      });

      setStatus({
        type: "success",
        title: "Listo",
        message: successMessage,
      });
      setActiveModal("");
      await loadResources();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo guardar",
        message: error.message,
      });
    }
  }

  const resourceSummary = useMemo(
    () => [
      { label: "Bancos", value: bancos.length },
      { label: "Cuentas", value: cuentas.length },
      { label: "Categorias principales", value: categoriasGrupo.length },
      { label: "Subcategorias", value: categorias.length },
    ],
    [bancos.length, categorias.length, categoriasGrupo.length, cuentas.length],
  );

  const cuentasFiltradas = useMemo(() => {
    if (!selectedBanco) return cuentas;

    return cuentas.filter((cuenta) => {
      const bancoId =
        typeof cuenta.banco === "object" ? cuenta.banco?._id : cuenta.banco;
      return bancoId === selectedBanco;
    });
  }, [cuentas, selectedBanco]);

  const gastosFiltrados = useMemo(() => {
    const cuentasPermitidas = new Set(cuentasFiltradas.map((cuenta) => cuenta._id));
    const { fechaDesde, fechaHasta } = buildDateRange(periodFilters);

    return gastos.filter((gasto) => {
      const cuentaId =
        typeof gasto.cuenta === "object" ? gasto.cuenta?._id : gasto.cuenta;
      const fecha = gasto.fecha ? new Date(gasto.fecha).toISOString().slice(0, 10) : "";

      if (selectedCuenta && cuentaId !== selectedCuenta) return false;
      if (selectedBanco && !cuentasPermitidas.has(cuentaId)) return false;
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;
      return true;
    });
  }, [cuentasFiltradas, gastos, periodFilters, selectedBanco, selectedCuenta]);

  const financialSummary = useMemo(() => {
    let bancario = 0;
    let real = 0;

    gastosFiltrados.forEach((gasto) => {
      if (gasto.incluirEnGastoBancario !== false) {
        bancario += Number(gasto.flujoBancario || 0);
      }

      if (gasto.incluirEnGastoReal !== false) {
        real += Number(gasto.economiaReal || 0);
      }
    });

    return {
      bancario,
      real,
      cantidad: gastosFiltrados.length,
    };
  }, [gastosFiltrados]);

  const categoriasResumen = useMemo(() => {
    const map = new Map();

    gastosFiltrados.forEach((gasto) => {
      if (gasto.incluirEnGastoReal === false) return;

      const nombre =
        categoryGrouping === "principal"
          ? gasto.categoria?.categoriaGrupo?.nombre || "Sin categoria principal"
          : gasto.categoria?.nombre || "Sin categoria";
      const actual = map.get(nombre) || 0;
      map.set(nombre, actual + Math.abs(Number(gasto.economiaReal || 0)));
    });

    return Array.from(map.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [categoryGrouping, gastosFiltrados]);

  const bancarioCategoriasResumen = useMemo(() => {
    const map = new Map();

    gastosFiltrados.forEach((gasto) => {
      if (gasto.incluirEnGastoBancario === false) return;

      const nombre =
        categoryGrouping === "principal"
          ? gasto.categoria?.categoriaGrupo?.nombre || "Sin categoria principal"
          : gasto.categoria?.nombre || "Sin categoria";
      const actual = map.get(nombre) || 0;
      map.set(nombre, actual + Math.abs(Number(gasto.flujoBancario || 0)));
    });

    return Array.from(map.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [categoryGrouping, gastosFiltrados]);

  const monthlyEvolution = useMemo(() => {
    const map = new Map();

    gastosFiltrados.forEach((gasto) => {
      if (!gasto.fecha) return;

      const date = new Date(gasto.fecha);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

      if (!map.has(key)) {
        map.set(key, { bancario: 0, real: 0 });
      }

      const item = map.get(key);

      if (gasto.incluirEnGastoBancario !== false) {
        item.bancario += Number(gasto.flujoBancario || 0);
      }

      if (gasto.incluirEnGastoReal !== false) {
        item.real += Number(gasto.economiaReal || 0);
      }
    });

    const labels = Array.from(map.keys()).sort();
    return {
      labels,
      bancario: labels.map((label) => map.get(label).bancario),
      real: labels.map((label) => map.get(label).real),
    };
  }, [gastosFiltrados]);

  const deudaSummary = useMemo(() => {
    const activas = deudas.filter((deuda) => deuda.activa);
    const saldoRestante = activas.reduce((acc, deuda) => {
      const pagado = Number(deuda.montoCuota || 0) * Number(deuda.cuotaActual || 0);
      return acc + Math.max(0, Number(deuda.montoTotal || 0) - pagado);
    }, 0);

    return {
      activas: activas.length,
      saldoRestante,
    };
  }, [deudas]);

  const quickActions = [
    {
      accent: "primary",
      icon: "+",
      title: "Crear Gasto",
      description:
        "Primer flujo del usuario. Luego lo convertiremos en gasto pendiente con factura.",
      onClick: () => setActiveModal("gasto"),
    },
    {
      icon: "C",
      title: "Crear Categoria Principal",
      description: "Agrupa subcategorias y mejora el dashboard.",
      onClick: () => setActiveModal("categoriaGrupo"),
    },
    {
      icon: "S",
      title: "Crear Subcategoria",
      description: "Clasifica gastos con menos pasos.",
      onClick: () => setActiveModal("categoria"),
    },
    {
      icon: "B",
      title: "Crear Banco",
      description: "Registra una institucion para tus cuentas.",
      onClick: () => setActiveModal("banco"),
    },
    {
      icon: "$",
      title: "Crear Cuenta",
      description: "Asocia una cuenta a un banco existente.",
      onClick: () => setActiveModal("cuenta"),
    },
  ];

  function updatePeriodFilter(field, value) {
    setPeriodFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Acciones rapidas fijas y datos reales desde MongoDB."
      user={user}
      onLogout={() => {
        logout();
        onLogout?.();
      }}
    >
      {!hasToken ? (
        <Alert
          tone="warning"
          title="Sesion no detectada"
          message="Si no aparecen tus datos, inicia sesion para poder consultar tu informacion."
        />
      ) : null}

      {pendingCount > 0 ? (
        <Alert
          tone="warning"
          title={`Tienes ${pendingCount} gastos pendientes por crear`}
          message="Este banner ya esta preparado. En el siguiente punto ajustaremos el backend para crear y completar pendientes."
        />
      ) : null}

      {status.message ? (
        <Alert
          tone={status.type}
          title={status.title}
          message={status.message}
        />
      ) : null}

      {loadingResources ? (
        <Alert
          tone="info"
          title="Cargando Dashboard"
          message="Estoy consultando bancos, cuentas, categorias y gastos desde MongoDB."
        />
      ) : null}

      <QuickActions actions={quickActions} />

      <AccountCarousel cuentas={cuentas} />

      <section className="dashboard-grid">
        <Card title="Resumen de recursos">
          <div className="metric-grid">
            {resourceSummary.map((item) => (
              <div className="metric" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="button-row">
            <Button onClick={loadResources} variant="secondary">
              {loadingResources ? "Actualizando..." : "Actualizar datos"}
            </Button>
          </div>
        </Card>
      </section>

      <section className="card dashboard-control-panel">
        <div>
          <h2>Vista financiera</h2>
          <p>Filtra los gastos por banco o cuenta sin salir del Dashboard.</p>
        </div>

        <div className="form-grid dashboard-filters">
          <PeriodFilter
            filters={periodFilters}
            idPrefix="dashboardPeriod"
            onChange={updatePeriodFilter}
          />
          <FormField id="dashboardBanco" label="Banco">
            <select
              id="dashboardBanco"
              onChange={(event) => {
                setSelectedBanco(event.target.value);
                setSelectedCuenta("");
              }}
              value={selectedBanco}
            >
              <option value="">Todos los bancos</option>
              {bancos.map((banco) => (
                <option key={banco._id} value={banco._id}>
                  {banco.nombre}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="dashboardCuenta" label="Cuenta">
            <select
              id="dashboardCuenta"
              onChange={(event) => setSelectedCuenta(event.target.value)}
              value={selectedCuenta}
            >
              <option value="">Todas las cuentas</option>
              {cuentasFiltradas.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="dashboardAgrupacion" label="Agrupar categorias">
            <select
              id="dashboardAgrupacion"
              onChange={(event) => setCategoryGrouping(event.target.value)}
              value={categoryGrouping}
            >
              <option value="subcategoria">Subcategoria</option>
              <option value="principal">Categoria principal</option>
            </select>
          </FormField>
        </div>
      </section>

      <section className="metric-grid metric-grid-wide">
        <MetricCard label="Gastos filtrados" value={financialSummary.cantidad} />
        <MetricCard
          label="Gasto bancario"
          value={formatCurrency(Math.abs(financialSummary.bancario))}
        />
        <MetricCard
          label="Gasto real"
          value={formatCurrency(Math.abs(financialSummary.real))}
        />
        <MetricCard
          label="Saldo de deudas activas"
          value={formatCurrency(deudaSummary.saldoRestante)}
        />
      </section>

      <section className="dashboard-grid dashboard-grid-spaced">
        <Card title="Gasto real por categoria">
          <MiniBarChart items={categoriasResumen} labelKey="nombre" valueKey="total" />
        </Card>

        <Card title="Gasto bancario por categoria">
          <MiniBarChart
            items={bancarioCategoriasResumen}
            labelKey="nombre"
            valueKey="total"
          />
        </Card>
      </section>

      <section className="dashboard-grid dashboard-grid-spaced">
        <Card title="Gasto bancario vs gasto real">
          <ComparisonBars
            items={[
              { label: "Bancario", value: financialSummary.bancario },
              { label: "Real", value: financialSummary.real },
            ]}
          />
        </Card>

        <Card title="Evolucion mensual">
          <MonthlyBars
            bancario={monthlyEvolution.bancario}
            labels={monthlyEvolution.labels}
            real={monthlyEvolution.real}
          />
        </Card>
      </section>

      <section className="dashboard-grid dashboard-grid-spaced">
        <Card title="Deudas activas">
          <div className="debt-summary">
            <strong>{deudaSummary.activas}</strong>
            <span>deudas activas</span>
          </div>
          <PreviewList
            emptyMessage="No hay deudas activas."
            items={deudas.filter((deuda) => deuda.activa).slice(0, 5)}
            renderItem={(item) => {
              const pagado =
                Number(item.montoCuota || 0) * Number(item.cuotaActual || 0);
              const saldo = Math.max(0, Number(item.montoTotal || 0) - pagado);

              return (
                <>
                  <strong>{item.descripcion}</strong>
                  <small>
                    {item.cuotaActual} / {item.cuotasTotales} cuotas ·{" "}
                    {formatCurrency(saldo)}
                  </small>
                </>
              );
            }}
          />
        </Card>
        <Card title="Ultimos gastos">
          <PreviewList
            emptyMessage="Todavia no hay gastos cargados."
            items={gastosFiltrados.slice(0, 5)}
            renderItem={(item) => (
              <>
                <strong>{item.descripcion || "Sin descripcion"}</strong>
                <small>
                  {item.cuenta?.nombre || "Sin cuenta"} ·{" "}
                  {item.categoria?.nombre || "Sin categoria"}
                </small>
              </>
            )}
          />
        </Card>
      </section>

      <BancoModal
        onClose={() => setActiveModal("")}
        onSubmit={handleCreate}
        open={activeModal === "banco"}
      />
      <CuentaModal
        bancos={bancos}
        onClose={() => setActiveModal("")}
        onSubmit={handleCreate}
        open={activeModal === "cuenta"}
      />
      <CategoriaGrupoModal
        onClose={() => setActiveModal("")}
        onSubmit={handleCreate}
        open={activeModal === "categoriaGrupo"}
      />
      <CategoriaModal
        categoriasGrupo={categoriasGrupo}
        onClose={() => setActiveModal("")}
        onSubmit={handleCreate}
        open={activeModal === "categoria"}
      />
      <GastoModal
        categorias={categorias}
        cuentas={cuentas}
        onClose={() => setActiveModal("")}
        onSubmit={handleCreate}
        open={activeModal === "gasto"}
      />
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

function PreviewList({ items, renderItem, emptyMessage }) {
  if (!items.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <div className="preview-list">
      {items.map((item) => (
        <article className="preview-item" key={item._id}>
          {renderItem(item)}
        </article>
      ))}
    </div>
  );
}

function AccountCarousel({ cuentas }) {
  return (
    <section className="accounts-carousel-section">
      <div className="section-title-row">
        <h2>Cuentas</h2>
      </div>
      {cuentas.length ? (
        <div className="accounts-carousel" aria-label="Cuentas">
          {cuentas.map((cuenta) => (
            <a
              className="account-card"
              href={`#/gastos-cuenta?cuenta=${cuenta._id}`}
              key={cuenta._id}
            >
              <strong>{cuenta.nombre}</strong>
              <span>{cuenta.banco?.nombre || "Banco no cargado"}</span>
              <small>Ver gastos</small>
            </a>
          ))}
        </div>
      ) : (
        <p className="empty-state">Todavia no hay cuentas cargadas.</p>
      )}
    </section>
  );
}

function BancoModal({ open, onClose, onSubmit }) {
  const [nombre, setNombre] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit("/bancos", { nombre: nombre.trim() }, "Banco creado correctamente.");
    setNombre("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear Banco">
      <form className="stack-form" onSubmit={handleSubmit}>
        <FormField id="bancoNombre" label="Nombre">
          <input
            id="bancoNombre"
            minLength="2"
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej: Santander"
            required
            value={nombre}
          />
        </FormField>
        <Button type="submit">Guardar banco</Button>
      </form>
    </Modal>
  );
}

function CuentaModal({ open, onClose, onSubmit, bancos }) {
  const [nombre, setNombre] = useState("");
  const [banco, setBanco] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(
      "/cuentas",
      { nombre: nombre.trim(), banco },
      "Cuenta creada correctamente.",
    );
    setNombre("");
    setBanco("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear Cuenta">
      <form className="stack-form" onSubmit={handleSubmit}>
        <FormField id="cuentaNombre" label="Nombre">
          <input
            id="cuentaNombre"
            minLength="2"
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej: Caja ahorro"
            required
            value={nombre}
          />
        </FormField>
        <FormField id="cuentaBanco" label="Banco">
          <select
            id="cuentaBanco"
            onChange={(event) => setBanco(event.target.value)}
            required
            value={banco}
          >
            <option value="">Seleccionar banco</option>
            {bancos.map((item) => (
              <option key={item._id} value={item._id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="submit">Guardar cuenta</Button>
      </form>
    </Modal>
  );
}

function CategoriaGrupoModal({ open, onClose, onSubmit }) {
  const [nombre, setNombre] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(
      "/categorias-grupo",
      { nombre: nombre.trim() },
      "Categoria principal creada correctamente.",
    );
    setNombre("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear Categoria Principal">
      <form className="stack-form" onSubmit={handleSubmit}>
        <FormField id="categoriaGrupoNombre" label="Nombre">
          <input
            id="categoriaGrupoNombre"
            minLength="2"
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej: Alimentacion"
            required
            value={nombre}
          />
        </FormField>
        <Button type="submit">Guardar categoria principal</Button>
      </form>
    </Modal>
  );
}

function CategoriaModal({ open, onClose, onSubmit, categoriasGrupo }) {
  const [nombre, setNombre] = useState("");
  const [categoriaGrupo, setCategoriaGrupo] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(
      "/categorias",
      {
        nombre: nombre.trim(),
        categoriaGrupo: categoriaGrupo || null,
      },
      "Subcategoria creada correctamente.",
    );
    setNombre("");
    setCategoriaGrupo("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear Subcategoria">
      <form className="stack-form" onSubmit={handleSubmit}>
        <FormField id="categoriaNombre" label="Nombre">
          <input
            id="categoriaNombre"
            minLength="2"
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej: Supermercado"
            required
            value={nombre}
          />
        </FormField>
        <FormField id="categoriaGrupo" label="Categoria principal">
          <select
            id="categoriaGrupo"
            onChange={(event) => setCategoriaGrupo(event.target.value)}
            value={categoriaGrupo}
          >
            <option value="">Sin categoria principal</option>
            {categoriasGrupo.map((item) => (
              <option key={item._id} value={item._id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="submit">Guardar subcategoria</Button>
      </form>
    </Modal>
  );
}

function GastoModal({ open, onClose, onSubmit, categorias, cuentas }) {
  const [fecha, setFecha] = useState(todayInputValue());
  const [descripcion, setDescripcion] = useState("");
  const [flujoBancario, setFlujoBancario] = useState("");
  const [porcentajeEconomiaReal, setPorcentajeEconomiaReal] = useState("100");
  const [categoria, setCategoria] = useState("");
  const [cuenta, setCuenta] = useState("");

  const economiaReal = useMemo(() => {
    if (flujoBancario === "" || porcentajeEconomiaReal === "") return "";

    const flujo = Number(flujoBancario);
    const porcentaje = Number(porcentajeEconomiaReal);

    if (Number.isNaN(flujo) || Number.isNaN(porcentaje)) return "";

    return (flujo * (porcentaje / 100)).toFixed(2);
  }, [flujoBancario, porcentajeEconomiaReal]);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(
      "/gastos",
      {
        fecha,
        descripcion: descripcion.trim(),
        flujoBancario: Number(flujoBancario),
        economiaReal: Number(economiaReal),
        porcentajeEconomiaReal: Number(porcentajeEconomiaReal),
        categoria,
        cuenta,
        incluirEnGastoBancario: Number(flujoBancario) !== 0,
        incluirEnGastoReal: Number(economiaReal) !== 0,
      },
      "Gasto creado correctamente.",
    );
    setFecha(todayInputValue());
    setDescripcion("");
    setFlujoBancario("");
    setPorcentajeEconomiaReal("100");
    setCategoria("");
    setCuenta("");
  }

  return (
    <Modal open={open} onClose={onClose} title="Crear Gasto">
      <form className="stack-form" onSubmit={handleSubmit}>
        <Alert
          tone="info"
          title="Flujo actual"
          message="Este modal crea gastos completos con la logica existente. En el proximo punto lo convertiremos en gasto pendiente con factura."
        />
        <div className="form-grid">
          <FormField id="gastoFecha" label="Fecha">
            <input
              id="gastoFecha"
              onChange={(event) => setFecha(event.target.value)}
              required
              type="date"
              value={fecha}
            />
          </FormField>
          <FormField id="gastoFlujo" label="Gasto bancario">
            <input
              id="gastoFlujo"
              onChange={(event) => setFlujoBancario(event.target.value)}
              required
              step="0.01"
              type="number"
              value={flujoBancario}
            />
          </FormField>
        </div>

        <FormField id="gastoDescripcion" label="Descripcion">
          <textarea
            id="gastoDescripcion"
            maxLength="500"
            minLength="2"
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Ej: Compra supermercado"
            required
            value={descripcion}
          />
        </FormField>

        <div className="form-grid">
          <FormField id="gastoPorcentaje" label="Porcentaje gasto real">
            <input
              id="gastoPorcentaje"
              max="100"
              min="0"
              onChange={(event) => setPorcentajeEconomiaReal(event.target.value)}
              required
              step="0.01"
              type="number"
              value={porcentajeEconomiaReal}
            />
          </FormField>
          <FormField id="gastoEconomia" label="Gasto real">
            <input id="gastoEconomia" readOnly type="number" value={economiaReal} />
          </FormField>
        </div>

        <div className="form-grid">
          <FormField id="gastoCategoria" label="Subcategoria">
            <select
              id="gastoCategoria"
              onChange={(event) => setCategoria(event.target.value)}
              required
              value={categoria}
            >
              <option value="">Seleccionar subcategoria</option>
              {categorias.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="gastoCuenta" label="Cuenta">
            <select
              id="gastoCuenta"
              onChange={(event) => setCuenta(event.target.value)}
              required
              value={cuenta}
            >
              <option value="">Seleccionar cuenta</option>
              {cuentas.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <Button type="submit">Guardar gasto</Button>
      </form>
    </Modal>
  );
}
