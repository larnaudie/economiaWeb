import { useEffect, useState } from "react";
import { CloudUpload, Database, RefreshCw } from "lucide-react";
import { ensureLocalDatabase, getLocalSyncSummary } from "../services/localDb";
import { remoteApiRequest, remoteUploadApiFile } from "../services/api";
import { pullCloudDataToLocal, syncLocalChangesToCloud } from "../services/localFirstApi";
import { showToast } from "../utils/toast";

const PULL_BACKOFF_KEY = "localPullBackoffUntil";
const MIN_PULL_GAP_MS = 2 * 60 * 1000;
const RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;

let globalLastPullAt = 0;
let globalPullPromise = null;

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

  async function refreshSummary() {
    try {
      const nextSummary = await getLocalSyncSummary();
      setSummary(nextSummary);
    } catch {
      setSummary(initialSummary);
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

    window.addEventListener("local-sync-change", refreshSummary);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("local-sync-change", refreshSummary);
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

export async function pullCloudChangesOnce({ force = false } = {}) {
  const now = Date.now();
  const backoffUntil = Number(window.localStorage.getItem(PULL_BACKOFF_KEY) || 0);
  if (!force && now < backoffUntil) return { changed: 0, downloaded: 0, skipped: true };
  if (!force && now - globalLastPullAt < MIN_PULL_GAP_MS) {
    return { changed: 0, downloaded: 0, skipped: true };
  }
  if (globalPullPromise) return globalPullPromise;

  globalLastPullAt = now;
  globalPullPromise = (async () => {
    await ensureLocalDatabase();
    const result = await pullCloudDataToLocal(remoteApiRequest);
    if (result.changed > 0) {
      window.dispatchEvent(new CustomEvent("local-data-pulled"));
    }
    return result;
  })();

  try {
    return await globalPullPromise;
  } catch (error) {
    if (error?.status === 429 || /demasiad|too many/i.test(error?.message || "")) {
      window.localStorage.setItem(PULL_BACKOFF_KEY, String(Date.now() + RATE_LIMIT_BACKOFF_MS));
    }
    throw error;
  } finally {
    globalPullPromise = null;
  }
}
