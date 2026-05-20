import { useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { apiRequest, saveAuth } from "../services/api";

export function Register({ onAuthenticated, onGoToLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const auth = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          username: username.trim(),
          password,
          confirmPassword,
          codigo: codigo.trim(),
        },
        token: null,
      });

      saveAuth(auth, auth);
      onAuthenticated?.();
    } catch (requestError) {
      setError(requestError.message || "Error en el registro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Card className="auth-card" title="Crear cuenta">
        <p>Registrate y entra directo a tu Dashboard.</p>

        {error ? (
          <Alert tone="error" title="No pudimos registrar" message={error} />
        ) : null}

        <form className="stack-form" onSubmit={handleSubmit}>
          <FormField id="registerUsername" label="Usuario">
            <input
              autoComplete="username"
              id="registerUsername"
              minLength="3"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </FormField>

          <FormField id="registerPassword" label="Contrasena">
            <input
              autoComplete="new-password"
              id="registerPassword"
              minLength="6"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </FormField>

          <FormField id="registerConfirmPassword" label="Confirmar contrasena">
            <input
              autoComplete="new-password"
              id="registerConfirmPassword"
              minLength="6"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </FormField>

          <FormField
            hint="Solo si estas creando el primer admin."
            id="registerCodigo"
            label="Codigo admin"
          >
            <input
              id="registerCodigo"
              onChange={(event) => setCodigo(event.target.value)}
              value={codigo}
            />
          </FormField>

          <Button disabled={loading} type="submit">
            {loading ? "Creando..." : "Crear cuenta"}
          </Button>
        </form>

        <button className="text-button" onClick={onGoToLogin} type="button">
          Ya tengo usuario
        </button>
      </Card>
    </main>
  );
}
