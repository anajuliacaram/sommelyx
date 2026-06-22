import { Link } from "react-router-dom";

/**
 * V6 footer — visual structure matches the approved prototype exactly
 * (Produto · Planos · Blog · Termos · Privacidade · Assinatura). The three
 * legal links are wired to the real legal routes to preserve functionality.
 */
export function LandingV6Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-brand">
          <img className="footer-logo-img" src="/logo-sommelyx-mark.png" alt="" />
          Sommelyx
        </span>
        <nav className="footer-links" aria-label="Rodapé">
          <a href="#produto">Produto</a>
          <a href="#pricing">Planos</a>
          <a href="#">Blog</a>
          <Link to="/termos-de-uso">Termos</Link>
          <Link to="/politica-de-privacidade">Privacidade</Link>
          <Link to="/assinatura-e-cobranca">Assinatura</Link>
        </nav>
        <span className="footer-legal">© 2026 Sommelyx Tecnologia Ltda.</span>
      </div>
    </footer>
  );
}
