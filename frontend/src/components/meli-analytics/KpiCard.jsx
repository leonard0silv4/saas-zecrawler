export function KpiCard({ icon: Icon, label, value, sub, color = "text-gray-800", accent = "bg-gray-50" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3 ${accent}`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
