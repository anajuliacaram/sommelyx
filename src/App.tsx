import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AuthConfirm from "@/pages/AuthConfirm";
import AuthCallback from "@/pages/AuthCallback";
import SelectProfile from "@/pages/SelectProfile";
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardIndex from "@/pages/dashboard/DashboardIndex";
import Plans from "@/pages/dashboard/Plans";
import Placeholder from "@/pages/dashboard/Placeholder";
import CellarPage from "@/pages/dashboard/CellarPage";
import InventoryPage from "@/pages/dashboard/InventoryPage";
import InventoryPlaceholder from "@/pages/dashboard/InventoryPlaceholder";
import AlertsPage from "@/pages/dashboard/AlertsPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

/**
 * Top-level routes use AnimatePresence for full-page transitions
 * (landing ↔ login ↔ signup etc).
 * Dashboard sub-routes animate via AnimatedOutlet inside DashboardLayout,
 * so the sidebar/header stay mounted.
 */
const AnimatedRoutes = () => {
  const location = useLocation();
  // Use the first path segment to group dashboard routes under one key
  const topKey = location.pathname.startsWith("/dashboard") ? "/dashboard" : location.pathname;

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={topKey}>
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/select-profile" element={<SelectProfile />} />
          </Route>
          <Route element={<ProtectedRoute requireProfile />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardIndex />} />
              <Route path="cellar" element={<CellarPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="wishlist" element={<Placeholder title="Wishlist" />} />
              <Route path="stats" element={<Placeholder title="Analytics" />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="sales" element={<InventoryPlaceholder title="Vendas" icon="sales" description="Rastreamento de pedidos, histórico de pagamentos e CRM integrado." />} />
              <Route path="registers" element={<InventoryPlaceholder title="Cadastros" icon="registers" description="Gestão de fornecedores, produtores e base de clientes VIP." />} />
              <Route path="reports" element={<InventoryPlaceholder title="Relatórios" icon="reports" description="BI avançado, impostos, previsão de demanda e valuation de acervo." />} />
              <Route path="plans" element={<Plans />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
