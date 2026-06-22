import { CheckTiny } from "./icons";

export function LandingV6Bento() {
  return (
    <section className="bento-section" id="produto">
      <div className="bento-header">
        <p className="section-eyebrow" data-reveal>o produto</p>
        <h2 className="section-h2" data-reveal data-reveal-delay="1">
          Tudo que sua adega precisa.
        </h2>
        <p className="section-sub" data-reveal data-reveal-delay="2">
          Quatro ferramentas, todas para melhorar sua experiência com o seu vinho.
        </p>
      </div>

      <div className="bento-grid">
        {/* MINHA ADEGA */}
        <div className="bc bc-adega" data-reveal>
          <div className="bc-inner">
            <div className="bc-head">
              <span className="bc-head-icon">
                <img src="/logo-sommelyx-mark.png" alt="" />
              </span>
              <span className="bc-name">Minha Adega</span>
              <span className="bc-count">25 garrafas</span>
            </div>
            <p className="bc-desc">
              Organize sua coleção com filtros inteligentes, janelas de consumo e organização
              personalizada.
            </p>

            <div className="adega-filterbar">
              <span className="adega-filter">
                <svg viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden="true">
                  <path d="M1 1.5h6M2 4h4M3 6.5h2" />
                </svg>
                País
              </span>
              <span className="adega-filter">Região</span>
              <span className="adega-filter">Uva</span>
              <span className="adega-filter">Produtor</span>
              <span className="adega-filter">Safra</span>
              <span className="adega-filter">Status</span>
            </div>

            <div className="adega-chips">
              <span className="chip chip-country">França</span>
              <span className="chip chip-country">Itália</span>
              <span className="chip chip-grape">Pinot Noir</span>
              <span className="chip chip-grape">Cabernet Sauvignon</span>
              <span className="chip chip-status">Beber agora</span>
              <span className="chip chip-status">Em guarda</span>
            </div>

            <div className="adega-groups">
              <p className="bc-section-label">Coleção por país</p>
              <div className="group-row">
                <span className="group-flag" style={{ background: "#3556a4" }} />
                <span className="group-name">França</span>
                <span className="group-bar"><span style={{ width: "100%" }} /></span>
                <span className="group-count">12</span>
              </div>
              <div className="group-row">
                <span className="group-flag" style={{ background: "#2e7d4f" }} />
                <span className="group-name">Itália</span>
                <span className="group-bar"><span style={{ width: "67%" }} /></span>
                <span className="group-count">8</span>
              </div>
              <div className="group-row">
                <span className="group-flag" style={{ background: "#6aa0d8" }} />
                <span className="group-name">Argentina</span>
                <span className="group-bar"><span style={{ width: "42%" }} /></span>
                <span className="group-count">5</span>
              </div>
            </div>

            <div className="adega-cw">
              <p className="bc-section-label">Janela de consumo</p>
              <div className="cw-bar">
                <span className="cw-seg now" style={{ width: "28%" }} />
                <span className="cw-seg soon" style={{ width: "20%" }} />
                <span className="cw-seg guard" style={{ width: "52%" }} />
              </div>
              <div className="cw-legend">
                <span className="cw-item"><span className="cw-dot d-now" />Beber agora <b>7</b></span>
                <span className="cw-item"><span className="cw-dot d-soon" />Pico em breve <b>5</b></span>
                <span className="cw-item"><span className="cw-dot d-guard" />Em guarda <b>13</b></span>
              </div>
            </div>

            <div className="adega-stats">
              <div className="stat-cell"><div className="stat-num">25</div><div className="stat-lbl">Total de garrafas</div></div>
              <div className="stat-cell"><div className="stat-num accent">7</div><div className="stat-lbl">Para beber agora</div></div>
              <div className="stat-cell"><div className="stat-num">13</div><div className="stat-lbl">Em guarda</div></div>
              <div className="stat-cell"><div className="stat-num">5</div><div className="stat-lbl">Na wishlist</div></div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Harmonização + Scanner */}
        <div className="bc-mid">
          {/* HARMONIZAÇÃO */}
          <div className="bc bc-harm" data-reveal data-reveal-delay="1">
            <div className="bc-inner">
              <div className="bc-head">
                <span className="bc-head-icon">
                  <svg viewBox="0 0 16 16" fill="none" stroke="#7a1224" strokeWidth={1.4} aria-hidden="true">
                    <path
                      d="M5 2.5h6M6 2.5v3.5a2 2 0 01-2 2 2 2 0 00-2 2v3h12v-3a2 2 0 00-2-2 2 2 0 01-2-2v-3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="bc-name">Harmonização</span>
              </div>
              <p className="bc-desc">
                Descubra harmonizações usando vinhos da sua adega ou qualquer rótulo externo.
              </p>

              <div className="harm-modes">
                <span className="mode-tab active">Por prato</span>
                <span className="mode-tab">Por ingrediente</span>
              </div>
              <div className="harm-query-box">"Risoto de funghi porcini"</div>
              <div className="harm-result-row">
                <div className="harm-result-dot" />
                <span className="harm-result-name">Brunello di Montalcino 2018</span>
                <span className="harm-match">perfeito</span>
              </div>
              <p className="harm-explain">
                <span className="harm-explain-label">Por que esta harmonização funciona</span>
                Taninos firmes e notas terrosas equilibram a untuosidade do funghi, enquanto a acidez
                limpa o paladar.
              </p>
              <div className="harm-source">
                <span className="harm-src s-adega">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="M2 6.2l2.4 2.4L10 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Da Adega
                </span>
                <span className="harm-src s-ext">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="M2 6.2l2.4 2.4L10 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Rótulos Externos
                </span>
              </div>
            </div>
          </div>

          {/* SCANNER */}
          <div className="bc bc-scan" data-reveal data-reveal-delay="2">
            <div className="bc-inner">
              <div className="bc-head">
                <span className="bc-head-icon">
                  <svg viewBox="0 0 16 16" fill="none" stroke="#7a1224" strokeWidth={1.3} aria-hidden="true">
                    <path
                      d="M2 5V3.5A1.5 1.5 0 013.5 2H5M11 2h1.5A1.5 1.5 0 0114 3.5V5M14 11v1.5a1.5 1.5 0 01-1.5 1.5H11M5 14H3.5A1.5 1.5 0 012 12.5V11"
                      strokeLinecap="round"
                    />
                    <path d="M4.5 8h7" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="bc-name">Scanner</span>
              </div>
              <p className="bc-desc">Fotografe um rótulo e adicione vinhos em segundos.</p>

              <div className="scan-input-area">
                <div className="scan-icon">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#7a1224" strokeWidth={1.3} aria-hidden="true">
                    <rect x="1.5" y="1.5" width="4.3" height="4.3" rx="0.9" />
                    <rect x="9.2" y="1.5" width="4.3" height="4.3" rx="0.9" />
                    <rect x="1.5" y="9.2" width="4.3" height="4.3" rx="0.9" />
                    <rect x="9.6" y="9.6" width="3.2" height="3.2" rx="0.7" fill="#7a1224" stroke="none" />
                  </svg>
                </div>
                <span className="scan-input-text">Extraindo do rótulo...</span>
              </div>
              <div className="scan-fields">
                {[
                  ["Produtor", "Biondi Santi"],
                  ["Safra", "2018"],
                  ["Região", "Toscana"],
                  ["Uva", "Sangiovese"],
                  ["Janela", "2024–2035"],
                ].map(([k, v]) => (
                  <div className="scan-field" key={k}>
                    <span className="scan-field-check"><CheckTiny /></span>
                    <span className="scan-field-key">{k}</span>
                    <span className="scan-field-val">{v}</span>
                  </div>
                ))}
              </div>
              <div className="scan-foot">
                <span className="chk"><CheckTiny strokeWidth={1.7} /></span>
                Pronto para adicionar à adega
              </div>
            </div>
          </div>
        </div>

        {/* ANALISAR CARTA */}
        <div className="bc bc-carta" data-reveal data-reveal-delay="3">
          <div className="bc-inner">
            <div className="bc-head">
              <span className="bc-head-icon">
                <svg viewBox="0 0 16 16" fill="none" stroke="#7a1224" strokeWidth={1.3} aria-hidden="true">
                  <rect x="3" y="1.5" width="10" height="13" rx="1.5" />
                  <path d="M5.5 5h5M5.5 8h5M5.5 11h3" strokeLinecap="round" />
                </svg>
              </span>
              <span className="bc-name">Analisar Carta</span>
              <span className="bc-count">18 vinhos</span>
            </div>
            <p className="bc-desc">Envie uma carta de vinhos e receba recomendações instantâneas.</p>

            <p className="bc-section-label">Ideal para</p>
            <div className="carta-use">
              <span className="carta-use-chip">Restaurantes</span>
              <span className="carta-use-chip">Wine Bars</span>
              <span className="carta-use-chip">Eventos</span>
              <span className="carta-use-chip">Viagens</span>
            </div>

            <p className="bc-section-label" style={{ marginTop: "2px" }}>Recomendações</p>
            <div className="carta-results">
              <div className="carta-res"><span className="carta-res-cat cat-best">Melhor escolha</span><span className="carta-res-name">Barolo Riserva 2016</span></div>
              <div className="carta-res"><span className="carta-res-cat cat-value">Custo-benefício</span><span className="carta-res-name">Chianti Classico 2020</span></div>
              <div className="carta-res"><span className="carta-res-cat cat-premium">Premium</span><span className="carta-res-name">Sassicaia 2019</span></div>
              <div className="carta-res"><span className="carta-res-cat cat-similar">Parecido c/ adega</span><span className="carta-res-name">Brunello di Montalcino 2018</span></div>
              <div className="carta-res"><span className="carta-res-cat cat-best">Boa escolha</span><span className="carta-res-name">Vermentino di Gallura 2022</span></div>
              <div className="carta-res"><span className="carta-res-cat cat-value">Custo-benefício</span><span className="carta-res-name">Nebbiolo Langhe 2020</span></div>
            </div>

            <p className="carta-foot">
              <b>Inclui harmonizações recomendadas</b> para o seu prato — escolha o vinho ideal em
              segundos, mesmo fora de casa.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
