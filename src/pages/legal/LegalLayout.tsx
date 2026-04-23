import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, LucideIcon } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { legalCompany } from "@/content/legal";
import { cn } from "@/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
}

interface LegalLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  sections: LegalSection[];
}

export default function LegalLayout({ title, description, icon: Icon, sections }: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <div className="min-h-screen bg-[#F4F1EC] text-[#1C1C1C]">
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,760px)_280px] lg:items-start lg:justify-center">
          <main className="min-w-0">
            <div
              className="rounded-[30px] border border-black/5 bg-white/88 p-5 shadow-[0_24px_70px_-40px_rgba(20,18,16,0.32)] backdrop-blur-sm sm:p-7 lg:p-8"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(249,246,240,0.98) 100%)",
              }}
            >
              <div className="flex flex-col gap-5 border-b border-black/6 pb-6 sm:gap-6 sm:pb-7">
                <div className="flex items-center justify-between gap-4">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(95,111,82,0.10)] bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5F5F5F] transition-colors hover:text-[#1C1C1C]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </Link>
                  <BrandName className="text-[18px] sm:text-[20px]" />
                </div>

                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(123,30,43,0.12)] bg-[rgba(123,30,43,0.06)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7B1E2B]">
                    <Icon className="h-3.5 w-3.5" />
                    Documentos legais
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#1C1C1C] sm:text-[40px]">
                      {title}
                    </h1>
                    <p className="max-w-2xl text-[15px] leading-7 text-[#5F5F5F] sm:text-[16px]">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 rounded-[20px] border border-[rgba(95,111,82,0.08)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-[12px] text-[#5F5F5F] sm:grid-cols-2 sm:text-[13px]">
                  <p>
                    <span className="font-semibold text-[#1C1C1C]">Última atualização:</span>{" "}
                    {legalCompany.lastUpdated}
                  </p>
                  <p>
                    <span className="font-semibold text-[#1C1C1C]">Contato:</span> {legalCompany.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                {sections.map((section, index) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24 rounded-[24px] border border-[rgba(95,111,82,0.08)] bg-[rgba(255,255,255,0.55)] px-4 py-5 shadow-[0_10px_30px_-24px_rgba(20,18,16,0.20)] sm:px-5 sm:py-6"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(123,30,43,0.78)]">
                          Seção {index + 1}
                        </p>
                        <h2 className="text-[21px] font-semibold tracking-[-0.025em] text-[#1C1C1C] sm:text-[24px]">
                          {section.title}
                        </h2>
                        {section.description ? (
                          <p className="max-w-2xl text-[14px] leading-6 text-[#5F5F5F] sm:text-[15px]">
                            {section.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-4 border-t border-[rgba(95,111,82,0.07)] pt-4 text-[15px] leading-7 text-[#34302A] [&_p]:m-0 [&_ul]:m-0 [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:pl-1 [&_strong]:text-[#1C1C1C]">
                        {section.content}
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-8 rounded-[22px] border border-black/6 bg-[#F7F3EE] px-4 py-4 text-[13px] leading-6 text-[#5F5F5F] sm:px-5">
                <p className="font-semibold text-[#1C1C1C]">{legalCompany.legalName}</p>
                <p>CNPJ: {legalCompany.cnpj}</p>
                <p>{legalCompany.address}</p>
                <p>E-mail: {legalCompany.email}</p>
                <p>Foro: {legalCompany.forum}</p>
              </div>
            </div>
          </main>

          <aside className="lg:sticky lg:top-6">
            <div className="rounded-[24px] border border-[rgba(95,111,82,0.08)] bg-[rgba(255,255,255,0.72)] p-4 shadow-[0_16px_40px_-30px_rgba(20,18,16,0.28)] backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(58,51,39,0.46)]">
                Navegação
              </p>
              <h2 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[#1C1C1C]">
                Índice da página
              </h2>
              <nav className="mt-4 space-y-1.5">
                {sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={cn(
                      "block rounded-[14px] px-3 py-2 text-[13px] leading-5 transition-colors",
                      activeSection === section.id
                        ? "bg-[rgba(123,30,43,0.08)] text-[#7B1E2B]"
                        : "text-[#5F5F5F] hover:bg-[rgba(95,111,82,0.05)] hover:text-[#1C1C1C]",
                    )}
                  >
                    <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.08em] opacity-65">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
