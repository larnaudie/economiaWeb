import { useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { apiRequest, getApiData, saveAuth } from "../services/api";
import { pullCloudChangesOnce } from "../components/SyncStatusPanel";
import { showToast } from "../utils/toast";

export function Login({ onAuthenticated, onGoToRegister }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const auth = await apiRequest("/auth/login", {
        method: "POST",
        body: { username: username.trim(), password },
        token: null,
      });

      const perfilResponse = await apiRequest("/usuarios/me", {
        token: auth.token,
      });
      const usuario = getApiData(perfilResponse);

      saveAuth(auth, usuario);
      try {
        const syncResult = await pullCloudChangesOnce({ force: true });
        showToast({
          title: "Datos descargados",
          message: `Se revisaron ${syncResult.downloaded || 0} dato(s) de la nube.`,
          type: "success",
        });
      } catch {
        showToast({
          title: "Modo local listo",
          message: "No se pudo descargar la nube ahora. Podes seguir usando datos locales.",
          type: "warning",
        });
      }
      onAuthenticated?.();
    } catch (requestError) {
      setError(requestError.message || "Error en el login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card" title="Ingresar a Economia Web">
        <p>Usa el mismo usuario de la aplicacion actual.</p>

        {error ? (
          <Alert tone="error" title="No pudimos iniciar sesion" message={error} />
        ) : null}

        <form className="stack-form" onSubmit={handleSubmit}>
          <FormField id="loginUsername" label="Usuario">
            <input
              autoComplete="username"
              id="loginUsername"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </FormField>

          <FormField id="loginPassword" label="Contrasena">
            <input
              autoComplete="current-password"
              id="loginPassword"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </FormField>

          <Button disabled={loading} type="submit">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>

        <button className="text-button" onClick={onGoToRegister} type="button">
          Crear usuario nuevo
        </button>
      </Card>
    </main>
  );
}
