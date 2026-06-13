import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package, RefreshCw, Clock,
  ShoppingCart, BarChart3, Layers,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../services/api";
import { notifyError, notifySuccess } from "../utils/notify.js";
import { AccountSelect } from "../components/meli-analytics/AccountSelect";
import { InventoryTab } from "../components/meli-analytics/InventoryTab";
import { TopProductsTab } from "../components/meli-analytics/TopProductsTab";
import { OrdersTab } from "../components/meli-analytics/OrdersTab";
import { ProductDrawer } from "../components/meli-analytics/ProductDrawer";

const PERIODS = [
  { label: "7d",  value: "7d" },
  { label: "15d", value: "15d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const TABS = [
  { id: "estoque",  label: "Estoque",      icon: Layers },
  { id: "top",      label: "Top Produtos", icon: BarChart3 },
  { id: "pedidos",  label: "Pedidos",      icon: ShoppingCart },
];

const QK = {
  accounts:  ()                                      => ["meli-analytics-accounts"],
  inventory: (uid, period, filter, alert, sort)      => ["cat-inventory", uid, period, filter, alert, sort],
  top:       (uid, period, sortBy, onlyActive)       => ["cat-top",       uid, period, sortBy, onlyActive],
  orders:    (uid, period)                           => ["cat-orders",    uid, period],
  lastSync:  (uid)                                   => ["cat-last-sync", uid],
};

export default function MeliCatalogPage() {
  const queryClient = useQueryClient();
  const tabSectionRef = useRef(null);

  const [selectedAccount, setSelectedAccount] = useState("");
  const [unifiedView,     setUnifiedView]     = useState(true);
  const [period,          setPeriod]          = useState("30d");
  const [activeTab,       setActiveTab]       = useState("estoque");
  const [inventoryType,   setInventoryType]   = useState("");
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
    queryKey: QK.inventory(userId, period, inventoryType, inventoryAlert, inventorySort),
    queryFn: () =>
      api.get("/meli/analytics/inventory", {
        params: {
          period,
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

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: QK.orders(userId, period),
    queryFn: () =>
      api.get("/meli/analytics/orders", {
        params: { period, ...(userId ? { user_id: userId } : {}), limit: 1000 },
      }).then((r) => r.data),
    enabled: enabled && activeTab === "pedidos",
  });
  const orders = ordersData?.orders ?? [];

  const rupturaCount = inventoryData?.rupturaTotal ?? 0;
  const criticoCount = inventoryData?.criticoTotal ?? 0;
  const alertTotal   = rupturaCount + criticoCount;

  async function handleSync(force = false) {
    setSyncing(true);
    try {
      const qp = { ...(userId ? { user_id: userId } : {}), ...(force ? { force: "true" } : {}) };
      const { data } = await api.post("/meli/analytics/sync", null, { params: qp });
      notifySuccess(
        force
          ? `Re-sync completo: ${data.synced} pedidos atualizados.`
          : `${data.synced} pedidos sincronizados.`
      );
      queryClient.invalidateQueries({ queryKey: ["cat-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["cat-top"] });
      queryClient.invalidateQueries({ queryKey: ["cat-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cat-last-sync"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-top"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-orders"] });
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
    <div className="space-y-5 mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={22} className="text-green-600" />
            Catálogo ML
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Estoque, produtos em destaque e pedidos — visão operacional
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Loja / Todas */}
            <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setUnifiedView(false)}
                className={"px-3 py-1.5 rounded-lg transition-all font-medium " + (!unifiedView ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Loja
              </button>
              <button
                type="button"
                onClick={() => setUnifiedView(true)}
                className={"px-3 py-1.5 rounded-lg transition-all font-medium " + (unifiedView ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                Todas
              </button>
            </div>

            <AccountSelect
              accounts={accounts}
              value={selectedAccount}
              onChange={setSelectedAccount}
              disabled={unifiedView}
            />

            {/* Period */}
            <div className="flex bg-gray-100 rounded-xl p-0.5 text-sm">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${
                    period === p.value
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleSync(false)}
              disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando…" : unifiedView ? "Sincronizar todas" : "Sincronizar"}
            </button>

            <button
              onClick={() => handleSync(true)}
              disabled={syncing || (unifiedView ? accounts.length === 0 : !selectedAccount)}
              title="Re-processa 90 dias"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={13} /> Re-sync 90d
            </button>
          </div>

          {/* Linha de última atualização */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={12} />
            {lastSyncFormatted ? (
              <span>
                Último sync de estoque:{" "}
                <strong className="text-gray-500 font-semibold">{lastSyncFormatted}</strong>
                <span className="text-gray-300 mx-1">·</span>
                atualização automática a cada 6h
              </span>
            ) : (
              <span>Estoque atualizado automaticamente a cada 6h</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div ref={tabSectionRef} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                requestAnimationFrame(() =>
                  tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-green-50 text-green-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          <div style={{ display: activeTab === "estoque" ? "block" : "none" }}>
            <InventoryTab
              inventory={inventory}
              loading={loadingInventory}
              inventoryType={inventoryType}
              setInventoryType={setInventoryType}
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
          <div style={{ display: activeTab === "pedidos" ? "block" : "none" }}>
            <OrdersTab orders={orders} loading={loadingOrders} />
          </div>
        </div>
      </div>

      <ProductDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
