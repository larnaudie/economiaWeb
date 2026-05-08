const API_URL = "/v1";

async function apiRequest(endpoint, method = "GET", body = null, token = null) {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Error HTTP ${response.status}`);
  }

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
    throw new Error("Sesión expirada o inválida");
  }

  if (!response.ok) {
    throw new Error(data.message || "Error en la petición");
  }

  return data;
}