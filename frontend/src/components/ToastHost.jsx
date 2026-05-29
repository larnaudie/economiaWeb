import { useEffect, useState } from "react";

const toastLabels = {
  success: "Listo",
  error: "Atencion",
  warning: "Revisar",
  info: "Info",
};

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function handleToast(event) {
      const toast = event.detail;
      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, toast.duration || 4200);
    }

    window.addEventListener("app-toast", handleToast);
    return () => window.removeEventListener("app-toast", handleToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article className={`toast toast-${toast.type || "info"}`} key={toast.id}>
          <strong>{toast.title || toastLabels[toast.type] || toastLabels.info}</strong>
          <span>{toast.message}</span>
        </article>
      ))}
    </div>
  );
}
