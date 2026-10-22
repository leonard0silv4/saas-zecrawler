import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package, RefreshCw, Clock,
  BarChart3, Layers,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError, notifySuccess } from "../utils/notify.js";
import { AccountSelect } from "../components/meli-analytics/AccountSelect";
import { InventoryTab } from "../components/meli-analytics/InventoryTab";
import { TopProductsTab } from "../components/meli-analytics/TopProductsTab";
import { ProductDrawer } from "../components/meli-analytics/ProductDrawer";
import { PageHeader, Tabs, Button } from "../components/ui";

const PERIODS = [
  { label: "7d",  value: "7d" },
  { label: "15d", value: "15d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const TABS = [
  { id: "estoque", label: "Estoque",      icon: Layers },
  { id: "top",     label: "Top Produtos", icon: BarChart3 },
];

const QK = {
  accounts:  ()                                         => ["meli-analytics-accounts"],
  inventory: (uid, period, filter, status, alert, sort) => ["cat-inventory", uid, period, filter, status, alert, sort],
  top:       (uid, period, sortBy, onlyActive)          => ["cat-top",       uid, period, sortBy, onlyActive],
  lastSync:  (uid)                                      => ["cat-last-sync", uid],
};

export default function MeliCatalogPage() {
  const queryClient = useQueryClient();
  const tabSectionRef = useRef(null);

  const [selectedAccount, setSelectedAccount] = useState("");
  const [unifiedView,     setUnifiedView]     = useState(true);
  const [period,          setPeriod]          = useState("30d");
  const [activeTab,       setActiveTab]       = useState("estoque");
  const [inventoryType,   setInventoryType]   = useState("");
  const [inventoryStatus, setInventoryStatus] = useState("active");
  const [inventoryAlert,  setInventoryAlert]  = useState("");
  const [inventorySort,   setInventorySort]   = useState({ field: "sold", dir: "desc" });
  const [topSort,         setTopSort]         = useState("receita");
  const [topOnlyActive,   setTopOnlyActive]   = useState(false);
  const [syncing,         setSyncing]         = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const userId  = !unifiedView && selectedAccount ? selectedAccount : null;
  const enabled = unifiedView || !!selectedAccount;

  const { data: accounts = [] } = useQuery({
    queryKey: QK.accounts(),
    queryFn: () => api.get("/meli/accounts").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (accounts.length && !selectedAccount) setSelectedAccount(String(accounts[0].user_id));
  }, [accounts, selectedAccount]);

  const { data: lastSyncData } = useQuery({
    queryKey: QK.lastSync(userId),
    queryFn: () =>
      api.get("/meli/analytics/last-sync", { params: userId ? { user_id: userId } : {} }).then((r) => r.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const invSort = inventorySort.field ? { sortBy: inventorySort.field, sortDir: inventorySort.dir } : {};

  const { data: inventoryData, isLoading: loadingInventory } = useQuery({
    queryKey: QK.inventory(userId, period, inventoryType, inventoryStatus, inventoryAlert, inventorySort),
    queryFn: () =>
      api.get("/meli/analytics/inventory", {
        params: {
          period,
          status: inventoryStatus,
          ...(userId ? { user_id: userId } : {}),
          ...(inventoryType  ? { filter: inventoryType }   : {}),
          ...(inventoryAlert ? { alert: inventoryAlert }   : {}),
          ...invSort,
        },
      }).then((r) => r.data),
    enabled: enabled && activeTab === "estoque",
  });
  const inventory = inventoryData?.products ?? [];

  const { data: topProducts = [], isLoading: loadingTop } = useQuery({
    queryKey: QK.top(userId, period, topSort, topOnlyActive),
    queryFn: () =>
      api.get("/meli/analytics/top-products", {
        params: {
          period,
          ...(userId ? { user_id: userId } : {}),
          sortBy: topSort,
          ...(topOnlyActive ? { onlyActive: "true" } : {}),
        },
      }).then((r) => r.data),
    enabled: enabled && activeTab === "top",
  });

  const rupturaCount = inventoryData?.rupturaTotal ?? 0;
  const criticoCount = inventoryData?.criticoTotal ?? 0;
  const alertTotal   = rupturaCount + criticoCount;

  async function handleSync(force = false) {
    setSyncing(true);
    try {
      const qp = { ...(userId ? { user_id: userId } : {}), ...(force ? { force: "true" } : {}) };
      const { data } = await api.post("/meli/analytics/sync", null, { params: qp });
      if (data.accountsFailed?.length) {
        notifyError(
          `Sync parcial: ${data.accountsFailed.length} conta(s) falharam (` +
          `${data.accountsFailed.map((a) => a.nickname || a.user_id).join(", ")}).`
        );
      } else if (data.productsFailedTotal > 0) {
        notifyError(`Sync concluído com ${data.productsFailedTotal} produto(s) não atualizados.`);
      } else {
        notifySuccess(
          force
            ? `Re-sync completo: ${data.synced} pedidos atualizados.`
            : `${data.synced} pedidos sincronizados.`
        );
      }
      queryClient.invalidateQueries({ queryKey: ["cat-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["cat-top"] });
      queryClient.invalidateQueries({ queryKey: ["cat-last-sync"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-top"] });
    } catch (err) {
      notifyError(err.response?.data?.error || "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncFormatted = lastSyncData?.lastSync
    ? format(new Date(lastSyncData.lastSync), "HH:mm 'de' dd/MM", { locale: ptBR })
    : null;

  return (
    <div className="space-y-5 mx-auto max-w-[1400px]">
      <PageHeader
        icon={Package}
        title="Catálogo ML"
        description="Estoque e produtos em destaque — visão operacional"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="seg">
          <button type="button" aria-pressed={!unifiedView} onClick={() => setUnifiedView(false)} className="seg-btn">Loja</button>
          <button type="button" aria-pressed={unifiedView} onClick={() => setUnifiedView(true)} className="seg-btn">Todas</button>
        </div>

        <AccountSelect
          accounts={accounts}
          value={selectedAccount}
          onChange={setSelectedAccount}
          disabled={unifiedView}
        />

        <div className="seg">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={period === p.value}
              onClick={() => setPeriod(p.value)}
              className="seg-btn"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {lastSyncFormatted && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-fg-dim pr-1">
              <Clock size={12} />
              Sync <strong className="num text-fg-muted font-medium">{lastSyncFormatted}</strong>
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSync(true)}
            disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
            title="Re-processa 90 dias"
          >
            <RefreshCw size={13} /> Re-sync 90d
          </Button>
          <Button
            size="sm"
            onClick={() => handleSync(false)}
            disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando…" : unifiedView ? "Sincronizar todas" : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div ref={tabSectionRef} className="space-y-4 scroll-mt-4">
        <Tabs
          items={TABS.map((t) => ({
            value: t.id,
            icon: t.icon,
            label: t.id === "estoque" && alertTotal > 0 ? `${t.label} · ${alertTotal}` : t.label,
          }))}
          value={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            requestAnimationFrame(() =>
              tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            );
          }}
        />

        <div className="glass rounded-2xl p-5">
          <div style={{ display: activeTab === "estoque" ? "block" : "none" }}>
            <InventoryTab
              inventory={inventory}
              loading={loadingInventory}
              inventoryType={inventoryType}
              setInventoryType={setInventoryType}
              inventoryStatus={inventoryStatus}
              setInventoryStatus={setInventoryStatus}
              inventoryAlert={inventoryAlert}
              setInventoryAlert={setInventoryAlert}
              inventorySort={inventorySort}
              setInventorySort={setInventorySort}
              rupturaCount={rupturaCount}
              onProductSelect={setSelectedProduct}
            />
          </div>
          <div style={{ display: activeTab === "top" ? "block" : "none" }}>
            <TopProductsTab
              topProducts={topProducts}
              loading={loadingTop}
              topSort={topSort}
              setTopSort={setTopSort}
              topOnlyActive={topOnlyActive}
              setTopOnlyActive={setTopOnlyActive}
            />
          </div>
        </div>
      </div>

      <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
