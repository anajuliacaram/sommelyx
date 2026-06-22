// V6 FAQ content — source of truth for both the FAQ section and the
// FAQPage JSON-LD schema in Landing.tsx.
export interface LandingFaq {
  q: string;
  a: string;
}

export const landingV6Faqs: LandingFaq[] = [
  {
    q: "Como funciona o período de teste?",
    a: "São 14 dias com acesso completo a todas as funcionalidades, sem necessidade de cartão de crédito. Cancele antes do fim do período e não haverá nenhuma cobrança.",
  },
  {
    q: "O que está incluído no plano Pro?",
    a: "Tudo o que você precisa para cuidar da adega: organização por janela de consumo, scanner de rótulos por câmera, harmonizações personalizadas, análise de cartas de restaurante, wishlist com alertas de preço e importação de planilhas. Um único plano, sem módulos escondidos.",
  },
  {
    q: "Consigo importar minha adega atual?",
    a: "Sim. Aceitamos CSV, Excel, PDF e imagens. Você revisa tudo antes de confirmar — nenhuma garrafa é adicionada à sua adega sem a sua aprovação.",
  },
  {
    q: "O scanner reconhece qualquer rótulo?",
    a: "O scanner identifica produtor, safra, região e estilo a partir de uma foto do rótulo. Quando há dúvida, ele sugere as opções mais prováveis para você confirmar — sempre com você no controle.",
  },
  {
    q: "Minha adega fica privada?",
    a: "Completamente. Cada conta é isolada e protegida por controle de acesso rigoroso. Nenhum dado da sua adega é compartilhado ou utilizado para outros fins.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, a qualquer momento, direto pelo painel — sem ligações, sem burocracia. Você mantém o acesso até o fim do período já pago.",
  },
];
