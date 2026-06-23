export function showToast({
  actionLabel = "",
  actionTarget = "",
  duration = 4200,
  message,
  title = "",
  type = "info",
}) {
  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: {
        actionLabel,
        actionTarget,
        duration,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        title,
        type,
      },
    }),
  );
}
