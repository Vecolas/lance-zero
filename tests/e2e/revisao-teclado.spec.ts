/**
 * Portão E2E da migração de entrada: todas as respostas learner-facing usam
 * arraste no tabuleiro; UCI/SAN não são controles da interface.
 */
import { expect, test, type Page } from '@playwright/test'

const ROTA_TABLEBASE = 'https://tablebase.lichess.ovh/**'
const MATE_EM_1 = /O rei preto já está no canto/

async function semTablebase(page: Page): Promise<void> {
  await page.route(ROTA_TABLEBASE, (route) => route.abort())
}

async function jogar(page: Page, uci: string): Promise<void> {
  const origem = page.locator('#lancezero-board-square-' + uci.slice(0, 2))
  const destino = page.locator('#lancezero-board-square-' + uci.slice(2, 4))
  await expect(origem).toBeVisible()
  await expect(destino).toBeVisible()
  await expect(origem.locator('[role="button"]').first()).toBeVisible()
  await origem.locator('[role="button"]').first().dragTo(destino)
}

test('revisão não expõe o input UCI ao aluno', async ({ page }) => {
  await semTablebase(page)
  await page.goto('/revisao/sessao')

  await expect(page.getByText(/Lance em UCI/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Jogar lance/i })).toHaveCount(0)
})

test('lance ilegal faz snapback e não avança a revisão', async ({ page }) => {
  await semTablebase(page)
  await page.goto('/endgames')
  await page.getByRole('button', { name: MATE_EM_1 }).click()

  await jogar(page, 'b1c3')
  await expect(page.getByText(/não é um lance legal nesta posição/)).toBeVisible()
  await expect(page.getByText(/Em andamento/)).toBeVisible()
})
