import { expect, test } from '@playwright/test'

/**
 * O "Hoje" e o "Treinar", depois da correção da lógica de aprendizado.
 *
 * ESTES TESTES SÃO A DEFINITION OF DONE DAS §48 E §49 DO PLANO, escrita como
 * portão. Cada `test` aqui corresponde a uma linha daquelas listas, e o que eles
 * mais afirmam são AUSÊNCIAS — o botão global que não pode voltar, o exercício
 * que não pode abrir sozinho. Ausência é o que ninguém nota faltando: se o botão
 * "Começar o treino" voltar num refactor, nada quebra, a tela funciona, e o
 * produto volta a ser uma sessão linear sem ninguém perceber.
 */

test('o Hoje lista atividades independentes, sem botão global de começar', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Treino de hoje')

  // A promessa da §48, afirmada como ausência: não existe porta única para o dia.
  await expect(page.getByRole('link', { name: 'Começar o treino' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /começar o treino/i })).toHaveCount(0)

  // O progresso é dito em TEXTO, não só na barra.
  await expect(page.getByText(/0 de \d+ conclu/)).toBeVisible()

  // Cada atividade é um card clicável, com motivo e destino próprios.
  const cards = page.getByRole('listitem')
  const total = await cards.count()
  expect(total).toBeGreaterThan(0)

  for (let i = 0; i < total; i += 1) {
    const link = cards.nth(i).getByRole('link')
    await expect(link).toHaveAttribute('href', /^\//)
    // Regra R10: todo card diz por que está ali.
    await expect(link).toContainText(/\w{20,}/)
  }
})

test('todo card do Hoje nasce pendente, com o status em texto e não só em símbolo', async ({
  page,
}) => {
  await page.goto('/dashboard')
  // Espera o plano existir antes de perguntar qualquer coisa sobre ele: sem
  // isto o teste mede a tela de carregamento e chama de ausência de cards.
  await expect(page.getByText(/\d+ de \d+ conclu/)).toBeVisible()

  // Status por símbolo sozinho falha do mesmo jeito que status por cor. O
  // rótulo em texto é o que o leitor de tela lê.
  const pendentes = page.getByText('Pendente', { exact: true })
  expect(await pendentes.count()).toBeGreaterThan(0)
})

test('um aluno novo NUNCA recebe PRÁTICA do que não foi ensinado', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText(/\d+ de \d+ conclu/)).toBeVisible()

  // A regra R1 vista pela tela: para quem nunca treinou, nada de "Praticar".
  const cards = page.getByRole('listitem')
  const total = await cards.count()
  expect(total).toBeGreaterThan(0)

  /**
   * A EXCEÇÃO DA REVISÃO DE REPERTÓRIO, declarada em vez de escondida.
   *
   * Um aluno novo PODE receber "Revisar — Revisões vencidas" no primeiro dia,
   * porque o app semeia os nós do repertório de fábrica como cards e eles
   * nascem vencidos (ver `semearCardsDeRepertorio`, entregue na issue #72).
   *
   * ISSO É UMA TENSÃO REAL com a regra deste trabalho, e está registrada como
   * ponto cego no ADR-0011: pela §50 do plano, a pergunta "o app já ensinou a
   * este aluno as ferramentas para tentar isto?" tem resposta NÃO para uma
   * linha de repertório que ele nunca abriu. Resolver isso é mexer no
   * comportamento do repertório — decisão de produto separada desta entrega —,
   * e escondê-la afrouxando este teste em silêncio seria pior que declará-la.
   *
   * O que o teste continua cobrando sem exceção nenhuma: nenhuma PRÁTICA.
   */
  for (let i = 0; i < total; i += 1) {
    const texto = (await cards.nth(i).innerText()).toLowerCase()
    expect(texto, `card ${i} manda um aluno novo praticar sem apoio`).not.toContain('praticar')
    expect(
      texto.includes('aprender') ||
        texto.includes('calibrar') ||
        texto.includes('analisar') ||
        texto.includes('revisar'),
      `card ${i} tem um tipo inesperado para aluno novo: ${texto}`,
    ).toBe(true)
  }
})

test('trocar o tempo disponível remonta o plano e persiste', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByText(/0 de \d+ conclu/)).toBeVisible()

  await page.getByRole('button', { name: '20 min' }).click()
  await expect(page.getByRole('button', { name: '20 min' })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()
  await expect(page.getByRole('button', { name: '20 min' })).toHaveAttribute('aria-pressed', 'true')
})

test('o plano de hoje é o MESMO depois de recarregar — não é resorteado', async ({ page }) => {
  await page.goto('/dashboard')
  const cards = page.getByRole('listitem')
  await expect(cards.first()).toBeVisible()
  const antes = await cards.allInnerTexts()

  await page.reload()
  await expect(cards.first()).toBeVisible()
  const depois = await cards.allInnerTexts()

  // O plano é gravado, não derivado a cada montagem. Sem isto, concluir uma
  // atividade reordenaria as outras sozinho.
  expect(depois).toEqual(antes)
})

