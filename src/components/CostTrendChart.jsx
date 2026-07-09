import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Fixed categorical palette, assigned by position rather than by resource
// group name, since real Azure resource groups won't match prod/dev/staging.
const PALETTE = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948']

export default function CostTrendChart({ activeKeys, resourceGroups }) {
  const colorFor = (key) => PALETTE[activeKeys.indexOf(key) % PALETTE.length]
  const maxDays = Math.max(...activeKeys.map((key) => resourceGroups[key].daily.length), 0)

  const chartData = Array.from({ length: maxDays }, (_, i) => {
    const point = { day: i + 1 }
    activeKeys.forEach((key) => {
      point[key] = resourceGroups[key].daily[i] ?? null
    })
    return point
  })

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-2 text-xs text-muted">
        {activeKeys.map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: colorFor(key) }}
            />
            {resourceGroups[key].label}
          </span>
        ))}
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: '#898781' }}
              axisLine={{ stroke: '#c3c2b7' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#898781' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              formatter={(value, name) => [`$${value}`, resourceGroups[name]?.label ?? name]}
              labelFormatter={(day) => `Day ${day}`}
              contentStyle={{ borderRadius: 8, border: '1px solid #e4e7ec', fontSize: 13 }}
            />
            {activeKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colorFor(key)}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
