import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Button } from "./Button";
import { FacturaLink } from "./FacturaLink";
import { FormField } from "./FormField";

function dateInputValue(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function idValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value._id === "string") return value._id;
  return "";
}

function parseDecimalInput(value) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function roundDecimal(value, decimals = 2) {
  if (value === null || value === undefined) return null;
  return Number(value.toFixed(decimals));
}

function dataUrlToFile(dataUrl, fileName = "factura.jpg") {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = window.atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], fileName, { type: mime });
}

const initialState = {
  fecha: new Date().toISOString().slice(0, 10),
  descripcion: "",
  flujoBancario: "",
  porcentajeEconomiaReal: "100",
  categoria: "",
  cuenta: "",
  incluirEnGastoBancario: true,
  incluirEnGastoReal: true,
};

function getInitialState(expense) {
  if (!expense) return initialState;

  return {
    fecha: dateInputValue(expense.fecha),
    descripcion: expense.descripcion || "",
    flujoBancario: expense.flujoBancario ?? "",
    porcentajeEconomiaReal: expense.porcentajeEconomiaReal ?? "100",
    categoria: idValue(expense.categoria),
    cuenta: idValue(expense.cuenta),
    incluirEnGastoBancario: expense.incluirEnGastoBancario !== false,
    incluirEnGastoReal: expense.incluirEnGastoReal !== false,
  };
}

