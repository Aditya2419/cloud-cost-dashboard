// Mock data shaped to resemble Azure Cost Management API responses.
// Swap `fetchCostData()` for a real call to:
// https://management.azure.com/subscriptions/{id}/providers/Microsoft.CostManagement/query
// and keep the same return shape to avoid touching any component code.

const resourceGroups = {
  prod: {
    label: 'rg-prod',
    budget: 4200,
    services: [
      { name: 'Virtual Machines', cost: 1320 },
      { name: 'Storage', cost: 610 },
      { name: 'Networking', cost: 480 },
      { name: 'SQL Database', cost: 390 },
      { name: 'Backup Vault', cost: 210 },
      { name: 'Entra ID / RBAC', cost: 60 },
    ],
    daily: [95, 102, 98, 110, 120, 115, 108, 130, 125, 118, 140, 135, 128, 150, 145, 138, 160, 155, 148, 170, 165, 158, 180, 175, 168, 190, 185, 178, 200, 195],
  },
  dev: {
    label: 'rg-dev',
    budget: 900,
    services: [
      { name: 'Virtual Machines', cost: 280 },
      { name: 'Storage', cost: 120 },
      { name: 'Networking', cost: 60 },
      { name: 'SQL Database', cost: 90 },
      { name: 'Backup Vault', cost: 30 },
      { name: 'Entra ID / RBAC', cost: 10 },
    ],
    daily: [18, 20, 19, 22, 24, 23, 21, 26, 25, 24, 28, 27, 26, 30, 29, 28, 32, 31, 30, 34, 33, 32, 36, 35, 34, 38, 37, 36, 40, 39],
  },
  staging: {
    label: 'rg-staging',
    budget: 1300,
    services: [
      { name: 'Virtual Machines', cost: 410 },
      { name: 'Storage', cost: 180 },
      { name: 'Networking', cost: 140 },
      { name: 'SQL Database', cost: 120 },
      { name: 'Backup Vault', cost: 60 },
      { name: 'Entra ID / RBAC', cost: 20 },
    ],
    daily: [28, 30, 29, 32, 34, 33, 31, 36, 35, 34, 38, 37, 36, 40, 39, 38, 42, 41, 40, 44, 43, 42, 46, 45, 44, 48, 47, 46, 50, 49],
  },
}

export async function fetchMockCostData() {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return resourceGroups
}
