# Cost dashboard backend

A small Express server that authenticates to Azure with a read-only service
principal and proxies Cost Management API calls to the frontend. This exists
so the Azure client secret never has to touch the browser.

## Why a backend at all?

The frontend can't safely call `management.azure.com` directly — that would
mean shipping your Azure client secret inside JavaScript that anyone can
open in devtools. This server holds the secret, does the OAuth exchange
server-side, and only ever returns cost numbers to the frontend.

## 1. Azure setup — create a read-only service principal

You'll need an Azure subscription (the free tier is enough — 30-day trial
or the always-free services). All steps below can be done in the Azure
Portal, no CLI required.

**a. Register an app in Microsoft Entra ID**
1. Azure Portal → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name it something like `cost-dashboard-reader`, leave the default
   account type, no redirect URI needed → **Register**
3. On the app's Overview page, copy the **Application (client) ID** and
   **Directory (tenant) ID** — you'll need both for `.env`

**b. Create a client secret**
1. In the same app registration → **Certificates & secrets** → **New client secret**
2. Give it a description and expiry (90 days is fine for a portfolio project)
3. Copy the secret **value** immediately — it's only shown once

**c. Grant read-only access (Cost Management Reader)**
1. Go to your **Subscription** (or a specific resource group if you want to
   scope access tighter) → **Access control (IAM)** → **Add role assignment**
2. Search for and select **Cost Management Reader** — this is the least-
   privilege role that can read costs and cannot modify anything
3. Under "Assign access to" choose **User, group, or service principal**,
   then search for the app name you registered (`cost-dashboard-reader`)
4. Review + assign

**d. Get your subscription ID**
- Azure Portal → **Subscriptions** → copy the **Subscription ID**

You now have everything for `.env`: tenant ID, client ID, client secret,
subscription ID.

## 2. Configure and run

```bash
cd backend
cp .env.example .env
# fill in AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_SUBSCRIPTION_ID
npm install
npm run dev
```

Server starts on `http://localhost:4000`. Check it's alive:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/costs
```

The frontend (`npm run dev` in the project root) automatically tries this
backend first and falls back to mock data if it's unreachable or
unconfigured, so you can develop the UI without Azure credentials and only
plug them in when you're ready.

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Basic liveness check |
| `GET /api/costs` | Returns cost data grouped by resource group and service, cached 15 minutes |

## Security notes worth knowing (and mentioning in interviews)

- The service principal has **Cost Management Reader** only — it cannot
  create, modify, or delete any Azure resource, even if the secret leaked.
- The client secret lives only in `backend/.env`, which is gitignored —
  never commit it.
- Responses are cached in-memory for 15 minutes to stay well under Azure's
  Cost Management API rate limits (roughly 30 calls per hour per subscription
  for this API).
- CORS is locked to `CORS_ORIGIN` in `.env` — by default only your local
  frontend can call this API.

## Deploying

For a live demo link on your resume, this backend can be deployed as-is to
any Node host (Render, Railway, an Azure Function with an HTTP trigger,
etc.) — just set the same environment variables there. Point the frontend's
`VITE_BACKEND_URL` at the deployed backend URL.
