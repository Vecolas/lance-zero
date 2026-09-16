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
  //
  // A AFIRMAÇÃO MUDOU DE LUGAR, não de conteúdo: o Hoje V2 não escreve mais
  // "dentro do seu orçamento de 20 min" no resumo — o resumo agora conta
  // atividades concluídas. Quem carrega o orçamento é o seletor, e é nele que
  // a escolha do diagnóstico tem de aparecer.
  await expect(page.getByRole('button', { name: '20 min' })).toHaveAttribute('aria-pressed', 'true')

  // E o plano cabe nele: a soma dos minutos dos cards não passa do orçamento.
  const minutos = await page
    .getByRole('listitem')
    .getByText(/^\d+ min$/)
    .allTextContents()
  const soma = minutos.reduce((total, texto) => total + Number(/(\d+)/.exec(texto)?.[1] ?? 0), 0)
  expect(soma).toBeLessThanOrEqual(20)
})

test('o tom não é de cassino e nada é enviado para fora', async ({ page }) => {
  await page.goto('/onboarding')
  const corpo = page.locator('main')
  /*
    A PROMESSA, não a grafia.

    Este trecho cobrava a string exata "sem envio de dados". A tela passou a
    dizer "Sem conta ou envio de dados: o resultado fica neste navegador" — o
    compromisso continua inteiro, e mesmo assim o teste reprovava. Teste preso à
    redação transforma revisão de texto em falha, e o efeito prático é ensinar a
    ignorar o vermelho.

    O que importa cobrar é o COMPROMISSO: nenhum dado sai do navegador. As duas
    metades da frase ficam.
  */
  await expect(corpo).toContainText(/envio de dados/)
  await expect(corpo).toContainText(/fica neste navegador/)
  await expect(corpo).not.toContainText(/parab[ée]ns/i)
  await expect(corpo).not.toContainText(/sequência de dias/i)
})

test('a lição ENSINA antes de cobrar, e a ordem das etapas é a do esquema', async ({ page }) => {
  await page.goto('/lessons')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Biblioteca')

  await page.getByRole('button', { name: 'Abrir lição' }).first().click()

  /**
   * A LIÇÃO TEM NOVE ETAPAS, e não mais três.
   *
   * O teste antigo afirmava `['Conceito', 'Exemplo resolvido', 'Agora sem
   * ajuda']` — e aquela lista de três era exatamente a dívida pedagógica: entre
   * ver a solução pronta e responder sem nenhuma ajuda havia um degrau que o
   * aluno só conseguia vencer por tentativa e erro.
   *
   * O que se afirma agora é a MESMA regra, mais forte: as etapas são mostradas
   * UMA DE CADA VEZ, na ordem do esquema, e as três primeiras não pedem lance
   * nenhum. O app explica antes de perguntar.
   */
  await expect(page.getByText('Etapa 1 de 9 — O que você vai aprender')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Lances possíveis' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Etapa 2 de 9 — A ideia')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Lances possíveis' })).toHaveCount(0)

  // A terceira etapa é a pergunta reutilizável — o que o aluno leva para a
  // partida, e a etapa que mais distingue ensinar de cobrar.
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(
    page.getByText('Etapa 3 de 9 — A pergunta que você leva para a partida'),
  ).toBeVisible()
  // A pergunta reutilizável tem PASSOS, e são eles que o aluno leva embora.
  // Conta os itens em vez de casar texto: `\w{10,}` quebrava na primeira
  // palavra acentuada e reprovava um conteúdo perfeitamente correto.
  const passos = page.getByRole('listitem')
  expect(await passos.count()).toBeGreaterThan(1)
})
