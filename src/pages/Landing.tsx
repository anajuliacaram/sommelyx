import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analytics } from "@/lib/analytics";
import { designSystem } from "@/styles/designSystem";
import { LandingBackground } from "@/components/landing/LandingBackground";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingShowcase } from "@/components/landing/LandingShowcase";
import { LandingAudience } from "@/components/landing/LandingAudience";
import { LandingPricing, landingFaqs } from "@/components/landing/LandingPricing";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    analytics.trackOncePerSession("landing_page_view", "landing");
  }, []);

  useEffect(() => {
    document.body.classList.add("landing-page");
    return () => {
      document.body.classList.remove("landing-page");
    };
  }, []);

  useEffect(() => {
    const scripts = document.querySelectorAll('script[data-sommelyx-jsonld="true"]');
    scripts.forEach((node) => node.remove());

    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Sommelyx",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Sommelyx é uma plataforma de gestão de vinhos para adegas pessoais e comerciais, com IA para leitura de rótulos, análise de cartas e harmonização.",
        featureList: [
          "Wine label scanning",
          "Wine list analysis",
          "AI pairing recommendations",
          "Personal and commercial cellar management",
          "CSV, PDF, image and text import",
        ],
        offers: {
          "@type": "Offer",
          price: "29",
          priceCurrency: "BRL",
          url: "https://sommelyx.com.br/#pricing",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Sommelyx",
        description:
          "Wine management platform with AI-powered label scanning, wine list analysis, pairing recommendations, and cellar control.",
        brand: {
          "@type": "Brand",
          name: "Sommelyx",
        },
        offers: {
          "@type": "Offer",
          price: "29",
          priceCurrency: "BRL",
          url: "https://sommelyx.com.br/#pricing",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: landingFaqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      },
    ];

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-sommelyx-jsonld", "true");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.querySelectorAll('script[data-sommelyx-jsonld="true"]').forEach((node) => node.remove());
    };
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
      <div className={`${designSystem.pageShell} ${designSystem.pageBackground}`}>
      <LandingBackground />
      <LandingHeader onLogin={handleLoginClick} onSignup={handleStartFreeClick} />
      <LandingHero onSignup={handleStartFreeClick} />
      <LandingFeatures onSignup={handleStartFreeClick} />
      <LandingShowcase />
      <LandingAudience />
      <LandingPricing onSignup={handleStartFreeClick} />
      <LandingFooter onLogin={handleLoginClick} />
    </div>
  );
}
