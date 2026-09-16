import { expect, test } from '@playwright/test'

test('marca lances forçantes e recebe a lista completa ao conferir', async ({ page }) => {
  await page.goto('/calculate')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cálculo')
  await expect(page.getByText(/Ache todos os xeques e todas as capturas/)).toBeVisible()
  await expect(page.getByText('Nenhum lance marcado ainda.')).toBeVisible()

  await page.getByRole('button', { name: 'Conferir' }).click()

  // Sem marcar nada, a conferência ainda ensina: mostra o que passou batido.
  await expect(page.getByText(/lances? forçantes? nesta posição/)).toBeVisible()
  await expect(page.getByText('Passaram batido:')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Próxima posição' })).toBeVisible()
})

test('avança de posição e limpa a seleção', async ({ page }) => {
  await page.goto('/calculate')
  await expect(page.getByText('Posição 1 de 11')).toBeVisible()

  await page.getByRole('button', { name: 'Conferir' }).click()
  await page.getByRole('button', { name: 'Próxima posição' }).click()

  await expect(page.getByText('Posição 2 de 11')).toBeVisible()
  await expect(page.getByText('Nenhum lance marcado ainda.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Conferir' })).toBeVisible()
})

test('o treino de cálculo alimenta o progresso', async ({ page }) => {
  await page.goto('/calculate')
  await page.getByRole('button', { name: 'Conferir' }).click()
  await expect(page.getByText(/lances? forçantes? nesta posição/)).toBeVisible()

  // A evolução mora no Roadmap: `/progress` virou redirecionamento.
  await page.goto('/roadmap')
  await expect(page.getByText(/Ainda não há o que medir/)).toBeHidden()
  await expect(page.getByRole('rowheader', { name: /Xeques, capturas/ })).toBeVisible()
})
