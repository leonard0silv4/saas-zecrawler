import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

import AppLayout from "./components/AppLayout";
import PageLoader from "./components/PageLoader";
import { lazyPage } from "./lib/lazyPage";

// Cada página vira um arquivo separado, baixado só quando a rota é aberta.
const AdminPage = lazyPage(() => import("./pages/AdminPage"));
const LoginPage = lazyPage(() => import("./pages/LoginPage"));
const RegisterPage = lazyPage(() => import("./pages/RegisterPage"));
const PublicPricingPage = lazyPage(() => import("./pages/PublicPricingPage"));
const AboutPage = lazyPage(() => import("./pages/AboutPage"));
const FaqPage = lazyPage(() => import("./pages/FaqPage"));
const ForgotPasswordPage = lazyPage(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazyPage(() => import("./pages/ResetPasswordPage"));
const DashboardPage = lazyPage(() => import("./pages/DashboardPage"));
const PlansPage = lazyPage(() => import("./pages/PlansPage"));
const LinksPage = lazyPage(() => import("./pages/LinksPage"));
const CatalogPage = lazyPage(() => import("./pages/CatalogPage"));
const MeliPage = lazyPage(() => import("./pages/MeliPage"));
const MeliMessagesPage = lazyPage(() => import("./pages/MeliMessagesPage"));
const MeliAnalyticsPage = lazyPage(() => import("./pages/MeliAnalyticsPage"));
const MeliCatalogPage = lazyPage(() => import("./pages/MeliCatalogPage"));
const PriceAnalyzePage = lazyPage(() => import("./pages/PriceAnalyzePage"));
const SellerMonitorPage = lazyPage(() => import("./pages/SellerMonitorPage"));
const SettingsPage = lazyPage(() => import("./pages/SettingsPage"));
const TeamPage = lazyPage(() => import("./pages/TeamPage"));
const HelpPage = lazyPage(() => import("./pages/HelpPage"));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-void">
      <div className="w-9 h-9 rounded-full border-2 border-glow/15 border-t-glow animate-spin shadow-[0_0_24px_-4px_rgb(var(--glow)/0.7)]" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function ModuleRoute({ module, children }) {
  const { canAccess, loading } = useAuth();
  if (loading) return null;
  if (!canAccess(module)) return <Navigate to="/plans" replace />;
  return children;
}

function OwnerRoute({ children }) {
  const { isOwner, loading } = useAuth();
  if (loading) return null;
  if (!isOwner) return <Navigate to="/dashboard" replace />;
  return children;
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="bottom-right" theme={theme} richColors closeButton duration={5000} />;
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <ThemedToaster />
        <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          {/* Home → login (URL canônica limpa para o Google) */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Painel de administração (acesso por credenciais próprias no .env) */}
          <Route path="/hub-admin" element={<AdminPage />} />

          {/* Páginas públicas institucionais */}
          <Route path="/price" element={<PublicPricingPage />} />
          <Route path="/about-us" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          <Route element={<ProtectedRoute><NotificationProvider><AppLayout /></NotificationProvider></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ajuda" element={<HelpPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/links" element={<LinksPage />} />
            <Route path="/price-analyze" element={<PriceAnalyzePage />} />
            <Route path="/seller-monitor" element={<SellerMonitorPage />} />
            <Route path="/expedicao" element={<Navigate to="/dashboard" replace />} />
            <Route path="/nfe" element={<Navigate to="/dashboard" replace />} />
            <Route path="/catalog" element={<ModuleRoute module="catalog"><CatalogPage /></ModuleRoute>} />
            <Route exatc path="/meli" element={<MeliPage />} />
            <Route exatc path="/meli/messages" element={<ModuleRoute module="meliMessages"><MeliMessagesPage /></ModuleRoute>} />
            <Route path="/meli/analytics" element={<ModuleRoute module="meliAnalytics"><MeliAnalyticsPage /></ModuleRoute>} />
            <Route path="/meli/catalog-ml" element={<ModuleRoute module="meliCatalog"><MeliCatalogPage /></ModuleRoute>} />
            <Route path="/ml-cookies" element={<Navigate to="/meli" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/team" element={<OwnerRoute><TeamPage /></OwnerRoute>} />
            <Route path="/setup-cookies" element={<Navigate to="/meli" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
