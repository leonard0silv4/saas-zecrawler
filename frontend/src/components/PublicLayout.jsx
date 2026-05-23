import LandingHeader from "./LandingHeader";

export default function PublicLayout({ children, noPadding = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-50 via-white to-brand-50">
      <LandingHeader />
      <main className={`flex-1 ${noPadding ? "" : "px-4 py-10"}`}>
        {children}
      </main>
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} ML SmartHub · Todos os direitos reservados
      </footer>
    </div>
  );
}
