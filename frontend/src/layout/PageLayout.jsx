import {
  Banknote,
  CircleUserRound,
  CircleAlert,
  RefreshCw,
  Gauge,
  House,
  ReceiptText,
  CreditCard,
  Settings,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { apiRequest, getApiData } from "../services/api";
import { SyncStatusPanel } from "../components/SyncStatusPanel";

const navGroups = [
  {
    title: "Uso diario",
    items: [
      { href: "#/", icon: <House size={17} />, label: "Home" },
      { href: "#/dashboard", icon: <Gauge size={17} />, label: "Dashboard" },
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
    title: "Sistema",
    items: [{ href: "#/settings", icon: <Settings size={17} />, label: "Settings" }],
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

function formatRate(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "N/D";
}

function formatRateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("es-UY", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
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
                <strong>USD compra $ {formatRate(rates.usdCompra ?? rates.usdUyu)}</strong>
                <strong>USD venta $ {formatRate(rates.usdVenta ?? rates.usdUyu)}</strong>
                <strong>UI $ {formatRate(rates.uiValor ?? rates.uiUyu, 4)}</strong>
                <small>
                  {rates.fuente}
                  {rates.fechaActualizacion
                    ? ` · ${formatRateTime(rates.fechaActualizacion)}`
                    : ""}
                  {rates.fallback ? " · fallback" : ""}
                </small>
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

        <SyncStatusPanel />

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
