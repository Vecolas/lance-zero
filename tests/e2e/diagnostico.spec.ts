import { expect, test, type Page } from '@playwright/test'

/**
 * A PROMESSA DA FASE 10, medida no navegador de verdade: um jogador NOVO, SEM
 * CONTA, chega ao primeiro exercício em poucos minutos e sai com uma primeira
 * semana montada.
 *
 * Este é o único caso que atravessa a coisa inteira — tela, domínio,
 * armazenamento local e a volta para o treino do dia. Os portões de unidade
 * provam cada peça; nenhum deles prova que o caminho existe.
 *
 * As buscas miram por texto e por região de propósito: o anunciador de rota do
 * Next tem `role="alert"` e colide com o modo estrito do Playwright.
 */

/** Responde o diagnóstico inteiro escolhendo a primeira opção de cada posição. */
async function responderTudo(page: Page): Promise<number> {
  const progresso = page.getByText(/^Posição \d+ de \d+$/)
  await expect(progresso).toBeVisible()

  const total = Number(/de (\d+)/.exec((await progresso.textContent()) ?? '')?.[1])
  expect(total).toBeGreaterThan(0)

  const opcoes = page.getByRole('list', { name: 'Lances possíveis' })
  for (let i = 0; i < total; i += 1) {
    await opcoes.getByRole('button').first().click()
  }
  return total
}

test('sem conta, o diagnóstico leva a um plano e a um perfil salvo', async ({ page }) => {
  await page.goto('/onboarding')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Diagnóstico')

  await page.getByRole('button', { name: '20 min' }).click()
  await page.getByLabel(/rating, se você souber/i).fill('1100')
  await page.getByRole('button', { name: 'Começar o diagnóstico' }).click()

  const respondidas = await responderTudo(page)

  const resultado = page.getByRole('region', { name: 'Seu ponto de partida' })
  await expect(resultado).toBeVisible()
  await expect(resultado.getByText(/Faixa estimada:/)).toBeVisible()
  await expect(resultado.getByText(new RegExp(`de ${respondidas} posições`))).toBeVisible()

  // A honestidade estatística é parte do produto, não enfeite: a tela diz o que
  // NÃO mediu.
  await expect(resultado.getByText(/ficaram sem nenhuma posição/)).toBeVisible()

  // A primeira semana, dentro do orçamento escolhido.
  const dias = resultado.getByText(/^Dia \d+ · \d+ min$/)
  await expect(dias).toHaveCount(7)
  for (const texto of await dias.allTextContents()) {
    expect(Number(/· (\d+) min/.exec(texto)?.[1])).toBeLessThanOrEqual(20)
  }

  await expect(resultado.getByText(/Perfil salvo neste navegador/)).toBeVisible()

  await resultado.getByRole('link', { name: 'Ir para o treino de hoje' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Treino de hoje')

  // O orçamento escolhido no diagnóstico é o que o plano do dia usa. Sem isto o
  // diagnóstico seria uma tela bonita que não muda nada.
  await expect(page.getByText('dentro do seu orçamento de 20 min.')).toBeVisible()
})

test('o tom não é de cassino e nada é enviado para fora', async ({ page }) => {
  await page.goto('/onboarding')
  const corpo = page.locator('main')
  await expect(corpo).toContainText('sem envio de dados')
  await expect(corpo).not.toContainText(/parab[ée]ns/i)
  await expect(corpo).not.toContainText(/sequência de dias/i)
})

test('a biblioteca mostra lições que terminam em exercício', async ({ page }) => {
  await page.goto('/lessons')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Biblioteca')

  await page.getByRole('button', { name: 'Abrir lição' }).first().click()

  // A ordem das etapas é a do esquema, e a última é a recuperação.
  const etapas = page.getByRole('heading', { level: 3 })
  await expect(etapas).toHaveText(['Conceito', 'Exemplo resolvido', 'Agora sem ajuda'])

  // O exercício final responde, e só então explica.
  const recuperacao = page.getByRole('region', { name: 'Agora sem ajuda' })
  const opcoes = recuperacao.getByRole('list', { name: 'Lances possíveis' })
  await expect(opcoes.getByRole('button').first()).toBeVisible()
  await opcoes.getByRole('button').first().click()
  await expect(recuperacao.getByText(/objetivo/i).first()).toBeVisible()
})
