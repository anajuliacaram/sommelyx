import LegalLayout from "@/pages/legal/LegalLayout";
import { legalCompany } from "@/content/legal";
import { LegalSectionCard } from "@/components/legal/LegalSectionCard";

export default function BillingTerms() {
  const toc = [
    { id: "planos", title: "Planos" },
    { id: "cobranca-recorrente", title: "Cobrança recorrente" },
    { id: "renovacao", title: "Renovação" },
    { id: "alteracao-plano", title: "Alteração de plano" },
    { id: "cancelamento", title: "Cancelamento" },
    { id: "direito-arrependimento", title: "Direito de arrependimento" },
    { id: "reembolsos", title: "Reembolsos" },
    { id: "falha-pagamento", title: "Falha de pagamento" },
    { id: "precos", title: "Preços" },
    { id: "responsabilidade-cliente", title: "Responsabilidade do cliente comercial" },
    { id: "limitacoes", title: "Limitações" },
    { id: "contato", title: "Contato" },
  ];

  return (
    <LegalLayout
      title="Termos de Assinatura e Cobrança"
      description="Estes termos regulam planos pagos, cobranças recorrentes, alterações de plano e cancelamento na Sommelyx."
      toc={toc}
      tags={["Assinatura", "Cobrança", "Cancelamento"]}
    >
      <LegalSectionCard>
        <p>
          Estes termos regulam planos pagos, cobranças recorrentes e regras de cancelamento da
          Sommelyx.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="planos">
        <h2>1. Planos</h2>
        <p>
          A Sommelyx pode oferecer planos gratuitos e pagos, mensais ou anuais, com funcionalidades
          e limites distintos para uso pessoal ou comercial.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="cobranca-recorrente">
        <h2>2. Cobrança recorrente</h2>
        <p>
          Ao contratar um plano pago, você autoriza a cobrança recorrente no meio de pagamento
          informado, de acordo com o ciclo selecionado.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="renovacao">
        <h2>3. Renovação</h2>
        <p>Salvo indicação em contrário, a assinatura é renovada automaticamente ao final de cada ciclo.</p>
      </LegalSectionCard>

      <LegalSectionCard id="alteracao-plano">
        <h2>4. Alteração de plano</h2>
        <p>
          Você pode solicitar upgrade ou downgrade, sujeito às regras vigentes no momento da
          alteração. Mudanças podem ter efeito imediato ou no ciclo seguinte, conforme o caso.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="cancelamento">
        <h2>5. Cancelamento</h2>
        <p>
          Você pode cancelar a renovação a qualquer momento. O cancelamento impede cobranças
          futuras, mas não desfaz valores já pagos, salvo quando exigido por lei ou previsto em
          condição comercial específica.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="direito-arrependimento">
        <h2>6. Direito de arrependimento</h2>
        <p>
          Quando aplicável, o consumidor pode exercer o direito de arrependimento no prazo legal de
          7 dias contados da contratação online, nos termos da legislação brasileira.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="reembolsos">
        <h2>7. Reembolsos</h2>
        <p>
          Fora das hipóteses legais obrigatórias ou de ofertas específicas, pagamentos já realizados
          não são reembolsáveis.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="falha-pagamento">
        <h2>8. Falha de pagamento</h2>
        <p>Se o pagamento falhar, a Sommelyx poderá:</p>
        <ul>
          <li>tentar nova cobrança;</li>
          <li>notificar o usuário;</li>
          <li>restringir funcionalidades pagas;</li>
          <li>suspender ou encerrar o plano por inadimplência.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard id="precos">
        <h2>9. Preços</h2>
        <p>
          Os preços podem ser alterados para ciclos futuros, com comunicação prévia quando aplicável.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="responsabilidade-cliente">
        <h2>10. Responsabilidade do cliente comercial</h2>
        <p>
          Planos comerciais não transferem à Sommelyx a responsabilidade pela operação do negócio. O
          cliente continua responsável por estoque, custos, preços, margens, localização e dados
          operacionais.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="limitacoes">
        <h2>11. Limitações</h2>
        <p>
          Recursos com IA podem ter limites de uso e não garantem precisão absoluta.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="contato">
        <h2>12. Contato</h2>
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
      </LegalSectionCard>
    </LegalLayout>
  );
}
