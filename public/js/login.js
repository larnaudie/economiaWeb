const token = getToken();

if (token) {
  window.location.href = "index.html";
}

const form = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  errorMessage.textContent = "";

  if (!username || !password) {
    errorMessage.textContent = "Todos los campos son obligatorios";
    return;
  }

  try {
    const result = await apiRequest("/auth/login", "POST", {
      username,
      password
    });

    saveAuth(result, username);
    window.location.href = "index.html";
  } catch (error) {
    errorMessage.textContent = error.message || "Error en el login";
  }
});