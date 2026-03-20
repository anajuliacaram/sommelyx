import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

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
        <Link
          to="/"
          className="inline-flex h-11 px-6 items-center rounded-2xl text-[13px] font-semibold text-white gradient-wine"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
