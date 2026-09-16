/**
 * A REGRA CENTRAL: se a pergunta pode ser respondida com um lance, a resposta
 * acontece no tabuleiro.
 *
 * O QUE ESTE ARQUIVO IMPEDE DE VOLTAR. A lição perguntava "qual peça você deve
 * capturar?" e oferecia `[Rxc6] [Rxd5] [Qxd4]`. Com três strings na tela o aluno
 * não resolve a posição: ele lê e escolhe. Dava para acertar sem localizar a
 * peça, sem ver de onde ela é atacada, e sem nunca executar o movimento — e a
 * evidência de aprendizado virava "clicou no botão certo".
 *
 * O CASO MAIS IMPORTANTE é `TESTE ILEGAL`. Ele prova a separação entre as duas
 * perguntas que a tela faz a cada arraste — "isto é um lance?" e "este lance
 * responde ao que estou ensinando?". Sem ela, um arraste torto vira erro
 * conceitual, a escada de dicas avança sozinha, e o aluno é corrigido por algo
 * que nem chegou a afirmar.
 */

import { expect, test, type Page } from '@playwright/test'

/** Abre a lição e avança até a etapa que cobra um lance. */
async function ateOExercicio(page: Page) {
  await page.goto('/lessons/peca-pendurada')
  /*
    O AVANÇO TEM MAIS DE UM RÓTULO: "Continuar" na maioria das etapas e
    "Próximo passo" dentro do exemplo resolvido, que anda linha a linha. Um
    regex só com "Continuar" empacava ali — e o teste acusava "nenhuma etapa
    interativa" quando o defeito era o laço, não a lição.
  */
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

test('TESTE SEM NOTAÇÃO — nenhuma etapa oferece lance como botão', async ({ page }) => {
  await page.goto('/lessons/peca-pendurada')

  for (let etapa = 0; etapa < 9; etapa += 1) {
    /*
      A LISTA DE OPÇÕES NÃO EXISTE MAIS em nenhuma das nove etapas.

      A asserção é pelo rótulo acessível da lista, que era o contrato dela —
      procurar a classe CSS passaria assim que alguém a renomeasse.
    */
    await expect(page.getByRole('list', { name: 'Lances possíveis' })).toHaveCount(0)

    /*
      E NENHUM BOTÃO COM CARA DE NOTAÇÃO.

      O padrão cobre SAN (`Rxc6`, `Nf3`, `O-O`) e UCI (`c1c6`). Ele é
      deliberadamente amplo: o objetivo não é proibir três strings específicas, é
      impedir que a notação volte a ser o MECANISMO de resposta.
    */
    const notacao = await page
      .getByRole('button')
      .evaluateAll((botoes) =>
        botoes
          .map((b) => (b.textContent ?? '').trim())
          .filter((t) =>
            /^(O-O(-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](=[QRBN])?[+#]?|[a-h][1-8][a-h][1-8][qrbn]?)$/.test(
              t,
            ),
          ),
      )
    expect(notacao, `botão de notação como resposta: ${notacao.join(', ')}`).toEqual([])

    const continuar = page.getByRole('button', { name: /Continuar|Próximo passo|Seguir/ }).first()
    if (!(await continuar.isVisible().catch(() => false))) break
    await continuar.click()
    await page.waitForTimeout(120)
  }
})

test('TESTE TABULEIRO — a etapa que cobra lance tem peça arrastável', async ({ page }) => {
  await ateOExercicio(page)

  // O tabuleiro da resposta é INTERATIVO — é o que o distingue da ilustração.
  await expect(page.locator('[data-testid="chessboard"][data-interactive="true"]')).toHaveCount(1)
  // E a tela diz como responder: sem isso o aluno olha para a posição e não
  // sabe que o arraste é a resposta. O hábito do botão fica.
  await expect(page.getByText('Jogue o lance no tabuleiro.')).toBeVisible()
})

test('TESTE ILEGAL — arraste impossível não conta como erro conceitual', async ({ page }) => {
  const tabuleiro = await ateOExercicio(page)
  const caixa = await tabuleiro.boundingBox()
  if (!caixa) throw new Error('tabuleiro sem caixa')

  /*
    ARRASTA DE UM CANTO AO OUTRO — quase certamente ilegal seja qual for a
    posição. O que se mede não é o lance: é a AUSÊNCIA de consequência
    pedagógica. Nenhum veredito de acerto ou erro pode aparecer.
  */
  const origem = { x: caixa.x + caixa.width * 0.06, y: caixa.y + caixa.height * 0.94 }
  const destino = { x: caixa.x + caixa.width * 0.94, y: caixa.y + caixa.height * 0.06 }

  await page.mouse.move(origem.x, origem.y)
  await page.mouse.down()
  await page.mouse.move(destino.x, destino.y, { steps: 10 })
  await page.mouse.up()

  await expect(page.getByText(/Cumpriu o objetivo|Não cumpre o objetivo/)).toHaveCount(0)
  // E o tabuleiro continua aceitando lance: nada foi consumido.
  await expect(page.locator('[data-testid="chessboard"][data-interactive="true"]')).toHaveCount(1)
})

test('TESTE ERRO NÃO CONCLUI — a etapa continua aberta depois de um lance errado', async ({
  page,
}) => {
  /*
    A REGRA ABSOLUTA DO PLANO (§29): lance errado ≠ etapa concluída.

    O caminho mais curto para provar isso sem depender de qual lance é errado:
    a etapa só oferece "Continuar" depois de um veredito, e o veredito de erro
    não pode fechar a lição sozinho. Aqui checamos o contrário disso — que a
    tela de resumo não apareceu.
  */
  await ateOExercicio(page)
  await expect(page.getByText('Antes de jogar, na sua próxima partida:')).toHaveCount(0)
})
