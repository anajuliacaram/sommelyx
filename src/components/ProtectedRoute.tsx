import { useAuth } from "@/contexts/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  requireProfile?: boolean;
}

export default function ProtectedRoute({ requireProfile = false }: ProtectedRouteProps) {
  const { loading, session, user, profileType } = useAuth();

  if (loading) {
    return (
      <div className="sx-v2-app-bg sx-v2-auth-loading min-h-screen">
        <div className="sx-v2-thinking-state">
          <span className="sx-v2-kicker">Sommelyx</span>
          <p>Preparando sua adega</p>
        </div>
      </div>
    );
  }

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireProfile && !profileType) {
    return <Navigate to="/select-profile" replace />;
  }

  return <Outlet />;
}
