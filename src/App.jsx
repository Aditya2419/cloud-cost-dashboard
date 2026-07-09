import { useEffect, useMemo, useState } from 'react'
import { Wallet, Target, TrendingUp, Layers } from 'lucide-react'
import MetricCard from './components/MetricCard.jsx'
import CostTrendChart from './components/CostTrendChart.jsx'
import ServiceBreakdown from './components/ServiceBreakdown.jsx'
import { fetchCostData } from './data/costApi.js'

export default function App() {
  const [resourceGroups, setResourceGroups] = useState(null)
  const [source, setSource] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCostData().then(({ data, source }) => {
      setResourceGroups(data)
      setSource(source)
      setLoading(false)
    })
  }, [])

  const resourceGroupKeys = useMemo(
    () => (resourceGroups ? Object.keys(resourceGroups) : []),
    [resourceGroups]
  )

  const activeKeys = filter === 'all' ? resourceGroupKeys : [filter]

  const combined = useMemo(() => {
    if (!resourceGroups) return null

    const serviceTotals = {}
    let budget = 0

    activeKeys.forEach((key) => {
      const rg = resourceGroups[key]
      budget += rg.budget
      rg.services.forEach((s) => {
        serviceTotals[s.name] = (serviceTotals[s.name] || 0) + s.cost
      })
    })

    const services = Object.entries(serviceTotals)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)

    const total = services.reduce((sum, s) => sum + s.cost, 0)
    const lastMonthTotal = total * 0.91
    const delta = (((total - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1)

    return { services, total, budget, delta, topService: services[0]?.name ?? '-' }
  }, [resourceGroups, filter])

  if (loading || !combined) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center text-muted">
        Loading cost data…
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-muted">Cloud cost dashboard</p>
            {source && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  source === 'mock'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-green-50 text-green-700'
                }`}
              >
                {source === 'mock' ? 'Mock data' : source === 'cache' ? 'Live (cached)' : 'Live'}
              </span>
            )}
          </div>
          <h1 className="text-xl font-semibold">Month to date</h1>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-line rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All resource groups</option>
          {resourceGroupKeys.map((key) => (
            <option key={key} value={key}>
              {resourceGroups[key].label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <MetricCard label="Total spend" value={`$${combined.total.toLocaleString()}`} icon={Wallet} />
        <MetricCard label="Budget" value={`$${combined.budget.toLocaleString()}`} icon={Target} />
        <MetricCard
          label="vs last month"
          value={`${combined.delta > 0 ? '+' : ''}${combined.delta}%`}
          icon={TrendingUp}
        />
        <MetricCard label="Top service" value={combined.topService} icon={Layers} />
      </div>

      <div className="mb-8">
        <CostTrendChart activeKeys={activeKeys} resourceGroups={resourceGroups} />
      </div>

      <ServiceBreakdown services={combined.services} />
    </div>
  )
}
