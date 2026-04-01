import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analytics } from "@/lib/analytics";
import { LandingBackground } from "@/components/landing/LandingBackground";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    analytics.trackOncePerSession("landing_page_view", "landing");
  }, []);

  const handleStartFreeClick = () => {
    analytics.track("landing_cta_start_free_click");
    navigate("/signup");
  };

  const handleLoginClick = () => {
    analytics.track("landing_cta_login_click");
    navigate("/login");
  };

  return (
    <div className="min-h-screen overflow-hidden selection:bg-wine/20 selection:text-foreground bg-background text-foreground">
      <LandingBackground />
      <LandingHeader onLogin={handleLoginClick} onSignup={handleStartFreeClick} />
      <LandingHero onSignup={handleStartFreeClick} />

      {/* ─── Social proof ─── */}
      <section className="relative z-10 px-5 sm:px-8 pb-12 sm:pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground/70 tracking-wide">
            Usado por colecionadores e profissionais do vinho em todo o Brasil
          </p>
        </div>
      </section>

      <LandingFeatures onSignup={handleStartFreeClick} />
      <LandingPricing onSignup={handleStartFreeClick} />
      <LandingFooter onLogin={handleLoginClick} />
    </div>
  );
}
