import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analytics } from "@/lib/analytics";
import { LandingV6 } from "@/components/landing/v6/LandingV6";
import { landingV6Faqs } from "@/components/landing/v6/faqs";
import "@/styles/landing-v6.css";

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
          "Sommelyx é uma experiência premium para organizar adegas, ler cartas e decidir harmonizações com curadoria.",
        featureList: [
          "Wine label scanning",
          "Wine list analysis",
          "Pairing recommendations",
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
          "Premium wine companion for cellar organization, wine list analysis, pairing recommendations, and cellar control.",
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
        mainEntity: landingV6Faqs.map((faq) => ({
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

  return <LandingV6 onLogin={handleLoginClick} onSignup={handleStartFreeClick} />;
}
