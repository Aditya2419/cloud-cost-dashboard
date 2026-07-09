// Gets an OAuth access token for the Azure Resource Manager API using the
// client credentials flow (app-only auth via the service principal created
// in Entra ID). Token is cached in memory until shortly before it expires,
// so we don't request a new one on every incoming request.

let cachedToken = null
let cachedExpiryMs = 0

export async function getAzureAccessToken() {
  const now = Date.now()

  // Reuse the cached token if it still has more than 60s of life left.
  if (cachedToken && now < cachedExpiryMs - 60_000) {
    return cachedToken
  }

  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env

  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error(
      'Missing Azure credentials. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET in backend/.env'
    )
  }

  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    client_secret: AZURE_CLIENT_SECRET,
    scope: 'https://management.azure.com/.default',
    grant_type: 'client_credentials',
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Azure AD token request failed (${response.status}): ${errText}`)
  }

  const data = await response.json()

  cachedToken = data.access_token
  cachedExpiryMs = now + data.expires_in * 1000

  return cachedToken
}
