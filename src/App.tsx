import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import SelectProfile from "@/pages/SelectProfile";
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardIndex from "@/pages/dashboard/DashboardIndex";
import Plans from "@/pages/dashboard/Plans";
import Placeholder from "@/pages/dashboard/Placeholder";
import CellarPage from "@/pages/dashboard/CellarPage";
import AlertsPage from "@/pages/dashboard/AlertsPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/select-profile" element={<SelectProfile />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardIndex />} />
              <Route path="cellar" element={<CellarPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="wishlist" element={<Placeholder title="Wishlist" />} />
              <Route path="stats" element={<Placeholder title="Analytics" />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="inventory" element={<Placeholder title="Estoque" />} />
              <Route path="sales" element={<Placeholder title="Vendas" />} />
              <Route path="registers" element={<Placeholder title="Cadastros" />} />
              <Route path="reports" element={<Placeholder title="Relatórios" />} />
              <Route path="plans" element={<Plans />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
