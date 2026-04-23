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

  if (!response.ok) {
    let errorMessage =
      data.message ||
      data.mensaje ||
      `Error HTTP ${response.status}`;

    if (Array.isArray(data.error) && data.error.length > 0) {
      errorMessage = data.error.map(err => err.message).join(", ");
    }

    throw new Error(errorMessage);
  }

  return data;
}