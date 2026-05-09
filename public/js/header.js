function renderHeader({ title = "Economía Web" } = {}) {
  const header = document.querySelector("header");
  if (!header) return;

  header.innerHTML = `
    <div class="header-content">
      <div class="header-left">
        <button class="hamburger" type="button" id="sidebarToggle">☰</button>
        <h1>${escapeHtml(title)}</h1>
      </div>

      <div class="user-info">
      
  <span id="userName">Usuario</span>
  <a href="perfil.html" class="header-avatar-link">
  <img
    id="headerAvatar"
    class="header-avatar"
    src="/imagenes/imagenes-web/perfil/default-avatar.png"
    alt="Perfil"
  />
</a>

</div>
    </div>

    <div id="sidebarOverlay" class="sidebar-overlay"></div>

    <aside id="sidebarMenu" class="sidebar-menu">
      <div class="sidebar-header">
        <h2>Economía Web</h2>
        <button type="button" id="sidebarClose">×</button>
      </div>

      <nav class="sidebar-links">
  <a href="index.html">Inicio</a>
  <a href="gestionar-creaciones.html">Gestionar Creaciones</a>
  <a href="categorias-grupo.html">Categorías Principales</a>
  <a href="crear-banco.html">Mis Bancos</a>
  <a href="crear-cuenta.html">Mis Cuentas</a>
  <a href="crear-categoria.html">Mis Subcategorías</a>
  <a href="deudas.html">Mis Deudas</a>
  <a href="cargar-excel.html">Importar Excel</a>
  <a href="cargar-excel-personal.html">Importar Excel Personal</a>
  <a href="perfil.html">Perfil</a>
</nav>

      <button id="logoutButton" type="button" class="sidebar-logout">
        Cerrar sesión
      </button>
    </aside>
  `;

  const user = getUser?.();
  const userName = document.getElementById("userName");
  const headerAvatar = document.getElementById("headerAvatar");
  if (headerAvatar) {
    headerAvatar.src =
      user?.fotoPerfilUrl || "/imagenes/imagenes-web/perfil/default-avatar.png";
  }
  if (userName && user?.username) {
    userName.textContent = user.username;
  }

  const sidebar = document.getElementById("sidebarMenu");
  const overlay = document.getElementById("sidebarOverlay");
  const openBtn = document.getElementById("sidebarToggle");
  const closeBtn = document.getElementById("sidebarClose");

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  }

  openBtn?.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay?.addEventListener("click", closeSidebar);

  document.getElementById("logoutButton")?.addEventListener("click", () => {
    if (typeof logout === "function") {
      logout();
    }
  });
}
