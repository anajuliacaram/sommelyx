import LegalLayout from "@/pages/legal/LegalLayout";
import { legalCompany } from "@/content/legal";
import { LegalSectionCard } from "@/components/legal/LegalSectionCard";

export default function PrivacyPolicy() {
  const toc = [
    { id: "controladora", title: "Quem é a controladora" },
    { id: "dados-tratar", title: "Quais dados podemos tratar" },
    { id: "usamos-dados", title: "Para que usamos os dados" },
    { id: "ia-utiliza", title: "Como a IA utiliza os dados" },
    { id: "compartilhamento", title: "Compartilhamento de dados" },
    { id: "transferencia", title: "Transferência internacional" },
    { id: "retencao", title: "Retenção" },
    { id: "direitos", title: "Direitos do titular" },
    { id: "seguranca", title: "Segurança" },
    { id: "uso-comercial", title: "Uso comercial" },
    { id: "contato", title: "Contato" },
  ];

  return (
    <LegalLayout
      title="Política de Privacidade"
      description="Esta Política descreve como a Sommelyx trata dados pessoais no contexto da plataforma, em conformidade com a LGPD."
      toc={toc}
      tags={["LGPD", "Dados", "IA"]}
    >
      <LegalSectionCard>
        <p>
          A Sommelyx trata dados pessoais de forma compatível com a LGPD e com as finalidades
          necessárias para prestar sua plataforma.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="controladora">
        <h2>1. Quem é a controladora</h2>
        <p>
          <strong>{legalCompany.legalName}</strong>
          <br />
          CNPJ: {legalCompany.cnpj}
          <br />
          Endereço: {legalCompany.address}
          <br />
          E-mail: {legalCompany.privacyEmail}
          <br />
          Encarregado/DPO: canal de contato em {legalCompany.privacyEmail}
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="dados-tratar">
        <h2>2. Quais dados podemos tratar</h2>
        <p>Dependendo do uso da plataforma, podemos tratar:</p>
        <ul>
          <li>dados de cadastro, como nome e e-mail;</li>
          <li>dados de autenticação e acesso;</li>
          <li>informações de uso, logs e dispositivo;</li>
          <li>dados inseridos na adega ou no inventário;</li>
          <li>imagens, PDFs, textos e arquivos enviados;</li>
          <li>dados relacionados à assinatura e cobrança;</li>
          <li>interações com suporte.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard id="usamos-dados">
        <h2>3. Para que usamos os dados</h2>
        <p>Usamos dados para:</p>
        <ul>
          <li>criar e administrar contas;</li>
          <li>operar a plataforma;</li>
          <li>armazenar e organizar vinhos, adegas e estoques;</li>
          <li>processar uploads;</li>
          <li>executar recursos de IA;</li>
          <li>gerar análises, recomendações e harmonizações;</li>
          <li>cobrar assinaturas;</li>
          <li>prevenir fraudes e proteger a plataforma;</li>
          <li>atender obrigações legais e regulatórias;</li>
          <li>melhorar desempenho, segurança e experiência.</li>
        </ul>
      </LegalSectionCard>

      <LegalSectionCard id="ia-utiliza">
        <h2>4. Como a IA utiliza os dados</h2>
        <p>Recursos de IA podem processar:</p>
        <ul>
          <li>imagens de rótulos;</li>
          <li>cartas e cardápios;</li>
          <li>arquivos PDF;</li>
          <li>textos extraídos;</li>
          <li>dados estruturados inseridos na plataforma.</li>
        </ul>
        <p>
          Esse processamento é usado para análise, classificação, extração de dados e geração de
          sugestões. As saídas são assistivas e não garantem exatidão.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="compartilhamento">
        <h2>5. Compartilhamento de dados</h2>
        <p>Podemos compartilhar dados com parceiros e fornecedores que apoiam a operação da plataforma, como:</p>
        <ul>
          <li>infraestrutura em nuvem;</li>
          <li>autenticação e banco de dados;</li>
          <li>pagamentos e faturamento;</li>
          <li>processamento de IA;</li>
          <li>monitoramento, suporte e segurança.</li>
        </ul>
        <p>
          Também poderemos compartilhar dados quando houver obrigação legal, regulatória ou ordem
          válida. Não vendemos dados pessoais.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="transferencia">
        <h2>6. Transferência internacional</h2>
        <p>
          Alguns fornecedores podem processar dados fora do Brasil. Nesses casos, buscamos adotar
          medidas adequadas de proteção conforme a LGPD.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="retencao">
        <h2>7. Retenção</h2>
        <p>Mantemos dados pelo período necessário para:</p>
        <ul>
          <li>prestar o serviço;</li>
          <li>cumprir obrigações legais;</li>
          <li>exercer direitos;</li>
          <li>garantir segurança e integridade da plataforma.</li>
        </ul>
        <p>
          Quando cabível, os dados poderão ser excluídos, anonimizados ou retidos nas hipóteses
          permitidas em lei.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="direitos">
        <h2>8. Direitos do titular</h2>
        <p>Nos termos da LGPD, você pode solicitar:</p>
        <ul>
          <li>confirmação do tratamento;</li>
          <li>acesso aos dados;</li>
          <li>correção;</li>
          <li>eliminação, bloqueio ou anonimização, quando aplicável;</li>
          <li>portabilidade, quando cabível;</li>
          <li>informações sobre compartilhamento;</li>
          <li>revogação de consentimento, quando essa for a base legal;</li>
          <li>oposição, nos casos previstos em lei.</li>
        </ul>
        <p>Solicitações podem ser feitas pelo e-mail: {legalCompany.privacyEmail}</p>
      </LegalSectionCard>

      <LegalSectionCard id="seguranca">
        <h2>9. Segurança</h2>
        <p>
          A Sommelyx adota medidas técnicas e administrativas razoáveis para proteger dados pessoais.
          Ainda assim, nenhum ambiente digital é totalmente invulnerável.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="uso-comercial">
        <h2>10. Uso comercial</h2>
        <p>
          Clientes comerciais são responsáveis pelos dados que inserem na plataforma e pela base
          legal aplicável quando houver dados de terceiros.
        </p>
      </LegalSectionCard>

      <LegalSectionCard id="contato">
        <h2>11. Contato</h2>
        <p>
          <strong>{legalCompany.legalName}</strong>
          <br />
          CNPJ: {legalCompany.cnpj}
          <br />
          Endereço: {legalCompany.address}
          <br />
          E-mail: {legalCompany.privacyEmail}
          <br />
          Foro: {legalCompany.forum}
        </p>
      </LegalSectionCard>
    </LegalLayout>
  );
}
