import { ArrowIcon, FeatureCheck } from "./icons";

interface Props {
  onSignup: () => void;
}

const FEATURES = [
  "Adega com janelas de consumo",
  "Scanner de rótulos por câmera",
  "Harmonizações personalizadas",
  "Análise de cartas de restaurante",
  "Wishlist e alertas de preço",
  "Importação de planilhas",
];

export function LandingV6Pricing({ onSignup }: Props) {
  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-header section-inner">
        <p className="section-eyebrow" data-reveal>planos</p>
        <h2 className="section-h2" data-reveal data-reveal-delay="1">
          Simples. Sem surpresas.
        </h2>
        <p className="section-sub" data-reveal data-reveal-delay="2">
          14 dias grátis para experimentar tudo. Sem cartão de crédito.
        </p>
      </div>
      <div className="plan-grid">
        <div className="plan" data-reveal>
          <div className="plan-head">
            <div className="plan-medal">
              <img src="/logo-sommelyx-mark.png" alt="" />
            </div>
            <div className="plan-headtext">
              <span className="plan-chip">Colecionador pessoal</span>
              <div className="plan-name">Pro</div>
            </div>
          </div>
          <p className="plan-desc">
            Para quem leva vinho a sério e quer cuidar de cada garrafa da sua adega.
          </p>
          <div className="plan-price-row">
            <span className="plan-price">R$ 29</span>
            <span className="plan-period">/mês</span>
          </div>
          <p className="plan-annual">ou R$ 280/ano — 2 meses grátis</p>
          <button type="button" className="plan-cta" onClick={onSignup}>
            Iniciar minha adega
            <ArrowIcon />
          </button>
          <p className="plan-cancel">Cancele quando quiser.</p>
          <div className="plan-divider" />
          <ul className="plan-features">
            {FEATURES.map((f) => (
              <li key={f}>
                <FeatureCheck />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
