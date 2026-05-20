import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { QuickActions } from "../components/QuickActions";
import { PageLayout } from "../layout/PageLayout";
import { apiRequest, getApiData, getUser, logout } from "../services/api";
import { excelDateToISO, parseMoneyValue } from "../utils/formatters";
import { creationActionMeta } from "../utils/quickActions";

function normalizeItems(response) {
  const data = getApiData(response);
  return Array.isArray(data) ? data : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function buildBankFlow(gValue, iValue) {
  const g = parseMoneyValue(gValue);
  const i = parseMoneyValue(iValue);
  if (g != null && i != null) return g + i;
  if (g != null) return g;
  if (i != null) return i;
  return null;
}

function resolveFlags(categoryName, flow, real) {
  const name = normalizeText(categoryName);
  const flujo = Number(flow) || 0;
  const realValue = Number(real) || 0;

  if (
    name.includes("transf") ||
    name.includes("traspaso") ||
    name.includes("balance mes anterior")
  ) {
    return { incluirEnGastoBancario: false, incluirEnGastoReal: false };
  }

  if (name.includes("balance split")) {
    return { incluirEnGastoBancario: false, incluirEnGastoReal: realValue < 0 };
  }

  return {
    incluirEnGastoBancario: flujo !== 0,
    incluirEnGastoReal: realValue !== 0,
  };
}

function getCategoryByName(categorias, name) {
  const normalized = normalizeText(name);
  return categorias.find((categoria) => normalizeText(categoria.nombre) === normalized);
}

export function ImportExpenses({ mode = "bank", onLogout }) {
  const fileInputRef = useRef(null);
  const [categorias, setCategorias] = useState([]);
  const [categoriasGrupo, setCategoriasGrupo] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [rows, setRows] = useState([]);
  const [activeModal, setActiveModal] = useState("");
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const [bulk, setBulk] = useState({
    fecha: "",
    descripcion: "",
    flujoBancario: "",
    porcentajeEconomiaReal: "",
    economiaReal: "",
    categoria: "",
    cuenta: "",
    incluirEnGastoBancario: "",
    incluirEnGastoReal: "",
  });
  const user = getUser();
  const isPersonal = mode === "personal";

  const loadResources = useCallback(async () => {
    const [categoriasResp, categoriasGrupoResp, cuentasResp] = await Promise.all([
      apiRequest("/categorias"),
      apiRequest("/categorias-grupo"),
      apiRequest("/cuentas"),
    ]);
    setCategorias(normalizeItems(categoriasResp));
    setCategoriasGrupo(normalizeItems(categoriasGrupoResp));
    setCuentas(normalizeItems(cuentasResp));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadResources, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadResources]);

  const selectedRows = useMemo(
    () => rows.filter((row) => row.selected && !row.created),
    [rows],
  );

  async function processFile(file) {
    setStatus({ type: "", title: "", message: "" });
    await loadResources();

    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) throw new Error("No se encontro una hoja valida.");

    const parsedRows = isPersonal
      ? parsePersonalSheet(sheet, categorias, XLSX)
      : parseBankSheet(sheet, XLSX);

    setRows(parsedRows);
    setStatus({
      type: "success",
      title: "Archivo procesado",
      message: `Se encontraron ${parsedRows.length} fila(s) validas.`,
    });
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await processFile(file);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo procesar",
        message: error.message,
      });
    } finally {
      event.target.value = "";
    }
  }

  function updateRow(localId, patch) {
    setRows((current) =>
      current.map((row) => {
        if (row.localId !== localId) return row;
        const next = { ...row, ...patch };

        if (
          patch.flujoBancario !== undefined ||
          patch.porcentajeEconomiaReal !== undefined
        ) {
          const flow = Number(next.flujoBancario);
          const percentage = Number(next.porcentajeEconomiaReal);
          if (!Number.isNaN(flow) && !Number.isNaN(percentage)) {
            next.economiaReal = Number((flow * (percentage / 100)).toFixed(2));
          }
        }

        return next;
      }),
    );
  }

  function toggleAll(checked) {
    setRows((current) =>
      current.map((row) => (row.created ? row : { ...row, selected: checked })),
    );
  }

  function applyBulk({ onlySelected }) {
    const hasAnyChange = Object.values(bulk).some((value) => value !== "");
    if (!hasAnyChange) {
      setStatus({
        type: "error",
        title: "Sin cambios",
        message: "Selecciona al menos un campo para aplicar.",
      });
      return;
    }

    setRows((current) =>
      current.map((row) => {
        if (row.created) return row;
        if (onlySelected && !row.selected) return row;

        const next = { ...row };
        Object.entries(bulk).forEach(([key, value]) => {
          if (value === "") return;
          if (key === "incluirEnGastoBancario" || key === "incluirEnGastoReal") {
            next[key] = value === "true";
          } else {
            next[key] = value;
          }
        });

        const flow = Number(next.flujoBancario);
        const percentage = Number(next.porcentajeEconomiaReal);
        if (bulk.economiaReal === "" && !Number.isNaN(flow) && !Number.isNaN(percentage)) {
          next.economiaReal = Number((flow * (percentage / 100)).toFixed(2));
        }
        return next;
      }),
    );
  }

  function deleteSelected() {
    setRows((current) => current.filter((row) => row.created || !row.selected));
  }

  async function ensureCategory(row) {
    if (row.categoria) return row.categoria;
    if (!row.categoriaNombreOriginal) return "";

    const existing = getCategoryByName(categorias, row.categoriaNombreOriginal);
    if (existing?._id) return existing._id;

    const response = await apiRequest("/categorias", {
      method: "POST",
      body: { nombre: row.categoriaNombreOriginal },
    });
    const created = getApiData(response);
    await loadResources();
    return created?._id || getCategoryByName(categorias, row.categoriaNombreOriginal)?._id || "";
  }

  function validateRow(row) {
    if (!row.fecha) return "La fecha es obligatoria.";
    if (!String(row.descripcion || "").trim()) return "La descripcion es obligatoria.";
    if (Number.isNaN(Number(row.flujoBancario))) return "Flujo bancario invalido.";
    if (Number.isNaN(Number(row.economiaReal))) return "Gasto real invalido.";
    if (!row.cuenta) return "Selecciona una cuenta.";
    if (!row.categoria && !row.categoriaNombreOriginal) return "Selecciona una categoria.";
    return "";
  }

  async function createRows({ onlySelected }) {
    const targetRows = rows.filter((row) => !row.created && (!onlySelected || row.selected));
    await createTargetRows(targetRows);
  }

  async function createSingleRow(row) {
    await createTargetRows([row]);
  }

  async function createTargetRows(targetRows) {
    if (!targetRows.length) {
      setStatus({
        type: "error",
        title: "Sin filas",
        message: "No hay filas pendientes para crear.",
      });
      return;
    }

    let created = 0;
    let failed = 0;

    for (const row of targetRows) {
      const validation = validateRow(row);
      if (validation) {
        failed++;
        continue;
      }

      try {
        const categoria = await ensureCategory(row);
        await apiRequest("/gastos", {
          method: "POST",
          body: {
            fecha: row.fecha,
            descripcion: String(row.descripcion || "").trim(),
            flujoBancario: Number(row.flujoBancario),
            economiaReal: Number(row.economiaReal),
            porcentajeEconomiaReal: Number(row.porcentajeEconomiaReal),
            categoria,
            cuenta: row.cuenta,
            incluirEnGastoBancario: row.incluirEnGastoBancario,
            incluirEnGastoReal: row.incluirEnGastoReal,
          },
        });

        created++;
        setRows((current) =>
          current.map((item) =>
            item.localId === row.localId
              ? { ...item, created: true, selected: false, categoria }
              : item,
          ),
        );
      } catch {
        failed++;
      }
    }

    setStatus({
      type: failed ? "warning" : "success",
      title: "Importacion finalizada",
      message: `Creados: ${created}. Errores: ${failed}.`,
    });
  }

  async function handleCreateCategory(payload) {
    try {
      await apiRequest("/categorias", {
        method: "POST",
        body: payload,
      });
      setActiveModal("");
      setStatus({
        type: "success",
        title: "Subcategoria creada",
        message: "Ya podes seleccionarla en las filas importadas.",
      });
      await loadResources();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo crear subcategoria",
        message: error.message,
      });
    }
  }

  const columns = buildColumns({
    categorias,
    createSingleRow,
    cuentas,
    rows,
    toggleAll,
    updateRow,
  });

  return (
    <PageLayout
      onLogout={() => {
        logout();
        onLogout?.();
      }}
      subtitle={
        isPersonal
          ? "Importa planillas personales con categoria en la columna E."
          : "Importa extractos bancarios leyendo columnas B, D, G e I desde fila 16."
      }
      title={isPersonal ? "Importar Excel Personal" : "Importar Excel Bancario"}
      user={user}
    >
      {status.message ? (
        <Alert message={status.message} title={status.title} tone={status.type} />
      ) : null}

      <QuickActions
        actions={[
          {
            ...creationActionMeta.categorias,
            onClick: () => setActiveModal("categoria"),
          },
        ]}
      />

      <Card title="Archivo">
        <div className="section-toolbar">
          <div>
            <h2>{isPersonal ? "Formato personal" : "Formato bancario"}</h2>
            <p>
              {isPersonal
                ? "Columnas A fecha, B descripcion, C bancario, D real, E categoria."
                : "Columnas B fecha, D descripcion, G/I gasto bancario desde fila 16."}
            </p>
          </div>
          <Button onClick={() => fileInputRef.current?.click()}>
            Seleccionar archivo
          </Button>
        </div>
        <input
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
      </Card>

      <Card className="expenses-table-card" title="Cambios por lote">
        <div className="bulk-actions import-bulk-actions">
          <FormField id="importBulkFecha" label="Fecha">
            <input
              id="importBulkFecha"
              onChange={(event) => setBulk((current) => ({ ...current, fecha: event.target.value }))}
              type="date"
              value={bulk.fecha}
            />
          </FormField>
          <FormField id="importBulkCategoria" label="Categoria">
            <select
              id="importBulkCategoria"
              onChange={(event) => setBulk((current) => ({ ...current, categoria: event.target.value }))}
              value={bulk.categoria}
            >
              <option value="">No cambiar</option>
              {categorias.map((categoria) => (
                <option key={categoria._id} value={categoria._id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="importBulkCuenta" label="Cuenta">
            <select
              id="importBulkCuenta"
              onChange={(event) => setBulk((current) => ({ ...current, cuenta: event.target.value }))}
              value={bulk.cuenta}
            >
              <option value="">No cambiar</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta._id} value={cuenta._id}>
                  {cuenta.nombre}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="importBulkPorcentaje" label="Porcentaje real">
            <input
              id="importBulkPorcentaje"
              onChange={(event) =>
                setBulk((current) => ({
                  ...current,
                  porcentajeEconomiaReal: event.target.value,
                }))
              }
              placeholder="No cambiar"
              type="number"
              value={bulk.porcentajeEconomiaReal}
            />
          </FormField>
          <FormField id="importBulkBancario" label="Incluir bancario">
            <select
              id="importBulkBancario"
              onChange={(event) =>
                setBulk((current) => ({
                  ...current,
                  incluirEnGastoBancario: event.target.value,
                }))
              }
              value={bulk.incluirEnGastoBancario}
            >
              <option value="">No cambiar</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </FormField>
          <FormField id="importBulkReal" label="Incluir real">
            <select
              id="importBulkReal"
              onChange={(event) =>
                setBulk((current) => ({
                  ...current,
                  incluirEnGastoReal: event.target.value,
                }))
              }
              value={bulk.incluirEnGastoReal}
            >
              <option value="">No cambiar</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </FormField>
        </div>
        <div className="button-row">
          <Button onClick={() => applyBulk({ onlySelected: false })} variant="secondary">
            Aplicar a todos
          </Button>
          <Button onClick={() => applyBulk({ onlySelected: true })} variant="secondary">
            Aplicar a seleccionados
          </Button>
          <Button onClick={deleteSelected} variant="danger">
            Eliminar seleccionados
          </Button>
          <Button
            onClick={() =>
              setBulk({
                fecha: "",
                descripcion: "",
                flujoBancario: "",
                porcentajeEconomiaReal: "",
                economiaReal: "",
                categoria: "",
                cuenta: "",
                incluirEnGastoBancario: "",
                incluirEnGastoReal: "",
              })
            }
            variant="secondary"
          >
            Limpiar cambios
          </Button>
        </div>
        <p className="selection-note">Filas seleccionadas: {selectedRows.length}</p>
      </Card>

      <Card className="expenses-table-card import-preview-card" title="Previsualizacion">
        <DataTable
          columns={columns}
          emptyMessage="Todavia no hay datos importados."
          items={rows}
          rowKey={(row) => row.localId}
        />
        <div className="button-row button-row-end">
          <Button onClick={() => createRows({ onlySelected: true })}>
            Crear seleccionados
          </Button>
          <Button onClick={() => createRows({ onlySelected: false })} variant="secondary">
            Crear todos
          </Button>
        </div>
      </Card>

      <Modal
        onClose={() => setActiveModal("")}
        open={activeModal === "categoria"}
        title="Crear Subcategoria"
      >
        <CategoriaModalContent
          categoriasGrupo={categoriasGrupo}
          onCancel={() => setActiveModal("")}
          onSubmit={handleCreateCategory}
        />
      </Modal>
    </PageLayout>
  );
}

function parseBankSheet(sheet, XLSX) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const parsedRows = [];

  for (let rowIndex = 15; rowIndex <= range.e.r; rowIndex++) {
    const excelRowNumber = rowIndex + 1;
    const fecha = excelDateToISO(sheet[`B${excelRowNumber}`]?.v ?? "", XLSX);
    const descripcion = String(sheet[`D${excelRowNumber}`]?.v ?? "").trim();
    const flujoBancario = buildBankFlow(
      sheet[`G${excelRowNumber}`]?.v ?? "",
      sheet[`I${excelRowNumber}`]?.v ?? "",
    );

    if (!fecha && !descripcion && (flujoBancario == null || flujoBancario === 0)) {
      continue;
    }

    const real = Number(flujoBancario || 0);
    const flags = resolveFlags(descripcion, flujoBancario || 0, real);

    parsedRows.push({
      localId: `row-${Date.now()}-${rowIndex}`,
      fecha,
      descripcion,
      flujoBancario: Number(flujoBancario || 0),
      porcentajeEconomiaReal: 100,
      economiaReal: real,
      categoria: "",
      categoriaNombreOriginal: "",
      cuenta: "",
      selected: true,
      created: false,
      ...flags,
    });
  }

  return parsedRows;
}

function parsePersonalSheet(sheet, categorias, XLSX) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });

  return rawRows
    .map((row, index) => {
      const fecha = excelDateToISO(row[0], XLSX);
      const descripcion = String(row[1] || "").trim();
      const flujoBancario = parseMoneyValue(row[2]);
      const economiaReal = parseMoneyValue(row[3]);
      const categoriaNombreOriginal = String(row[4] || "").trim();

      if (
        !fecha &&
        !descripcion &&
        flujoBancario == null &&
        economiaReal == null &&
        !categoriaNombreOriginal
      ) {
        return null;
      }

      if (!fecha && !descripcion && !categoriaNombreOriginal) return null;

      const categoria = getCategoryByName(categorias, categoriaNombreOriginal);
      const flow = Number(flujoBancario || 0);
      const real = Number(economiaReal || 0);
      const percentage = flow === 0 ? 0 : Number(((real / flow) * 100).toFixed(2));
      const flags = resolveFlags(categoriaNombreOriginal, flow, real);

      return {
        localId: `row-${Date.now()}-${index}`,
        fecha,
        descripcion,
        flujoBancario: flow,
        porcentajeEconomiaReal: percentage,
        economiaReal: real,
        categoria: categoria?._id || "",
        categoriaNombreOriginal,
        cuenta: "",
        selected: true,
        created: false,
        ...flags,
      };
    })
    .filter(Boolean);
}

