export const PLANS = {
  free: {
    name: "Gratuito",
    slug: "free",
    price: 0,
    maxLinks: 10,
    stripePriceId: null, // free = no Stripe price
    features: ["Acompanhamento de links", "Análise de preços (XML)", "Dashboard básico"],
  },
  starter: {
    name: "Starter",
    slug: "starter",
    price: 19.9,
    maxLinks: 100,
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
    features: [
      "Acompanhamento de links",
      "Análise de preços",
      "Dashboard completo",
      "Notificações por email",
      "Cookies / sessão ML",
    ],
  },
  pro: {
    name: "Pro",
    slug: "pro",
    price: 29.9,
    maxLinks: 500,
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
    features: [
      "Tudo do Starter",
      "Monitor de sellers",
      "Catálogo de produtos",
    ],
  },
  business: {
    name: "Business",
    slug: "business",
    price: 59.9,
    maxLinks: 1000,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS || "",
    features: ["Tudo do Pro", "Multi-contas ML", "Monitor de sellers", "API access", "Suporte prioritário"],
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
  sellerMonitor: { name: "Monitor de Sellers", plans: ["pro", "business"] },
};
