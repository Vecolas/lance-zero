import { expect, test } from '@playwright/test'

test('curso novo navega por Aprender e Treinar sem revelar a resposta', async ({ page }) => {
  await page.route('https://explorer.lichess.ovh/**', (route) => route.abort())
  await page.goto('/aberturas')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aberturas')
  await expect(page.getByRole('link', { name: 'Abrir curso Abertura Italiana' })).toBeVisible()
  await page.getByRole('link', { name: 'Abrir curso Abertura Italiana' }).click()

  await expect(page.getByRole('heading', { name: 'Abertura Italiana' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aprender', exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Aprender', exact: true }).first().click()
  await expect(page.getByText('MODO APRENDER')).toBeVisible()
  await expect(page.getByText('O QUE VAMOS OBSERVAR?')).toBeVisible()

  await page.getByRole('button', { name: 'Treinar', exact: true }).first().click()
  await expect(page.getByText('MODO TREINAR')).toBeVisible()
  await expect(page.getByText('Qual é sua decisão?')).toBeVisible()
  await expect(page.getByText(/sem dicas/)).toBeVisible()
  await expect(page.getByText('Lance do repertório.')).toBeHidden()
})

test('curso novo oferece Explorer como enriquecimento sob demanda', async ({ page }) => {
  let consultas = 0
  await page.route('https://explorer.lichess.ovh/**', (route) => {
    consultas += 1
    return route.abort()
  })
  await page.goto('/aberturas/italiana')
  await expect(page.getByText('O que o mundo joga (opcional)')).toBeVisible()
  expect(consultas).toBe(0)
  await page.getByRole('button', { name: 'Consultar o explorador' }).click()
  await expect(page.getByText(/Não consegui falar com o explorador/)).toBeVisible()
  expect(consultas).toBe(1)
})
