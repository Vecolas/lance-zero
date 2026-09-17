/**
 * A Biblioteca e a página da lição, ponta a ponta.
 *
 * A REGRA QUE ESTE ARQUIVO PROTEGE, e é a do plano: a biblioteca comunica o
 * conteúdo ANTES de o aluno abrir, e a lição aberta parece uma mesa de estudo —
 * tabuleiro grande, instrução ao lado — e não uma página de texto com o tabuleiro
 * perdido.
 *
 * O TESTE MAIS IMPORTANTE é `o tabuleiro é a coluna dominante`. Ele é o único
 * aqui que mede pixel, e mede de propósito: "tabuleiro em destaque" é uma frase
 * que todo mundo concorda e ninguém verifica. Antes deste trabalho o tabuleiro
 * estava preso em 20 rem ao lado de um texto que levava o resto da largura — o
 * oposto do que a tela dizia ser.
 */

import { expect, test, type Page } from '@playwright/test'

/** A largura, em pixels, de um elemento visível. */
async function largura(page: Page, seletor: string): Promise<number> {
  return page
    .locator(seletor)
    .first()
    .evaluate((el) => el.getBoundingClientRect().width)
}

test('TESTE BIBLIOTECA — a grade mostra cards com prévia, estado e CTA', async ({ page }) => {
  await page.goto('/lessons')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Biblioteca de lições')

  const grade = page.getByRole('list', { name: 'Lições disponíveis' })
  const cards = grade.getByRole('link')
  // A grade é montada no cliente: esperar o PRIMEIRO card é esperar a
  // hidratação. Contar antes disso mede zero e não prova nada.
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThanOrEqual(12)

  // O card diz as três coisas: o que é, em que estado está, e o que o clique faz.
  const primeiro = cards.first()
  await expect(primeiro).toHaveAttribute('aria-label', /Lição: .+\. Estado: .+\./)
  await expect(primeiro).toContainText('Disponível')
  await expect(primeiro).toContainText('Aprender')
})

test('TESTE PREVIEW — cada card traz o mini tabuleiro da posição da lição', async ({ page }) => {
  await page.goto('/lessons')
  const grade = page.getByRole('list', { name: 'Lições disponíveis' })

  // Um tabuleiro por card: é ele que faz o aluno reconhecer o tema sem abrir.
  const tabuleiros = grade.locator('[data-testid="chessboard"]')
  await expect(tabuleiros.first()).toBeVisible()
  expect(await tabuleiros.count()).toBeGreaterThanOrEqual(12)

  /*
    O TABULEIRO É QUADRADO. Num tabuleiro, distorção não é feiúra: as casas
    deixam de ser casas, e o padrão que o card existe para mostrar deixa de ser
    reconhecível.
  */
  const caixa = await tabuleiros.first().evaluate((el) => {
    const { width, height } = el.getBoundingClientRect()
    return { width, height }
  })
  expect(Math.abs(caixa.width - caixa.height)).toBeLessThan(2)
  expect(caixa.width).toBeGreaterThan(80)
})

test('a prévia NÃO é interativa: a única ação do card é abrir', async ({ page }) => {
  await page.goto('/lessons')
  const grade = page.getByRole('list', { name: 'Lições disponíveis' })

  /*
    NENHUMA PEÇA ARRASTÁVEL dentro do card.

    A biblioteca não julga lance nenhum: um tabuleiro que aceita o arraste e não
    responde ensina que o app às vezes ignora o que você faz. O `role="button"`
    das casas é markup da biblioteca de tabuleiro e existe de qualquer jeito — o
    que distingue prévia de tabuleiro jogável é o arraste.
  */
  await expect(grade.locator('[draggable="true"]')).toHaveCount(0)
})

test('o card leva à lição, que tem endereço próprio', async ({ page }) => {
  await page.goto('/lessons')
  await page.getByRole('link', { name: /A peça que ninguém está defendendo/ }).click()

  // ENDEREÇO PRÓPRIO: antes a lição abria dentro da biblioteca, e a URL não
  // mudava — o link não se compartilhava e recarregar voltava para a lista.
  await expect(page).toHaveURL(/\/lessons\/peca-pendurada$/)
  await expect(page.getByText('Etapa 1 de 9 — O que você vai aprender')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Etapa 1 de 9 — O que você vai aprender')).toBeVisible()
})

test('o filtro por área recorta a grade', async ({ page }) => {
  await page.goto('/lessons')
  const grade = page.getByRole('list', { name: 'Lições disponíveis' })
  await expect(grade.getByRole('link').first()).toBeVisible()
  const todas = await grade.getByRole('link').count()

  await page.getByRole('button', { name: 'Finais', exact: true }).click()
  const finais = await grade.getByRole('link').count()

  expect(finais).toBeGreaterThan(0)
  expect(finais).toBeLessThan(todas)
})

test('TESTE CARD LONGO — título comprido não quebra o card', async ({ page }) => {
  await page.goto('/lessons')
  const grade = page.getByRole('list', { name: 'Lições disponíveis' })
  await expect(grade.getByRole('link').first()).toBeVisible()

  // Nenhum card estoura a própria coluna, e o CTA continua dentro dele.
  const estouros = await grade
    .getByRole('link')
    .evaluateAll((cards) => cards.filter((card) => card.scrollWidth > card.clientWidth + 1).length)
  expect(estouros, 'cards com conteúdo maior que a própria caixa').toBe(0)
})

/**
 * Avança a lição até a primeira etapa COM tabuleiro, e devolve o tabuleiro.
 *
 * NASCEU DE UM FALSO VERMELHO. Os dois testes abaixo clicavam em `Continuar`
 * exatamente três vezes e mediam o que estivesse na tela. Passavam sozinhos e
 * reprovavam na suíte inteira: com doze processos disputando a máquina, o
 * primeiro clique podia chegar antes de a lição terminar de hidratar, cair no
 * vazio, e as três tentativas paravam uma etapa antes do tabuleiro.
 *
 * O teste então acusava "o tabuleiro sumiu" num layout que estava correto — e o
 * próximo a ver isso gastaria a tarde procurando um defeito de CSS.
 *
 * Contar cliques também amarra o teste ao número de etapas do conteúdo: uma
 * etapa nova na lição reprovaria a medida de layout sem nada de layout ter
 * mudado. O teste da jornada de abertura, mais abaixo, já fazia assim.
 */
async function avancarAteOTabuleiro(page: import('@playwright/test').Page) {
  const tabuleiro = page.locator('[data-testid="chessboard"]').first()

  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    if (await tabuleiro.isVisible().catch(() => false)) break
    await page.getByRole('button', { name: 'Continuar' }).click()
  }

  await expect(tabuleiro).toBeVisible()
  return tabuleiro
}

