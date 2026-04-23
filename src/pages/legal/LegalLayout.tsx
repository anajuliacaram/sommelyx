import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronLeft, FileText } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { legalCompany } from "@/content/legal";
import { cn } from "@/lib/utils";

interface LegalLayoutProps {
  title: string;
  description: string;
  toc?: { id: string; title: string }[];
  tags?: string[];
  children: ReactNode;
}

export default function LegalLayout({ title, description, toc, tags = [], children }: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState("");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("legal-page");
    return () => {
      document.body.classList.remove("legal-page");
    };
  }, []);

  useEffect(() => {
    if (!toc) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );

    toc.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="legal-shell min-h-[100dvh] text-[#1C1C1C]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="legal-hero rounded-[32px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5F5F5F] transition-colors hover:text-[#1C1C1C]"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Link>
              <BrandName className="text-[18px] sm:text-[20px]" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="legal-pill">Documentos legais</span>
              {tags.map((tag) => (
                <span key={tag} className="legal-meta-pill">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-6 max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7B1E2B]">
                Sommelyx Legal
              </p>
              <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.06em] text-[#181818] sm:text-[48px] lg:text-[58px]">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-8 text-[#5F5F5F] sm:text-[16px] sm:leading-9">
                {description}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="legal-meta-pill">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B1E2B]">
                  Atualização
                </span>
                {legalCompany.lastUpdated}
              </span>
              <span className="legal-meta-pill">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B1E2B]">
                  Contato
                </span>
                {legalCompany.email}
              </span>
              <span className="legal-meta-pill">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B1E2B]">
                  Foro
                </span>
                {legalCompany.forum}
              </span>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
          <main className="min-w-0 max-w-3xl">
            {toc ? (
              <div className="mb-5 lg:hidden">
                <button
                  type="button"
                  className="legal-index-toggle"
                  onClick={() => setMobileTocOpen((value) => !value)}
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B1E2B]">
                      Índice
                    </span>
                    <span className="text-[13px] font-semibold text-[#1C1C1C]">
                      {mobileTocOpen ? "Ocultar navegação" : "Abrir navegação"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn("h-4 w-4 text-[#6B6B6B] transition-transform duration-200", mobileTocOpen && "rotate-180")}
                  />
                </button>

                {mobileTocOpen ? (
                  <nav className="legal-sidebar-card legal-index-panel">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7B1E2B]/8 text-[#7B1E2B]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B1E2B]">
                          Índice da página
                        </p>
                        <p className="text-[12px] text-[#5F5F5F]">
                          Seções e navegação rápida
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {toc.map((item, index) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            data-active={activeSection === item.id}
                            className="legal-sidebar-link"
                            onClick={() => setMobileTocOpen(false)}
                          >
                            <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-inherit/70">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1 text-[13px] leading-5 font-medium">
                              {item.title}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-6 lg:space-y-7">{children}</div>
          </main>

          {toc ? (
            <aside className="hidden lg:block">
              <nav className="legal-sidebar-card sticky top-8">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7B1E2B]/8 text-[#7B1E2B]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B1E2B]">
                      Índice da página
                    </p>
                    <p className="text-[12px] text-[#5F5F5F]">
                      Navegação rápida
                    </p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {toc.map((item, index) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        data-active={activeSection === item.id}
                        className="legal-sidebar-link"
                      >
                        <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-inherit/70">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 text-[13px] leading-5 font-medium">
                          {item.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
