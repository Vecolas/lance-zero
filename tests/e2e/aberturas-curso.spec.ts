import { expect, test } from '@playwright/test'
import { legalMoves } from '@/lib/chess'
import { OPENING_COURSE_BY_SLUG } from '@/content/openings/course'
import { posicoesDaLinha } from '@/domain/openings/variacoes'

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
/**
 * O lance que a linha principal da Italiana prevê nesta posição.
 *
 * Derivado do CONTEÚDO, e não cravado no teste: quem reescrever a abertura não
 * precisa lembrar de vir aqui, e um teste com a linha copiada seria a segunda
 * fonte da mesma verdade — livre para divergir em silêncio.
 */
function lanceDaPrincipal(fen: string): { from: string; to: string } | undefined {
  const italiana = OPENING_COURSE_BY_SLUG.get('italiana')
  if (!italiana) return undefined
  const posicoes = posicoesDaLinha(italiana.rootFen, italiana.mainline)
  const indice = posicoes.indexOf(fen)
  const lance = indice >= 0 ? italiana.mainline[indice] : undefined
  if (!lance) return undefined
  return { from: lance.uci.slice(0, 2), to: lance.uci.slice(2, 4) }
}

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
      ETAPA QUE COBRA RESPOSTA: joga o lance que o repertório espera.

      DUAS VERSÕES FICARAM PARA TRÁS. A primeira clicava na primeira opção de uma
      lista de notação; a lista saiu. A segunda jogava o primeiro lance LEGAL e
      confirmava com `Continuar` — o que funcionava porque a etapa aceitava
      qualquer lance e pedia confirmação.

      Hoje a prática guiada é uma partida: lance fora da linha faz snapback e não
      existe mais botão por lance. Tentar lances ao acaso também não serve, e a
      razão é o próprio tabuleiro: recusar um destino MANTÉM a peça selecionada,
      então uma segunda tentativa que comece pela mesma casa a DESSELECIONA. As
      tentativas ficam fora de fase e o ajudante nunca chega ao lance certo.

      Então ele não adivinha: acha a posição atual dentro da linha principal e
      joga o lance que ela prevê.
    */
    const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
    if (await tabuleiro.isVisible().catch(() => false)) {
      const fen = await tabuleiro.getAttribute('data-fen')
      const doRepertorio = fen ? lanceDaPrincipal(fen) : undefined
      const lance = doRepertorio ?? (fen ? legalMoves(fen)[0] : undefined)
      if (lance) {
        await page.locator('#lancezero-board-square-' + lance.from).click()
        await page.locator('#lancezero-board-square-' + lance.to).click()
        await page.waitForTimeout(80)
        // Etapas que ainda confirmam o item com um botão — a verificação curta
        // da visão, por exemplo — continuam honradas.
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

  // A jornada começa na VISÃO, e não num menu de abas. São OITO etapas desde
  // que "Respostas do adversário" foi fundida em "Variações".
  await expect(page.getByText('Etapa 1 de 8')).toBeVisible()
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

test('a biblioteca de variações ensina cada ramo no tabuleiro, sem explorador', async ({
  page,
}) => {
  /*
    DUAS ETAPAS VIRARAM UMA. Havia "Melhores respostas do adversário" e
    "Variações importantes", separadas por quem tomava a decisão. O jogador pensa
    "estou na Defesa dos Dois Cavalos", e não "estou na lista de ramos cujo autor
    da decisão foi o oponente" — então a lista passou a ser uma só, e `autor`
    voltou a ser metadata que muda a FRASE, não a etapa.

    Este teste também guarda a saída do explorador: a rota abaixo conta, e exige
    zero. A propriedade "não consulta sozinho" continua medida em
    `aberturas.spec.ts`, na tela `/openings`, onde o painel mora.
  */
  let consultas = 0
  await page.route('https://explorer.lichess.ovh/**', (route) => {
    consultas += 1
    return route.abort()
  })
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Variações importantes/)

  // A ETAPA ENSINA NO TABULEIRO, e começa NO DESVIO — não no `e4` que a etapa
  // anterior já percorreu.
  await expect(page.locator('[data-testid="chessboard"]').first()).toBeVisible()
  await expect(page.getByRole('group', { name: 'Escolher a variação' })).toBeVisible()
  await expect(page.getByText(/tudo igual à linha principal/)).toBeVisible()
  await expect(page.getByText('6. Nf6')).toBeVisible()

  // O desvio, nomeado com o lance que ele recusa.
  await expect(page.getByText(/O adversário joga/).first()).toBeVisible()
  await expect(page.getByText(/no lugar de Bc5/).first()).toBeVisible()

  /*
    AS DUAS PERGUNTAS QUE O RAMO PRECISA RESPONDER antes de pedir um lance. Sem
    elas o ramo volta a ser uma sequência de lances — e a pergunta que sobrevive
    à mudança de ordem dos lances é "o que ele está tentando fazer?".
  */
  await expect(page.getByText(/O que ele quer\./)).toBeVisible()
  await expect(page.getByText(/Seu objetivo\./)).toBeVisible()

  // UMA LISTA SÓ: o ramo do ALUNO e o do ADVERSÁRIO convivem no mesmo seletor.
  await page.getByRole('button', { name: /Defesa Húngara/ }).click()
  await expect(page.getByText('6. Be7')).toBeVisible()
  await page.getByRole('button', { name: /Giuoco Piano/ }).click()
  await expect(page.getByText(/não é um desvio/)).toBeVisible()

  // A importância aparece em TEXTO no chip, nunca só por cor.
  await expect(page.getByRole('button', { name: /Defesa Húngara.*complementar/ })).toBeVisible()

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

test('a lista é UMA só: um ramo do adversário e um do aluno convivem nela', async ({ page }) => {
  /*
    O QUE ESTES DOIS TESTES SUBSTITUÍRAM: um afirmava "a etapa das variações
    mostra as escolhas do ALUNO" e o outro media o estado vazio que sobrava
    quando a abertura não tinha nenhuma. Os dois descreviam a divisão por autor
    da decisão, e ela deixou de existir.

    O Gambito da Dama Recusado é o caso que prova a fusão: ele tem ramos das
    BRANCAS (3.Cf3, 3.cxd5) e um ramo das PRETAS, que é o repertório do aluno
    (2...c6, a ponte para a Eslava). Antes eles viviam em etapas diferentes.
  */
  await page.goto('/aberturas/gambito-da-dama-recusado')

  await irAteEtapa(page, /Variações importantes/)

  const seletor = page.getByRole('group', { name: 'Escolher a variação' })
  await expect(seletor).toBeVisible()

  // O ramo do adversário: a frase diz quem joga.
  await seletor.getByRole('button', { name: /Variante da Troca/ }).click()
  await expect(page.getByText(/O adversário joga/)).toBeVisible()

  // E o ramo do ALUNO, no MESMO seletor, com a frase invertida.
  await seletor.getByRole('button', { name: /Estrutura com c6/ }).click()
  await expect(page.getByText(/Você joga/)).toBeVisible()

  // Nenhuma tela fala mais em "respostas do adversário" como etapa.
  await expect(page.getByRole('heading', { name: /Melhores respostas/ })).toHaveCount(0)
})

test('a jornada de abertura tem OITO etapas, e nenhuma se chama Respostas', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  await expect(page.getByText('Etapa 1 de 8')).toBeVisible()

  // O Mapa do estudo lista todas — é por ele que se prova que a etapa sumiu da
  // jornada inteira, e não só da tela atual.
  await page.getByRole('button', { name: /Mapa do estudo/ }).click()
  await expect(page.getByText(/Melhores respostas do adversário/)).toHaveCount(0)
  await expect(page.getByText('Variações importantes')).toBeVisible()
})

test('os planos mostram a rota também em texto', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  await irAteEtapa(page, /Planos e estruturas/)

  // Rota em TEXTO, e não só como seta no tabuleiro: informação que só existe
  // como desenho some para quem usa leitor de tela.
  await expect(page.getByText('Rota visual: d3 → d4')).toBeVisible()
  await expect(page.getByText('Ruptura d4')).toBeVisible()
})

/**
 * A LINHA PRINCIPAL DEIXOU DE SER SÓ LEITURA.
 *
 * O QUE ESTE TESTE PROVA, e é a razão de a Fase 5 existir: depois da
 * demonstração, o aluno PRODUZ os lances. Um teste que só verificasse "a tela
 * abre" passaria igual se a etapa tivesse voltado a ser um ← / → mudo.
 *
 * As três asserções são o contrato inteiro: a porta existe, o lance errado NÃO
 * anda a posição, e o lance certo anda DOIS plies — o do aluno e a resposta do
 * computador — sem nenhum clique entre eles.
 */
test('a linha principal demonstra, depois cobra, e o computador responde sozinho', async ({
  page,
}) => {
  const italiana = OPENING_COURSE_BY_SLUG.get('italiana')
  if (!italiana) throw new Error('conteúdo da Italiana ausente')
  const posicoes = posicoesDaLinha(italiana.rootFen, italiana.mainline)

  await page.goto('/aberturas/italiana')
  await irAteEtapa(page, /Linha principal/)

  /*
    A FASE DE ENTENDER É A DE ANTES, e continua sendo: tabuleiro passivo,
    comentário ao lado, ← / →. O que mudou é que ela ACABA.
  */
  const proximo = page.getByRole('button', { name: 'Próximo lance →' })
  for (let i = 0; i < 12; i += 1) {
    if ((await proximo.count()) === 0) break
    if (await proximo.isDisabled()) break
    await proximo.click()
  }

  // A PORTA. Sem ela a etapa teria voltado a ser uma leitura com fim mudo.
  const aSuaVez = page.getByRole('button', { name: /Agora é a sua vez/ })
  await expect(aSuaVez).toBeVisible()
  await aSuaVez.click()

  const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
  await expect(tabuleiro).toBeVisible()

  const antes = await tabuleiro.getAttribute('data-fen')
  expect(antes).toBeTruthy()
  const indice = posicoes.indexOf(antes ?? '')
  // A demonstração parou numa posição da própria linha, e não em qualquer uma.
  expect(indice).toBeGreaterThan(0)

  const certo = italiana.mainline[indice]
  const resposta = italiana.mainline[indice + 1]
  if (!certo || !resposta) throw new Error('linha principal curta demais para este teste')

  /*
    O LANCE ERRADO. Escolhido entre os legais, e diferente do da linha — cravar
    um lance aqui obrigaria a reescrever o teste a cada mudança de conteúdo.
  */
  const errado = legalMoves(antes ?? '').find(
    (lance) => `${lance.from}${lance.to}` !== certo.uci.slice(0, 4),
  )
  if (!errado) throw new Error('nenhum lance legal alternativo')

  await page.locator('#lancezero-board-square-' + errado.from).click()
  await page.locator('#lancezero-board-square-' + errado.to).click()
  await expect(page.getByText(/A posição não mudou/)).toBeVisible()
  // O SNAPBACK: a posição é EXATAMENTE a mesma. É isto que mantém o aluno na
  // decisão até resolvê-la, em vez de arrastá-lo para a seguinte.
  await expect(tabuleiro).toHaveAttribute('data-fen', antes ?? '')

  /*
    O LANCE CERTO. A posição tem de andar DOIS plies: o dele e o do computador.
    Um teste que aceitasse "andou" passaria com a resposta do adversário
    faltando — que é justamente o defeito que esta etapa veio consertar.
  */
  await page.locator('#lancezero-board-square-' + certo.uci.slice(0, 2)).click()
  await page.locator('#lancezero-board-square-' + certo.uci.slice(2, 4)).click()

  await expect(tabuleiro).toHaveAttribute('data-fen', posicoes[indice + 2] ?? '')
  await expect(page.getByText(`O computador respondeu ${resposta.san}.`)).toBeVisible()

  /*
    A CONFIRMAÇÃO EXPLICA O LANCE DO ALUNO, e esta asserção existe porque a
    primeira versão da tela explicava o do ADVERSÁRIO.

    O motor joga a resposta na mesma transição, então quando a tela volta a pedir
    algo o índice já andou DOIS. Usar `-1` para achar "o que acabou de ser
    jogado" pega a resposta do computador, e o painel passa a comentar a jogada
    errada em toda decisão. Nada erra, nada avisa — só o texto está trocado.
  */
  await expect(page.getByText(`${certo.san} é o lance da linha.`)).toBeVisible()
  await expect(page.getByText(certo.comment)).toBeVisible()
})
