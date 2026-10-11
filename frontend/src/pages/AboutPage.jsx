import { Link } from "react-router-dom";
import {
  BarChart2, ShieldCheck, Zap, Users, TrendingUp, Globe, Sparkles, LineChart, ArrowRight
} from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import SEO from "../components/SEO";

const DIFFERENTIALS = [
  {
    icon: BarChart2,
    title: "Dados em tempo real",
    description:
      "Acompanhe preços, estoque e variações dos seus produtos e concorrentes diretamente do Mercado Livre, com atualizações automáticas e histórico completo.",
    color: "bg-brandSolid-500/10 text-brandSolid-300",
  },
  {
    icon: TrendingUp,
    title: "Monitor de concorrentes",
    description:
      "Descubra quem disputa os mesmos catálogos que você e receba alertas quando concorrentes mudarem preços ou entrarem em novos produtos.",
    color: "bg-violet-500/10 text-violet-300",
  },
  {
    icon: Zap,
    title: "Automação inteligente",
    description:
      "Scraping automatizado com cron configurável, análise de preços da concorrência organizada automaticamente, catálogo integrado e respostas automáticas de perguntas.",
    color: "bg-warn/10 text-warn",
  },
  {
    icon: Users,
    title: "Gestão de equipes",
    description:
      "Adicione membros ao seu time com permissões granulares. Cada colaborador acessa apenas o que precisa, com controle total pelo administrador.",
    color: "bg-neon/10 text-neon",
  },
  {
    icon: ShieldCheck,
    title: "Segurança e privacidade",
    description:
      "Seus dados e credenciais do Mercado Livre ficam protegidos com criptografia. Nunca compartilhamos suas informações com terceiros.",
    color: "bg-danger/10 text-danger",
  },
  {
    icon: Globe,
    title: "Multi-contas Mercado Livre",
    description:
      "Conecte múltiplas contas do ML em um único painel. Ideal para operações com várias lojas ou marcas distintas.",
    color: "bg-violet-500/10 text-violet-300",
  },
  {
    icon: LineChart,
    title: "Analytics & Vendas ML",
    description:
      "Visualize métricas de vendas, faturamento e reputação das suas contas ML em um único painel. Acompanhe os top produtos, histórico de pedidos e alertas de estoque em tempo real.",
    color: "bg-brandSolid-500/10 text-brandSolid-300",
  },
  {
    icon: Sparkles,
    title: "Insights por IA",
    description:
      "Com um clique, a IA analisa os dados de vendas do período e retorna recomendações priorizadas: oportunidades de crescimento, sugestões de campanha e alertas críticos de estoque. Disponível em todos os planos pagos.",
    color: "bg-violet-500/10 text-violet-300",
  },
];

const STATS = [
  { value: "24/7", label: "Monitoramento automático" },
  { value: "1h", label: "Intervalo padrão de scraping" },
  { value: "4", label: "Planos disponíveis" },
  { value: "100%", label: "Web — sem instalação" },
];

export default function AboutPage() {
  return (
    <PublicLayout noPadding>
      <SEO
        title="Sobre Nós"
        description="Conheça o ML SmartHub e como ajudamos vendedores do Mercado Livre a crescerem com dados e automação."
        canonical="/about-us"
      />
      <div className="px-4 py-12 max-w-5xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 bg-brandSolid-500/15 text-brandSolid-300 text-xs font-semibold rounded-full mb-4">
            Sobre Nós
          </span>
          <h1 className="text-4xl sm:text-5xl font-semibold text-fg mb-4 leading-tight">
            Inteligência para quem vende<br className="hidden sm:block" /> no Mercado Livre
          </h1>
          <p className="text-fg-muted text-lg max-w-2xl mx-auto leading-relaxed">
            O <strong className="text-fg/90">ML SmartHub</strong> nasceu da necessidade real de vendedores que
            precisavam de dados confiáveis, automação e visibilidade sobre a concorrência — tudo em um único lugar.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {STATS.map((s) => (
            <div key={s.label} className="glass rounded-2xl border border-line/10 p-5 text-center shadow-sm">
              <div className="text-3xl font-bold text-brandSolid-300 mb-1">{s.value}</div>
              <div className="text-sm text-fg-muted">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Nossa missão */}
        <div className="glass hud-corners relative overflow-hidden rounded-2xl p-8 sm:p-10 text-fg mb-16 bg-gradient-to-br from-brandSolid-500/25 via-brandSolid-500/10 to-transparent">
          <h2 className="text-2xl font-bold mb-3">Nossa missão</h2>
          <p className="text-fg-muted text-lg leading-relaxed max-w-3xl">
            Democratizar o acesso a ferramentas de inteligência competitiva para vendedores de todos os tamanhos.
            Acreditamos que qualquer lojista — do pequeno empreendedor ao grande atacadista — merece tecnologia
            de ponta para crescer com segurança e eficiência no maior marketplace da América Latina.
          </p>
        </div>

        {/* Diferenciais */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-fg">Por que o ML SmartHub?</h2>
            <p className="text-fg-muted mt-2">Ferramentas construídas por quem conhece o dia a dia do vendedor</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DIFFERENTIALS.map((item) => (
              <div key={item.title} className="glass rounded-2xl border border-line/10 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-4 ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <h3 className="text-base font-bold text-fg mb-2">{item.title}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Nossa história */}
        <div className="bg-ink/[0.03] rounded-2xl border border-line/10 p-8 mb-16">
          <h2 className="text-2xl font-bold text-fg mb-4">Nossa história</h2>
          <div className="space-y-4 text-fg-muted leading-relaxed">
            <p>
              O ML SmartHub surgiu em 2024 a partir de uma dor real: vendedores profissionais gastavam horas
              por dia em planilhas, abas abertas e comparações manuais para entender o que estava acontecendo
              com seus produtos e concorrentes no Mercado Livre.
            </p>
            <p>
              Nossa equipe de desenvolvedores especializados em e-commerce construiu uma plataforma que automatiza
              esse trabalho — coleta de dados, análise de preços, monitoramento de sellers e gestão de perguntas —
              permitindo que os vendedores foquem no que realmente importa: crescer o negócio.
            </p>
            <p>
              A plataforma foi pensada para crescer junto com o vendedor — do pequeno empreendedor que
              está começando até operações com múltiplas contas e equipes dedicadas.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-fg mb-3">Pronto para experimentar?</h2>
          <p className="text-fg-muted mb-6">Crie sua conta grátis e explore a plataforma sem compromisso.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brandSolid-500 hover:bg-brandSolid-400 text-white font-medium rounded-xl transition-colors shadow-glow-brand"
            >
              <Zap size={18} />
              Criar conta grátis
            </Link>
            <Link
              to="/price"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 glass border border-line/15 text-fg/90 font-medium rounded-xl hover:bg-ink/[0.03] transition-colors"
            >
              Ver planos
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
