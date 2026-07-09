import { Router } from 'express'
import NodeCache from 'node-cache'
import { fetchLiveCostData } from '../services/costManagement.js'

const router = Router()

// Cost Management data doesn't change minute-to-minute and the API has rate
// limits, so cache responses for 15 minutes.
const cache = new NodeCache({ stdTTL: 15 * 60 })
const CACHE_KEY = 'cost-data'

router.get('/costs', async (req, res) => {
  try {
    const cached = cache.get(CACHE_KEY)
    if (cached) {
      return res.json({ source: 'cache', data: cached })
    }

    const data = await fetchLiveCostData()
    cache.set(CACHE_KEY, data)
    res.json({ source: 'live', data })
  } catch (err) {
    console.error('Failed to fetch cost data:', err.message)
    res.status(502).json({
      error: 'Failed to reach Azure Cost Management API',
      detail: err.message,
    })
  }
})

export default router
