import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { to: "/price", label: "Planos" },
  { to: "/about-us", label: "Sobre Nós" },
  { to: "/faq", label: "FAQ" },
];

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-void/60 backdrop-blur-xl border-b border-line/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/login" className="flex items-center group">
            <BrandLogo size={34} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "text-brandSolid-300 bg-brandSolid-500/10"
                      : "text-fg-muted hover:text-fg hover:bg-ink/[0.03]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="text-sm font-medium text-fg-muted hover:text-fg transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-brandSolid-500 hover:bg-brandSolid-400 text-white text-sm font-medium rounded-lg transition-colors shadow-glow-brand"
            >
              Criar conta grátis
            </Link>
          </div>

          {/* Mobile: tema + hamburger */}
          <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            className="md:hidden p-2 rounded-lg text-fg-muted hover:bg-ink/[0.06] transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-line/10 bg-surface-2 px-4 py-3 space-y-1 shadow-lg">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "text-brandSolid-300 bg-brandSolid-500/10"
                    : "text-fg-muted hover:text-fg hover:bg-ink/[0.03]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-line/10 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-fg-muted hover:bg-ink/[0.03] transition-all"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-center bg-brandSolid-500 text-white hover:bg-brandSolid-400 transition-colors shadow-glow-brand"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
