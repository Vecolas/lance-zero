import { expect, test } from '@playwright/test'
import { feedbackToneCatalog } from '../../src/lib/design/feedback'

/**
 * O texto do desfecho vem do CATÁLOGO, não escrito à mão aqui.
 *
 * Antes da issue #61 este arquivo mirava "Não saiu desta vez", que era desenho
 * próprio da tela de puzzles. Cravar a palavra aqui de novo faria o e2e
 * DEFENDER a divergência: mudar o tom no catálogo deixaria a suíte vermelha e
 * quem corrigisse concluiria que a correção é que estava errada.
 */
const ESTADO_INCORRETO = feedbackToneCatalog.incorreto.label

test('o tema não aparece antes da resposta', async ({ page }) => {
  await page.goto('/puzzles')

  await expect(page.getByText(/Puzzle 1 de \d+/)).toBeVisible()
  await expect(page.getByText(/Pense primeiro/)).toBeVisible()

  // Recuperação antes de explicação: nada de motivo nem de solução na tela.
  await expect(page.getByText('O que era')).toBeHidden()
  await expect(page.getByText(/^Solução:/)).toBeHidden()
})

test('as dicas escalam e a primeira não entrega o lance', async ({ page }) => {
  await page.goto('/puzzles')

  await page.getByRole('button', { name: 'Dica' }).click()
  const primeira = await page
    .getByText(/Dica|peça|casa/)
    .first()
    .textContent()
  // Nível 1 é categoria de pensamento: não pode conter notação algébrica.
  expect(primeira ?? '').not.toMatch(/\b[a-h][1-8]\b/)

  await expect(page.getByRole('button', { name: /Mais uma dica \(1\/3\)/ })).toBeVisible()
})

test('desistir revela a solução e oferece o próximo', async ({ page }) => {
  await page.goto('/puzzles')

  await page.getByRole('button', { name: 'Desistir' }).click()

  await expect(page.getByText(ESTADO_INCORRETO)).toBeVisible()
  await expect(page.getByText('O que era')).toBeVisible()
  await expect(page.getByText(/^Solução:/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Próximo puzzle|Encerrar sessão/ })).toBeVisible()
})

test('o erro vira card de revisão em /train', async ({ page }) => {
  await page.goto('/puzzles')
  await page.getByRole('button', { name: 'Desistir' }).click()
  await expect(page.getByText('O que era')).toBeVisible()

  await page.goto('/train')
  // O card criado pelo puzzle está vencido agora, então a fila não está vazia.
  await expect(page.getByText(/Revisão 1 de/)).toBeVisible()
  await expect(page.getByText(/errou este padrão antes/)).toBeVisible()

  // A revisão usa a MESMA faixa da tela de puzzles: é isso que a #61 fechou.
  await page.getByRole('button', { name: 'Não lembro' }).click()
  await expect(page.getByText(ESTADO_INCORRETO)).toBeVisible()
  await expect(page.getByText(/O lance certo era/)).toBeVisible()
})
