const API_URL = import.meta.env.VITE_API_URL || "/v1";

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export function saveAuth(data, user) {
  if (data?.token) {
    localStorage.setItem("token", data.token);
  }

  localStorage.setItem(
    "user",
    JSON.stringify({
      id: user?._id || user?.id || data?.id || null,
      username: user?.username || data?.username || "",
      email: user?.email || "",
      fotoPerfilUrl:
        user?.fotoPerfilUrl || "/imagenes/imagenes-web/perfil/default-avatar.png",
      rol: user?.rol || data?.rol || "user",
    }),
  );
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getApiData(response) {
  return response?.data ?? response;
}

export async function apiRequest(endpoint, options = {}) {
  const { method = "GET", body, token = getToken() } = options;

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con la API. Verifica que el backend este corriendo.",
    );
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    throw new Error("Sesion expirada o invalida");
  }

  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP ${response.status}`);
  }

  return data;
}

export async function uploadApiFile(endpoint, fieldName, file, options = {}) {
  const { token = getToken() } = options;
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append(fieldName, file);

  let response;

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw new Error(
      "No se pudo conectar con la API. Verifica que el backend este corriendo.",
    );
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    throw new Error("Sesion expirada o invalida");
  }

  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP ${response.status}`);
  }

  return data;
}
