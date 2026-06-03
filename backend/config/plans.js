import dotenv from "dotenv";
dotenv.config();

export const TRIAL_DAYS = 10;

export const PLANS = {
  free: {
    name: "Gratuito",
    slug: "free",
    price: 0,
    maxLinks: 10,
    maxSellerMonitors: 1,
    maxTeamUsers: 1,
    maxTeams: 1,
    stripePriceId: null, // free = no Stripe price
    features: ["Acompanhamento de links", "Análise de preços (XML)", "Dashboard básico", "Monitor de sellers (1 seller)"],
  },
  starter: {
    name: "Starter",
    slug: "starter",
    price: 19.9,
    trialDays: TRIAL_DAYS,
    maxLinks: 100,
    maxSellerMonitors: 3,
    maxTeamUsers: 5,
    maxTeams: 2,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
    features: [
      "Acompanhamento de links",
      "Análise de preços",
      "Dashboard completo",
      "Contas conectadas ML",
      "Monitor de sellers (até 3)",
    ],
  },
  pro: {
    name: "Pro",
    slug: "pro",
    price: 29.9,
    trialDays: TRIAL_DAYS,
    maxLinks: 500,
    maxSellerMonitors: 10,
    maxTeamUsers: 10,
    maxTeams: 5,
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    features: [
      "Tudo do Starter",
      "Monitor de sellers (até 10)",
      "Catálogo de produtos",
    ],
  },
  business: {
    name: "Business",
    slug: "business",
    price: 59.9,
    trialDays: TRIAL_DAYS,
    maxLinks: 1000,
    maxSellerMonitors: 20,
    maxTeamUsers: 30,
    maxTeams: 20,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || "",
    features: [
      "Tudo do Pro",
      "Multi-contas ML",
      "Mensagens Mercado Livre",
      "Analytics & Gestão de Vendas ML",
      "Gestão de Estoque Full + Ruptura",
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
  meliAnalytics: { name: "Analytics & Vendas ML", plans: ["business"] },
  sellerMonitor: { name: "Monitor de Sellers", plans: ["free", "starter", "pro", "business"] },
};
