import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { supabasePing } from "./services/supabaseTest";
import { AuthProvider, useAuth } from "./services/auth";
import Layout from "./components/Layout";
import { UserRole } from "./types";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CommerceDashboard from "./pages/commerce/Dashboard";
import ScanPage from "./pages/commerce/ScanPage";
import CustomerPortal from "./pages/customer/Portal";
import SuperAdminDashboard from "./pages/admin/Dashboard";
import RewardsPage from "./pages/commerce/RewardsPage";
import RewardMembersPage from "./pages/commerce/RewardMembersPage";
import CustomersPage from "./pages/commerce/CustomersPage";
import NewCustomerPage from "./pages/commerce/NewCustomerPage";
import SearchCustomerPage from "./pages/commerce/SearchCustomerPage";
import SettingsPage from "./pages/commerce/SettingsPage";
import InactivePage from "./pages/commerce/InactivePage";
import TopCustomersPage from "./pages/commerce/TopCustomersPage";
import BillingPage from "./pages/commerce/BillingPage";
import StaffPage from "./pages/commerce/StaffPage";
import RemindersPage from "./pages/commerce/RemindersPage";
import PublicQR from "./pages/PublicQR";

// ✅ NUEVO: redirección consistente según rol
const defaultPathByRole = (role: UserRole) => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "/admin";
    case UserRole.CUSTOMER:
      return "/customer";
    case UserRole.SCANNER:
      return "/commerce/scan";
    case UserRole.COMMERCE_OWNER:
    case UserRole.STAFF_MANAGER:
    case UserRole.VIEWER:
    default:
      return "/commerce";
  }
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({
  children,
  roles,
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 font-black tracking-widest uppercase text-xs">
        Cargando...
      </div>
    );

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  // ✅ CAMBIO: si el rol no corresponde, redirigir a un destino claro según su rol
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={defaultPathByRole(user.role)} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/q/:token" element={<PublicQR />} />

      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : (
            <Navigate to={defaultPathByRole(user.role)} replace />
          )
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
            <Layout title="Admin Central">
              <Routes>
                {/* ✅ CAMBIO: path relativo */}
                <Route index element={<SuperAdminDashboard />} />

                {/* ✅ NUEVO: catch-all interno */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/commerce/*"
        element={
          <ProtectedRoute
            roles={[UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER, UserRole.SCANNER, UserRole.VIEWER]}
          >
            <Layout title="Panel Comercio">
              <Routes>
                {/* ✅ CAMBIO: paths relativos (sin /) */}
                <Route index element={<CommerceDashboard />} />
                <Route path="scan" element={<ScanPage />} />
                <Route path="search-customer" element={<SearchCustomerPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/new" element={<NewCustomerPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="rewards" element={<RewardsPage />} />
                <Route path="rewards/:id" element={<RewardMembersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="reminders" element={<RemindersPage />} />
                <Route path="inactive" element={<InactivePage />} />
                <Route path="top" element={<TopCustomersPage />} />
                <Route path="billing" element={<BillingPage />} />

                {/* ✅ NUEVO: catch-all interno para evitar rebotes raros */}
                <Route path="*" element={<Navigate to="/commerce" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/customer/*"
        element={
          <ProtectedRoute roles={[UserRole.CUSTOMER]}>
            <Layout title="Club de Beneficios">
              <Routes>
                <Route index element={<CustomerPortal />} />
                <Route
                  path="benefits"
                  element={<div className="p-8 bg-white rounded-3xl border">Explorar Beneficios</div>}
                />

                {/* ✅ NUEVO: catch-all interno */}
                <Route path="*" element={<Navigate to="/customer" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // ✅ CAMBIO: mover handlers acá (y limpiarlos)
    const onError = (e: ErrorEvent) => {
      alert("JS error: " + (e.message || "unknown"));
    };
    const onRejection = (e: any) => {
      alert("Promise error: " + (e.reason?.message || e.reason || "unknown"));
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Verificación rápida de que Vite está leyendo el .env.local
    console.log("VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
    console.log(
      "VITE_SUPABASE_ANON_KEY (length):",
      (import.meta.env.VITE_SUPABASE_ANON_KEY || "").length
    );

    // Ping a Supabase (tu función existente)
    supabasePing().then(({ data, error }) => {
      console.log("SUPABASE PING:", { data, error });
    });

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;
