import { Link } from "react-router-dom";
import {
  Link2, LineChart, Store, Package, MessageCircle,
  ArrowRight, Lightbulb, ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const MODULES = [
  {
    id: "links",
    module: "links",
    step: "Passo 1",
    icon: Link2,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    borderColor: "border-blue-200",
    bgLight: "bg-blue-50",
    label: "Links",
    tagline: "Base de tudo — monitore preços de concorrentes",
    to: "/links",
    what: "Adicione URLs de produtos do Mercado Livre para monitorar preços automaticamente. O sistema extrai preço atual, nome do produto, seller e mantém um histórico das últimas 20 atualizações.",
    steps: [
      'Clique em "Novo link" e cole a URL do produto no ML (mercadolivre.com ou mercadolibre.com)',
      "Informe seu preço de referência para acompanhar a margem em relação à concorrência",
      "Adicione tags para organizar seus links por categoria, marca ou coleção",
      "O sistema atualiza os preços automaticamente; acompanhe as variações e o histórico em tempo real",
    ],
    tip: "Configure seus sellers em Configurações → Meus Sellers para que o sistema reconheça seus produtos na Análise de Preços.",
  },
  {
    id: "price-analyze",
    module: "priceAnalyze",
    step: "Passo 2",
    icon: LineChart,
    color: "bg-sky-500",
    textColor: "text-sky-600",
    borderColor: "border-sky-200",
    bgLight: "bg-sky-50",
    label: "Análise de Preços",
    tagline: "Inteligência competitiva agrupada por SKU",
    to: "/price-analyze",
    what: "Agrupa todos os seus links por SKU e compara seus preços com os da concorrência. Gera recomendações automáticas quando a diferença for maior que 10% e pode exportar um XML no padrão do sistema.",
    steps: [
      "Certifique-se de ter links cadastrados antes de usar este módulo",
      'Clique em "Análise Rápida" para ver os grupos por SKU usando dados já salvos',
      'Ou clique em "Gerar XML" para fazer uma nova varredura completa e baixar o arquivo',
      "Revise as recomendações — o sistema sugere ajustes quando seu preço diverge >10% da média dos concorrentes",
    ],
    tip: "A análise rápida usa dados já salvos nos links. Use Gerar XML quando precisar de dados 100% atualizados para exportação.",
  },
  {
    id: "seller-monitor",
    module: "sellerMonitor",
    step: "Módulo independente",
    icon: Store,
    color: "bg-teal-500",
    textColor: "text-teal-600",
    borderColor: "border-teal-200",
    bgLight: "bg-teal-50",
    label: "Monitor de Sellers",
    tagline: "Vigilância completa da página de um concorrente",
    to: "/seller-monitor",
    what: "Monitora toda a vitrine de um vendedor no ML — não apenas um produto, mas todos os produtos da página. Gera alertas automáticos quando novos produtos aparecem ou preços mudam.",
    steps: [
      'Clique em "Adicionar seller" e cole a URL da página do vendedor no ML',
      "O sistema faz scraping de todos os produtos listados naquela página",
      "Alertas são gerados automaticamente: novo produto ou mudança de preço",
      "Marque alertas como lidos individualmente ou todos de uma vez",
    ],
    tip: "Use para acompanhar concorrentes estratégicos completos, não apenas produtos pontuais. Ideal para descobrir quando um seller lança novidades.",
  },
  {
    id: "catalog",
    module: "catalog",
    step: "Módulo independente",
    icon: Package,
    color: "bg-orange-500",
    textColor: "text-orange-600",
    borderColor: "border-orange-200",
    bgLight: "bg-orange-50",
    label: "Dimensões e Peso",
    tagline: "Validação de pacotes de envio no padrão ML",
    to: "/catalog",
    what: "Cadastre seus produtos com SKU, dimensões (L×C×A em cm) e peso (kg). Use o verificador de pacote para validar se um conjunto de produtos cabe em uma caixa e se o peso informado na embalagem está correto — usando as fórmulas oficiais do Mercado Livre.",
    steps: [
      "Importe via XLSX ou adicione produtos manualmente com SKU + dimensões + peso",
      "O peso cúbico é calculado automaticamente: (L×C×A) ÷ 6000",
      'Acesse "Verificar Pacote", informe as dimensões da caixa e o peso declarado',
      "Selecione os produtos e quantidades que serão colocados na caixa",
      "O sistema calcula o cubado da caixa (÷5900), compara com o limite dos produtos e verifica a diferença de peso (margem de 5%)",
    ],
    tip: "O divisor do produto é 6000 e o da caixa é 5900 — padrão do ML. O sistema aceita divergências de até 5% no peso sem reprovar o pacote.",
  },
  {
    id: "meliMessages",
    module: "meliMessages",
    step: "Plano Business",
    icon: MessageCircle,
    color: "bg-indigo-500",
    textColor: "text-indigo-600",
    borderColor: "border-indigo-200",
    bgLight: "bg-indigo-50",
    label: "Mensagens ML",
    tagline: "Gestão de perguntas do Mercado Livre",
    to: "/meli/messages",
    what: "Gerencie todas as perguntas de compradores do Mercado Livre diretamente pelo sistema. Suporte a múltiplas contas, templates de resposta com hashtag para autocomplete, sugestões automáticas de resposta e inserção de links de produtos.",
    steps: [
      "Conecte suas contas do Mercado Livre em Contas conectadas antes de usar este módulo",
      "Acesse Mensagens ML e selecione a conta desejada no topo da tela",
      "Filtre entre perguntas pendentes e respondidas",
      "Responda diretamente ou use os templates — digite # para acionar o autocomplete",
      "Use as sugestões automáticas para agilizar respostas baseadas no contexto da pergunta",
    ],
    tip: "Crie templates de resposta com # para acionar o autocomplete. Nomeie-os de forma descritiva para encontrá-los rapidamente durante o atendimento.",
  },
];

function ModuleCard({ mod }) {
  const [open, setOpen] = useState(false);
  const Icon = mod.icon;

  return (
    <div className={`border ${mod.borderColor} rounded-xl overflow-hidden bg-white`}>
      {/* Header clicável */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-10 h-10 rounded-lg ${mod.color} flex items-center justify-center shrink-0`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold uppercase tracking-wide ${mod.textColor}`}>{mod.step}</span>
          </div>
          <p className="font-semibold text-gray-900">{mod.label}</p>
          <p className="text-sm text-gray-500">{mod.tagline}</p>
        </div>
        {open
          ? <ChevronUp size={18} className="text-gray-400 shrink-0" />
          : <ChevronDown size={18} className="text-gray-400 shrink-0" />
        }
      </button>

      {/* Conteúdo expansível */}
      {open && (
        <div className={`px-5 pb-5 border-t ${mod.borderColor}`}>
          {/* O que é */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">O que é</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{mod.what}</p>
          </div>

          {/* Como usar */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Como usar</h4>
            <ol className="space-y-2">
              {mod.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className={`shrink-0 w-5 h-5 rounded-full ${mod.color} text-white text-xs flex items-center justify-center font-bold mt-0.5`}>
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Dica */}
          <div className={`mt-4 flex gap-3 ${mod.bgLight} rounded-lg p-3`}>
            <Lightbulb size={16} className={`${mod.textColor} shrink-0 mt-0.5`} />
            <p className="text-sm text-gray-700 leading-relaxed">{mod.tip}</p>
          </div>

          {/* Link para a página */}
          <div className="mt-4">
            <Link
              to={mod.to}
              className={`inline-flex items-center gap-2 text-sm font-medium ${mod.textColor} hover:underline`}
            >
              Ir para {mod.label}
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const { canAccess } = useAuth();
  const visibleModules = MODULES.filter((m) => canAccess(m.module));

  return (
    <div className="max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📘 Como o ML Smart Hub funciona</h1>
        <p className="text-gray-500 mt-1">Guia completo dos módulos e fluxo de trabalho do sistema</p>
      </div>

      {/* Fluxo visual */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">Fluxo principal</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Links */}
          <div className="flex flex-col items-center text-center min-w-[120px]">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center mb-2">
              <Link2 size={22} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Links</span>
            <span className="text-xs text-gray-500 mt-0.5">Adicione URLs de<br />produtos ML</span>
          </div>

          <div className="flex flex-col items-center text-gray-300 sm:rotate-0">
            <ArrowRight size={24} className="hidden sm:block" />
            <ArrowRight size={24} className="block sm:hidden rotate-90" />
            <span className="text-xs text-gray-400 mt-1">alimenta</span>
          </div>

          {/* Análise de Preços */}
          <div className="flex flex-col items-center text-center min-w-[120px]">
            <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center mb-2">
              <LineChart size={22} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">Análise de Preços</span>
            <span className="text-xs text-gray-500 mt-0.5">Grupos por SKU<br />e recomendações</span>
          </div>
        </div>

        {/* Módulos independentes */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Módulos independentes</h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center">
                <Store size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Monitor de Sellers</p>
                <p className="text-xs text-gray-500">Monitora vitrines completas de vendedores</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Package size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Dimensões e Peso</p>
                <p className="text-xs text-gray-500">Valida pacotes de envio no padrão ML</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                <MessageCircle size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Mensagens ML</p>
                <p className="text-xs text-gray-500">Gestão de perguntas de compradores</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards detalhados por módulo — filtrados pelo plano */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Detalhes dos seus módulos</h2>
      <div className="space-y-3">
        {visibleModules.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} />
        ))}
      </div>

      {/* Rodapé */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
        <p className="text-sm text-gray-500">
          Dúvidas adicionais?{" "}
          <a href="/faq" className="text-brand-600 font-medium hover:underline">
            Acesse o FAQ público →
          </a>
        </p>
      </div>
    </div>
  );
}
