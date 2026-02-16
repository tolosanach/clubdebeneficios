window.addEventListener("error", (e) => {
  alert("JS error: " + (e.message || "unknown"));
});
window.addEventListener("unhandledrejection", (e: any) => {
  alert("Promise error: " + (e.reason?.message || e.reason || "unknown"));
});
import React, { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

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

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({
  children,
  roles,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 font-black tracking-widest uppercase text-xs">
        Cargando...
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

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
            <Navigate to="/login" />
          ) : user.role === UserRole.SUPER_ADMIN ? (
            <Navigate to="/admin" />
          ) : [UserRole.COMMERCE_OWNER, UserRole.STAFF_MANAGER, UserRole.VIEWER].includes(
              user.role
            ) ? (
            <Navigate to="/commerce" />
          ) : user.role === UserRole.SCANNER ? (
            <Navigate to="/commerce/scan" />
          ) : (
            <Navigate to="/customer" />
          )
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
            <Layout title="Admin Central">
              <Routes>
                <Route path="/" element={<SuperAdminDashboard />} />
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
                <Route path="/" element={<CommerceDashboard />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/search-customer" element={<SearchCustomerPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/customers/new" element={<NewCustomerPage />} />
                <Route path="/staff" element={<StaffPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/rewards/:id" element={<RewardMembersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/reminders" element={<RemindersPage />} />
                <Route path="/inactive" element={<InactivePage />} />
                <Route path="/top" element={<TopCustomersPage />} />
                <Route path="/billing" element={<BillingPage />} />
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
                <Route path="/" element={<CustomerPortal />} />
                <Route
                  path="/benefits"
                  element={<div className="p-8 bg-white rounded-3xl border">Explorar Beneficios</div>}
                />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Verificación rápida de que Vite está leyendo el .env.local
    console.log("VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
    console.log("VITE_SUPABASE_ANON_KEY (length):", (import.meta.env.VITE_SUPABASE_ANON_KEY || "").length);

    // Ping a Supabase (tu función existente)
    supabasePing().then(({ data, error }) => {
      console.log("SUPABASE PING:", { data, error });
    });
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

