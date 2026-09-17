/**
 * RESPONDER É JOGAR — medido no navegador.
 *
 * O QUE ESTE ARQUIVO IMPEDE DE VOLTAR: a lição mantinha a posição CONGELADA. O
 * aluno arrastava a peça, acertava, e a peça voltava — o lance certo nunca
 * aparecia no tabuleiro e o adversário não existia. Havia ainda um botão
 * `Continuar` entre um lance e o próximo, que trocava a tela a cada jogada.
 *
 * OS DOIS CASOS ESTÃO AQUI DE PROPÓSITO, e são o par que impede a correção de
 * virar outro defeito:
 *
 *   - ERROU: a posição NÃO anda. Se andasse, errar seria um jeito de avançar;
 *   - ACERTOU: a posição anda DOIS lances — o do aluno e o do computador — sem
 *     nenhum clique no meio.
 *
 * A LIÇÃO ESCOLHIDA É `lances-candidatos`, e não por acaso: o aluno joga de
 * PRETAS ali, então ela também prova o lado que falta — o computador jogando de
 * brancas sozinho.
 */

import { expect, test, type Locator, type Page } from '@playwright/test'

/** Abre a lição e avança até a etapa que cobra um lance. */
async function ateOExercicio(page: Page): Promise<Locator> {
  await page.goto('/lessons/lances-candidatos')
  for (let i = 0; i < 16; i += 1) {
    const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
    if (await tabuleiro.isVisible().catch(() => false)) return tabuleiro
    await page
      .getByRole('button', { name: /Continuar|Próximo passo|Seguir/ })
      .first()
      .click()
    await page.waitForTimeout(120)
  }
  throw new Error('nenhuma etapa interativa encontrada na lição')
}

/** Joga clicando nas duas casas — a porta que não exige arraste. */
async function jogar(page: Page, de: string, para: string) {
  await page.locator(`#lancezero-board-square-${de}`).click()
  await page.locator(`#lancezero-board-square-${para}`).click()
  await page.waitForTimeout(120)
}

test('TESTE SNAPBACK — lance errado não anda a posição', async ({ page }) => {
  const tabuleiro = await ateOExercicio(page)
  const antes = await tabuleiro.getAttribute('data-fen')
  expect(antes).toBeTruthy()

  /*
    Cxg2+ É LEGAL E É O LANCE QUE A VISTA PEGA PRIMEIRO — xeque e captura ao
    mesmo tempo. Ele não resolve, e é exatamente o erro que a lição existe para
    corrigir. Medir o snapback com um lance PLAUSÍVEL importa: um lance
    aleatório provaria menos.
  */
  await jogar(page, 'e3', 'g2')

  // A POSIÇÃO É A MESMA. É aqui que "errar não faz avançar" vira uma medida em
  // vez de uma promessa.
  await expect(tabuleiro).toHaveAttribute('data-fen', antes ?? '')

  // E nada convida a seguir em frente: o exercício continua aberto.
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toHaveCount(0)
  await expect(page.locator('[data-testid="chessboard"][data-interactive="true"]')).toHaveCount(1)
})

test('TESTE SEQUÊNCIA — o lance certo anda DOIS lances, sem clique no meio', async ({ page }) => {
  const tabuleiro = await ateOExercicio(page)
  const antes = (await tabuleiro.getAttribute('data-fen')) ?? ''

  // O aluno joga de pretas, e no FEN inicial é a vez dele.
  expect(antes.split(' ')[1]).toBe('b')

  // Cc2+ — o garfo de rei e torre.
  await jogar(page, 'e3', 'c2')

  const depois = (await tabuleiro.getAttribute('data-fen')) ?? ''
  expect(depois).not.toBe(antes)

  /*
    DOIS LANCES, NUM GESTO SÓ.

    O computador respondeu Rd2 na MESMA transição: a vez voltou a ser das pretas
    sem que o aluno clicasse em nada. Se a resposta viesse por botão — ou não
    viesse —, o FEN estaria na vez das brancas aqui.
  */
  expect(depois.split(' ')[1]).toBe('b')

  /*
    `2nK` NA SEGUNDA FILEIRA é o retrato dos dois lances juntos: o cavalo preto
    em c2, que o aluno jogou, e o rei branco em d2 ao lado dele, que o computador
    jogou para sair do xeque. Uma asserção só de "o FEN mudou" passaria com o
    lance do aluno sozinho.
  */
  expect(depois).toContain('2nK')

  await expect(page.getByTestId('estado-do-exercicio')).toContainText('computador respondeu')

  // Recolher a torre é o que prova o garfo — e é o que encerra o exercício.
  await jogar(page, 'c2', 'a1')
  await expect(page.getByTestId('estado-do-exercicio')).toContainText('concluído')
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible()
})

test('TESTE AO LADO — a instrução fica ao lado do tabuleiro, nunca embaixo', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'a regra "ao lado" é do desktop')

  const tabuleiro = await ateOExercicio(page)
  const caixaDoTabuleiro = await tabuleiro.boundingBox()
  const painel = await page.getByTestId('instrucao-do-estudo').first().boundingBox()

  expect(caixaDoTabuleiro).not.toBeNull()
  expect(painel).not.toBeNull()
  if (!caixaDoTabuleiro || !painel) return

  // A MESMA MEDIDA DA JORNADA: o painel começa depois do fim do tabuleiro no
  // eixo X e antes do fim dele no eixo Y. É o que distingue "ao lado" de
  // "embaixo" sem confiar na descrição do CSS.
  expect(painel.x, 'a instrução caiu abaixo do tabuleiro em vez de ficar ao lado').toBeGreaterThan(
    caixaDoTabuleiro.x + caixaDoTabuleiro.width - 1,
  )
  expect(painel.y).toBeLessThan(caixaDoTabuleiro.y + caixaDoTabuleiro.height)

  // E o tabuleiro continua sendo o conteúdo, não uma miniatura ao lado do texto.
  expect(caixaDoTabuleiro.width).toBeGreaterThan(360)
})
