export function showToast({ message, title = "", type = "info", duration = 4200 }) {
  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: {
        duration,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        title,
        type,
      },
    }),
  );
}
