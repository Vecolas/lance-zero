/**
 * O CONTRATO VISUAL DA JORNADA (V5.1 §180A–180C, §180F).
 *
 * Dois defeitos deste arquivo existem para impedir, e os dois eram visíveis na
 * tela enquanto nenhum teste os via:
 *
 * 1. **A FAIXA COM TODOS OS NOMES.** A navegação imprimia os dez rótulos de uma
 *    jornada de final lado a lado. Ela comia a largura que o tabuleiro deveria
 *    ter, transformava o curso numa coleção de abas, e anunciava o que o aluno
 *    não tinha alcançado como "ainda não aberta".
 *
 * 2. **O TEXTO EMBAIXO DO TABULEIRO COM A LATERAL VAZIA.** Em desktop, o painel
 *    pedagógico caindo sob o tabuleiro enquanto sobra meia tela à direita é
 *    layout incorreto — e é o mais fácil de reintroduzir sem perceber, porque a
 *    página continua "funcionando".
 *
 * O SEGUNDO SÓ É PEGÁVEL MEDINDO. "Tabuleiro em destaque com instrução ao lado"
 * é uma frase que todo mundo aprova e ninguém confere; o que este arquivo faz é
 * comparar as caixas.
 */

import { expect, test, type Page } from '@playwright/test'

/**
 * Avança até a primeira etapa que tem tabuleiro E painel de instrução.
 *
 * ESPERA A ETAPA RENDERIZAR ANTES DE CLICAR DE NOVO. A primeira versão usava
 * `isVisible()` — que responde no instante — e clicava em Continuar antes de a
 * etapa nova aparecer. Numa execução isolada passava; com a suíte inteira
 * disputando CPU, o laço atravessava a etapa certa e parava numa que não tem
 * painel. O teste reprovava por corrida, não por layout, que é a pior espécie de
 * vermelho: ele acusa o lugar errado.
 *
 * O alvo é o PAR tabuleiro + painel, porque é o par que a regra descreve.
 */
async function ateOTabuleiro(page: Page) {
  const tabuleiro = page.locator('[data-testid="chessboard"]').first()
  const painel = page.locator('[data-testid="instrucao-do-estudo"]').first()

  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    if (await painel.isVisible().catch(() => false)) break
    await page.getByRole('button', { name: /Continuar/ }).click()
    // Espera a etapa NOVA assentar: o cabeçalho é o que sempre muda.
    await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(/—\s*\d+\/\d+/)
    await page.waitForTimeout(150)
  }

  await expect(tabuleiro).toBeVisible()
  await expect(painel).toBeVisible()
  return tabuleiro
}

async function caixa(page: Page, seletor: string) {
  return page
    .locator(seletor)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }
    })
}

/*
  O TOTAL NÃO É CRAVADO NO TESTE.

  O V5.1 prevê 10 etapas no final e 8 na abertura, mas o número exato é CONTEÚDO
  do currículo — a abertura tem 9 hoje porque a etapa "Respostas" ainda não foi
  fundida à linha principal, que é trabalho à parte. Amarrar o teste ao número
  faria ele reprovar na primeira etapa nova por um motivo que não é layout.

  O que se afirma é o FORMATO: nome, travessão, posição/total.
*/
for (const { nome, rota } of [
  { nome: 'final', rota: '/finais/oposicao' },
  { nome: 'abertura', rota: '/aberturas/italiana' },
]) {
  test(`TESTE ETAPA ÚNICA — a jornada de ${nome} mostra uma etapa por vez`, async ({ page }) => {
    await page.goto(rota)

    /*
      O CABEÇALHO DIZ NOME + POSIÇÃO. "Reconhecer" sozinho conta o que o aluno
      está fazendo e esconde quanto falta — que é a diferença entre um curso e
      uma sequência de telas sem fim.
    */
    const cabecalho = page.getByRole('heading', { level: 2 }).first()
    await expect(cabecalho).toContainText(/—\s*\d+\/\d+/)

    /*
      E NÃO EXISTE A FAIXA COM TODOS OS NOMES.

      A medida é o número de rótulos de etapa visíveis fora do Mapa: um. Contar
      "não existe elemento X" passaria assim que alguém renomeasse a classe.
    */
    const rotulos = await page.evaluate(() => {
      const textos = [...document.querySelectorAll('h2, nav a, nav button, nav span')]
        .map((el) => (el.textContent ?? '').trim())
        .filter(Boolean)
      return textos.filter((t) => /^(Visão|Reconhecer|Princípio|Demonstrar|Ideias|Linha)\b/.test(t))
        .length
    })
    expect(rotulos, 'a faixa com todos os nomes de etapa voltou').toBeLessThanOrEqual(1)

    // E nada no produto diz mais "ainda não aberta".
    await expect(page.getByText(/ainda não aberta/i)).toHaveCount(0)
  })
}