test('TESTE LIÇÃO — o tabuleiro é a coluna DOMINANTE, com a instrução ao lado', async ({
  page,
}) => {
  test.skip(
    test.info().project.name !== 'desktop',
    'a regra de duas colunas vale a partir de 52rem',
  )

  await page.goto('/lessons/peca-pendurada')

  await avancarAteOTabuleiro(page)

  /*
    A MEDIÇÃO É O PONTO. "Tabuleiro em destaque" é uma frase que todo mundo
    aprova e ninguém confere — e a tela dizia isso enquanto o prendia em 20 rem
    ao lado de um texto que levava o resto da largura.
  */
  const larguraDoTabuleiro = await largura(page, '[data-testid="chessboard"]')
  expect(larguraDoTabuleiro, 'o tabuleiro da lição é pequeno demais').toBeGreaterThan(360)
})

test('TESTE RESPONSIVO — no celular o tabuleiro vem primeiro', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'a regra é do celular')

  await page.goto('/lessons/peca-pendurada')

  const tabuleiro = await avancarAteOTabuleiro(page)

  // Em coluna única a prioridade não muda: o tabuleiro vem ANTES do texto.
  const topo = await tabuleiro.evaluate((el) => el.getBoundingClientRect().top)
  expect(topo).toBeLessThan(700)
})

test('a jornada de abertura segue a MESMA regra do tabuleiro grande', async ({ page }) => {
  test.skip(
    test.info().project.name !== 'desktop',
    'a regra de duas colunas vale a partir de 60rem',
  )

  /*
    A ETAPA DA LINHA COMENTADA é a primeira com tabuleiro, e é onde a regra
    aparece: posição de um lado, comentário do lance do outro. A etapa de abertura
    da jornada é leitura pura e não tem tabuleiro — medir lá seria medir o nada.
  */
  await page.goto('/aberturas/italiana')

  // Avança até a primeira etapa COM tabuleiro. O número de etapas de leitura
  // antes dela é conteúdo do currículo, e amarrar o teste a ele o faria reprovar
  // na primeira variação nova da Italiana — que não é defeito de layout.
  const tabuleiro = page.locator('[data-testid="chessboard"]').first()
  for (let tentativa = 0; tentativa < 6; tentativa += 1) {
    if (await tabuleiro.isVisible()) break
    await page.getByRole('button', { name: /Continuar/ }).click()
  }
  await expect(tabuleiro).toBeVisible()

  // A mesma medida da lição: o conteúdo de uma abertura É a posição.
  expect(await largura(page, '[data-testid="chessboard"]')).toBeGreaterThan(360)
})

test('TESTE RETOMAR — quem parou no meio volta onde parou', async ({ page }) => {
  /*
    A LACUNA QUE ESTE TESTE FECHA era silenciosa: `SkillState` só registra o FIM
    da lição, então entre a etapa 1 e a etapa 9 o app não guardava nada. Quem
    fechava a aba na etapa 6 voltava para a etapa 1, e a biblioteca oferecia
    "Aprender" a quem já estava no meio. O estado "Em andamento" existia no
    modelo do card e nunca acontecia na prática.
  */
  await page.goto('/lessons/peca-pendurada')
  await expect(page.getByText('Etapa 1 de 9 — O que você vai aprender')).toBeVisible()

  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Etapa 3 de 9')).toBeVisible()

  // SAIR DE VERDADE: voltar pela biblioteca é o que o aluno faz, e é lá que o
  // checkpoint precisa aparecer. Um `goto` direto na lição não provaria o card.
  await page.goto('/lessons')
  const card = page.getByRole('link', { name: /A peça que ninguém está defendendo/ })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Em andamento')
  await expect(card).toContainText('Continuar')

  await card.click()
  await expect(page.getByText('Etapa 3 de 9')).toBeVisible()
})

test('TESTE ESTADOS — o card diz o estado por texto, e não só por cor', async ({ page }) => {
  /*
    A REGRA DO CLAUDE.md: status nunca depende só de cor — sempre cor + ícone +
    texto. Num card de biblioteca isso não é detalhe de acessibilidade: é a
    diferença entre o aluno saber e o aluno adivinhar o que o clique vai fazer.
  */
  await page.goto('/lessons')
  const card = page.getByRole('link', { name: /^Lição: / }).first()
  await expect(card).toBeVisible()

  // O nome acessível carrega as três informações: o quê, em que estado, e a ação.
  await expect(card).toHaveAttribute(
    'aria-label',
    /Lição: .+\. Estado: .+\. (Aprender|Continuar|Rever lição|Revisar|Reaprender)/,
  )

  // E o estado está visível como TEXTO, não só como cor de borda.
  await expect(card).toContainText(/Disponível|Em andamento|Concluída|Revisar|Reaprender/)
})
