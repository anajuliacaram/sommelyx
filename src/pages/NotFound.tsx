import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "linear-gradient(165deg, #F4F1EC 0%, #EDE7DF 40%, #E6E2D8 65%, #E8E4DB 100%)" }}>
      <div className="text-center max-w-sm">
        <Logo variant="compact" className="h-8 w-auto mx-auto mb-6 opacity-30" />
        <h1 className="text-5xl font-serif font-bold text-foreground mb-2">404</h1>
        <p className="text-[14px] text-muted-foreground mb-6">Essa página não existe ou foi movida.</p>
        <Button asChild variant="primary" className="h-10 px-6 text-[12px] font-bold shadow-float">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
