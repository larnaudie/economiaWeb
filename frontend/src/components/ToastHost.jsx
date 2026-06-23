import { useEffect, useState } from "react";
import { X } from "lucide-react";

const toastLabels = {
  success: "Listo",
  error: "Atencion",
  warning: "Revisar",
  info: "Info",
};

export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  function removeToast(id) {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, exiting: true } : toast,
      ),
    );

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 300);
  }

  useEffect(() => {
    function handleToast(event) {
      const toast = event.detail;
      setToasts((current) => [...current, toast]);

      window.setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration || 4200);
    }

    window.addEventListener("app-toast", handleToast);
    return () => window.removeEventListener("app-toast", handleToast);
  }, []);

  if (!toasts.length) return null;

  function handleAction(toast) {
    if (!toast.actionTarget) return;
    window.location.hash = toast.actionTarget;
    removeToast(toast.id);
  }

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <article
          className={`toast toast-${toast.type || "info"} ${toast.exiting ? "toast-exiting" : ""}`}
          key={toast.id}
        >
          <div className="toast-content">
            <strong>{toast.title || toastLabels[toast.type] || toastLabels.info}</strong>
            <span>{toast.message}</span>
            {toast.actionLabel && toast.actionTarget ? (
              <button
                className="toast-action"
                onClick={() => handleAction(toast)}
                type="button"
              >
                {toast.actionLabel}
              </button>
            ) : null}
          </div>
          <button
            aria-label="Cerrar mensaje"
            className="toast-close"
            onClick={() => removeToast(toast.id)}
            type="button"
          >
            <X size={14} />
          </button>
        </article>
      ))}
    </div>
  );
}
