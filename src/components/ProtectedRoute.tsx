import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  requireProfile?: boolean;
}

export default function ProtectedRoute({ requireProfile = false }: ProtectedRouteProps) {
  const { loading, session, user, profileType } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4F1EC] text-sm font-medium text-neutral-600">Carregando...</div>;
  }

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireProfile && !profileType) {
    return <Navigate to="/select-profile" replace />;
  }

  return <Outlet />;
}
