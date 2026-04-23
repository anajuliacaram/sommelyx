import { ShieldCheck } from "lucide-react";
import { legalCompany } from "@/content/legal";
import LegalLayout, { LegalSection } from "@/pages/legal/LegalLayout";

export default function PrivacyPolicy() {
  const sections: LegalSection[] = [
    {
      id: "controladora",
      title: "Quem é a controladora",
      description: "Identificação da empresa responsável pelo tratamento de dados no contexto da plataforma.",
      content: (
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
      ),
    },
    {
      id: "dados-tratados",
      title: "Quais dados podemos tratar",
      content: (
        <>
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
        </>
      ),
    },
    {
      id: "finalidades",
      title: "Para que usamos os dados",
      content: (
        <>
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
        </>
      ),
    },
    {
      id: "ia",
      title: "Como a IA utiliza os dados",
      description: "Explicação objetiva sobre o processamento automatizado dentro do produto.",
      content: (
        <>
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
        </>
      ),
    },
    {
      id: "compartilhamento",
      title: "Compartilhamento de dados",
      content: (
        <>
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
        </>
      ),
    },
    {
      id: "transferencia-internacional",
      title: "Transferência internacional",
      content: (
        <p>
          Alguns fornecedores podem processar dados fora do Brasil. Nesses casos, buscamos adotar
          medidas adequadas de proteção conforme a LGPD.
        </p>
      ),
    },
    {
      id: "retencao",
      title: "Retenção",
      content: (
        <>
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
        </>
      ),
    },
    {
      id: "direitos-do-titular",
      title: "Direitos do titular",
      content: (
        <>
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
        </>
      ),
    },
    {
      id: "seguranca",
      title: "Segurança",
      content: (
        <p>
          A Sommelyx adota medidas técnicas e administrativas razoáveis para proteger dados pessoais.
          Ainda assim, nenhum ambiente digital é totalmente invulnerável.
        </p>
      ),
    },
    {
      id: "uso-comercial",
      title: "Uso comercial",
      content: (
        <p>
          Clientes comerciais são responsáveis pelos dados que inserem na plataforma e pela base
          legal aplicável quando houver dados de terceiros.
        </p>
      ),
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
          E-mail: {legalCompany.privacyEmail}
          <br />
          Foro: {legalCompany.forum}
        </p>
      ),
    },
  ];

  return (
    <LegalLayout
      title="Política de Privacidade"
      description="Como tratamos dados pessoais, como usamos recursos de IA e quais direitos você pode exercer em relação às suas informações."
      icon={ShieldCheck}
      sections={sections}
    />
  );
}
