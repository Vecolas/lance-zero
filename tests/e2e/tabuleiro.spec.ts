import { expect, test } from '@playwright/test'

test('carrega um PGN e percorre a partida lance a lance', async ({ page }) => {
  await page.goto('/games')

  await page.getByRole('button', { name: 'Usar partida de exemplo' }).click()

  await expect(page.getByText('Lance 0 de 26')).toBeVisible()
  await expect(page.getByRole('button', { name: 'e4', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Próximo lance' }).click()
  await expect(page.getByText('Lance 1 de 26')).toBeVisible()

  await page.getByRole('button', { name: 'Último lance' }).click()
  await expect(page.getByText('Lance 26 de 26')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Próximo lance' })).toBeDisabled()

  await page.getByRole('button', { name: 'Primeiro lance' }).click()
  await expect(page.getByText('Lance 0 de 26')).toBeVisible()
})

test('pula para um lance pela lista textual e gira o tabuleiro', async ({ page }) => {
  await page.goto('/games')
  await page.getByRole('button', { name: 'Usar partida de exemplo' }).click()

  await page.getByRole('button', { name: 'Nf3', exact: true }).click()
  await expect(page.getByText('Lance 3 de 26')).toBeVisible()

  await page.getByRole('button', { name: 'Girar tabuleiro' }).click()
  await expect(page.getByText('Lance 3 de 26')).toBeVisible()
})

test('recusa um FEN inválido sem quebrar a tela', async ({ page }) => {
  await page.goto('/games')
  await page.getByLabel('FEN').fill('isto não é um fen')
  await page.getByRole('button', { name: 'Carregar FEN' }).click()
  await expect(page.getByText('FEN inválido')).toBeVisible()
  await expect(page.getByText('Lance 0 de 0')).toBeVisible()
})
