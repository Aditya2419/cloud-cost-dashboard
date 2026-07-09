const BAR_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948']

export default function ServiceBreakdown({ services }) {
  const maxCost = services[0]?.cost ?? 1

  return (
    <div>
      <p className="text-sm text-muted mb-3">Spend by service</p>
      <div className="space-y-2.5">
        {services.map((service, i) => (
          <div key={service.name} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-muted">{service.name}</span>
            <div className="flex-1 h-4 rounded bg-panel overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${(service.cost / maxCost) * 100}%`,
                  background: BAR_COLORS[i % BAR_COLORS.length],
                }}
              />
            </div>
            <span className="w-16 text-right text-sm font-medium tabular-nums">
              ${service.cost.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
