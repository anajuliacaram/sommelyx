import { useRef } from "react";
import { LandingV6Nav } from "./LandingV6Nav";
import { LandingV6Hero } from "./LandingV6Hero";
import { LandingV6Bento } from "./LandingV6Bento";
import { LandingV6Pricing } from "./LandingV6Pricing";
import { LandingV6Faq } from "./LandingV6Faq";
import { LandingV6Close } from "./LandingV6Close";
import { LandingV6Footer } from "./LandingV6Footer";
import { useLandingV6Motion } from "./useLandingV6Motion";

interface Props {
  onLogin: () => void;
  onSignup: () => void;
}

/**
 * Production implementation of the approved V6 landing prototype
 * (design-prototype/landing-v6-refined.html). All visual styling lives in
 * src/styles/landing-v6.css, scoped under `.lvx`.
 */
export function LandingV6({ onLogin, onSignup }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLandingV6Motion(rootRef);

  return (
    <div className="lvx" ref={rootRef}>
      <LandingV6Nav onLogin={onLogin} onSignup={onSignup} />
      <main>
        <LandingV6Hero onSignup={onSignup} />
        <LandingV6Bento />
        <LandingV6Pricing onSignup={onSignup} />
        <LandingV6Faq />
        <LandingV6Close onSignup={onSignup} />
      </main>
      <LandingV6Footer />
    </div>
  );
}
