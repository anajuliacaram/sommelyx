import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { legalCompany } from "@/content/legal";

interface LegalLayoutProps {
  title: string;
  description: string;
  toc?: {id: string; title: string}[];
  children: ReactNode;
}

export default function LegalLayout({ title, description, toc, children }: LegalLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>('');

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
      { rootMargin: '-20% 0px -70% 0px' }
    );

    toc.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [toc]);

  return (
    <div className="min-h-[100dvh] bg-[#F4F1EC] text-[#1C1C1C]">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <article
          className="rounded-[28px] border-0 bg-[#FAF7F3] p-5 shadow-[0_12px_40px_-24px_rgba(20,18,16,0.12)] sm:p-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
            <div>
              <div className="flex flex-col gap-5 border-b border-black/6 pb-6">
            <div className="flex items-center justify-between gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5F5F5F] transition-colors hover:text-[#1C1C1C]"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar para a landing
              </Link>
              <BrandName className="text-[18px] sm:text-[20px]" />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B1E2B]">
                Documentos legais
              </p>
              <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#1C1C1C] sm:text-[36px]">
                {title}
              </h1>
              <p className="max-w-2xl text-[14px] leading-7 text-[#5F5F5F] sm:text-[15px]">
                {description}
              </p>
            </div>
            <div className="grid gap-2 text-[12px] text-[#5F5F5F] sm:grid-cols-2">
              <p>
                <span className="font-semibold text-[#1C1C1C]">Última atualização:</span>{" "}
                {legalCompany.lastUpdated}
              </p>
              <p>
                <span className="font-semibold text-[#1C1C1C]">Contato:</span> {legalCompany.email}
              </p>
            </div>
          </div>

          <div className="prose prose-neutral mt-8 max-w-none prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-h2:mt-4 prose-h2:text-[22px] prose-h3:mt-2 prose-h3:text-[17px] prose-p:mt-4 prose-p:text-[15px] prose-p:leading-9 prose-li:text-[15px] prose-li:leading-9 prose-strong:text-[#1C1C1C] prose-ul:mt-4">
            {children}
          </div>

          <div className="mt-12 rounded-xl border-0 bg-[#FAF7F3]/30 px-4 py-4 text-[13px] leading-6 text-[#5F5F5F]">
            <p className="font-semibold text-[#1C1C1C]">{legalCompany.legalName}</p>
            <p>CNPJ: {legalCompany.cnpj}</p>
            <p>{legalCompany.address}</p>
            <p>E-mail: {legalCompany.email}</p>
            <p>Foro: {legalCompany.forum}</p>
          </div>
            </div>
            {toc && (
              <nav className="hidden lg:block sticky top-8 h-fit">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7B1E2B] mb-4">
                  Índice da página
                </h3>
                <ul className="space-y-2">
                  {toc.map((item, index) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className={`text-[13px] leading-6 transition-colors ${
                          activeSection === item.id
                            ? 'text-[#1C1C1C] font-medium'
                            : 'text-[#5F5F5F] hover:text-[#1C1C1C]'
                        }`}
                      >
                        {index + 1}. {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
