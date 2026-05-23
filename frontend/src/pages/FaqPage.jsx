import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, MessageCircle, Zap } from "lucide-react";
import PublicLayout from "../components/PublicLayout";

const FAQ_GROUPS = [
  {
    group: "Sobre o sistema",
    items: [
      {
        q: "O que é o ML SmartHub?",
        a: "O ML SmartHub é uma plataforma SaaS para vendedores do Mercado Livre que automatiza o monitoramento de preços, acompanhamento de concorrentes, gestão de catálogo e comunicação com clientes. Tudo em um único painel, sem precisar alternar entre abas ou fazer comparações manuais.",
      },
      {
        q: "Para quem é indicado?",
        a: "Para qualquer pessoa que venda no Mercado Livre — desde pequenos empreendedores que querem acompanhar preços com mais eficiência até grandes operações com equipes e múltiplas contas conectadas.",
      },
      {
        q: "Preciso instalar alguma coisa?",
        a: "Não. O ML SmartHub é 100% online. Basta criar uma conta e acessar pelo navegador. Não há aplicativo para baixar nem configuração de servidor.",
      },
    ],
  },
  {
    group: "Funcionalidades",
    items: [
      {
        q: "Como funciona o monitoramento de links?",
        a: "Você cadastra os links dos produtos que deseja acompanhar — seus próprios anúncios ou os dos concorrentes. O sistema verifica automaticamente, de acordo com o intervalo configurado (padrão: a cada hora), e exibe histórico de preço, posição e estoque.",
      },
      {
        q: "O que é o Monitor de Sellers?",
        a: "É uma funcionalidade que acompanha todos os produtos de um vendedor específico no Mercado Livre. Quando um novo produto aparece ou o preço de um existente muda, você recebe um alerta. Ideal para ficar de olho nos concorrentes estratégicos.",
      },
      {
        q: "Como funciona a Análise de Preços (XML)?",
        a: "O sistema gera um arquivo XML compatível com ferramentas de precificação como o Bling, Tiny e outros ERPs. Você importa o XML e tem os preços da concorrência já organizados para tomar decisões de reprecificação.",
      },
      {
        q: "Posso conectar mais de uma conta do Mercado Livre?",
        a: "Sim! Nos planos Pro e Business você pode conectar múltiplas contas ML e gerenciá-las pelo mesmo painel. Ideal para operações com mais de uma loja ou marca.",
      },
      {
        q: "Como funciona a gestão de perguntas do Mercado Livre?",
        a: "No plano Business, o sistema sincroniza as perguntas dos compradores das suas contas ML conectadas. Você responde diretamente pela plataforma, pode criar templates de respostas e acompanhar o histórico por comprador.",
      },
    ],
  },
  {
    group: "Conta e planos",
    items: [
      {
        q: "O plano gratuito tem limite de tempo?",
        a: "Não. O plano Gratuito é permanente e não expira. Você pode usar com até 10 links monitorados e 1 seller monitorado sem pagar nada.",
      },
      {
        q: "Posso mudar de plano a qualquer momento?",
        a: "Sim. Você pode fazer upgrade imediatamente pelo painel de Planos. O downgrade é aplicado ao fim do período de cobrança atual, sem cobranças adicionais.",
      },
      {
        q: "Como funciona a gestão do time?",
        a: "O dono da conta (owner) pode adicionar usuários membros ou administradores, definir permissões individuais e criar times para organizar o acesso. Cada plano tem um limite de usuários e times.",
      },
      {
        q: "O pagamento é seguro?",
        a: "Sim. Todo o processamento de pagamento é feito pelo Stripe, uma das maiores plataformas de pagamento do mundo. O ML SmartHub não armazena dados do seu cartão.",
      },
      {
        q: "Posso cancelar quando quiser?",
        a: "Sim, sem multa e sem burocracia. Você cancela pelo portal de cobrança dentro da plataforma e a assinatura fica ativa até o fim do período já pago.",
      },
    ],
  },
  {
    group: "Segurança e privacidade",
    items: [
      {
        q: "Meus cookies do Mercado Livre ficam seguros?",
        a: "Seus cookies são armazenados de forma criptografada e utilizados exclusivamente para fazer as consultas no Mercado Livre em seu nome. Nunca são compartilhados com terceiros.",
      },
      {
        q: "O ML SmartHub acessa minha conta ML para fazer compras ou alterações?",
        a: "Não. O sistema usa os cookies apenas para leitura de dados (preços, produtos, perguntas). Nenhuma ação de compra, venda ou modificação de anúncio é realizada automaticamente.",
      },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`border border-gray-100 rounded-xl overflow-hidden transition-all ${open ? "shadow-sm" : ""}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 bg-white">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <PublicLayout noPadding>
      <div className="px-4 py-12 max-w-3xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-brand-100 text-brand-700 text-xs font-semibold rounded-full mb-4 uppercase tracking-wider">
            FAQ
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Perguntas frequentes</h1>
          <p className="text-gray-500 text-lg">
            Tudo que você precisa saber antes de começar.
          </p>
        </div>

        {/* Accordion por grupo */}
        <div className="space-y-8">
          {FAQ_GROUPS.map((group) => (
            <div key={group.group}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                {group.group}
              </h2>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Ainda com dúvidas? */}
        <div className="mt-14 bg-gradient-to-br from-brand-50 to-white rounded-2xl border border-brand-100 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-100 mb-4">
            <MessageCircle size={22} className="text-brand-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Ainda tem dúvidas?</h3>
          <p className="text-gray-500 text-sm mb-5">
            Crie sua conta gratuitamente e explore a plataforma por conta própria.
            O plano gratuito não tem limite de tempo.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Zap size={16} />
            Criar conta grátis
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
