import {
  Banknote,
  CircleUserRound,
  CircleAlert,
  RefreshCw,
  FileSpreadsheet,
  FolderPlus,
  Gauge,
  Landmark,
  ReceiptText,
  CreditCard,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiRequest, getApiData } from "../services/api";

const navGroups = [
  {
    title: "Uso diario",
    items: [
      { href: "#/", icon: <Gauge size={17} />, label: "Dashboard" },
      { href: "#/gastos", icon: <ReceiptText size={17} />, label: "Mis Gastos" },
      {
        href: "#/gastos-pendientes",
        icon: <CircleAlert size={17} />,
        label: "Pendientes",
      },
      {
        href: "#/gastos-cuenta",
        icon: <WalletCards size={17} />,
        label: "Gastos por Cuenta",
      },
      { href: "#/deudas", icon: <Banknote size={17} />, label: "Mis Deudas" },
      {
        href: "#/tarjetas-credito",
        icon: <CreditCard size={17} />,
        label: "Tarjetas",
      },
    ],
  },
  {
    title: "Gestion",
    items: [
      { href: "#/creaciones", icon: <FolderPlus size={17} />, label: "Creaciones" },
      {
        href: "#/importar-excel",
        icon: <FileSpreadsheet size={17} />,
        label: "Importar Excel",
      },
      {
        href: "#/importar-excel-personal",
        icon: <Landmark size={17} />,
        label: "Excel Personal",
      },
      { href: "#/perfil", icon: <CircleUserRound size={17} />, label: "Perfil" },
    ],
  },
];

function buildMobileNavGroups(user) {
  return [
    {
      title: "Perfil",
      items: [
        {
          href: "#/perfil",
          icon: (
            <img
              alt=""
              className="mobile-nav-avatar"
              src={
                user?.fotoPerfilUrl ||
                "/imagenes/imagenes-web/perfil/default-avatar.png"
              }
            />
          ),
          label: "Perfil",
        },
      ],
    },
    ...navGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href !== "#/perfil"),
    })),
  ];
}

function getCurrentHash() {
  if (typeof window === "undefined") return "#/";
  return window.location.hash || "#/";
}

function saveMobileNavScroll(nav) {
  if (!nav || typeof window === "undefined") return;
  window.sessionStorage.setItem("mobileNavScroll", String(nav.scrollLeft));
}

function restoreMobileNavScroll(nav) {
  if (!nav || typeof window === "undefined") return;
  const savedPosition = Number(window.sessionStorage.getItem("mobileNavScroll") || 0);
  nav.scrollLeft = savedPosition;
}

export function PageLayout({ title, subtitle, children, user, onLogout }) {
  const currentHash = getCurrentHash();
  const mobileNavRef = useRef(null);
  const [rates, setRates] = useState(null);
  const [ratesError, setRatesError] = useState("");
  const mobileNavGroups = buildMobileNavGroups(user);

  const loadRates = useCallback(async () => {
    try {
      const response = await apiRequest("/cotizaciones");
      setRates(getApiData(response));
      setRatesError("");
    } catch {
      setRatesError("Cotizaciones no disponibles");
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadRates, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRates]);

  useLayoutEffect(() => {
    const nav = mobileNavRef.current;
    if (!nav) return undefined;

    restoreMobileNavScroll(nav);
    const frameId = window.requestAnimationFrame(() => restoreMobileNavScroll(nav));
    const timeoutIds = [40, 120, 260].map((delay) =>
      window.setTimeout(() => restoreMobileNavScroll(nav), delay),
    );

    return () => {
      window.cancelAnimationFrame(frameId);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [currentHash]);

  function rememberMobileNavPosition() {
    saveMobileNavScroll(mobileNavRef.current);
  }

  function handleMobileNavScroll(event) {
    saveMobileNavScroll(event.currentTarget);
  }

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

        <nav className="sidebar-nav sidebar-nav-desktop" aria-label="Navegacion principal">
          {navGroups.map((group) => (
            <div className="sidebar-nav-group" key={group.title}>
              <span className="sidebar-nav-title">{group.title}</span>
              {group.items.map((item) => {
                const isActive =
                  currentHash === item.href ||
                  (item.href !== "#/" && currentHash.startsWith(item.href));

                return (
                  <a
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "active" : ""}
                    href={item.href}
                    key={item.href}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        <nav
          className="sidebar-nav sidebar-nav-mobile"
          ref={mobileNavRef}
          aria-label="Navegacion principal mobile"
          onScroll={handleMobileNavScroll}
        >
          {mobileNavGroups.map((group) => (
            <div className="sidebar-nav-group" key={group.title}>
              <span className="sidebar-nav-title">{group.title}</span>
              {group.items.map((item) => {
                const isActive =
                  currentHash === item.href ||
                  (item.href !== "#/" && currentHash.startsWith(item.href));

                return (
                  <a
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "active" : ""}
                    href={item.href}
                    key={item.href}
                    onClick={rememberMobileNavPosition}
                    onPointerDown={rememberMobileNavPosition}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="rates-banner">
          <div>
            <span>Cotizaciones</span>
            {rates ? (
              <>
                <strong>USD $ {Number(rates.usdUyu || 0).toFixed(2)}</strong>
                <strong>UI $ {Number(rates.uiUyu || 0).toFixed(4)}</strong>
                <small>{rates.fuente}</small>
              </>
            ) : (
              <small>{ratesError || "Cargando..."}</small>
            )}
          </div>
          <button
            aria-label="Actualizar cotizaciones"
            onClick={loadRates}
            type="button"
          >
            <RefreshCw size={14} />
          </button>
        </div>

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