test('TESTE MAPA — o índice abre, lista tudo e leva a qualquer etapa', async ({ page }) => {
  await page.goto('/finais/oposicao')

  await page.getByRole('button', { name: /Mapa do estudo/ }).click()
  const mapa = page.getByRole('dialog', { name: 'Mapa do estudo' })
  await expect(mapa).toBeVisible()

  /*
    TODAS AS ETAPAS SÃO BOTÃO. Nenhuma é um rótulo inerte — é o que distingue
    orientar de aprisionar, e era literalmente o contrário antes.
  */
  const etapas = mapa.getByRole('button').filter({ hasNotText: /Fechar/ })
  expect(await etapas.count()).toBeGreaterThanOrEqual(8)

  // A última etapa da jornada abre, mesmo sem nada concluído.
  await etapas.last().click()
  await expect(mapa).toBeHidden()
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText(/—\s*\d+\/\d+/)
})

test('TESTE MAPA — Escape fecha o índice', async ({ page }) => {
  await page.goto('/finais/oposicao')
  await page.getByRole('button', { name: /Mapa do estudo/ }).click()
  await expect(page.getByRole('dialog', { name: 'Mapa do estudo' })).toBeVisible()

  // Sem isto o índice é armadilha de teclado: cobre a tela e o foco fica atrás.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Mapa do estudo' })).toBeHidden()
})

test('TESTE LAYOUT — em desktop a instrução fica AO LADO do tabuleiro', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'a regra é de largura, não de projeto')

  await page.goto('/finais/oposicao')
  const tabuleiro = await ateOTabuleiro(page)
  const caixaDoTabuleiro = await tabuleiro.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }
  })

  /*
    O PAINEL COMEÇA DEPOIS DO TABULEIRO NO EIXO X, e não abaixo dele.

    É exatamente o defeito da captura que originou o V5.1: tabuleiro à esquerda,
    texto embaixo, e meia tela vazia à direita. Duas asserções, porque uma só
    passaria com o painel empilhado numa página estreita.
  */
  const painel = await caixa(page, '[data-testid="instrucao-do-estudo"]')
  expect(
    painel.left,
    'a instrução caiu abaixo do tabuleiro em vez de ficar ao lado',
  ).toBeGreaterThanOrEqual(caixaDoTabuleiro.right - 1)
  expect(painel.top, 'a instrução começa abaixo do fim do tabuleiro').toBeLessThan(
    caixaDoTabuleiro.bottom,
  )

  // O TABULEIRO CONTINUA DOMINANTE: nunca reduzido a miniatura para caber duas
  // colunas (§18H). Se não coubesse, a regra seria empilhar — não encolher.
  expect(caixaDoTabuleiro.width).toBeGreaterThan(360)
})

test('TESTE LAYOUT — no celular o tabuleiro vem antes do texto', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'a regra é do celular')

  await page.goto('/finais/oposicao')
  const tabuleiro = await ateOTabuleiro(page)
  const topoDoTabuleiro = await tabuleiro.evaluate((el) => el.getBoundingClientRect().top)
  const painel = await caixa(page, '[data-testid="instrucao-do-estudo"]')

  // Empilhado, e nessa ordem: o tabuleiro é o objeto do estudo.
  expect(painel.top).toBeGreaterThan(topoDoTabuleiro)
})
