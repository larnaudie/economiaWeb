import { useEffect, useState } from "react";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { PendingExpenses } from "./pages/PendingExpenses";
import { Creations } from "./pages/Creations";
import { Debts } from "./pages/Debts";
import { CreditCards } from "./pages/CreditCards";
import { ImportExpenses } from "./pages/ImportExpenses";
import { AccountExpenses } from "./pages/AccountExpenses";
import { Profile } from "./pages/Profile";
import { Register } from "./pages/Register";
import { LocalData } from "./pages/LocalData";
import { Settings } from "./pages/Settings";
import { ToastHost } from "./components/ToastHost";
import { getToken } from "./services/api";
import { applyTheme, loadSavedTheme } from "./utils/theme";
import "./styles/app.css";

const legacyPathRoutes = {
  "/index.html": "#/",
  "/login.html": "#/login",
  "/register.html": "#/registro",
  "/registro.html": "#/registro",
  "/crear-gasto.html": "#/gastos",
  "/gastos-cuenta.html": "#/gastos-cuenta",
  "/gestionar-creaciones.html": "#/creaciones",
  "/cargar-excel.html": "#/importar-excel",
  "/cargar-excel-personal.html": "#/importar-excel-personal",
  "/deudas.html": "#/deudas",
  "/crear-banco.html": "#/creaciones",
  "/crear-cuenta.html": "#/creaciones",
  "/crear-categoria.html": "#/creaciones",
  "/categorias-grupo.html": "#/creaciones",
  "/perfil.html": "#/perfil",
};

function getRouteFromLocation() {
  const legacyRoute = legacyPathRoutes[window.location.pathname];

  if (legacyRoute) {
    const routeWithQuery = `${legacyRoute}${window.location.search}`;
    window.history.replaceState(null, "", `/${routeWithQuery}`);
    return routeWithQuery;
  }

  return window.location.hash || "#/";
}

function getRouteBase(route) {
  return route.split("?")[0];
}

function getRouteParams(route) {
  const query = route.includes("?") ? route.slice(route.indexOf("?") + 1) : "";
  return new URLSearchParams(query);
}

function App() {
  const [route, setRoute] = useState(getRouteFromLocation);
  const [authVersion, setAuthVersion] = useState(0);
  const [localDataVersion, setLocalDataVersion] = useState(0);
  const routeBase = getRouteBase(route);
  const routeParams = getRouteParams(route);

  useEffect(() => {
    applyTheme(loadSavedTheme());
  }, []);

  useEffect(() => {
    function handleHashChange() {
      setRoute(getRouteFromLocation());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    function handleLocalDataPulled() {
      setLocalDataVersion((value) => value + 1);
    }

    window.addEventListener("local-data-pulled", handleLocalDataPulled);
    return () => window.removeEventListener("local-data-pulled", handleLocalDataPulled);
  }, []);

  function navigate(nextRoute) {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  }

  function handleAuthChange() {
    setAuthVersion((value) => value + 1);
    navigate("#/");
  }

  function renderWithToasts(content) {
    return (
      <>
        <div key={`${routeBase}-${localDataVersion}`}>{content}</div>
        <ToastHost />
      </>
    );
  }

  if (routeBase === "#/login") {
    return renderWithToasts(
      <Login
        onAuthenticated={handleAuthChange}
        onGoToRegister={() => navigate("#/registro")}
      />,
    );
  }

  if (routeBase === "#/registro") {
    return renderWithToasts(
      <Register
        onAuthenticated={handleAuthChange}
        onGoToLogin={() => navigate("#/login")}
      />,
    );
  }

  if (
    routeBase === "#/gastos" ||
    routeBase === "#/dashboard" ||
    routeBase === "#/gastos-pendientes" ||
    routeBase === "#/creaciones" ||
    routeBase === "#/deudas" ||
    routeBase === "#/tarjetas-credito" ||
    routeBase === "#/importar-excel" ||
    routeBase === "#/importar-excel-personal" ||
    routeBase === "#/gastos-cuenta" ||
    routeBase === "#/datos-locales" ||
    routeBase === "#/settings" ||
    routeBase === "#/perfil"
  ) {
    if (!getToken()) {
      return renderWithToasts(
        <Login
          onAuthenticated={handleAuthChange}
          onGoToRegister={() => navigate("#/registro")}
        />,
      );
    }

    if (routeBase === "#/gastos") {
      return renderWithToasts(<Expenses onLogout={() => navigate("#/login")} />);
    }

    if (routeBase === "#/dashboard") {
      return renderWithToasts(
        <Dashboard
          authVersion={authVersion}
          mode="analytics"
          onLogout={() => navigate("#/login")}
        />,
      );
    }

    if (routeBase === "#/gastos-pendientes") {
      return renderWithToasts(<PendingExpenses onLogout={() => navigate("#/login")} />);
    }

    if (routeBase === "#/creaciones") {
      return renderWithToasts(<Creations onLogout={() => navigate("#/login")} />);
    }

    if (routeBase === "#/deudas") {
      return renderWithToasts(<Debts onLogout={() => navigate("#/login")} />);
    }

    if (routeBase === "#/tarjetas-credito") {
      return renderWithToasts(
        <CreditCards
          onLogout={() => navigate("#/login")}
          selectedResumenId={routeParams.get("resumen") || ""}
          selectedTarjetaId={routeParams.get("tarjeta") || ""}
        />,
      );
    }

    if (routeBase === "#/gastos-cuenta") {
      return renderWithToasts(
        <AccountExpenses
          initialCuentaId={routeParams.get("cuenta") || ""}
          onLogout={() => navigate("#/login")}
        />,
      );
    }

    if (routeBase === "#/perfil") {
      return renderWithToasts(<Profile onLogout={() => navigate("#/login")} />);
    }

    if (routeBase === "#/datos-locales") {
      return renderWithToasts(<LocalData onLogout={() => navigate("#/login")} />);
    }

    if (routeBase === "#/settings") {
      return renderWithToasts(<Settings onLogout={() => navigate("#/login")} />);
    }

    return renderWithToasts(
      <ImportExpenses
        mode={routeBase === "#/importar-excel-personal" ? "personal" : "bank"}
        onLogout={() => navigate("#/login")}
      />,
    );
  }

  if (!getToken()) {
    return renderWithToasts(
      <Login
        onAuthenticated={handleAuthChange}
        onGoToRegister={() => navigate("#/registro")}
      />,
    );
  }

  return renderWithToasts(
    <Dashboard
      authVersion={authVersion}
      mode="home"
      onLogout={() => {
        navigate("#/login");
      }}
    />,
  );
}

export default App;
