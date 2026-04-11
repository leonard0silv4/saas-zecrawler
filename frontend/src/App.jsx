import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PlansPage from "./pages/PlansPage";
import LinksPage from "./pages/LinksPage";
import ExpedicaoPage from "./pages/ExpedicaoPage";
import NfePage from "./pages/NfePage";
import CatalogPage from "./pages/CatalogPage";
import MeliPage from "./pages/MeliPage";
import PriceAnalyzePage from "./pages/PriceAnalyzePage";
import SellerMonitorPage from "./pages/SellerMonitorPage";
import MlCookiesPage from "./pages/MlCookiesPage";
import SettingsPage from "./pages/SettingsPage";

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/links" element={<LinksPage />} />
            <Route path="/price-analyze" element={<PriceAnalyzePage />} />
            <Route path="/seller-monitor" element={<SellerMonitorPage />} />
            <Route path="/expedicao" element={<ExpedicaoPage />} />
            <Route path="/nfe" element={<NfePage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/meli" element={<MeliPage />} />
            <Route path="/ml-cookies" element={<MlCookiesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
