import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";
import { Instagram, Linkedin } from "lucide-react";
import { legalCompany } from "@/content/legal";

interface LandingFooterProps {
  onLogin: () => void;
  onSignup?: () => void;
}

export function LandingFooter({ onLogin, onSignup }: LandingFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="landing-final-cta">
        <p className="landing-kicker">Próxima garrafa</p>
        <h2>Cuide da sua adega como cuida do momento de abrir.</h2>
        {onSignup ? (
          <button type="button" className="landing-btn landing-btn-primary" onClick={onSignup}>
            Começar grátis
          </button>
        ) : null}
      </div>

      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <Logo variant="compact" className="h-12 w-auto" />
          <div>
            <BrandName className="text-[24px]" />
            <span>Curadoria para adega, carta e mesa.</span>
          </div>
        </div>

        <nav className="landing-footer-links" aria-label="Rodapé">
          <a href="#experience">Experiência</a>
          <a href="#product">Produto</a>
          <a href="#pricing">Planos</a>
          <button type="button" onClick={onLogin}>Entrar</button>
        </nav>

        <div className="landing-footer-social">
          <a href="https://instagram.com/sommelyx" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram size={16} />
          </a>
          <a href="https://www.linkedin.com/company/sommelyx/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <Linkedin size={16} />
          </a>
        </div>
      </div>

      <div className="landing-footer-legal">
        <div>
          <Link to="/termos-de-uso">Termos</Link>
          <Link to="/politica-de-privacidade">Privacidade</Link>
          <Link to="/assinatura-e-cobranca">Assinatura</Link>
        </div>
        <p>{legalCompany.legalName} · CNPJ {legalCompany.cnpj}</p>
      </div>
    </footer>
  );
}
