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

      <LandingFeatures onSignup={handleStartFreeClick} />
      <LandingPricing onSignup={handleStartFreeClick} />
      <LandingFooter onLogin={handleLoginClick} />
    </div>
  );
}
