# Playwright Visual QA Template

Illustrative patterns; adapt selectors/routes to project code.

```ts
import { test, expect } from '@playwright/test'

const viewports = [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

for (const viewport of viewports) {
  test(`Hoje visual - ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/hoje')

    await expect(page.getByRole('heading', { level: 1 }))
      .toHaveText('Hoje')

    await expect(page).toHaveScreenshot(
      `hoje-${viewport.name}.png`,
      { animations: 'disabled' }
    )
  })
}
```

## ARIA structure

```ts
await expect(page).toMatchAriaSnapshot(`
  - main:
    - heading "Hoje" [level=1]
`)
```

## Overflow smoke test concept

Check body-level accidental horizontal overflow:

```ts
const hasOverflow = await page.evaluate(() =>
  document.documentElement.scrollWidth >
  document.documentElement.clientWidth
)

expect(hasOverflow).toBe(false)
```

Do not apply that assertion to components whose correct semantics intentionally use local horizontal scrolling, such as compact tab strips.
