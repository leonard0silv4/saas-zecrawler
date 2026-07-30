import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatBRL } from "./formatBRL";

function Row({ label, value, badge }) {
  const badgeColors = {
    full:    "bg-green-100 text-green-700",
    normal:  "bg-gray-100 text-gray-600",
    ruptura: "bg-red-100 text-red-700",
    crítico: "bg-orange-100 text-orange-700",
    baixo:   "bg-yellow-100 text-yellow-700",
  };
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-right">
        {badge ? (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColors[badge] || "bg-gray-100 text-gray-600"}`}>
            {value}
          </span>
        ) : value}
      </dd>
    </div>
  );
}

export function ProductDrawer({ product, onClose }) {
  const [open, setOpen]       = useState(false);
  const [closing, setClosing] = useState(false);
  const rafRef = useRef(null);

  useEffect(() => {
    if (product) {
      setClosing(false);
      rafRef.current = requestAnimationFrame(() => setOpen(true));
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [product]);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => { setOpen(false); onClose(); }, 280);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  function handleClose() { setClosing(true); }

  if (!product) return null;
  const isOpen = open && !closing;

  return createPortal(
    <div className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}>
      <div className="flex-1 bg-black/30" onClick={handleClose} />
      <div className={`w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden
        transition-transform duration-300 ease-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 truncate pr-4">{product.title}</h3>
          <button onClick={handleClose} className="shrink-0 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-sm">
          {product.thumbnail && (
            <img
              src={product.thumbnail}
              alt={product.title}
              className="w-20 h-20 object-contain rounded-xl border border-gray-100"
            />
          )}
          <dl className="space-y-2">
            {product.SKU && <Row label="SKU" value={product.SKU} />}
            {product.nickname && <Row label="Loja" value={product.nickname} />}
            <Row label="Preço atual" value={formatBRL(product.price)} />
            <Row label="Tipo" value={product.isFull ? "Full" : "Normal/Clássico"} badge={product.isFull ? "full" : "normal"} />
            <Row label="Estoque disponível" value={product.available_quantity ?? "—"} />
            {product.isFull && (
              <Row
                label="Estoque Full"
                value={
                  product.estoqueFullSource === "fallback_item"
                    ? `${product.estoque_full ?? "—"} (estimado)`
                    : product.estoque_full ?? "—"
                }
              />
            )}
            {product.isFull && product.estoque_full_detalhe && (
              <>
                <Row label="Full — Total no depósito" value={product.estoque_full_detalhe.total ?? "—"} />
                {product.estoque_full_detalhe.not_available_by_reason &&
                  Object.entries(product.estoque_full_detalhe.not_available_by_reason).map(([reason, qty]) => (
                    <Row
                      key={reason}
                      label={`Full — indisponível (${reason})`}
                      value={typeof qty === "object" ? JSON.stringify(qty) : qty ?? 0}
                    />
                  ))}
              </>
            )}
            {product.logisticType && <Row label="Logística" value={product.logisticType} />}
            <Row label="Vendidos (total)" value={product.sold_quantity ?? "—"} />
            {product.averageSellDay != null && (
              <Row label="Média vendas/dia" value={product.averageSellDay.toFixed(1)} />
            )}
            {product.daysRestStock != null && (
              <Row label="Dias de estoque restante" value={product.daysRestStock} />
            )}
            {product.alertRuptura && (
              <Row label="Alerta" value={product.alertRuptura} badge={product.alertRuptura.toLowerCase()} />
            )}
            <Row label="Status do anúncio" value={product.status || "—"} />
          </dl>
          {product.historySell?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Histórico de vendas
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={product.historySell.slice(-30)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={false} />
                  <YAxis tick={{ fontSize: 10 }} width={28} />
                  <Tooltip formatter={(v) => [v, "Vendas"]} />
                  <Area type="monotone" dataKey="sellQty" stroke="#16a34a" fill="#dcfce7" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {product.permalink && (
            <a
              href={product.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-brand-600 hover:underline text-sm"
            >
              Ver anúncio no ML <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
