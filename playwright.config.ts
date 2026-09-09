import { defineConfig, devices } from '@playwright/test'

const PORT = 3210
const BASE_URL = `http://localhost:${PORT}`
const PROD = process.env.E2E_TARGET === 'prod'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    /**
     * `E2E_TARGET=prod` roda contra o build de produção.
     *
     * Não é preciosismo: a CSP de desenvolvimento é mais frouxa de propósito
     * (o runtime do Next precisa de `unsafe-eval` e de websocket), então uma
     * violação que só existe em produção passaria despercebida se todo e2e
     * rodasse em `next dev`. Ver `src/lib/security/headers.ts`.
     */
    command: PROD
      ? `pnpm exec next build && pnpm exec next start --port ${PORT}`
      : `pnpm exec next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: PROD ? 300_000 : 120_000,
  },
})