function buildColumns({ categorias, createSingleRow, cuentas, rows, toggleAll, updateRow }) {
  return [
    {
      key: "select",
      header: (
        <input
          checked={rows.length > 0 && rows.every((row) => row.created || row.selected)}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => toggleAll(event.target.checked)}
          type="checkbox"
        />
      ),
      render: (row) => (
        <input
          checked={row.selected}
          disabled={row.created}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => updateRow(row.localId, { selected: event.target.checked })}
          type="checkbox"
        />
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      render: (row) => (
        <input
          className="table-input"
          disabled={row.created}
          onChange={(event) => updateRow(row.localId, { fecha: event.target.value })}
          type="date"
          value={row.fecha}
        />
      ),
    },
    {
      key: "descripcion",
      header: "Descripcion",
      render: (row) => (
        <textarea
          className="table-textarea"
          disabled={row.created}
          onChange={(event) => updateRow(row.localId, { descripcion: event.target.value })}
          value={row.descripcion}
        />
      ),
    },
    {
      key: "flujo",
      header: "Bancario",
      render: (row) => (
        <input
          className="table-input"
          disabled={row.created}
          onChange={(event) =>
            updateRow(row.localId, { flujoBancario: event.target.value })
          }
          type="number"
          value={row.flujoBancario}
        />
      ),
    },
    {
      key: "porcentaje",
      header: "% Real",
      render: (row) => (
        <input
          className="table-input"
          disabled={row.created}
          onChange={(event) =>
            updateRow(row.localId, { porcentajeEconomiaReal: event.target.value })
          }
          type="number"
          value={row.porcentajeEconomiaReal}
        />
      ),
    },
    {
      key: "real",
      header: "Real",
      render: (row) => (
        <input
          className="table-input"
          disabled={row.created}
          onChange={(event) => updateRow(row.localId, { economiaReal: event.target.value })}
          type="number"
          value={row.economiaReal}
        />
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      render: (row) => (
        <select
          className="table-select"
          disabled={row.created}
          onChange={(event) => updateRow(row.localId, { categoria: event.target.value })}
          value={row.categoria}
        >
          <option value="">
            {row.categoriaNombreOriginal || "Seleccionar categoria"}
          </option>
          {categorias.map((categoria) => (
            <option key={categoria._id} value={categoria._id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "cuenta",
      header: "Cuenta",
      render: (row) => (
        <select
          className="table-select"
          disabled={row.created}
          onChange={(event) => updateRow(row.localId, { cuenta: event.target.value })}
          value={row.cuenta}
        >
          <option value="">Seleccionar cuenta</option>
          {cuentas.map((cuenta) => (
            <option key={cuenta._id} value={cuenta._id}>
              {cuenta.nombre}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => (row.created ? "Creado" : "Pendiente"),
    },
    {
      key: "incluirBancario",
      header: "Bancario",
      render: (row) => (
        <input
          checked={row.incluirEnGastoBancario}
          disabled={row.created}
          onChange={(event) =>
            updateRow(row.localId, { incluirEnGastoBancario: event.target.checked })
          }
          type="checkbox"
        />
      ),
    },
    {
      key: "incluirReal",
      header: "Real",
      render: (row) => (
        <input
          checked={row.incluirEnGastoReal}
          disabled={row.created}
          onChange={(event) =>
            updateRow(row.localId, { incluirEnGastoReal: event.target.checked })
          }
          type="checkbox"
        />
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (row) => (
        <div className="table-actions">
          <Button
            disabled={row.created}
            onClick={() => createSingleRow(row)}
            variant="secondary"
          >
            Crear
          </Button>
        </div>
      ),
    },
  ];
}

function CategoriaModalContent({ categoriasGrupo, onCancel, onSubmit }) {
  const [nombre, setNombre] = useState("");
  const [categoriaGrupo, setCategoriaGrupo] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      nombre: nombre.trim(),
      categoriaGrupo: categoriaGrupo || null,
    });
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <FormField id="importCategoriaNombre" label="Nombre">
        <input
          id="importCategoriaNombre"
          minLength="2"
          onChange={(event) => setNombre(event.target.value)}
          required
          value={nombre}
        />
      </FormField>
      <FormField id="importCategoriaGrupo" label="Categoria principal">
        <select
          id="importCategoriaGrupo"
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
      <div className="button-row button-row-end">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button type="submit">Guardar subcategoria</Button>
      </div>
    </form>
  );
}
