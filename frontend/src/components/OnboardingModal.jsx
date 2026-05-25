import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Link2, LineChart, Store, Package, MessageCircle, BarChart2, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const STORAGE_KEY = "onboarding_completed";

const SLIDES = [
  {
    id: "welcome",
    module: null, // sempre visível
    emoji: "🎉",
    title: "Bem-vindo ao ML Smart Hub!",
    subtitle: "Seu sistema de inteligência competitiva para o Mercado Livre",
    body: "Em poucos passos você vai entender como cada módulo funciona e como eles se conectam para te dar vantagem competitiva.",
    icon: null,
    color: null,
    tip: null,
  },
  {
    id: "links",
    module: "links",
    emoji: null,
    title: "Passo 1 — Links",
    subtitle: "A base de todo o sistema",
    body: "Adicione URLs de produtos do Mercado Livre que você quer monitorar. O sistema coleta preço, seller e mantém histórico automático.",
    icon: Link2,
    color: "bg-blue-500",
    tip: "Configure seus sellers em Configurações → Meus Sellers para que o sistema reconheça seus produtos na Análise de Preços.",
  },
  {
    id: "price-analyze",
    module: "priceAnalyze",
    emoji: null,
    title: "Passo 2 — Análise de Preços",
    subtitle: "Inteligência competitiva agrupada por SKU",
    body: "Com os links cadastrados, o sistema agrupa produtos por SKU e compara seus preços com os da concorrência — gerando recomendações automáticas quando a diferença for >10%.",
    icon: LineChart,
    color: "bg-sky-500",
    tip: "A análise rápida usa dados já salvos; use Gerar XML para uma varredura atualizada com dados frescos.",
  },
  {
    id: "seller-monitor",
    module: "sellerMonitor",
    emoji: null,
    title: "Monitor de Sellers",
    subtitle: "Vigilância completa de um concorrente",
    body: "Adicione a URL da página de um vendedor e o sistema monitora todos os produtos da vitrine — alertando quando novos produtos aparecem ou preços mudam.",
    icon: Store,
    color: "bg-teal-500",
    tip: "Ideal para acompanhar concorrentes estratégicos completos, não apenas produtos pontuais.",
  },
  {
    id: "catalog",
    module: "catalog",
    emoji: null,
    title: "Dimensões e Peso",
    subtitle: "Calculadora de pacotes de envio ML",
    body: "Cadastre seus produtos com SKU e dimensões. Use o Verificador de Pacote para validar se os itens cabem na caixa e se o peso declarado está correto — no padrão do Mercado Livre.",
    icon: Package,
    color: "bg-orange-500",
    tip: "Divisor do produto: 6000 | Divisor da caixa: 5900. Margem de peso aceita: 5%.",
  },
  {
    id: "meliAnalytics",
    module: "meliAnalytics",
    emoji: null,
    title: "Analytics ML — Exclusivo Business",
    subtitle: "Vendas, estoque Full e KPIs do seu negócio",
    body: "Monitore faturamento, liquidez do marketplace, ruptura de estoque Full, etiquetagem e ranking de produtos — tudo em um único painel. Disponível apenas no plano Business.",
    icon: BarChart2,
    color: "bg-green-600",
    tip: "Clique em Sincronizar ao entrar no módulo para trazer os pedidos mais recentes. Acesse a aba Estoque para ver alertas de Ruptura no Full.",
  },
  {
    id: "meliMessages",
    module: "meliMessages",
    emoji: null,
    title: "Mensagens ML",
    subtitle: "Gestão de perguntas do Mercado Livre",
    body: "Responda perguntas de compradores diretamente pelo sistema. Use templates com hashtags, sugestões de resposta automáticas e insira links de produtos nas respostas — tudo em um único lugar.",
    icon: MessageCircle,
    color: "bg-indigo-500",
    tip: "Crie templates de resposta com # para acionar o autocomplete e agilizar o atendimento de perguntas repetitivas.",
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { canAccess } = useAuth();

  // Filtra slides conforme módulos disponíveis para o plano do usuário
  const visibleSlides = SLIDES.filter((s) => s.module == null || canAccess(s.module));

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  function goToHelp() {
    finish();
    navigate("/ajuda");
  }

  if (!visible) return null;

  const slide = visibleSlides[step];
  const isFirst = step === 0;
  const isLast = step === visibleSlides.length - 1;
  const Icon = slide.icon;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Barra de progresso */}
        <div className="flex gap-1 p-4 pb-0">
          {visibleSlides.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-brand-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Botão fechar */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={finish}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Fechar e não mostrar novamente"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-6 pb-6">
          {/* Ícone / Emoji */}
          <div className="flex flex-col items-center text-center mb-6">
            {slide.emoji && (
              <span className="text-5xl mb-3">{slide.emoji}</span>
            )}
            {Icon && (
              <div className={`w-14 h-14 rounded-2xl ${slide.color} flex items-center justify-center mb-3`}>
                <Icon size={28} className="text-white" />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">{slide.title}</h2>
            <p className="text-sm text-brand-600 font-medium mt-1">{slide.subtitle}</p>
          </div>

          {/* Texto */}
          <p className="text-sm text-gray-600 leading-relaxed text-center">{slide.body}</p>

          {/* Dica */}
          {slide.tip && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">💡 Dica: </span>
                {slide.tip}
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between mt-6 gap-3">
            {/* Voltar */}
            {!isFirst ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={15} />
                Voltar
              </button>
            ) : (
              <button
                onClick={goToHelp}
                className="text-xs text-gray-400 hover:text-brand-600 hover:underline transition-colors"
              >
                Ver guia completo
              </button>
            )}

            {/* Próximo / Começar */}
            {isLast ? (
              <button
                onClick={finish}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                Começar a usar
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {isFirst ? "Conhecer o sistema" : "Próximo"}
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          {/* Contador discreto */}
          <p className="text-center text-xs text-gray-400 mt-4">
            {step + 1} de {visibleSlides.length}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
