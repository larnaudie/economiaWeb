const THEME_STORAGE_KEY = "economiaWebTheme";

export const defaultTheme = {
  accent: "#0f766e",
  background: "#061b1d",
  cardFrom: "#f2fffb",
  cardMiddle: "#e2f7f0",
  cardTo: "#d3eee7",
  shell: "#062527",
  text: "#111827",
};

const variableMap = {
  accent: ["--primary", "--accent"],
  background: ["--bg"],
  cardFrom: ["--theme-card-from"],
  cardMiddle: ["--theme-card-middle"],
  cardTo: ["--theme-card-to"],
  shell: ["--shell"],
  text: ["--text"],
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
