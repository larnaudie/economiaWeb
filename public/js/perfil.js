requireAuth();
renderHeader({ title: "Perfil" });

const token = getToken();

const perfilForm = document.getElementById("perfilForm");
const perfilError = document.getElementById("perfilError");
const perfilSuccess = document.getElementById("perfilSuccess");

const perfilAvatarPreview = document.getElementById("perfilAvatarPreview");
const perfilImagenInput = document.getElementById("perfilImagenInput");
const subirFotoPerfilBtn = document.getElementById("subirFotoPerfilBtn");

const fotoPerfilError = document.getElementById("fotoPerfilError");
const fotoPerfilSuccess = document.getElementById("fotoPerfilSuccess");

const cropperModal = document.getElementById("cropperModal");
const cropperImage = document.getElementById("cropperImage");
const confirmarCropBtn = document.getElementById("confirmarCropBtn");
const cancelarCropBtn = document.getElementById("cancelarCropBtn");

let cropper = null;
let croppedImageBlob = null;

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

    const usuario = getApiData(data);

    document.getElementById("username").value = usuario?.username || "";
    document.getElementById("email").value = usuario?.email || "";

    perfilAvatarPreview.src =
      usuario?.fotoPerfilUrl ||
      "/imagenes/imagenes-web/perfil/default-avatar.png";

    const currentUser = getUser() || {};

    currentUser.username = usuario?.username || currentUser.username;
    currentUser.email = usuario?.email || currentUser.email;
    currentUser.fotoPerfilUrl =
      usuario?.fotoPerfilUrl || currentUser.fotoPerfilUrl;

    localStorage.setItem("user", JSON.stringify(currentUser));

    const headerAvatar = document.getElementById("headerAvatar");
    if (headerAvatar) {
      headerAvatar.src =
        currentUser.fotoPerfilUrl ||
        "/imagenes/imagenes-web/perfil/default-avatar.png";
    }
  } catch (error) {
    perfilError.textContent = error.message || "No se pudo cargar el perfil";
  }
}

perfilImagenInput?.addEventListener("change", () => {
  const file = perfilImagenInput.files?.[0];

  fotoPerfilError.textContent = "";
  fotoPerfilSuccess.textContent = "";
  croppedImageBlob = null;

  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    fotoPerfilError.textContent = "La imagen no puede superar los 5MB.";
    perfilImagenInput.value = "";
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    fotoPerfilError.textContent = "Solo se permiten imágenes JPG, PNG o WEBP.";
    perfilImagenInput.value = "";
    return;
  }

  const objectUrl = URL.createObjectURL(file);

  cropperModal.classList.remove("hidden");

  if (cropper) {
    cropper.destroy();
    cropper = null;
  }

  cropperImage.onload = () => {
    cropper = new Cropper(cropperImage, {
      aspectRatio: 1,
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 0.8,
      background: false,
      responsive: true,
      guides: true,
      center: true,
      cropBoxResizable: true,
      cropBoxMovable: true,
    });
  };

  cropperImage.src = objectUrl;
});

cancelarCropBtn?.addEventListener("click", () => {
  cropperModal.classList.add("hidden");
  perfilImagenInput.value = "";
  croppedImageBlob = null;

  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
});

confirmarCropBtn?.addEventListener("click", () => {
  if (!cropper) return;

  const canvas = cropper.getCroppedCanvas({
    width: 400,
    height: 400,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        fotoPerfilError.textContent = "No se pudo recortar la imagen.";
        return;
      }

      croppedImageBlob = blob;
      perfilAvatarPreview.src = URL.createObjectURL(blob);

      cropperModal.classList.add("hidden");

      cropper.destroy();
      cropper = null;
    },
    "image/webp",
    0.9,
  );
});

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
  const confirmPassword = document
    .getElementById("confirmPassword")
    .value.trim();

  if (password || confirmPassword) {
    if (password.length < 6) {
      perfilError.textContent =
        "La nueva contraseña debe tener al menos 6 caracteres.";
      return;
    }

    if (password !== confirmPassword) {
      perfilError.textContent = "Las contraseñas no coinciden.";
      return;
    }
  }

  const data = {
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("email").value.trim(),
  };

  if (password) {
    data.password = password;
    data.confirmPassword = confirmPassword;
  }

  try {
    const result = await apiRequest("/usuarios/me", "PATCH", data, authToken);

    perfilSuccess.textContent = "Perfil actualizado correctamente";

    const currentUser = getUser() || {};
    const usuarioActualizado = getApiData(result);

    currentUser.username = usuarioActualizado?.username || data.username;
    currentUser.email = usuarioActualizado?.email || data.email;
    currentUser.fotoPerfilUrl =
      usuarioActualizado?.fotoPerfilUrl || currentUser.fotoPerfilUrl;
    localStorage.setItem("user", JSON.stringify(currentUser));

    perfilForm.reset();
    await cargarPerfil();
  } catch (error) {
    perfilError.textContent = error.message || "Error al guardar perfil";
    perfilSuccess.textContent = "";
  }
});

subirFotoPerfilBtn?.addEventListener("click", async () => {
  try {
    fotoPerfilError.textContent = "";
    fotoPerfilSuccess.textContent = "";

    const file = croppedImageBlob;

    if (!file) {
      fotoPerfilError.textContent = "Seleccioná y recortá una imagen.";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      fotoPerfilError.textContent = "La imagen no puede superar los 5MB.";
      return;
    }

    const authToken = getAuthToken();

    const formData = new FormData();
    formData.append("imagen", file, "perfil.webp");

    const response = await fetch("/v1/uploads/perfil", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Error al subir imagen");
    }

    const currentUser = getUser() || {};

    currentUser.fotoPerfilUrl = result.data.fotoPerfilUrl;

    localStorage.setItem("user", JSON.stringify(currentUser));

    perfilAvatarPreview.src = result.data.fotoPerfilUrl;
    const headerAvatar = document.getElementById("headerAvatar");
    if (headerAvatar) {
      headerAvatar.src = result.data.fotoPerfilUrl;
    }

    fotoPerfilSuccess.textContent = "Foto de perfil actualizada correctamente.";
  } catch (error) {
    fotoPerfilError.textContent = error.message || "Error al subir imagen.";
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await cargarPerfil();
});
