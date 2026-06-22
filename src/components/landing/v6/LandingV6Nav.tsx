import { ArrowIconSmall } from "./icons";

interface Props {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingV6Nav({ onLogin, onSignup }: Props) {
  return (
    <nav className="nav" id="nav">
      <span className="nav-sweep" aria-hidden="true" />
      <div className="nav-inner">
        <a href="#" className="nav-logo" aria-label="Sommelyx">
          <img className="nav-logo-img" src="/logo-sommelyx-mark.png" alt="Sommelyx" />
          <span className="nav-logo-word">Sommelyx</span>
        </a>
        <div className="nav-links">
          <a href="#produto" data-spy="produto">Recursos</a>
          <a href="#pricing" data-spy="pricing">Planos</a>
          <a href="#faq" data-spy="faq">FAQ</a>
        </div>
        <div className="nav-actions">
          <button type="button" className="nav-login" onClick={onLogin}>
            Entrar
          </button>
          <button type="button" className="btn-cta" onClick={onSignup}>
            Começar grátis
            <ArrowIconSmall />
          </button>
        </div>
      </div>
    </nav>
  );
}