export function ExpenseForm({
  categorias,
  cuentas,
  expense,
  mode = "full",
  onCancel,
  onSubmit,
  requireAccounting = false,
  submitLabel = "Guardar gasto",
}) {
  const [form, setForm] = useState(() => getInitialState(expense));
  const [facturaFile, setFacturaFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [showAccountingFields, setShowAccountingFields] = useState(mode !== "quick");
  const [cameraStream, setCameraStream] = useState(null);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const isQuickMode = mode === "quick";

  const economiaReal = useMemo(() => {
    if (form.flujoBancario === "" || form.porcentajeEconomiaReal === "") {
      return "";
    }

    const flujo = parseDecimalInput(form.flujoBancario);
    const porcentaje = parseDecimalInput(form.porcentajeEconomiaReal);

    if (flujo === null || porcentaje === null) return "";

    return (flujo * (porcentaje / 100)).toFixed(2);
  }, [form.flujoBancario, form.porcentajeEconomiaReal]);

  function updateField(field, value) {
    setFormError("");
    setForm((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  function closeCameraPreview() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const descripcion = form.descripcion.trim();
    const flujoBancario = parseDecimalInput(form.flujoBancario);
    const porcentajeEconomiaReal = parseDecimalInput(form.porcentajeEconomiaReal);
    const economiaRealValue = parseDecimalInput(economiaReal);

    if (descripcion.length < 2) {
      setFormError("La descripcion debe tener al menos 2 caracteres.");
      return;
    }

    if (!form.fecha) {
      setFormError("La fecha es obligatoria.");
      return;
    }

    if (form.flujoBancario !== "" && flujoBancario === null) {
      setFormError("El gasto bancario debe ser un numero valido.");
      return;
    }

    if (form.porcentajeEconomiaReal !== "" && porcentajeEconomiaReal === null) {
      setFormError("El porcentaje de gasto real debe ser un numero valido.");
      return;
    }

    if (requireAccounting) {
      const missing = [];
      if (form.flujoBancario === "") missing.push("gasto bancario");
      if (!form.categoria) missing.push("subcategoria");
      if (!form.cuenta) missing.push("cuenta");

      if (missing.length) {
        setShowAccountingFields(true);
        setFormError(`Para completar el gasto falta: ${missing.join(", ")}.`);
        return;
      }
    }

    const normalizedFlujoBancario = roundDecimal(flujoBancario);
    const normalizedEconomiaReal = roundDecimal(economiaRealValue);
    const normalizedPorcentajeEconomiaReal = roundDecimal(porcentajeEconomiaReal);

    onSubmit({
      fecha: form.fecha,
      descripcion,
      flujoBancario: normalizedFlujoBancario,
      economiaReal: normalizedEconomiaReal,
      porcentajeEconomiaReal: normalizedPorcentajeEconomiaReal,
      categoria: form.categoria || null,
      cuenta: form.cuenta || null,
      incluirEnGastoBancario:
        Number(normalizedFlujoBancario) !== 0 && form.incluirEnGastoBancario,
      incluirEnGastoReal:
        Number(normalizedEconomiaReal) !== 0 && form.incluirEnGastoReal,
      facturaFile,
    });
  }

  async function handleTakePhoto() {
    if (!Capacitor.isNativePlatform()) {
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
          });
          setCameraStream(stream);
          return;
        } catch {
          cameraInputRef.current?.click();
          return;
        }
      }

      cameraInputRef.current?.click();
      return;
    }

    try {
      const photo = await Camera.getPhoto({
        allowEditing: false,
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (photo.dataUrl) {
        setFacturaFile(dataUrlToFile(photo.dataUrl, `factura-${Date.now()}.jpg`));
      }
    } catch (error) {
      if (/cancel/i.test(error?.message || "")) return;
      cameraInputRef.current?.click();
    }
  }

  function captureBrowserPhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setFacturaFile(new File([blob], `factura-${Date.now()}.jpg`, { type: "image/jpeg" }));
        }
        closeCameraPreview();
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <form className="stack-form" noValidate onSubmit={handleSubmit}>
      <FormField id="expenseDescripcion" label="Descripcion">
        <textarea
          id="expenseDescripcion"
          maxLength="500"
          minLength="2"
          onChange={(event) => updateField("descripcion", event.target.value)}
          required
          value={form.descripcion}
        />
      </FormField>

      <FormField id="expenseFecha" label="Fecha">
        <input
          id="expenseFecha"
          onChange={(event) => updateField("fecha", event.target.value)}
          type="date"
          value={form.fecha}
        />
      </FormField>

      <FormField id="expenseFactura" label="Factura">
        <input
          accept="image/*"
          capture="environment"
          hidden
          id="expenseFacturaCamera"
          onChange={(event) => setFacturaFile(event.target.files?.[0] || null)}
          ref={cameraInputRef}
          type="file"
        />
        <input
          accept="image/*,application/pdf"
          hidden
          id="expenseFacturaFile"
          onChange={(event) => setFacturaFile(event.target.files?.[0] || null)}
          ref={fileInputRef}
          type="file"
        />
        <div className="button-row">
          <Button onClick={handleTakePhoto} variant="secondary">
            Sacar foto
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
            Elegir archivo
          </Button>
        </div>
        {facturaFile ? (
          <small className="field-hint">Archivo seleccionado: {facturaFile.name}</small>
        ) : null}
        {expense?.facturaUrl ? (
          <FacturaLink className="text-link" url={expense.facturaUrl} />
        ) : null}
        <small className="field-hint">
          Opcional. Podes sacar una foto o adjuntar una imagen/PDF.
        </small>
        {cameraStream ? (
          <div className="camera-preview">
            <video autoPlay playsInline ref={videoRef} />
            <div className="button-row">
              <Button onClick={captureBrowserPhoto} variant="primary">
                Usar foto
              </Button>
              <Button onClick={closeCameraPreview} variant="secondary">
                Cancelar camara
              </Button>
            </div>
          </div>
        ) : null}
      </FormField>

      {isQuickMode ? (
        <div className="quick-expense-note">
          <strong>Lo podes completar despues</strong>
          <span>Si faltan monto, cuenta o categoria, el sistema lo guarda como pendiente.</span>
          <Button
            onClick={() => setShowAccountingFields((current) => !current)}
            variant="secondary"
          >
            {showAccountingFields ? "Ocultar detalles" : "Agregar detalles ahora"}
          </Button>
        </div>
      ) : null}

      {showAccountingFields ? (
        <>
          <div className="form-grid">
            <FormField id="expenseFlujo" label="Gasto bancario">
              <input
                inputMode="decimal"
                id="expenseFlujo"
                onChange={(event) =>
                  updateField("flujoBancario", event.target.value)
                }
                step="0.01"
                type="text"
                value={form.flujoBancario}
              />
            </FormField>
            <FormField id="expensePorcentaje" label="Porcentaje gasto real">
              <input
                inputMode="decimal"
                id="expensePorcentaje"
                max="100"
                min="0"
                onChange={(event) =>
                  updateField("porcentajeEconomiaReal", event.target.value)
                }
                step="0.01"
                type="text"
                value={form.porcentajeEconomiaReal}
              />
            </FormField>

            <FormField id="expenseEconomia" label="Gasto real">
              <input id="expenseEconomia" readOnly type="text" value={economiaReal} />
            </FormField>
          </div>

          <div className="form-grid">
            <FormField id="expenseCategoria" label="Subcategoria">
              <select
                id="expenseCategoria"
                onChange={(event) => updateField("categoria", event.target.value)}
                value={form.categoria}
              >
                <option value="">Seleccionar subcategoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria._id} value={categoria._id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="expenseCuenta" label="Cuenta">
              <select
                id="expenseCuenta"
                onChange={(event) => updateField("cuenta", event.target.value)}
                value={form.cuenta}
              >
                <option value="">Seleccionar cuenta</option>
                {cuentas.map((cuenta) => (
                  <option key={cuenta._id} value={cuenta._id}>
                    {cuenta.nombre}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="check-row">
            <label>
              <input
                checked={form.incluirEnGastoBancario}
                onChange={(event) =>
                  updateField("incluirEnGastoBancario", event.target.checked)
                }
                type="checkbox"
              />
              Incluir en gasto bancario
            </label>
            <label>
              <input
                checked={form.incluirEnGastoReal}
                onChange={(event) =>
                  updateField("incluirEnGastoReal", event.target.checked)
                }
                type="checkbox"
              />
              Incluir en gasto real
            </label>
          </div>
        </>
      ) : null}

      {formError ? (
        <div className="form-inline-error" role="alert">
          {formError}
        </div>
      ) : null}

      <div className="button-row button-row-end">
        {onCancel ? (
          <Button onClick={onCancel} variant="secondary">
            Cancelar
          </Button>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
