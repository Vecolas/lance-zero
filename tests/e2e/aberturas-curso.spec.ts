import { expect, test } from '@playwright/test'
import { legalMoves } from '@/lib/chess'

/**
 * A jornada da abertura, medida no navegador.
 *
 * ESTE ARQUIVO FOI REESCRITO, e vale registrar de quê para quê. Ele testava a
 * navegação por ABAS do curso antigo — "clique em Aprender", "clique em
 * Treinar", "clique em Planos". Aquelas asserções morreram com a tela, mas o
 * que elas PROTEGIAM continua valendo, e é isto que os testes abaixo afirmam
 * sobre a jornada:
 *
 *   - o treino não revela a resposta antes da tentativa;
 *   - as respostas do adversário são ENSINADAS no tabuleiro, e a jornada não
 *     fala com o explorador (ADR-0018 — ele mora em `/openings`, e é lá que
 *     `aberturas.spec.ts` guarda o "sob demanda");
 *   - o catálogo filtra;
 *   - quem já conhece a abertura tem uma verificação curta;
 *   - dá para adotar a abertura no repertório;
 *   - os planos mostram a rota, inclusive em texto.
 *
 * Nenhuma capacidade foi perdida na migração — o plano §153 é explícito: migrar
 * o conteúdo para as etapas, não apagá-lo. Reescrever o teste para o novo
 * caminho é como isso fica provado, em vez de prometido.
 */

/**
 * Percorre a jornada até a etapa pedida.
 *
 * As etapas de leitura só pedem `Continuar →`. A PRÁTICA GUIADA não: ela exige
 * responder os itens previstos, e o `Continuar →` fica desabilitado até lá — o
 * que é justamente a regra que impede o aluno de cair no treino sem ter passado
 * pelo caminho. O ajudante responde, e é por isso que ele existe: sem ele, cada
 * teste reimplementaria essa travessia e uma das cópias ficaria para trás.
 */
async function irAteEtapa(page: import('@playwright/test').Page, titulo: RegExp) {
  for (let i = 0; i < 24; i += 1) {
    /*
      O ALVO É O `h1`, e não "qualquer texto na página". O trilho de progresso
      anuncia as etapas FUTURAS para leitor de tela ("Etapa 6: Planos e
      estruturas, ainda não aberta"), então um `getByText` solto casava com a
      etapa que ainda nem abriu e o ajudante parava cedo — levando o teste a
      afirmar sobre a tela errada.
    */
    const atual = await page
      .getByRole('heading', { level: 2 })
      .first()
      .innerText()
      .catch(() => '')
    if (titulo.test(atual)) return

    /*
      ETAPA QUE COBRA RESPOSTA: joga no tabuleiro.

      Antes o ajudante clicava na primeira opção de uma lista de notação. A
      lista saiu — a resposta é um lance —, e o que ele faz agora é jogar o
      primeiro lance legal da posição. Ele não tenta acertar: a travessia existe
      para CHEGAR a uma etapa, e os testes que medem acerto o fazem por conta
      própria.
    */
    const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
    if (await tabuleiro.isVisible().catch(() => false)) {
      const fen = await tabuleiro.getAttribute('data-fen')
      const lance = fen ? legalMoves(fen)[0] : undefined
      if (lance) {
        await page.locator('#lancezero-board-square-' + lance.from).click()
        await page.locator('#lancezero-board-square-' + lance.to).click()
        const confirmar = page.getByRole('button', { name: 'Continuar', exact: true })
        if ((await confirmar.count()) > 0) await confirmar.first().click()
        continue
      }
    }

    const continuar = page.getByRole('button', { name: /Continuar →/ })
    if ((await continuar.count()) === 0) break
    if (await continuar.isDisabled()) break
    await continuar.click()
  }
}

