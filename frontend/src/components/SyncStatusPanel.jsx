import { useEffect, useRef, useState } from "react";
import { CloudUpload, Database, RefreshCw } from "lucide-react";
import { ensureLocalDatabase, getLocalSyncSummary } from "../services/localDb";
import { remoteApiRequest, remoteUploadApiFile } from "../services/api";
import { pullCloudDataToLocal, syncLocalChangesToCloud } from "../services/localFirstApi";
import { showToast } from "../utils/toast";

const PULL_BACKOFF_KEY = "localPullBackoffUntil";
const PULL_INTERVAL_MS = 15 * 60 * 1000;
const MIN_PULL_GAP_MS = 2 * 60 * 1000;
const RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;

const initialSummary = {
  lastSyncAt: null,
  localDbReady: false,
  pendingCount: 0,
};

function formatLastSync(value) {
  if (!value) return "Nunca sincronizado";
  return new Date(value).toLocaleString("es-UY", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

export function SyncStatusPanel() {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const backoffUntilRef = useRef(
    Number(window.localStorage.getItem(PULL_BACKOFF_KEY) || 0),
  );
  const lastPullAtRef = useRef(0);

  async function refreshSummary() {
    try {
      const nextSummary = await getLocalSyncSummary();
      setSummary(nextSummary);
    } catch {
      setSummary(initialSummary);
    }
  }

  async function pullCloudChanges() {
    const now = Date.now();
    if (now < backoffUntilRef.current) return;
    if (now - lastPullAtRef.current < MIN_PULL_GAP_MS) return;
    lastPullAtRef.current = now;

    try {
      await ensureLocalDatabase();
      const result = await pullCloudDataToLocal(remoteApiRequest);
      await refreshSummary();
      if (result.changed > 0) {
        window.dispatchEvent(new CustomEvent("local-data-pulled"));
      }
    } catch (error) {
      if (error?.status === 429 || /demasiad|too many/i.test(error?.message || "")) {
        backoffUntilRef.current = Date.now() + RATE_LIMIT_BACKOFF_MS;
        window.localStorage.setItem(PULL_BACKOFF_KEY, String(backoffUntilRef.current));
      }
      // Pull is intentionally quiet: local work should continue even if cloud is unavailable.
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        await ensureLocalDatabase();
        await refreshSummary();
      } catch {
        setSummary(initialSummary);
      }
    }, 0);

    const intervalId = window.setInterval(pullCloudChanges, PULL_INTERVAL_MS);

    function handleFocus() {
      pullCloudChanges();
    }

    window.addEventListener("local-sync-change", refreshSummary);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("local-sync-change", refreshSummary);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  async function handleSyncClick() {
    setLoading(true);
    try {
      await ensureLocalDatabase();
      const result = await syncLocalChangesToCloud(remoteApiRequest, remoteUploadApiFile);
      await refreshSummary();
      showToast({
        title: result.failed ? "Sync con advertencias" : "Sync completado",
        message: `Subidos: ${result.synced}. Limpiados: ${result.cleaned || 0}. Descargados: ${result.downloaded}. Errores: ${result.failed}.`,
        type: result.failed ? "warning" : "success",
      });
    } finally {
      setLoading(false);
    }
  }

  function goToLocalData() {
    window.location.hash = "#/datos-locales";
  }

  function handlePanelKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button")) return;
    event.preventDefault();
    goToLocalData();
  }

  return (
    <section
      className="sync-status-panel sync-status-panel-clickable"
      aria-label="Ver datos guardados localmente"
      onClick={goToLocalData}
      onKeyDown={handlePanelKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="sync-status-header">
        <span className="sync-status-icon" aria-hidden="true">
          <Database size={15} />
        </span>
        <div>
          <strong>Datos Guardados Localmente</strong>
        </div>
      </div>

      <div className="sync-status-grid">
        <span>Pendientes</span>
        <strong>{summary.pendingCount}</strong>
        <span>Ultimo sync</span>
        <strong>{formatLastSync(summary.lastSyncAt)}</strong>
      </div>

      <button
        className="sync-status-button"
        disabled={loading}
        onClick={(event) => {
          event.stopPropagation();
          handleSyncClick();
        }}
        type="button"
      >
        {loading ? <RefreshCw size={14} /> : <CloudUpload size={14} />}
        <span>{loading ? "Revisando..." : "Sync nube"}</span>
      </button>
    </section>
  );
}
