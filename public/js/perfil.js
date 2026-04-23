requireAuth();

const token = getToken();
const logoutButton = document.getElementById("logoutButton");
const perfilForm = document.getElementById("perfilForm");
const perfilError = document.getElementById("perfilError");
const perfilSuccess = document.getElementById("perfilSuccess");

function getAuthToken() {
  if (!token) {
    window.location.href = "login.html";
    return null;
  }
  return token;
}

async function cargarPerfil() {
  const authToken = getAuthToken();
  if (!authToken) return;

  try {
    const data = await apiRequest("/usuarios/me", "GET", null, authToken);

    document.getElementById("username").value = data.usuario?.username || "";
    document.getElementById("email").value = data.usuario?.email || "";
  } catch (error) {
    perfilError.textContent = error.message || "No se pudo cargar el perfil";
  }
}

function formatearFecha(fecha) {
  const d = new Date(fecha);

  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

perfilForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const authToken = getAuthToken();
  if (!authToken) return;

  perfilError.textContent = "";
  perfilSuccess.textContent = "";

  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (password || confirmPassword) {
    if (password.length < 6) {
      perfilError.textContent = "La nueva contraseña debe tener al menos 6 caracteres.";
      return;
    }

    if (password !== confirmPassword) {
      perfilError.textContent = "Las contraseñas no coinciden.";
      return;
    }
  }

  const data = {
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("email").value.trim()
  };

  if (password) {
    data.password = password;
    data.confirmPassword = confirmPassword;
  }

  try {
    const result = await apiRequest("/usuarios/me", "PATCH", data, authToken);

    perfilSuccess.textContent = "Perfil actualizado correctamente";

    const currentUser = getUser() || {};
    currentUser.username = result.usuario?.username || data.username;
    localStorage.setItem("user", JSON.stringify(currentUser));

    perfilForm.reset();
    await cargarPerfil();
  } catch (error) {
    perfilError.textContent = error.message || "Error al guardar perfil";
    perfilSuccess.textContent = "";
  }
});

logoutButton.addEventListener("click", logout);

document.addEventListener("DOMContentLoaded", async () => {
  await cargarPerfil();
});