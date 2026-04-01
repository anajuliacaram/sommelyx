import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#F7F7F8" }}>
      <div className="text-center">
        <h1 className="mb-3 text-5xl font-serif font-bold" style={{ color: "#0F0F14" }}>404</h1>
        <p className="mb-6 text-base" style={{ color: "#6B7280" }}>Página não encontrada</p>
        <Button asChild variant="primary" className="h-11 px-6 text-[13px] font-semibold shadow-float">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
