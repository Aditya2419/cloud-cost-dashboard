import { getAzureAccessToken } from './azureAuth.js'

const MANAGEMENT_BASE = 'https://management.azure.com'
const API_VERSION = '2023-11-01'

function subscriptionScope() {
  const { AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP } = process.env
  if (!AZURE_SUBSCRIPTION_ID) {
    throw new Error('Missing AZURE_SUBSCRIPTION_ID in backend/.env')
  }
  return AZURE_RESOURCE_GROUP
    ? `/subscriptions/${AZURE_SUBSCRIPTION_ID}/resourceGroups/${AZURE_RESOURCE_GROUP}`
    : `/subscriptions/${AZURE_SUBSCRIPTION_ID}`
}

async function runCostQuery(body) {
  const token = await getAzureAccessToken()
  const url = `${MANAGEMENT_BASE}${subscriptionScope()}/providers/Microsoft.CostManagement/query?api-version=${API_VERSION}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after')
      const waitMsg = retryAfter ? `Retry after ~${retryAfter} seconds.` : 'Wait a while before retrying.'
      throw new Error(
        `Azure Cost Management rate limit hit (429). ${waitMsg} This resets on a rolling window — avoid restarting the backend repeatedly, since that clears the response cache.`
      )
    }
    const errText = await response.text()
    throw new Error(`Azure Cost Management query failed (${response.status}): ${errText}`)
  }

  return response.json()
}

// Azure's "MonthToDate" timeframe only covers the current calendar month —
// if all spend happened in prior months, that returns nothing even though
// real data exists. We use an explicit lookback window instead so historical
// spend still shows up. Configurable via AZURE_LOOKBACK_DAYS (default 90).
function lookbackRange() {
  const days = Number(process.env.AZURE_LOOKBACK_DAYS || 90)
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  const toISO = to.toISOString().slice(0, 10)
  const fromISO = from.toISOString().slice(0, 10)
  return { from, to, fromISO, toISO, days }
}

// Rows come back as arrays whose column order matches result.properties.columns.
// This turns each row into a plain object keyed by column name.
function rowsToObjects(result) {
  const columns = result.properties.columns.map((c) => c.name)
  return result.properties.rows.map((row) =>
    Object.fromEntries(row.map((value, i) => [columns[i], value]))
  )
}

async function queryServiceBreakdown() {
  const { fromISO, toISO } = lookbackRange()
  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: { from: fromISO, to: toISO },
    dataset: {
      granularity: 'None',
      aggregation: { totalCost: { name: 'PreTaxCost', function: 'Sum' } },
      grouping: [
        { type: 'Dimension', name: 'ResourceGroupName' },
        { type: 'Dimension', name: 'ServiceName' },
      ],
    },
  }
  return rowsToObjects(await runCostQuery(body))
}

async function queryDailyTrend() {
  const { fromISO, toISO } = lookbackRange()
  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: { from: fromISO, to: toISO },
    dataset: {
      granularity: 'Daily',
      aggregation: { totalCost: { name: 'PreTaxCost', function: 'Sum' } },
      grouping: [{ type: 'Dimension', name: 'ResourceGroupName' }],
    },
  }
  return rowsToObjects(await runCostQuery(body))
}

// Best-effort budget lookup. Budgets are a separate API (Microsoft.Consumption/budgets)
// and a subscription may not have any configured — that's fine, we just default to 0.
async function queryBudgets() {
  try {
    const token = await getAzureAccessToken()
    const url = `${MANAGEMENT_BASE}${subscriptionScope()}/providers/Microsoft.Consumption/budgets?api-version=2023-11-01`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) return {}

    const data = await response.json()
    const budgetsByResourceGroup = {}
    for (const budget of data.value ?? []) {
      const rgFilter = budget.properties?.filter?.dimensions?.name === 'ResourceGroupName'
        ? budget.properties.filter.dimensions.values?.[0]
        : null
      if (rgFilter) {
        budgetsByResourceGroup[rgFilter] = budget.properties.amount
      }
    }
    return budgetsByResourceGroup
  } catch {
    return {}
  }
}

// Converts a UsageDate value like 20260609 into a JS Date.
function parseUsageDate(usageDate) {
  const s = String(usageDate)
  return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T00:00:00Z`)
}

// Combines the three queries above into the shape the frontend already expects:
// { [resourceGroupKey]: { label, budget, services: [{ name, cost }], daily: number[] } }
export async function fetchLiveCostData() {
  const { from, days } = lookbackRange()
  const [serviceRows, dailyRows, budgets] = await Promise.all([
    queryServiceBreakdown(),
    queryDailyTrend(),
    queryBudgets(),
  ])

  const resourceGroups = {}

  for (const row of serviceRows) {
    const rgName = row.ResourceGroupName || 'ungrouped'
    const key = rgName.toLowerCase()
    if (!resourceGroups[key]) {
      resourceGroups[key] = {
        label: rgName,
        budget: budgets[rgName] ?? 0,
        services: [],
        daily: Array(days).fill(0),
      }
    }
    resourceGroups[key].services.push({
      name: row.ServiceName || 'Other',
      cost: Math.round((row.PreTaxCost ?? 0) * 100) / 100,
    })
  }

  for (const row of dailyRows) {
    const rgName = row.ResourceGroupName || 'ungrouped'
    const key = rgName.toLowerCase()
    if (!resourceGroups[key]) continue
    const dayIndex = Math.floor((parseUsageDate(row.UsageDate) - from) / 86_400_000)
    if (dayIndex >= 0 && dayIndex < resourceGroups[key].daily.length) {
      resourceGroups[key].daily[dayIndex] = Math.round((row.PreTaxCost ?? 0) * 100) / 100
    }
  }

  // Sort each resource group's services by cost, descending.
  for (const rg of Object.values(resourceGroups)) {
    rg.services.sort((a, b) => b.cost - a.cost)
  }

  return resourceGroups
}