test('a jornada abre pela visão e chega ao treino sem revelar a resposta', async ({ page }) => {
  await page.route('https://explorer.lichess.ovh/**', (route) => route.abort())
  await page.goto('/aberturas')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Aberturas')
  await page.getByRole('link', { name: /Abertura Italiana/ }).click()

  // A jornada começa na VISÃO, e não num menu de abas.
  await expect(page.getByText('Etapa 1 de 9')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Visão e objetivo' })).toBeVisible()

  await irAteEtapa(page, /Treino final/)

  // O treino é o ÁPICE, e continua sem dicas.
  await expect(page.getByText('TREINO · sem dicas')).toBeVisible()

  /*
    E NÃO ENTREGA NADA ANTES DA TENTATIVA.

    A versão anterior desta asserção procurava o texto "Lance do repertório." e
    passava por sorte: a frase de instrução da própria tela ("Jogue o lance do
    repertório…") contém essa substring, então o teste media a instrução em vez
    do feedback — e no desktop passava só porque o computador ainda estava
    respondendo naquele instante.

    O que se afirma agora é o fato: antes de qualquer lance do aluno não existe
    desfecho de rodada na tela.
  */
  await expect(page.getByText('Rodada concluída')).toHaveCount(0)
  await expect(page.getByText('Rodada encerrada')).toHaveCount(0)
  await expect(page.getByText('FORA DO REPERTÓRIO')).toHaveCount(0)
})

test('as respostas do adversário são ensinadas no tabuleiro, sem explorador', async ({ page }) => {
  /*
    O QUE ESTE TESTE SUBSTITUIU: "o Explorer continua sendo enriquecimento sob
    demanda", que media o painel da Lichess NESTA etapa. O painel saiu da jornada
    (ADR-0018), e a propriedade que aquele teste guardava — o explorador não
    consulta a rede sozinho — continua guardada em `aberturas.spec.ts`, na tela
    `/openings`, onde o painel mora agora.

    Se qualquer consulta partir daqui, a rota abaixo conta e o teste reprova: a
    saída do explorador é afirmada, não prometida.
  */
  let consultas = 0
  await page.route('https://explorer.lichess.ovh/**', (route) => {
    consultas += 1
    return route.abort()
  })
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Melhores respostas do adversário/)

  // A ETAPA ENSINA NO TABULEIRO, e começa NO DESVIO — não no `e4` que a etapa
  // anterior já percorreu.
  await expect(page.locator('[data-testid="chessboard"]').first()).toBeVisible()
  await expect(page.getByRole('group', { name: 'Escolher a resposta' })).toBeVisible()
  await expect(page.getByText(/tudo igual à linha principal/)).toBeVisible()
  await expect(page.getByText('6. Nf6')).toBeVisible()

  /*
    O DESVIO, NOMEADO COM O LANCE QUE ELE RECUSA. Estas duas asserções vieram,
    palavra por palavra, do teste da etapa de VARIAÇÕES — e o fato de elas
    passarem aqui sem mudar uma vírgula é a medida da correção: a decisão do
    adversário sempre foi conteúdo desta etapa, e estava na etapa seguinte.
  */
  await expect(page.getByText(/O adversário joga/).first()).toBeVisible()
  await expect(page.getByText(/no lugar de Bc5/).first()).toBeVisible()

  // Trocar de resposta reposiciona a navegação no desvio da resposta nova.
  await page.getByRole('button', { name: 'Defesa Húngara' }).click()
  await expect(page.getByText('6. Be7')).toBeVisible()

  // E liga o que se estuda ao que se vai enfrentar: é o mesmo conjunto de linhas
  // que o bot joga no treino.
  await expect(page.getByText(/encontrar estas respostas no treino/)).toBeVisible()

  // E nada de explorador: nem o painel, nem uma única consulta.
  await expect(page.getByText('O que o mundo joga (opcional)')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Consultar o explorador' })).toHaveCount(0)
  expect(consultas).toBe(0)
})

/**
 * O CATÁLOGO FILTRA POR LADO E POR NÍVEL — e só.
 *
 * Havia três seletores: primeiro lance, nível e status. Os dois que saíram
 * respondiam perguntas que o card já responde — o primeiro lance está no
 * mini-tabuleiro e o status vem escrito dentro do card. Três peneiras para seis
 * aberturas é mais peneira que conteúdo.
 *
 * E eles moravam numa SEGUNDA fileira, puxada para cima por uma margem negativa
 * para parecer a mesma linha dos botões. Quando os botões quebravam, as duas se
 * sobrepunham: texto por cima de texto.
 */
test('o catálogo filtra por lado e por nível, na mesma fileira', async ({ page }) => {
  await page.goto('/aberturas')
  await expect(page.getByRole('link', { name: /Abertura Italiana/ })).toBeVisible()

  // O lado: botões, visíveis o tempo todo.
  await page.getByRole('button', { name: 'Pretas', exact: true }).click()
  await expect(page.getByRole('link', { name: /Defesa Caro-Kann/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Abertura Italiana/ })).toBeHidden()

  // O nível: atrás do ícone de filtro, no fim da MESMA fileira.
  await page.getByRole('button', { name: 'Todas', exact: true }).click()
  await page.getByRole('button', { name: /Filtrar por nível/ }).click()
  await page.getByRole('button', { name: 'Avançada' }).click()
  await expect(page.getByText(/Nenhuma abertura corresponde aos filtros/)).toBeVisible()
})

test('TESTE GRADE RALA — um card sozinho não estica para a tela inteira', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'a regra só tem efeito onde cabem colunas')

  /*
    O DEFEITO, e ele só aparecia com o filtro ligado: a grade usava `auto-fit`,
    que COLAPSA as colunas vazias. Com um card só, ele esticava de ponta a ponta —
    um cartão de 1150 px com o tabuleiro no meio e o título perdido num canto.

    `auto-fill` mantém as colunas reservadas, então um card sozinho fica com a
    largura que teria numa lista cheia. O teste mede isso: a razão entre o card e
    a grade, com a grade cheia e depois com ela rala.
  */
  await page.goto('/aberturas')
  const grade = page.locator('[class*="grid"]').first()
  const primeiro = () => grade.getByRole('link').first()
  await expect(primeiro()).toBeVisible()

  const larguraDaGrade = await grade.evaluate((el) => el.getBoundingClientRect().width)
  const cheia = await primeiro().evaluate((el) => el.getBoundingClientRect().width)

  // Filtra até sobrar UM. "Brancas" + o nível mais raro é o caminho do aluno.
  await page.getByRole('button', { name: 'Brancas', exact: true }).click()
  await expect(primeiro()).toBeVisible()
  const cartoes = await grade.getByRole('link').count()

  const rala = await primeiro().evaluate((el) => el.getBoundingClientRect().width)
  expect(
    Math.round(rala),
    `com ${cartoes} card(s) o cartão ficou com ${Math.round(rala)}px numa grade de ${Math.round(larguraDaGrade)}px`,
  ).toBe(Math.round(cheia))

  // E a régua absoluta que o pedido traz: nunca mais que dois lado a lado.
  expect(rala).toBeLessThanOrEqual(larguraDaGrade / 2 + 1)
})

