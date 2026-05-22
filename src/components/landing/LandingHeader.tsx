import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "@/components/Logo";
import { BrandName } from "@/components/BrandName";
import { Instagram, Linkedin } from "lucide-react";

interface LandingHeaderProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function LandingHeader({ onLogin, onSignup }: LandingHeaderProps) {
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 120], [0.62, 0.86]);
  const headerBackground = useTransform(
    headerOpacity,
    (o) => `linear-gradient(180deg, rgba(250,246,239,${o + 0.06}), rgba(250,246,239,${o}))`,
  );

  return (
    <motion.header
      className="landing-header"
      style={{
        background: headerBackground,
      }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="landing-header-inner">
        <a href="/" className="landing-brand-link" aria-label="Sommelyx">
          <Logo variant="navbar" className="landing-brand-logo" />
          <BrandName className="landing-brand-name" />
        </a>

        <nav className="landing-nav" aria-label="Navegação principal">
          <a href="#experience">Experiência</a>
          <a href="#product">Produto</a>
          <a href="#pricing">Planos</a>
        </nav>

        <div className="landing-header-actions">
          <a
            href="https://instagram.com/sommelyx"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-social-link"
            aria-label="Instagram"
          >
            <Instagram size={15} />
          </a>
          <a
            href="https://www.linkedin.com/company/sommelyx/"
            target="_blank"
            rel="noopener noreferrer"
            className="landing-social-link"
            aria-label="LinkedIn"
          >
            <Linkedin size={15} />
          </a>
          <button type="button" className="landing-header-login" onClick={onLogin}>
            Entrar
          </button>
          <button type="button" className="landing-header-cta" onClick={onSignup}>
            Comece grátis
          </button>
        </div>
      </div>
    </motion.header>
  );
}
