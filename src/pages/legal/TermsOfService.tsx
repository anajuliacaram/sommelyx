import LegalLayout from "@/pages/legal/LegalLayout";
import { legalCompany } from "@/content/legal";

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Termos de Uso"
      description="Estes Termos regulam o acesso e o uso da plataforma Sommelyx para usuários pessoais e comerciais."
    >
      <p>
        A Sommelyx é uma plataforma SaaS para gestão de adega, inventário de vinhos e experiências
        assistidas por inteligência artificial, disponível para uso pessoal e comercial.
      </p>
      <p>Ao criar uma conta ou utilizar a plataforma, você concorda com estes Termos.</p>

      <h2>1. Quem somos</h2>
      <p>
        Sommelyx é operada por <strong>{legalCompany.legalName}</strong>, inscrita no CNPJ{" "}
        <strong>{legalCompany.cnpj}</strong>, com sede em <strong>{legalCompany.address}</strong>.
        Contato: <strong>{legalCompany.email}</strong>.
      </p>

      <h2>2. O que a plataforma oferece</h2>
      <p>A plataforma permite, entre outras funcionalidades:</p>
      <ul>
        <li>cadastrar e organizar vinhos;</li>
        <li>gerenciar adega e estoque;</li>
        <li>enviar imagens de rótulos;</li>
        <li>enviar PDFs, cartas de vinho e cardápios;</li>
        <li>usar recursos de IA para análise, identificação e recomendações;</li>
        <li>operar fluxos comerciais, como inventário, localização, custo e preço.</li>
      </ul>

      <h2>3. Conta e acesso</h2>
      <p>Você é responsável por:</p>
      <ul>
        <li>manter suas credenciais seguras;</li>
        <li>fornecer informações corretas e atualizadas;</li>
        <li>responder por toda atividade realizada em sua conta.</li>
      </ul>
      <p>Se identificar uso indevido, avise a Sommelyx imediatamente.</p>

      <h2>4. Conteúdo enviado pelo usuário</h2>
      <p>
        Você pode enviar conteúdos como imagens, PDFs, textos, listas e dados de vinhos. Você
        continua sendo responsável por esse conteúdo, incluindo sua legalidade, precisão e eventual
        autorização de uso.
      </p>
      <p>
        Ao utilizar a plataforma, você autoriza a Sommelyx a armazenar, processar, organizar,
        converter e analisar esse conteúdo na medida necessária para prestar o serviço.
      </p>

      <h2>5. Uso de IA</h2>
      <p>
        A Sommelyx utiliza inteligência artificial para processar dados enviados pelo usuário,
        inclusive imagens, textos, PDFs e dados estruturados.
      </p>
      <p>Os resultados gerados por IA têm caráter assistivo. Eles podem conter imprecisões, omissões ou interpretações inadequadas. As saídas da IA:</p>
      <ul>
        <li>não são garantia;</li>
        <li>não substituem validação humana;</li>
        <li>não substituem julgamento profissional, comercial ou técnico.</li>
      </ul>
      <p>Você é responsável por revisar os resultados antes de tomar decisões com base neles.</p>

      <h2>6. Uso comercial</h2>
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

      <h2>7. Uso permitido</h2>
      <p>Você concorda em não:</p>
      <ul>
        <li>usar a plataforma de forma ilícita, abusiva ou fraudulenta;</li>
        <li>inserir conteúdo que viole direitos de terceiros;</li>
        <li>tentar acessar sistemas ou dados sem autorização;</li>
        <li>interferir na segurança ou estabilidade da plataforma.</li>
      </ul>

      <h2>8. Assinaturas e planos</h2>
      <p>
        Algumas funcionalidades podem depender de plano pago. As regras de cobrança, renovação,
        cancelamento e inadimplência estão descritas nos Termos de Assinatura e Cobrança.
      </p>

      <h2>9. Disponibilidade e segurança</h2>
      <p>
        A Sommelyx adota medidas razoáveis de segurança e boas práticas técnicas. Ainda assim,
        nenhum sistema é totalmente livre de falhas ou riscos.
      </p>
      <p>
        Podemos atualizar, alterar, limitar ou suspender partes da plataforma por razões técnicas,
        operacionais, legais ou de segurança.
      </p>

      <h2>10. Limitação de responsabilidade</h2>
      <p>Na máxima extensão permitida pela lei, a Sommelyx não se responsabiliza por:</p>
      <ul>
        <li>decisões tomadas exclusivamente com base em IA;</li>
        <li>erros em dados enviados pelo usuário;</li>
        <li>perdas comerciais, operacionais ou financeiras;</li>
        <li>indisponibilidade causada por terceiros ou infraestrutura externa;</li>
        <li>uso indevido da plataforma pelo usuário.</li>
      </ul>

      <h2>11. Encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas em caso de violação destes Termos, uso abusivo,
        fraude, risco de segurança ou inadimplência.
      </p>

      <h2>12. Contato</h2>
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
    </LegalLayout>
  );
}
