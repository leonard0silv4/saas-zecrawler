import dotenv from "dotenv";
dotenv.config();

export const TRIAL_DAYS = 10;

export const PLANS = {
  free: {
    name: "Gratuito",
    slug: "free",
    price: 0,
    maxLinks: 5,
    maxSellerMonitors: 1,
    maxTeamUsers: 1,
    maxTeams: 1,
    maxMeliAccounts: 0,
    stripePriceId: null, // free = no Stripe price
    features: ["Acompanhamento de links", "Análise de preços (XML)", "Dashboard básico", "Monitor de sellers (1 seller)"],
  },
  starter: {
    name: "Starter",
    slug: "starter",
    price: 99.9,
    trialDays: TRIAL_DAYS,
    maxLinks: 30,
    maxSellerMonitors: 5,
    maxTeamUsers: 2,
    maxTeams: 1,
    maxMeliAccounts: 1,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
    features: [
      "Acompanhamento de links",
      "Análise de preços",
      "Dashboard completo",
      "1 conta conectada ML",
      "Monitor de sellers (até 5)",
    ],
  },
  pro: {
    name: "Pro",
    slug: "pro",
    price: 139.9,
    trialDays: TRIAL_DAYS,
    maxLinks: 50,
    maxSellerMonitors: 10,
    maxTeamUsers: 6,
    maxTeams: 3,
    maxMeliAccounts: 3,
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    features: [
      "Tudo do Starter",
      "Até 3 contas ML",
      "Monitor de sellers (até 10)",
      "Catálogo de produtos",
      "Analytics & Vendas ML",
      "Inteligência de Estoque Full + Ruptura",
    ],
  },
  business: {
    name: "Business",
    slug: "business",
    price: 199.9,
    trialDays: TRIAL_DAYS,
    maxLinks: 200,
    maxSellerMonitors: 20,
    maxTeamUsers: 20,
    maxTeams: 10,
    maxMeliAccounts: 10,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || "",
    features: [
      "Tudo do Pro",
      "Até 10 contas ML",
      "Mensagens Mercado Livre",
      "Central de Perguntas Multi-Contas",
      "Monitor de sellers (até 20)",
    ],
  },
};

/**
 * Reverse lookup: Stripe Price ID → plan slug.
 */
export function planSlugByPriceId(priceId) {
  for (const [slug, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceId && plan.stripePriceId === priceId) return slug;
  }
  return null;
}

export const MODULES = {
  links: { name: "Acompanhamento de Links", plans: ["free", "starter", "pro", "business"] },
  priceAnalyze: { name: "Análise de Preços", plans: ["free", "starter", "pro", "business"] },
  catalog: { name: "Catálogo", plans: ["pro", "business"] },
  meli: { name: "Contas Mercado Livre", plans: ["starter", "pro", "business"] },
  meliMessages: { name: "Mensagens Mercado Livre", plans: ["business"] },
  meliAnalytics: { name: "Analytics & Vendas ML", plans: ["pro", "business"] },
  meliCatalog:   { name: "Catálogo ML",           plans: ["pro", "business"] },
  sellerMonitor: { name: "Monitor de Sellers", plans: ["free", "starter", "pro", "business"] },
};
