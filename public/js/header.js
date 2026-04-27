function renderHeader({ title = "Economía Web" } = {}) {
  const header = document.querySelector("header");
  if (!header) return;

  header.innerHTML = `
    <div class="header-content">
      <h1>${title}</h1>

      <div class="user-info">
        <span id="userName">Usuario</span>
        <button class="hamburger" type="button" id="hamburgerBtn">☰</button>
      </div>
    </div>

    <nav id="navMenu" class="nav-menu">
      <a href="index.html">Inicio</a>
      <a href="gestionar-creaciones.html">Gestionar Creaciones</a>
      <a href="crear-banco.html">Mis Bancos</a>
      <a href="crear-cuenta.html">Mis Cuentas</a>
      <a href="crear-categoria.html">Mis Categorías</a>
      <a href="deudas.html">Mis Deudas</a>
      <a href="cargar-excel.html">Importar Excel</a>
      <a href="cargar-excel-personal.html">Importar Excel Personal</a>
      <a href="perfil.html">Perfil</a>
      <button id="logoutButton" type="button">Cerrar sesión</button>
    </nav>
  `;

  const user = getUser?.();
  const userName = document.getElementById("userName");

  if (userName && user?.username) {
    userName.textContent = user.username;
  }

  document.getElementById("hamburgerBtn")?.addEventListener("click", () => {
    document.getElementById("navMenu")?.classList.toggle("show");
  });

  document.getElementById("logoutButton")?.addEventListener("click", () => {
    if (typeof logout === "function") {
      logout();
    } else {
      console.error("logout no está definido");
    }
  });
}