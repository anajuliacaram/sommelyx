import { landingV6Faqs } from "./faqs";

function Chevron() {
  return (
    <svg className="faq-chevron" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <path d="M4 7l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LandingV6Faq() {
  return (
    <section className="faq-section" id="faq">
      <div className="faq-inner">
        <div className="faq-header">
          <p className="section-eyebrow" data-reveal>dúvidas</p>
          <h2 className="section-h2" data-reveal data-reveal-delay="1">
            Perguntas frequentes.
          </h2>
          <p className="section-sub" data-reveal data-reveal-delay="2">
            Tudo o que você precisa saber antes de começar.
          </p>
        </div>
        <div className="faq-container" data-reveal data-reveal-delay="2">
          {landingV6Faqs.map((faq, i) => (
            <details className="faq-item" key={faq.q} open={i === 0}>
              <summary>
                {faq.q}
                <Chevron />
              </summary>
              <div className="faq-answer">
                <div className="faq-answer-inner">{faq.a}</div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