test('o filtro de nível avisa que está ativo, e não só por cor', async ({ page }) => {
  await page.goto('/aberturas')
  const botao = page.getByRole('button', { name: /Filtrar por nível/ })

  await botao.click()
  await page.getByRole('button', { name: 'Iniciante' }).click()

  // O rótulo acessível passa a dizer QUAL nível está em vigor. Sem isso, quem
  // não vê o ponto no canto do botão não tem como saber que há filtro ligado.
  await expect(page.getByRole('button', { name: 'Filtrar por nível: Iniciante' })).toBeVisible()
})

test('o menu do filtro fecha com Escape e devolve o foco', async ({ page }) => {
  await page.goto('/aberturas')
  const botao = page.getByRole('button', { name: /Filtrar por nível/ })

  await botao.click()
  await expect(page.getByRole('group', { name: 'Nível' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('group', { name: 'Nível' })).toBeHidden()
  // O foco VOLTA ao botão: fechar e largar o foco no nada faz a navegação por
  // teclado recomeçar do topo da página.
  await expect(botao).toBeFocused()
})

test('quem já conhece a abertura recebe uma verificação curta, e não um atalho', async ({
  page,
}) => {
  await page.goto('/aberturas/italiana')

  await page.getByRole('button', { name: 'Já conheço' }).click()
  await expect(page.getByText('DIAGNÓSTICO')).toBeVisible()
  await expect(page.getByText(/Qual decisão você tomaria/)).toBeVisible()

  /*
    A DECISÃO É TOMADA NO TABULEIRO, e não escolhida numa lista.

    Aqui se clicava no botão `e4`. Ler três lances e apontar um é reconhecimento
    de string: o aluno confirma que já viu aquela notação, não que reconhece a
    posição. A pergunta é "qual decisão VOCÊ tomaria" — e tomar uma decisão de
    abertura é jogar o lance.
  */
  /*
    O TABULEIRO DA VERIFICAÇÃO, e não o da etapa.

    A etapa de visão agora tem tabuleiro próprio — toda etapa tem, e é a regra
    do contrato. Mirar `#lancezero-board-square-e2` solto encontra os dois e o
    Playwright recusa por ambiguidade, com razão: são posições diferentes.
  */
  const verificacao = page.locator('[class*="bloco"]', { hasText: 'DIAGNÓSTICO' }).first()
  await verificacao.locator('#lancezero-board-square-e2').click()
  await verificacao.locator('#lancezero-board-square-e4').click()
  await expect(page.getByText(/Você reconheceu a decisão do repertório/)).toBeVisible()

  // E MESMO ASSIM o treino continua exigindo a demonstração: "já conheço" não
  // é porta de fuga. Quem superestima o próprio nível cairia no treino sem o
  // repertório e concluiria que o app está errado.
  await expect(page.getByText(/o treino final continua exigindo a demonstração/i)).toBeVisible()
})

test('o aluno pode adotar a abertura no próprio repertório', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Jogar pelos dois lados/)

  await page.getByRole('button', { name: 'Adicionar ao meu repertório' }).click()
  await expect(page.getByRole('button', { name: 'Repertório ativo' })).toBeVisible()
})

