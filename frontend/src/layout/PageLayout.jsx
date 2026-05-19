export function PageLayout({ title, subtitle, children, user, onLogout }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">EW</span>
          <span>
            <strong>Economia Web</strong>
            <small>Finanzas personales</small>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Navegacion principal">
          <a href="#/">Dashboard</a>
          <a href="#/gastos">Mis Gastos</a>
          <a href="#/gastos-cuenta">Gastos por Cuenta</a>
          <a href="#/creaciones">Gestionar Creaciones</a>
          <a href="#/deudas">Mis Deudas</a>
          <a href="#/importar-excel">Importar Excel</a>
          <a href="#/importar-excel-personal">Importar Excel Personal</a>
          <a href="#/perfil">Perfil</a>
        </nav>

        {user ? (
          <div className="sidebar-user">
            <div className="sidebar-user-profile">
              <img
                alt="Foto de perfil"
                src={
                  user.fotoPerfilUrl ||
                  "/imagenes/imagenes-web/perfil/default-avatar.png"
                }
              />
              <span>
                <strong>{user.username}</strong>
                <small>{user.email || "Sesion activa"}</small>
              </span>
            </div>
            <button type="button" onClick={onLogout}>
              Cerrar sesion
            </button>
          </div>
        ) : null}
      </aside>

      <main className="app-main">
        <header className="page-header">
          <div>
            <p className="eyebrow">Migracion gradual</p>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
