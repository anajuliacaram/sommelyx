import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingContactButton } from "@/components/FloatingContactButton";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AuthConfirm from "@/pages/AuthConfirm";
import AuthCallback from "@/pages/AuthCallback";
import AuthDiagnostics from "@/pages/AuthDiagnostics";
import SelectProfile from "@/pages/SelectProfile";
import TermsOfService from "@/pages/legal/TermsOfService";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import BillingTerms from "@/pages/legal/BillingTerms";
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardIndex from "@/pages/dashboard/DashboardIndex";
import Plans from "@/pages/dashboard/Plans";
import CellarPage from "@/pages/dashboard/CellarPage";
import InventoryPage from "@/pages/dashboard/InventoryPage";
import AlertsPage from "@/pages/dashboard/AlertsPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import WishlistPage from "@/pages/dashboard/WishlistPage";
import StatsPage from "@/pages/dashboard/StatsPage";
import SalesPage from "@/pages/dashboard/SalesPage";
import RegistersPage from "@/pages/dashboard/RegistersPage";
import ReportsPage from "@/pages/dashboard/ReportsPage";
import ActivityLogPage from "@/pages/dashboard/ActivityLogPage";
import ConsumptionPage from "@/pages/dashboard/ConsumptionPage";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const getPostAuthTarget = (profileType: "personal" | "commercial" | null) =>
  profileType ? "/dashboard" : "/select-profile";

const PublicAuthRoute = ({ children }: { children: JSX.Element }) => {
  const { user, profileType, loading } = useAuth();
  if (!loading && user) return <Navigate to={getPostAuthTarget(profileType)} replace />;
  return children;
};

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, profileType, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC] text-sm font-medium text-neutral-600">
        Carregando...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!profileType) return <Navigate to="/select-profile" replace />;
  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const topKey = location.pathname.startsWith("/dashboard") ? "/dashboard" : location.pathname;

  const routes = (
    <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicAuthRoute><Login /></PublicAuthRoute>} />
          <Route path="/signup" element={<PublicAuthRoute><Signup /></PublicAuthRoute>} />
          <Route path="/forgot-password" element={<PublicAuthRoute><ForgotPassword /></PublicAuthRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/diagnostics" element={<AuthDiagnostics />} />
          <Route path="/termos-de-uso" element={<TermsOfService />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
          <Route path="/assinatura-e-cobranca" element={<BillingTerms />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/select-profile" element={<SelectProfile />} />
          </Route>
          <Route element={<ProtectedRoute requireProfile />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardIndex />} />
              <Route path="cellar" element={<CellarPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="wishlist" element={<WishlistPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="registers" element={<RegistersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="log" element={<ActivityLogPage />} />
              <Route path="consumption" element={<ConsumptionPage />} />
              <Route path="plans" element={<Plans />} />
            </Route>
            <Route path="/inventory" element={<Navigate to="/dashboard/inventory" replace />} />
            <Route path="/plans" element={<Navigate to="/dashboard/plans" replace />} />
            <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
  );

  return (
    <div key={topKey} className="page-transition-surface">
      {routes}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppErrorBoundary>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
            <FloatingContactButton />
          </AuthProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
