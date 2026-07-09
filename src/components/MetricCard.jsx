export default function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={15} className="text-muted" strokeWidth={1.75} />}
        <p className="text-sm text-muted">{label}</p>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
