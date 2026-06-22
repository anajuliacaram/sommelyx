import { ArrowIcon } from "./icons";

interface Props {
  onSignup: () => void;
}

export function LandingV6Close({ onSignup }: Props) {
  return (
    <section className="close-section">
      <img className="close-mark" src="/logo-sommelyx-mark.png" alt="Sommelyx" data-reveal />
      <h2 className="close-h2" data-reveal data-reveal-delay="1">
        A sua próxima garrafa
        <br />
        merece ser <em>lembrada.</em>
      </h2>
      <p className="close-sub" data-reveal data-reveal-delay="2">
        Organize sua adega em minutos. O Sommelyx cuida do resto.
      </p>
      <div data-reveal data-reveal-delay="3">
        <button type="button" className="btn-wine" style={{ margin: "0 auto" }} onClick={onSignup}>
          Iniciar minha adega grátis
          <ArrowIcon />
        </button>
        <div className="close-proof">
          <span>14 dias grátis</span>
          <div className="close-proof-sep" />
          <span>Sem cartão</span>
          <div className="close-proof-sep" />
          <span>Cancele quando quiser</span>
        </div>
      </div>
    </section>
  );
}
