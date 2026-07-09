import { fetchMockCostData } from './mockData.js'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

// Tries the real backend (which proxies Azure Cost Management) first.
// Falls back to mock data if the backend isn't running or Azure isn't
// configured yet, so the UI is always demoable.
export async function fetchCostData() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/costs`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) throw new Error(`Backend responded with ${response.status}`)

    const { source, data } = await response.json()

    if (!data || Object.keys(data).length === 0) {
      throw new Error('Backend returned no resource groups')
    }

    return { data, source }
  } catch (err) {
    console.warn('Falling back to mock cost data:', err.message)
    const data = await fetchMockCostData()
    return { data, source: 'mock' }
  }
}
