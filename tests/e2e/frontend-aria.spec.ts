import { expect, test } from '@playwright/test'

const FIXTURES = [
  { rota: '/dashboard', heading: 'Treino de hoje' },
  { rota: '/train', heading: 'Treinar' },
  { rota: '/aberturas/italiana', heading: 'Abertura Italiana' },
  { rota: '/endgames/mate-de-dama', heading: 'Mate de rei e dama' },
  { rota: '/settings', heading: 'Ajustes' },
] as const

test.describe('contratos ARIA das páginas principais', () => {
  for (const fixture of FIXTURES) {
    test(`${fixture.rota} mantém snapshot semântico mínimo`, async ({ page }) => {
      await page.goto(fixture.rota, { waitUntil: 'domcontentloaded' })
      const snapshot = await page.locator('body').ariaSnapshot()
      expect(snapshot).toContain(`heading "${fixture.heading}"`)
      expect(snapshot).toMatch(/navigation/)
      expect(snapshot).toMatch(/link|button/)
    })
  }
})
