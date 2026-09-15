import { expect, test } from '@playwright/test'

const ROTAS = [
  '/dashboard',
  '/train',
  '/aberturas',
  '/aberturas/italiana?mode=learn',
  '/aberturas/italiana?mode=train',
  '/endgames',
  '/endgames/mate-de-dama',
  '/progress',
  '/settings',
] as const
const VIEWPORTS = [
  { nome: 'mobile', width: 360, height: 800 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'desktop', width: 1440, height: 900 },
] as const

test.describe('QA visual do frontend', () => {
  test('rotas principais não criam overflow e mantêm landmarks', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      for (const rota of ROTAS) {
        await page.goto(rota, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('h1').first()).toBeVisible()
        const layout = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        }))
        expect(layout.overflow, `${rota} em ${viewport.nome} ultrapassa a viewport`).toBe(false)
        await expect(page.locator('main')).toBeVisible()
        const arquivo = rota.slice(1).replace(/[/?&=]/g, '-') || 'home'
        await page.screenshot({
          path: testInfo.outputPath(`frontend-${viewport.nome}-${arquivo}.png`),
          fullPage: true,
        })
      }
    }
  })
})
