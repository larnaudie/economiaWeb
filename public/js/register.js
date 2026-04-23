const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  message.textContent = "";

  if (!username || !password || !confirmPassword) {
    message.textContent = "Todos los campos son obligatorios";
    return;
  }

  if (password !== confirmPassword) {
    message.textContent = "Las contraseñas no coinciden";
    return;
  }

  try {
    const data = await apiRequest("/auth/register", "POST", {
      username,
      password,
      confirmPassword
    });

    // 🔥 CLAVE: guardás sesión automáticamente
    saveAuth(data, username);

    // redirigís directo al sistema
    window.location.href = "index.html";

  } catch (error) {
    message.textContent = error.message || "Error en el registro";
  }
});