test('a etapa das variações mostra as escolhas do ALUNO, e diz quando não há nenhuma', async ({
  page,
}) => {
  /*
    DEPOIS DA PARTIÇÃO (ADR-0018), esta etapa deixou de repetir a lista da etapa
    anterior: ela mostra só os ramos em que quem escolhe é o aluno. Na Italiana
    sobra o Giuoco Piano, que NÃO é um desvio — é o nome de um trecho da própria
    linha principal —, e a etapa afirma isso em vez de inventar uma bifurcação.

    As asserções do desvio ("O adversário joga X no lugar de Y") mudaram-se para
    o teste da etapa 4, onde elas passaram a viver sem mudar uma palavra.
  */
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Variações importantes/)

  await expect(page.locator('[data-testid="chessboard"]').first()).toBeVisible()
  await expect(page.getByText(/não é um desvio/)).toBeVisible()

  // E a etapa NÃO repete a decisão do adversário, que já foi ensinada antes.
  await expect(page.getByText(/no lugar de Bc5/)).toHaveCount(0)
})

test('sem escolha do aluno, a etapa das variações diz isso — e continua com tabuleiro', async ({
  page,
}) => {
  /*
    QUATRO DAS SEIS ABERTURAS não têm nenhum ramo escolhido pelo aluno: contra
    cada resposta do adversário, a continuação é uma só. O estado vazio precisa
    dizer ISSO, e não "esta abertura ainda não tem variações autoradas" — que
    seria falso duas telas depois de a etapa 4 ter mostrado duas linhas.

    E precisa manter a posição na tela: `TESTE TABULEIRO SEMPRE` mede as nove
    etapas da Italiana, e nenhuma delas passa por este caminho.
  */
  await page.goto('/aberturas/escocesa')

  await irAteEtapa(page, /Variações importantes/)

  await expect(page.locator('[data-testid="chessboard"]').first()).toBeVisible()
  await expect(page.getByText(/Quem decide aqui é o adversário/)).toBeVisible()
})

test('os planos mostram a rota também em texto', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Planos e estruturas/)

  // Rota em TEXTO, e não só como seta no tabuleiro: informação que só existe
  // como desenho some para quem usa leitor de tela.
  await expect(page.getByText('Rota visual: d3 → d4')).toBeVisible()
  await expect(page.getByText('Ruptura d4')).toBeVisible()
})
