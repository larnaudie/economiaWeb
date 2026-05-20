import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "../components/Alert";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { FormField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { PageLayout } from "../layout/PageLayout";
import { apiRequest, getApiData, getToken, getUser, logout, saveAuth } from "../services/api";

const defaultAvatar = "/imagenes/imagenes-web/perfil/default-avatar.png";

export function Profile({ onLogout }) {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fotoPerfilUrl: defaultAvatar,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [croppedFile, setCroppedFile] = useState(null);
  const [cropSourceUrl, setCropSourceUrl] = useState("");
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, size: 180 });
  const [previewUrl, setPreviewUrl] = useState(defaultAvatar);
  const [status, setStatus] = useState({ type: "", title: "", message: "" });
  const fileInputRef = useRef(null);
  const cropFrameRef = useRef(null);
  const cropImageRef = useRef(null);
  const dragStateRef = useRef(null);
  const user = getUser();

  const loadProfile = useCallback(async () => {
    try {
      const response = await apiRequest("/usuarios/me");
      const usuario = getApiData(response);
      const nextProfile = {
        username: usuario?.username || "",
        email: usuario?.email || "",
        password: "",
        confirmPassword: "",
        fotoPerfilUrl: usuario?.fotoPerfilUrl || defaultAvatar,
      };
      setProfile(nextProfile);
      setPreviewUrl(nextProfile.fotoPerfilUrl);
      saveAuth({ token: getToken(), rol: usuario?.rol }, usuario);
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo cargar perfil",
        message: error.message,
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadProfile, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProfile]);

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setStatus({
        type: "error",
        title: "Imagen demasiado grande",
        message: "La imagen no puede superar los 5MB.",
      });
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setStatus({
        type: "error",
        title: "Formato no permitido",
        message: "Solo se permiten imagenes JPG, PNG o WEBP.",
      });
      return;
    }

    setSelectedFile(file);
    setCroppedFile(null);
    setCropBox({ x: 0, y: 0, size: 180 });
    setCropSourceUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return URL.createObjectURL(file);
    });
  }

  function closeCropper() {
    setCropSourceUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return "";
    });
    setSelectedFile(null);
    setCroppedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function confirmCrop() {
    if (!selectedFile) return;

    try {
      const cropSourceBox = getCropSourceBox();
      const { blob, url } = await cropImageToSquare(selectedFile, cropSourceBox);
      setCroppedFile(blob);
      setPreviewUrl(url);
      setCropSourceUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return "";
      });
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo recortar",
        message: error.message,
      });
    }
  }

  function getCropSourceBox() {
    const bounds = getCropBounds();
    const image = cropImageRef.current;

    if (!bounds || !image) {
      throw new Error("No se pudo leer el area de recorte.");
    }

    const scaleX = image.naturalWidth / bounds.width;
    const scaleY = image.naturalHeight / bounds.height;
    const sourceX = Math.max(0, (cropBox.x - bounds.x) * scaleX);
    const sourceY = Math.max(0, (cropBox.y - bounds.y) * scaleY);
    const sourceSize = Math.min(cropBox.size * scaleX, cropBox.size * scaleY);

    return {
      sourceX,
      sourceY,
      sourceSize,
    };
  }

  function getCropBounds() {
    const frame = cropFrameRef.current?.getBoundingClientRect();
    const image = cropImageRef.current?.getBoundingClientRect();

    if (!frame || !image) return null;

    return {
      x: image.left - frame.left,
      y: image.top - frame.top,
      width: image.width,
      height: image.height,
    };
  }

  function clampCropBox(nextBox) {
    const bounds = getCropBounds();
    if (!bounds) return nextBox;

    const maxSize = Math.min(bounds.width, bounds.height);
    const size = Math.min(Math.max(nextBox.size, 72), maxSize);
    const x = Math.min(
      Math.max(nextBox.x, bounds.x),
      bounds.x + bounds.width - size,
    );
    const y = Math.min(
      Math.max(nextBox.y, bounds.y),
      bounds.y + bounds.height - size,
    );

    return { x, y, size };
  }

  function resetCropBox() {
    const bounds = getCropBounds();
    if (!bounds) return;

    const size = Math.min(bounds.width, bounds.height) * 0.72;
    setCropBox({
      x: bounds.x + (bounds.width - size) / 2,
      y: bounds.y + (bounds.height - size) / 2,
      size,
    });
  }

  function handleCropImageLoad() {
    window.requestAnimationFrame(resetCropBox);
  }

  function handleCropBoxPointerDown(event, mode) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originBox: cropBox,
    };
  }

  function handleCropBoxPointerMove(event) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (dragState.mode === "resize") {
      const nextSize = Math.max(
        dragState.originBox.size + Math.max(deltaX, deltaY),
        72,
      );
      setCropBox(clampCropBox({ ...dragState.originBox, size: nextSize }));
      return;
    }

    setCropBox(
      clampCropBox({
        ...dragState.originBox,
        x: dragState.originBox.x + deltaX,
        y: dragState.originBox.y + deltaY,
      }),
    );
  }

  function handleCropBoxPointerUp(event) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setStatus({ type: "", title: "", message: "" });

    if (profile.password || profile.confirmPassword) {
      if (profile.password.length < 6) {
        setStatus({
          type: "error",
          title: "Password invalida",
          message: "La nueva contrasena debe tener al menos 6 caracteres.",
        });
        return;
      }

      if (profile.password !== profile.confirmPassword) {
        setStatus({
          type: "error",
          title: "Passwords distintos",
          message: "Las contrasenas no coinciden.",
        });
        return;
      }
    }

    try {
      const payload = {
        username: profile.username.trim(),
        email: profile.email.trim(),
      };

      if (profile.password) {
        payload.password = profile.password;
        payload.confirmPassword = profile.confirmPassword;
      }

      const response = await apiRequest("/usuarios/me", {
        method: "PATCH",
        body: payload,
      });
      const updated = getApiData(response);
      saveAuth({ token: getToken(), rol: updated?.rol }, updated || payload);
      setStatus({
        type: "success",
        title: "Perfil actualizado",
        message: "Los cambios se guardaron correctamente.",
      });
      await loadProfile();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo guardar",
        message: error.message,
      });
    }
  }

  async function handleUploadPhoto() {
    const fileToUpload = croppedFile || selectedFile;

    if (!fileToUpload) {
      setStatus({
        type: "error",
        title: "Sin imagen",
        message: "Selecciona una imagen primero.",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("imagen", fileToUpload, "perfil.webp");

      const response = await fetch("/v1/uploads/perfil", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al subir imagen");

      const currentUser = getUser() || {};
      saveAuth(
        { token: getToken(), rol: currentUser.rol },
        { ...currentUser, fotoPerfilUrl: result.data.fotoPerfilUrl },
      );
      setPreviewUrl(result.data.fotoPerfilUrl);
      setProfile((current) => ({
        ...current,
        fotoPerfilUrl: result.data.fotoPerfilUrl,
      }));
      setStatus({
        type: "success",
        title: "Foto actualizada",
        message: "La foto de perfil se actualizo correctamente.",
      });
      setSelectedFile(null);
      setCroppedFile(null);
      await loadProfile();
    } catch (error) {
      setStatus({
        type: "error",
        title: "No se pudo subir imagen",
        message: error.message,
      });
    }
  }

  return (
    <PageLayout
      onLogout={() => {
        logout();
        onLogout?.();
      }}
      subtitle="Datos de usuario y foto de perfil."
      title="Perfil"
      user={user}
    >
      {status.message ? (
        <Alert message={status.message} title={status.title} tone={status.type} />
      ) : null}

      <section className="dashboard-grid">
        <Card title="Foto de perfil">
          <div className="profile-photo-panel">
            <img alt="Foto de perfil" src={previewUrl || defaultAvatar} />
            <input
              accept="image/png,image/jpeg,image/webp"
              ref={fileInputRef}
              onChange={handleFileChange}
              type="file"
            />
            <p>
              Selecciona una imagen, ajusta el recorte cuadrado y luego subela.
            </p>
            <Button onClick={handleUploadPhoto} variant="secondary">
              Subir foto
            </Button>
          </div>
        </Card>

        <Card title="Editar mi perfil">
          <form className="stack-form" onSubmit={handleSave}>
            <FormField id="profileUsername" label="Nombre de usuario">
              <input
                id="profileUsername"
                maxLength="30"
                minLength="3"
                onChange={(event) => updateField("username", event.target.value)}
                required
                value={profile.username}
              />
            </FormField>
            <FormField id="profileEmail" label="Email">
              <input
                id="profileEmail"
                onChange={(event) => updateField("email", event.target.value)}
                type="email"
                value={profile.email}
              />
            </FormField>
            <FormField id="profilePassword" label="Nueva contrasena">
              <input
                id="profilePassword"
                minLength="6"
                onChange={(event) => updateField("password", event.target.value)}
                type="password"
                value={profile.password}
              />
            </FormField>
            <FormField id="profileConfirmPassword" label="Repetir contrasena">
              <input
                id="profileConfirmPassword"
                minLength="6"
                onChange={(event) =>
                  updateField("confirmPassword", event.target.value)
                }
                type="password"
                value={profile.confirmPassword}
              />
            </FormField>
            <div className="button-row button-row-end">
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </Card>
      </section>

      <Modal
        onClose={closeCropper}
        open={Boolean(cropSourceUrl)}
        title="Recortar foto de perfil"
      >
        <div className="cropper-panel">
          <div className="cropper-frame cropper-frame-contain" ref={cropFrameRef}>
            {cropSourceUrl ? (
              <>
                <img
                  alt="Recortar imagen"
                  className="cropper-contained-image"
                  onLoad={handleCropImageLoad}
                  ref={cropImageRef}
                  src={cropSourceUrl}
                />
                <div
                  className="crop-selection"
                  onPointerCancel={handleCropBoxPointerUp}
                  onPointerDown={(event) => handleCropBoxPointerDown(event, "move")}
                  onPointerMove={handleCropBoxPointerMove}
                  onPointerUp={handleCropBoxPointerUp}
                  style={{
                    height: `${cropBox.size}px`,
                    left: `${cropBox.x}px`,
                    top: `${cropBox.y}px`,
                    width: `${cropBox.size}px`,
                  }}
                >
                  <span
                    className="crop-resize-handle"
                    onPointerDown={(event) =>
                      handleCropBoxPointerDown(event, "resize")
                    }
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="cropper-toolbar" aria-label="Controles de recorte">
            <Button onClick={resetCropBox} variant="secondary">
              Restablecer
            </Button>
          </div>

          <div className="button-row button-row-end">
            <Button onClick={closeCropper} variant="secondary">
              Cancelar
            </Button>
            <Button onClick={confirmCrop}>Usar recorte</Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}

function cropImageToSquare(file, cropBox) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("No se pudo preparar la imagen."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 400, 400);

      context.drawImage(
        image,
        cropBox.sourceX,
        cropBox.sourceY,
        cropBox.sourceSize,
        cropBox.sourceSize,
        0,
        0,
        400,
        400,
      );
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("No se pudo recortar la imagen."));
            return;
          }
          resolve({ blob, url: URL.createObjectURL(blob) });
        },
        "image/webp",
        0.9,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo leer la imagen."));
    };

    image.src = objectUrl;
  });
}
