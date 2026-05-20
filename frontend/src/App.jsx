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
import { getToken } from "./services/api";
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
  const routeBase = getRouteBase(route);
  const routeParams = getRouteParams(route);

  useEffect(() => {
    function handleHashChange() {
      setRoute(getRouteFromLocation());
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function navigate(nextRoute) {
    window.location.hash = nextRoute;
    setRoute(nextRoute);
  }

  function handleAuthChange() {
    setAuthVersion((value) => value + 1);
    navigate("#/");
  }

  if (routeBase === "#/login") {
    return (
      <Login
        onAuthenticated={handleAuthChange}
        onGoToRegister={() => navigate("#/registro")}
      />
    );
  }

  if (routeBase === "#/registro") {
    return (
      <Register
        onAuthenticated={handleAuthChange}
        onGoToLogin={() => navigate("#/login")}
      />
    );
  }

  if (
    routeBase === "#/gastos" ||
    routeBase === "#/gastos-pendientes" ||
    routeBase === "#/creaciones" ||
    routeBase === "#/deudas" ||
    routeBase === "#/tarjetas-credito" ||
    routeBase === "#/importar-excel" ||
    routeBase === "#/importar-excel-personal" ||
    routeBase === "#/gastos-cuenta" ||
    routeBase === "#/perfil"
  ) {
    if (!getToken()) {
      return (
        <Login
          onAuthenticated={handleAuthChange}
          onGoToRegister={() => navigate("#/registro")}
        />
      );
    }

    if (routeBase === "#/gastos") {
      return <Expenses onLogout={() => navigate("#/login")} />;
    }

    if (routeBase === "#/gastos-pendientes") {
      return <PendingExpenses onLogout={() => navigate("#/login")} />;
    }

    if (routeBase === "#/creaciones") {
      return <Creations onLogout={() => navigate("#/login")} />;
    }

    if (routeBase === "#/deudas") {
      return <Debts onLogout={() => navigate("#/login")} />;
    }

    if (routeBase === "#/tarjetas-credito") {
      return (
        <CreditCards
          onLogout={() => navigate("#/login")}
          selectedTarjetaId={routeParams.get("tarjeta") || ""}
        />
      );
    }

    if (routeBase === "#/gastos-cuenta") {
      return (
        <AccountExpenses
          initialCuentaId={routeParams.get("cuenta") || ""}
          onLogout={() => navigate("#/login")}
        />
      );
    }

    if (routeBase === "#/perfil") {
      return <Profile onLogout={() => navigate("#/login")} />;
    }

    return (
      <ImportExpenses
        mode={routeBase === "#/importar-excel-personal" ? "personal" : "bank"}
        onLogout={() => navigate("#/login")}
      />
    );
  }

  if (!getToken()) {
    return (
      <Login
        onAuthenticated={handleAuthChange}
        onGoToRegister={() => navigate("#/registro")}
      />
    );
  }

  return (
    <Dashboard
      authVersion={authVersion}
      onLogout={() => {
        navigate("#/login");
      }}
    />
  );
}

export default App;
