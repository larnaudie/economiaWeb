const THEME_STORAGE_KEY = "economiaWebTheme";

export const defaultTheme = {
  accent: "#0f766e",
  background: "#061b1d",
  border: "#e2e8ee",
  cardFrom: "#f2fffb",
  cardMiddle: "#e2f7f0",
  cardTo: "#d3eee7",
  danger: "#d43f3f",
  muted: "#667085",
  primaryDark: "#0b5f59",
  shell: "#062527",
  surface: "#ffffff",
  surfaceSoft: "#f3f7f8",
  success: "#138a5b",
  text: "#111827",
  warning: "#facc15",
};

const variableMap = {
  accent: ["--primary", "--accent"],
  background: ["--bg"],
  border: ["--border"],
  cardFrom: ["--theme-card-from"],
  cardMiddle: ["--theme-card-middle"],
  cardTo: ["--theme-card-to"],
  danger: ["--danger"],
  muted: ["--muted"],
  primaryDark: ["--primary-dark"],
  shell: ["--shell"],
  surface: ["--surface", "--surface-strong"],
  surfaceSoft: ["--surface-soft"],
  success: ["--success"],
  text: ["--text"],
  warning: ["--warning"],
};

export function loadSavedTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved ? { ...defaultTheme, ...JSON.parse(saved) } : defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export function applyTheme(theme) {
  const nextTheme = { ...defaultTheme, ...theme };

  Object.entries(variableMap).forEach(([key, variables]) => {
    variables.forEach((variable) => {
      document.documentElement.style.setProperty(variable, nextTheme[key]);
    });
  });

  return nextTheme;
}

export function saveTheme(theme) {
  const nextTheme = applyTheme(theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(nextTheme));
  window.dispatchEvent(new CustomEvent("theme-change", { detail: nextTheme }));
  return nextTheme;
}

export function resetTheme() {
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  applyTheme(defaultTheme);
  window.dispatchEvent(new CustomEvent("theme-change", { detail: defaultTheme }));
  return defaultTheme;
}
