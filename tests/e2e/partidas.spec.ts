import { expect, test } from '@playwright/test'

const PGN_DUAS = `[Event "Teste A"]
[White "Alice"]
[Black "Bruno"]
[Result "1-0"]
[Date "2026.01.02"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0

[Event "Teste B"]
[White "Bruno"]
[Black "Alice"]
[Result "0-1"]
[Date "2026.01.03"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 0-1`

async function importar(page: import('@playwright/test').Page) {
  await page.goto('/games')
  await page.getByLabel('PGN', { exact: true }).fill(PGN_DUAS)
  await page.getByRole('button', { name: 'Importar' }).click()
  await expect(page.getByText(/2 importadas/)).toBeVisible()
}

test('importa várias partidas de um PGN só e não duplica', async ({ page }) => {
  await importar(page)

  await expect(page.getByRole('link', { name: /Alice × Bruno/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Bruno × Alice/ })).toBeVisible()

  // Importar de novo o mesmo texto não pode criar cópias.
  await page.getByRole('button', { name: 'Importar' }).click()
  await expect(page.getByText(/0 importadas, 2 já existiam/)).toBeVisible()
})

test('a revisão humana não mostra nenhuma avaliação', async ({ page }) => {
  await importar(page)
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revisar partida')
  await expect(page.getByText('Onde você acha que a partida mudou?')).toBeVisible()

  // Passe 1 é sem engine: nada de centipawns, nada de barra de avaliação.
  await expect(page.getByText(/\+\d+\.\d\d/)).toBeHidden()
  await expect(page.getByText(/O passe 2|Passe 2/)).toBeVisible()
})

test('marcar lances e anotar sobrevive ao recarregamento', async ({ page }) => {
  await importar(page)
  await page.getByRole('link', { name: /Alice × Bruno/ }).click()

  await page.getByRole('button', { name: 'Qh5' }).click()
  await page.getByRole('button', { name: 'Marcar este lance' }).click()
  await page.getByLabel('Suas anotações').fill('Achei que a dama saiu cedo demais.')
  await page.getByRole('button', { name: 'Salvar minha análise' }).click()

  await expect(page.getByText('Salvo: 1 lance marcado.')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Suas anotações')).toHaveValue('Achei que a dama saiu cedo demais.')
  await expect(page.getByRole('button', { name: /Qh5/ })).toContainText('⚑')

  await page.goto('/games')
  await expect(page.getByRole('link', { name: /Alice × Bruno/ })).toContainText('Revisada')
})
