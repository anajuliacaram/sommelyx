import { ArrowIcon } from "./icons";

interface Props {
  onSignup: () => void;
}

export function LandingV6Hero({ onSignup }: Props) {
  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-badge" data-reveal>
          <span className="hero-badge-medal" aria-hidden="true">🇧🇷</span>
          <span className="hero-badge-text">
            O primeiro app <b>100% brasileiro</b> para gestão de adegas
          </span>
        </div>
        <h1 className="hero-h1" data-reveal data-reveal-delay="1">
          Sua adega,<br />
          <em>inteligente.</em>
        </h1>
        <p className="hero-sub" data-reveal data-reveal-delay="2">
          Sommelyx organiza seus vinhos, acompanha janelas de consumo e ajuda a decidir o que abrir,
          harmonizar ou guardar.
        </p>
        <div className="hero-benefits" data-reveal data-reveal-delay="2">
          <span className="hero-benefit">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
              <path d="M2.5 6.5h11M6 6.5v7" strokeLinecap="round" />
            </svg>
            Organize
          </span>
          <span className="hero-benefit-sep" />
          <span className="hero-benefit">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
            Descubra
          </span>
          <span className="hero-benefit-sep" />
          <span className="hero-benefit">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path
                d="M5 2.5h6M6 2.5v4a2 2 0 01-2 2 2 2 0 00-2 2v3h12v-3a2 2 0 00-2-2 2 2 0 01-2-2v-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Harmonize
          </span>
          <span className="hero-benefit-sep" />
          <span className="hero-benefit">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path d="M3 8.5l3.2 3.2L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Decida
          </span>
        </div>
        <div className="hero-actions" data-reveal data-reveal-delay="3">
          <button type="button" className="btn-wine" onClick={onSignup}>
            Iniciar minha adega
            <ArrowIcon />
          </button>
          <a href="#produto" className="btn-outline">
            Ver como funciona
          </a>
        </div>
        <div className="hero-proof" data-reveal data-reveal-delay="4">
          <div className="hero-proof-avatars">
            <div className="proof-avatar av-1">A</div>
            <div className="proof-avatar av-2">R</div>
            <div className="proof-avatar av-3">M</div>
            <div className="proof-avatar av-4">C</div>
          </div>
          <div className="hero-proof-text">
            <strong>+400 colecionadores</strong> já organizam
            <br />
            sua adega com Sommelyx
          </div>
        </div>
      </div>

      <div className="hero-right">
        <div className="hero-stage" id="heroStage">
          <div className="hero-halo" />

          {/* MAIN: Minha Adega */}
          <div className="gcard card-main" data-depth="14">
            <div className="float-a">
              <div className="gcard-sheen" />
              <div className="card-header">
                <div className="card-app-icon">
                  <img src="/logo-sommelyx-mark.png" alt="" />
                </div>
                <div className="card-header-titles">
                  <div className="card-header-label">Minha Adega</div>
                  <div className="card-header-sub">organizada por janela de consumo</div>
                </div>
                <div className="card-header-count">15</div>
              </div>
              <div className="wine-row">
                <div className="wine-dot dot-red" />
                <div className="wine-name-col">
                  <div className="wine-n">Sassicaia</div>
                  <div className="wine-m">Tenuta San Guido · 2019</div>
                </div>
                <div className="wine-badge badge-now">beber agora</div>
              </div>
              <div className="wine-row">
                <div className="wine-dot dot-red" />
                <div className="wine-name-col">
                  <div className="wine-n">Brunello di Montalcino</div>
                  <div className="wine-m">Biondi Santi · 2018</div>
                </div>
                <div className="wine-badge badge-wait">guardar</div>
              </div>
              <div className="wine-row">
                <div className="wine-dot dot-red" />
                <div className="wine-name-col">
                  <div className="wine-n">Château Margaux</div>
                  <div className="wine-m">Bordeaux · 2018</div>
                </div>
                <div className="wine-badge badge-soon">pico em breve</div>
              </div>
              <div className="wine-row">
                <div className="wine-dot dot-white" />
                <div className="wine-name-col">
                  <div className="wine-n">Puligny-Montrachet</div>
                  <div className="wine-m">Louis Latour · 2020</div>
                </div>
                <div className="wine-badge badge-now">beber agora</div>
              </div>
              <div className="card-footer-bar">
                <div className="card-footer-icon">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#7a1224" strokeWidth={1.5} aria-hidden="true">
                    <circle cx="5.5" cy="5.5" r="4.2" />
                    <path d="M5.5 3.2v2.5l1.6 1" />
                  </svg>
                </div>
                <span className="card-footer-text">Abertura recomendada: Sassicaia · esta semana</span>
                <span className="card-footer-action">Ver →</span>
              </div>
            </div>
          </div>

          {/* SCANNER */}
          <div className="gcard card-scan" data-depth="26">
            <div className="float-b">
              <div className="gcard-sheen" />
              <div className="sf-label">Scanner de rótulos</div>
              <div className="sf-wine">Brunello di Montalcino</div>
              <div className="sf-meta">Biondi Santi · Toscana · 2018</div>
              <div className="sf-tag">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#3d4f35" strokeWidth={1.6} aria-hidden="true">
                  <path d="M1 4h6M4 1v6" />
                </svg>
                Adicionar à adega
              </div>
            </div>
          </div>

          {/* HARMONIZAÇÃO */}
          <div className="gcard card-harm" data-depth="22">
            <div className="float-c">
              <div className="gcard-sheen" />
              <div className="hf-label">Harmonização</div>
              <div className="hf-query">"Risoto de funghi porcini, jantar de negócios."</div>
              <div className="hf-result">
                <div className="hf-result-dot" />
                <span className="hf-result-name">Brunello 2018</span>
                <span className="hf-result-match">perfeito</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
