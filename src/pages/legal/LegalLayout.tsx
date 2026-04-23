import { ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { BrandName } from "@/components/BrandName";
import { legalCompany } from "@/content/legal";

interface LegalLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function LegalLayout({ title, description, children }: LegalLayoutProps) {
  useEffect(() => {
    document.body.classList.add("legal-page");
    return () => {
      document.body.classList.remove("legal-page");
    };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#F4F1EC] text-[#1C1C1C]">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
        <div
          className="rounded-[28px] border border-black/5 bg-white/88 p-5 shadow-[0_18px_60px_-34px_rgba(20,18,16,0.28)] backdrop-blur-sm sm:p-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(250,247,243,0.98) 100%)",
          }}
        >
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

          <div className="prose prose-neutral mt-6 max-w-none prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-h2:mt-8 prose-h2:text-[22px] prose-h3:mt-6 prose-h3:text-[17px] prose-p:text-[15px] prose-p:leading-7 prose-li:text-[15px] prose-li:leading-7 prose-strong:text-[#1C1C1C]">
            {children}
          </div>

          <div className="mt-10 rounded-2xl border border-black/6 bg-[#F7F3EE] px-4 py-4 text-[13px] leading-6 text-[#5F5F5F]">
            <p className="font-semibold text-[#1C1C1C]">{legalCompany.legalName}</p>
            <p>CNPJ: {legalCompany.cnpj}</p>
            <p>{legalCompany.address}</p>
            <p>E-mail: {legalCompany.email}</p>
            <p>Foro: {legalCompany.forum}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
