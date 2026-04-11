import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings } from "lucide-react";
import SettingsPlanSection from "../components/SettingsPlanSection";
import SettingsStoresSection from "../components/SettingsStoresSection";
import SettingsCookiesSection from "../components/SettingsCookiesSection";

const TABS = [
  { id: "plan", label: "Plano" },
  { id: "stores", label: "Minhas lojas" },
  { id: "cookies", label: "Cookies ML" },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initial = TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : "plan";
  const [tab, setTab] = useState(initial);

  useEffect(() => {
    if (TABS.some((t) => t.id === tabFromUrl)) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  function selectTab(id) {
    setTab(id);
    const next = new URLSearchParams(searchParams);
    if (id === "plan") {
      next.delete("tab");
    } else {
      next.set("tab", id);
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-brand-50 text-brand-700">
          <Settings size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações</h1>
          <p className="text-gray-600 text-sm mt-0.5">Plano, lojas próprias e cookies do Mercado Livre.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectTab(id)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-brand-600 text-brand-700 bg-brand-50/50"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plan" && <SettingsPlanSection />}
      {tab === "stores" && <SettingsStoresSection />}
      {tab === "cookies" && <SettingsCookiesSection />}
    </div>
  );
}
