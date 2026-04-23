import { FileText } from "lucide-react";
import { legalCompany } from "@/content/legal";
import LegalLayout, { LegalSection } from "@/pages/legal/LegalLayout";

export default function TermsOfService() {
  const sections: LegalSection[] = [
    {
      id: "quem-somos",
      title: "Quem somos",
      description: "Identificação da empresa responsável pela operação da plataforma.",
      content: (
        <p>
          Sommelyx é operada por <strong>{legalCompany.legalName}</strong>, inscrita no CNPJ{" "}
          <strong>{legalCompany.cnpj}</strong>, com sede em <strong>{legalCompany.address}</strong>.
          Contato: <strong>{legalCompany.email}</strong>.
        </p>
      ),
    },
    {
      id: "o-que-a-plataforma-oferece",
      title: "O que a plataforma oferece",
      description: "Escopo funcional do produto para uso pessoal e comercial.",
      content: (
        <>
          <p>A plataforma permite, entre outras funcionalidades:</p>
          <ul>
            <li>cadastrar e organizar vinhos;</li>
            <li>gerenciar adega e estoque;</li>
            <li>enviar imagens de rótulos;</li>
            <li>enviar PDFs, cartas de vinho e cardápios;</li>
            <li>usar recursos de IA para análise, identificação e recomendações;</li>
            <li>operar fluxos comerciais, como inventário, localização, custo e preço.</li>
          </ul>
        </>
      ),
    },
    {
      id: "conta-e-acesso",
      title: "Conta e acesso",
      description: "Responsabilidades básicas do usuário ao usar a plataforma.",
      content: (
        <>
          <p>Você é responsável por:</p>
          <ul>
            <li>manter suas credenciais seguras;</li>
            <li>fornecer informações corretas e atualizadas;</li>
            <li>responder por toda atividade realizada em sua conta.</li>
          </ul>
          <p>Se identificar uso indevido, avise a Sommelyx imediatamente.</p>
        </>
      ),
    },
    {
      id: "conteudo-enviado",
      title: "Conteúdo enviado pelo usuário",
      description: "Como tratamos uploads e qual permanece sendo a sua responsabilidade.",
      content: (
        <>
          <p>
            Você pode enviar conteúdos como imagens, PDFs, textos, listas e dados de vinhos. Você
            continua sendo responsável por esse conteúdo, incluindo sua legalidade, precisão e eventual
            autorização de uso.
          </p>
          <p>
            Ao utilizar a plataforma, você autoriza a Sommelyx a armazenar, processar, organizar,
            converter e analisar esse conteúdo na medida necessária para prestar o serviço.
          </p>
        </>
      ),
    },
    {
      id: "uso-de-ia",
      title: "Uso de IA",
      description: "Como os recursos de inteligência artificial apoiam a experiência no produto.",
      content: (
        <>
          <p>
            A Sommelyx utiliza inteligência artificial para processar dados enviados pelo usuário,
            inclusive imagens, textos, PDFs e dados estruturados.
          </p>
          <p>
            Os resultados gerados por IA têm caráter assistivo. Eles podem conter imprecisões, omissões
            ou interpretações inadequadas. As saídas da IA:
          </p>
          <ul>
            <li>não são garantia;</li>
            <li>não substituem validação humana;</li>
            <li>não substituem julgamento profissional, comercial ou técnico.</li>
          </ul>
          <p>Você é responsável por revisar os resultados antes de tomar decisões com base neles.</p>
        </>
      ),
    },
    {
      id: "uso-comercial",
      title: "Uso comercial",
      description: "Responsabilidades específicas de usuários que operam a plataforma no contexto de negócio.",
      content: (
        <>
          <p>Se você utiliza a plataforma em contexto comercial, continua sendo responsável por:</p>
          <ul>
            <li>estoque;</li>
            <li>localização;</li>
            <li>custos;</li>
            <li>preços;</li>
            <li>margens;</li>
            <li>disponibilidade;</li>
            <li>exatidão dos cadastros e operações.</li>
          </ul>
          <p>A Sommelyx não assume responsabilidade pela gestão operacional do seu negócio.</p>
        </>
      ),
    },
    {
      id: "uso-permitido",
      title: "Uso permitido",
      description: "Condições mínimas para uso adequado da plataforma.",
      content: (
        <>
          <p>Você concorda em não:</p>
          <ul>
            <li>usar a plataforma de forma ilícita, abusiva ou fraudulenta;</li>
            <li>inserir conteúdo que viole direitos de terceiros;</li>
            <li>tentar acessar sistemas ou dados sem autorização;</li>
            <li>interferir na segurança ou estabilidade da plataforma.</li>
          </ul>
        </>
      ),
    },
    {
      id: "assinaturas-e-planos",
      title: "Assinaturas e planos",
      content: (
        <p>
          Algumas funcionalidades podem depender de plano pago. As regras de cobrança, renovação,
          cancelamento e inadimplência estão descritas nos Termos de Assinatura e Cobrança.
        </p>
      ),
    },
    {
      id: "disponibilidade-e-seguranca",
      title: "Disponibilidade e segurança",
      content: (
        <>
          <p>
            A Sommelyx adota medidas razoáveis de segurança e boas práticas técnicas. Ainda assim,
            nenhum sistema é totalmente livre de falhas ou riscos.
          </p>
          <p>
            Podemos atualizar, alterar, limitar ou suspender partes da plataforma por razões técnicas,
            operacionais, legais ou de segurança.
          </p>
        </>
      ),
    },
    {
      id: "limitacao-de-responsabilidade",
      title: "Limitação de responsabilidade",
      content: (
        <>
          <p>Na máxima extensão permitida pela lei, a Sommelyx não se responsabiliza por:</p>
          <ul>
            <li>decisões tomadas exclusivamente com base em IA;</li>
            <li>erros em dados enviados pelo usuário;</li>
            <li>perdas comerciais, operacionais ou financeiras;</li>
            <li>indisponibilidade causada por terceiros ou infraestrutura externa;</li>
            <li>uso indevido da plataforma pelo usuário.</li>
          </ul>
        </>
      ),
    },
    {
      id: "encerramento",
      title: "Encerramento",
      content: (
        <p>
          Podemos suspender ou encerrar contas em caso de violação destes Termos, uso abusivo,
          fraude, risco de segurança ou inadimplência.
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
          E-mail: {legalCompany.email}
          <br />
          Foro: {legalCompany.forum}
        </p>
      ),
    },
  ];

  return (
    <LegalLayout
      title="Termos de Uso"
      description="Como a plataforma funciona, quais são as responsabilidades de cada parte e quais limites se aplicam ao uso do serviço."
      icon={FileText}
      sections={sections}
    />
  );
}
