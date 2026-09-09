import { expect, test } from '@playwright/test'

test('a landing apresenta a promessa e leva ao treino', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Treine o que perde suas partidas.',
  )
  await page.getByRole('link', { name: 'Ver o treino de hoje' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Treino de hoje')
})

test('o skip link leva ao conteúdo principal', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page).toHaveURL(/#conteudo$/)
})

test('a página de licenças lista as obrigações', async ({ page }) => {
  await page.goto('/licenses')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Licenças e fontes de dados')
  await expect(page.getByRole('cell', { name: 'GPL-3.0' }).first()).toBeVisible()
})
