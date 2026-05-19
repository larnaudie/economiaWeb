import { useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { apiRequest, getApiData, saveAuth } from "../services/api";

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