/*
  A ABA "TREINAR" VIROU "REVISAR".

  O caso abaixo era `abrir Treinar NÃO dispara um exercício: é um hub` e afirmava
  os quatro títulos do hub. O hub deixou de existir — ele era um roteador: cinco
  dos seis blocos só apontavam para lugares que já existiam.

  A AFIRMAÇÃO QUE SOBREVIVEU É A DE AUSÊNCIA, e é a que importa: abrir a aba não
  monta tabuleiro nenhum. Ela vem da §49 do plano de aprendizado e é a razão de o
  hub ter existido em primeiro lugar — `/train` abria uma posição direto, sem o
  aluno ter escolhido nada. A tela nova herda a propriedade.
*/
test('abrir Revisar NÃO dispara um exercício', async ({ page }) => {
  await page.goto('/revisao')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revisar')

  // Nenhum tabuleiro, nenhuma pergunta sobre um lance.
  await expect(page.locator('[data-testid="chessboard"]')).toHaveCount(0)

  // Nada chamado genericamente de "puzzle": o vocabulário é pedagógico.
  await expect(page.getByText(/puzzle/i)).toHaveCount(0)
})

test('o endereço antigo de Treinar leva à casa da revisão', async ({ page }) => {
  // `/train` esteve na navegação desde a fase 5 e está no SHELL do service
  // worker. Um 404 aqui transformaria renomear uma aba em perder acesso.
  await page.goto('/train')
  await expect(page).toHaveURL(/\/revisao$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Revisar')
})

test('Revisar admite quando não há nada vencido, sem esconder o caminho', async ({ page }) => {
  await page.goto('/revisao')

  /*
    Estado vazio HONESTO, e o botão CONTINUA VISÍVEL.

    Escondê-lo faria a tela parecer quebrada — o aluno chega na aba de revisar e
    não encontra como revisar. Inerte com o motivo ao lado, ele ensina a regra.
  */
  await expect(page.getByText('Nada vencido agora')).toBeVisible()
  await expect(page.getByText(/Antecipar revisão não ajuda a fixar/)).toBeVisible()
  await expect(page.getByText('Revisar agora')).toBeVisible()
})

test('a prática de uma habilidade nunca vista manda aprender antes', async ({ page }) => {
  await page.goto('/pratica/tactics.fork')

  // A porta que fecha a dívida: sem estágio, não há exercício.
  await expect(page.getByText(/ainda não te mostrou|adivinhar/i)).toBeVisible()
  await expect(page.locator('[data-testid="chessboard"]')).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Aprender/i })).toBeVisible()
})

test('a lição ensina antes de cobrar, e o exercício só aparece depois', async ({ page }) => {
  await page.goto('/lessons/tactics.hanging-piece')

  // A primeira etapa é objetivo, não pergunta. É a ordem de `ETAPAS_DA_LICAO`,
  // e a tela não pode escolher outra.
  await expect(page.getByText('Etapa 1 de 9 — O que você vai aprender')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible()

  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Etapa 2 de 9 — A ideia')).toBeVisible()

  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(
    page.getByText('Etapa 3 de 9 — A pergunta que você leva para a partida'),
  ).toBeVisible()
})

/**
 * A EVOLUÇÃO MORA NO ROADMAP. `/progress` foi uma tela e virou redirecionamento;
 * o teste passa a ir onde o conteúdo está.
 *
 * Enquanto ele apontava para `/progress`, chegava numa página que não tinha
 * aquilo — o redirecionamento existia, mas ninguém tinha remontado a evolução no
 * destino. É como o conteúdo ficou órfão sem nada apontar.
 */
test('a evolução admite que ainda não há o que medir', async ({ page }) => {
  await page.goto('/roadmap')
  await expect(page.getByRole('heading', { name: 'Últimos 7 dias' })).toBeVisible()
  await expect(page.getByText(/Ainda não há atividade registrada nesta semana/)).toBeVisible()
  await expect(page.getByText(/Ainda não há o que medir/)).toBeVisible()
})

test('a fila tem rota própria e admite quando não há nada vencido', async ({ page }) => {
  await page.goto('/revisao/sessao')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sessão de revisão')
  await expect(page.getByText(/Nada vencido agora/)).toBeVisible()
})

test('o endereço antigo da fila continua abrindo', async ({ page }) => {
  // É o href que os PLANOS JÁ GRAVADOS guardam. Sem o desvio, o card
  // "Revisões vencidas" de ontem abriria um 404 hoje.
  await page.goto('/train/revisao')
  await expect(page).toHaveURL(/\/revisao\/sessao$/)
})
