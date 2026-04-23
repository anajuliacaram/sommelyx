import { CreditCard } from "lucide-react";
import { legalCompany } from "@/content/legal";
import LegalLayout, { LegalSection } from "@/pages/legal/LegalLayout";

export default function BillingTerms() {
  const sections: LegalSection[] = [
    {
      id: "planos",
      title: "Planos",
      description: "Visão geral dos formatos de contratação disponíveis.",
      content: (
        <p>
          A Sommelyx pode oferecer planos gratuitos e pagos, mensais ou anuais, com funcionalidades
          e limites distintos para uso pessoal ou comercial.
        </p>
      ),
    },
    {
      id: "cobranca-recorrente",
      title: "Cobrança recorrente",
      content: (
        <p>
          Ao contratar um plano pago, você autoriza a cobrança recorrente no meio de pagamento
          informado, de acordo com o ciclo selecionado.
        </p>
      ),
    },
    {
      id: "renovacao",
      title: "Renovação",
      content: <p>Salvo indicação em contrário, a assinatura é renovada automaticamente ao final de cada ciclo.</p>,
    },
    {
      id: "alteracao-de-plano",
      title: "Alteração de plano",
      content: (
        <p>
          Você pode solicitar upgrade ou downgrade, sujeito às regras vigentes no momento da
          alteração. Mudanças podem ter efeito imediato ou no ciclo seguinte, conforme o caso.
        </p>
      ),
    },
    {
      id: "cancelamento",
      title: "Cancelamento",
      content: (
        <p>
          Você pode cancelar a renovação a qualquer momento. O cancelamento impede cobranças
          futuras, mas não desfaz valores já pagos, salvo quando exigido por lei ou previsto em
          condição comercial específica.
        </p>
      ),
    },
    {
      id: "arrependimento",
      title: "Direito de arrependimento",
      content: (
        <p>
          Quando aplicável, o consumidor pode exercer o direito de arrependimento no prazo legal de
          7 dias contados da contratação online, nos termos da legislação brasileira.
        </p>
      ),
    },
    {
      id: "reembolsos",
      title: "Reembolsos",
      content: (
        <p>
          Fora das hipóteses legais obrigatórias ou de ofertas específicas, pagamentos já realizados
          não são reembolsáveis.
        </p>
      ),
    },
    {
      id: "falha-de-pagamento",
      title: "Falha de pagamento",
      content: (
        <>
          <p>Se o pagamento falhar, a Sommelyx poderá:</p>
          <ul>
            <li>tentar nova cobrança;</li>
            <li>notificar o usuário;</li>
            <li>restringir funcionalidades pagas;</li>
            <li>suspender ou encerrar o plano por inadimplência.</li>
          </ul>
        </>
      ),
    },
    {
      id: "precos",
      title: "Preços",
      content: (
        <p>
          Os preços podem ser alterados para ciclos futuros, com comunicação prévia quando aplicável.
        </p>
      ),
    },
    {
      id: "responsabilidade-comercial",
      title: "Responsabilidade do cliente comercial",
      content: (
        <p>
          Planos comerciais não transferem à Sommelyx a responsabilidade pela operação do negócio. O
          cliente continua responsável por estoque, custos, preços, margens, localização e dados
          operacionais.
        </p>
      ),
    },
    {
      id: "limitacoes",
      title: "Limitações",
      content: <p>Recursos com IA podem ter limites de uso e não garantem precisão absoluta.</p>,
    },
    {
      id: "contato",
      title: "Contato",
      content: (
        <p>
          <strong>{legalCompany.legalName}</strong>
          <br />
          CNPJ: {legalCompany.cnpj}
          <br />
          Endereço: {legalCompany.address}
          <br />
          E-mail: {legalCompany.billingEmail}
          <br />
          Foro: {legalCompany.forum}
        </p>
      ),
    },
  ];

  return (
    <LegalLayout
      title="Termos de Assinatura e Cobrança"
      description="Como funcionam os ciclos de cobrança, renovação, cancelamento e as condições aplicáveis aos planos pagos da Sommelyx."
      icon={CreditCard}
      sections={sections}
    />
  );
}
