import LandingHeader from "./LandingHeader";
import { GridBackground } from "./fx";

export default function PublicLayout({ children, noPadding = false }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-void">
      <GridBackground />
      <LandingHeader />
      <main className={`relative z-10 flex-1 ${noPadding ? "" : "px-4 py-10"}`}>
        {children}
      </main>
      <footer className="relative z-10 border-t border-line/10 bg-surface/60 py-6 text-center text-sm text-fg-dim">
        © {new Date().getFullYear()} ML SmartHub · Todos os direitos reservados
      </footer>
    </div>
  );
}
