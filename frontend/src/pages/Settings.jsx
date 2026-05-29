import { useState } from "react";
import {
  ChevronDown,
  CircleUserRound,
  FileSpreadsheet,
  FolderPlus,
  Landmark,
  Palette,
} from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { PageLayout } from "../layout/PageLayout";
import { getUser, logout } from "../services/api";
import {
  defaultTheme,
  loadSavedTheme,
  resetTheme,
  saveTheme,
} from "../utils/theme";
import { showToast } from "../utils/toast";

const settingsLinks = [
  {
    description: "Bancos, cuentas, categorias principales y subcategorias.",
    href: "#/creaciones",
    icon: <FolderPlus size={18} />,
    title: "Creaciones",
  },
  {
    description: "Importa movimientos bancarios desde Excel.",
    href: "#/importar-excel",
    icon: <FileSpreadsheet size={18} />,
    title: "Importar Excel",
  },
  {
    description: "Carga movimientos personales desde planillas propias.",
    href: "#/importar-excel-personal",
    icon: <Landmark size={18} />,
    title: "Excel Personal",
  },
  {
    description: "Datos de usuario, foto y cuenta.",
    href: "#/perfil",
    icon: <CircleUserRound size={18} />,
    title: "Perfil",
  },
];

const themeFields = [
  { key: "background", label: "Fondo pagina" },
  { key: "shell", label: "Menu lateral" },
  { key: "accent", label: "Color principal" },
  { key: "primaryDark", label: "Color principal oscuro" },
  { key: "surface", label: "Superficie base" },
  { key: "surfaceSoft", label: "Superficie suave" },
  { key: "border", label: "Bordes" },
  { key: "cardFrom", label: "Tarjetas claro" },
  { key: "cardMiddle", label: "Tarjetas medio" },
  { key: "cardTo", label: "Tarjetas fondo" },
  { key: "text", label: "Texto principal" },
  { key: "muted", label: "Texto secundario" },
  { key: "success", label: "Exito / positivos" },
  { key: "danger", label: "Error / negativos" },
  { key: "warning", label: "Warning" },
];

export function Settings({ onLogout }) {
  const [draftTheme, setDraftTheme] = useState(() => loadSavedTheme());
  const [openPanel, setOpenPanel] = useState("");
  const user = getUser();

  function updateThemeField(key, value) {
    setDraftTheme((current) => ({ ...current, [key]: value }));
  }

  function handleApplyTheme() {
    const savedTheme = saveTheme(draftTheme);
    setDraftTheme(savedTheme);
    showToast({
      message: "El tema quedo aplicado en este navegador.",
      title: "Theme guardado",
      type: "success",
    });
  }

  function handleResetTheme() {
    const nextTheme = resetTheme();
    setDraftTheme(nextTheme);
    showToast({
      message: "Volvimos a los colores base de Economia Web.",
      title: "Theme restablecido",
      type: "info",
    });
  }

  return (
    <PageLayout
      onLogout={() => {
        logout();
        onLogout?.();
      }}
      subtitle="Ajusta la apariencia y accede a las herramientas administrativas."
      title="Settings"
      user={user}
    >
      <Card className="settings-hub-card" title="Opciones">
        <div className="settings-options-list">
          <button
            className={`settings-option-card ${openPanel === "theme" ? "active" : ""}`}
            onClick={() =>
              setOpenPanel((current) => (current === "theme" ? "" : "theme"))
            }
            type="button"
          >
            <span className="settings-option-icon" aria-hidden="true">
              <Palette size={18} />
            </span>
            <span>
              <strong>Theme</strong>
              <small>Colores, fondos y previsualizacion antes de aplicar.</small>
            </span>
            <ChevronDown className="settings-option-chevron" size={18} />
          </button>

          {openPanel === "theme" ? (
            <div className="settings-panel">
              <div className="theme-editor-grid">
                {themeFields.map((field) => (
                  <FormField id={`theme-${field.key}`} key={field.key} label={field.label}>
                    <div className="theme-color-input">
                      <input
                        id={`theme-${field.key}`}
                        onChange={(event) => updateThemeField(field.key, event.target.value)}
                        type="color"
                        value={draftTheme[field.key] || defaultTheme[field.key]}
                      />
                      <input
                        aria-label={`${field.label} hex`}
                        onChange={(event) => updateThemeField(field.key, event.target.value)}
                        value={draftTheme[field.key] || defaultTheme[field.key]}
                      />
                    </div>
                  </FormField>
                ))}
              </div>

              <ThemePreview theme={draftTheme} />

              <div className="button-row button-row-end">
                <Button onClick={handleResetTheme} variant="secondary">
                  Restablecer
                </Button>
                <Button onClick={handleApplyTheme}>Aplicar theme</Button>
              </div>
            </div>
          ) : null}

          {settingsLinks.map((item) => (
            <a className="settings-option-card" href={item.href} key={item.href}>
              <span className="settings-option-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
            </a>
          ))}
        </div>
      </Card>
    </PageLayout>
  );
}

function ThemePreview({ theme }) {
  return (
    <div
      className="theme-preview"
      style={{
        "--preview-accent": theme.accent,
        "--preview-bg": theme.background,
        "--preview-border": theme.border,
        "--preview-card-from": theme.cardFrom,
        "--preview-card-middle": theme.cardMiddle,
        "--preview-card-to": theme.cardTo,
        "--preview-danger": theme.danger,
        "--preview-muted": theme.muted,
        "--preview-shell": theme.shell,
        "--preview-surface": theme.surface,
        "--preview-success": theme.success,
        "--preview-text": theme.text,
      }}
    >
      <aside>
        <span>EW</span>
        <strong>Menu</strong>
      </aside>
      <main>
        <article>
          <small>Preview</small>
          <strong>Tarjeta de ejemplo</strong>
          <p>Asi se verian las cards y los fondos principales.</p>
          <div className="theme-preview-statuses">
            <span>Creado</span>
            <span>-$ 120</span>
          </div>
          <button type="button">Accion</button>
        </article>
      </main>
    </div>
  );
}
