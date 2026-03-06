import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  requireProfile?: boolean;
}

export default function ProtectedRoute({ requireProfile = false }: ProtectedRouteProps) {
  const { loading, session, user, profileType } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F7F8" }}>
        <div className="space-y-3 w-48 animate-pulse" role="status" aria-label="Verificando sessão">
          <div className="h-6 w-full rounded-lg" style={{ background: "rgba(0,0,0,0.06)" }} />
          <div className="h-4 w-3/4 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }} />
          <div className="h-4 w-1/2 rounded-lg" style={{ background: "rgba(0,0,0,0.03)" }} />
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireProfile && !profileType) {
    return <Navigate to="/select-profile" replace />;
  }

  return <Outlet />;
}
