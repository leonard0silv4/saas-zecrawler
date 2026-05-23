import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";

import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PublicPricingPage from "./pages/PublicPricingPage";
import AboutPage from "./pages/AboutPage";
import FaqPage from "./pages/FaqPage";
import DashboardPage from "./pages/DashboardPage";
import PlansPage from "./pages/PlansPage";
import LinksPage from "./pages/LinksPage";
import CatalogPage from "./pages/CatalogPage";
import MeliPage from "./pages/MeliPage";
import MeliMessagesPage from "./pages/MeliMessagesPage";
import SetupCookiesPage from "./pages/SetupCookiesPage";
import PriceAnalyzePage from "./pages/PriceAnalyzePage";
import SellerMonitorPage from "./pages/SellerMonitorPage";
import MlCookiesPage from "./pages/MlCookiesPage";
import SettingsPage from "./pages/SettingsPage";
import TeamPage from "./pages/TeamPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton duration={5000} />
        <Routes>
          {/* Páginas públicas institucionais */}
          <Route path="/precos" element={<PublicPricingPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />

          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          <Route element={<ProtectedRoute><NotificationProvider><AppLayout /></NotificationProvider></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/links" element={<LinksPage />} />
            <Route path="/price-analyze" element={<PriceAnalyzePage />} />
            <Route path="/seller-monitor" element={<SellerMonitorPage />} />
            <Route path="/expedicao" element={<Navigate to="/dashboard" replace />} />
            <Route path="/nfe" element={<Navigate to="/dashboard" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route exatc path="/meli" element={<MeliPage />} />
            <Route exatc path="/meli/messages" element={<ModuleRoute module="meliMessages"><MeliMessagesPage /></ModuleRoute>} />
            <Route path="/ml-cookies" element={<MlCookiesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/team" element={<OwnerRoute><TeamPage /></OwnerRoute>} />
            <Route path="/setup-cookies" element={<SetupCookiesPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
