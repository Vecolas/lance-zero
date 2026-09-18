import { expect, test } from '@playwright/test'
import { legalMoves } from '@/lib/chess'
import { OPENING_COURSE_BY_SLUG } from '@/content/openings/course'
import { posicoesDaLinha } from '@/domain/openings/variacoes'
import { ramosDaAbertura } from '@/domain/openings/ramos'
import { percursoDoRamo } from '@/domain/openings/linha-principal'

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

  /*
    A PRINCIPAL E OS RAMOS. A prática guiada passou a treinar também os ramos
    core, então a posição da vez pode não estar na linha principal — e aí o
    ajudante caía no primeiro lance LEGAL, que faz snapback, e girava até
    estourar o laço.
  */
  const linhas = [italiana.mainline, ...italiana.variations.map((variacao) => variacao.line)]
  for (const linha of linhas) {
    const posicoes = posicoesDaLinha(italiana.rootFen, linha)
    const indice = posicoes.indexOf(fen)
    const lance = indice >= 0 ? linha[indice] : undefined
    if (lance) return { from: lance.uci.slice(0, 2), to: lance.uci.slice(2, 4) }
  }
  return undefined
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

    /*
      A PRÁTICA GUIADA TEM MAIS DE UMA LINHA desde que ela passou a treinar
      também os ramos core. Entre uma e outra o tabuleiro fica passivo e a tela
      oferece "Próxima linha" — sem isto o ajudante parava aqui, porque o
      `Continuar →` do rodapé ainda está desabilitado: faltam itens.
    */
    const proximaLinha = page.getByRole('button', { name: /Próxima linha →/ })
    if ((await proximaLinha.count()) > 0) {
      await proximaLinha.first().click()
      continue
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

  /*
    A BIBLIOTECA É UMA GRADE DE CARDS, e cada card traz um MINI-TABULEIRO na
    posição em que o ramo bifurca. O card existe para o aluno reconhecer a
    POSIÇÃO — é ela que aparece numa partida, não o nome da variação.
  */
  const cards = page.getByRole('button', { name: /Defesa dos Dois Cavalos/ })
  await expect(cards).toBeVisible()
  // Um tabuleiro por card, e não um só compartilhado.
  expect(await page.locator('[data-testid="chessboard"]').count()).toBeGreaterThan(1)

  /*
    IMPORTÂNCIA E ESTADO EM TEXTO, dentro do card. Status nunca depende só de
    cor — e aqui pesa duas vezes, porque o estado é a única orientação que a
    biblioteca oferece a quem ainda não sabe por onde começar.
  */
  await expect(page.getByRole('button', { name: /Defesa Húngara.*complementar/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /não visto/ }).first()).toBeVisible()
  await expect(page.getByText('Recomendado agora')).toBeVisible()

  // NENHUMA FREQUÊNCIA INVENTADA (plano §17.2): `linhasAutoradas` conta linhas
  // autoradas, não partidas do mundo.
  await expect(page.getByText(/% das partidas/)).toHaveCount(0)

  // ABRIR UM CARD LEVA AO ESTUDO DO RAMO, que começa NO DESVIO — não no `e4`
  // que a etapa anterior já percorreu.
  await cards.click()
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

  // E DÁ PARA VOLTAR. Um estudo sem saída seria o beco que o ADR-0016 desfez.
  await page.getByRole('button', { name: /Todas as variações/ }).click()
  await expect(page.getByRole('button', { name: /Giuoco Piano/ })).toBeVisible()

  // UMA LISTA SÓ: o ramo do ALUNO e o do ADVERSÁRIO convivem na mesma grade.
  await page.getByRole('button', { name: /Defesa Húngara/ }).click()
  await expect(page.getByText('6. Be7')).toBeVisible()
  await page.getByRole('button', { name: /Todas as variações/ }).click()
  await page.getByRole('button', { name: /Giuoco Piano/ }).click()
  await expect(page.getByText(/não é um desvio/)).toBeVisible()

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

  // O ramo do adversário: a frase diz quem joga.
  await page.getByRole('button', { name: /Variante da Troca/ }).click()
  await expect(page.getByText(/O adversário joga/)).toBeVisible()

  // E o ramo do ALUNO, na MESMA grade, com a frase invertida.
  await page.getByRole('button', { name: /Todas as variações/ }).click()
  await page.getByRole('button', { name: /Estrutura com c6/ }).click()
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

  /*
    OS PLANOS VIRARAM CARDS, cada um com a posição em que ELE acontece. Antes
    eram sete parágrafos empilhados sobre uma única posição — a característica
    da abertura, que não é a posição de plano nenhum. A tela não mudava entre um
    plano e outro, então nada nela dizia que o assunto tinha mudado.
  */
  const card = page.getByRole('button', { name: /Ruptura d4/ })
  await expect(card).toBeVisible()
  await card.click()

  // AS QUATRO PERGUNTAS DO §24.2. As duas últimas são as que faltavam: sem
  // preparação o aluno rompe cedo, sem o adversário ele executa como se o outro
  // lado não existisse.
  await expect(page.getByText(/Quando usar\./)).toBeVisible()
  await expect(page.getByText(/Por que funciona\./)).toBeVisible()
  await expect(page.getByText(/O que precisa estar preparado\./)).toBeVisible()
  await expect(page.getByText(/O que o adversário tenta\./)).toBeVisible()

  // Rota em TEXTO, e não só como seta no tabuleiro: informação que só existe
  // como desenho some para quem usa leitor de tela.
  await expect(page.getByText('Rota visual: d3 → d4')).toBeVisible()
})

/**
 * A MICRODECISÃO DO PLANO — e o silêncio dos planos que não têm uma.
 *
 * O QUE ELE PROVA, e é o mais importante desta etapa: a pergunta só existe onde
 * o conteúdo a autorou. Todo plano traz uma seta, e a implementação óbvia seria
 * "pergunte pelo lance da seta" — no Sistema Londres isso pediria e2-e4, que é
 * legal e perde um peão. Cinco dos sete planos do curso NÃO têm pergunta, e
 * essa ausência é a parte que um teste precisa guardar.
 */
test('o plano cobra o lance que o começa, e só onde o conteúdo permite', async ({ page }) => {
  await page.goto('/aberturas/caro-kann')
  await irAteEtapa(page, /Planos e estruturas/)

  await page.getByRole('button', { name: /Libertar o bispo/ }).click()

  // A PERGUNTA VEM ANTES DA RESPOSTA, e a seta some enquanto ela está aberta —
  // uma rota desenhada durante a pergunta é o gabarito no enunciado.
  await expect(
    page.getByText(/Qual lance começa este plano\?|O centro fechou com e5/),
  ).toBeVisible()
  await expect(page.getByText(/Rota visual/)).toHaveCount(0)

  const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
  const antes = await tabuleiro.getAttribute('data-fen')

  // O LANCE ERRADO NÃO ANDA A POSIÇÃO. É a mesma regra da linha principal.
  await page.locator('#lancezero-board-square-e7').click()
  await page.locator('#lancezero-board-square-e6').click()
  await expect(page.getByText(/A posição não mudou/)).toBeVisible()
  await expect(tabuleiro).toHaveAttribute('data-fen', antes ?? '')

  // O certo abre a explicação, e só então a rota aparece.
  await page.locator('#lancezero-board-square-c8').click()
  await page.locator('#lancezero-board-square-f5').click()
  await expect(page.getByText('✓ Bf5 começa o plano.')).toBeVisible()
  await expect(page.getByText(/Rota visual/)).toBeVisible()
})

test('o plano sem microdecisão não inventa uma pergunta', async ({ page }) => {
  /*
    O SISTEMA LONDRES É O CASO QUE JUSTIFICA A REGRA. A seta do plano é e2→e4,
    legal na posição e perdedora de peão: d5 e o cavalo de f6 já vigiam a casa, e
    é por isso que o Londres joga e3 antes. Se um dia alguém derivar a pergunta
    da seta, este teste é o que avisa.
  */
  await page.goto('/aberturas/sistema-londres')
  await irAteEtapa(page, /Planos e estruturas/)

  await page.getByRole('button', { name: /Ruptura e4/ }).click()

  await expect(page.getByText(/O que precisa estar preparado\./)).toBeVisible()
  await expect(page.getByText(/Qual lance começa este plano/)).toHaveCount(0)
  // E o tabuleiro fica passivo: não há nada a responder aqui.
  await expect(page.locator('[data-testid="chessboard"][data-interactive="true"]')).toHaveCount(0)
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

/**
 * O RAMO TAMBÉM SE JOGA — é o que separa estudar de ler sobre.
 *
 * ANTES DESTA ENTREGA o ramo explicava o desvio, dizia o que fazer, e nunca
 * pedia que a pessoa o fizesse. Era o mesmo defeito que a linha principal tinha,
 * numa tela que parecia completa: três parágrafos bem escritos e nenhuma
 * produção.
 *
 * O ESTADO DO CARD É A OUTRA METADE. "praticado" só aparece depois de o lance
 * certo ter sido jogado — um rótulo que mudasse ao abrir mediria cliques.
 */
test('o ramo se joga, e o card passa a dizer praticado', async ({ page }) => {
  const italiana = OPENING_COURSE_BY_SLUG.get('italiana')
  if (!italiana) throw new Error('conteúdo da Italiana ausente')

  /*
    O RAMO E O LANCE SAEM DO CONTEÚDO, e não do teste. Cravar "Bc4" aqui criaria
    a segunda fonte da mesma verdade — livre para divergir em silêncio no dia em
    que alguém reescrevesse a variação.
  */
  const ramo = ramosDaAbertura(italiana).find(
    (item) => item.ramificacao.indiceDaDivergencia !== null,
  )
  if (!ramo) throw new Error('nenhum ramo com desvio')
  const percurso = percursoDoRamo(italiana, ramo)
  const decisao = percurso.decisoes[0]
  if (!decisao) throw new Error('o ramo não cobra nenhuma decisão')

  await page.goto('/aberturas/italiana')
  await irAteEtapa(page, /Variações importantes/)

  const card = page.getByRole('button', { name: new RegExp(ramo.nome) })
  // ANTES: não visto. É o estado que prova que o depois significa alguma coisa.
  await expect(
    page.getByRole('button', { name: new RegExp(`${ramo.nome}[\\s\\S]*não visto`) }),
  ).toBeVisible()
  await card.click()

  // Percorre o exemplo resolvido até a porta.
  const proximo = page.getByRole('button', { name: 'Próximo lance →' })
  for (let i = 0; i < 12; i += 1) {
    if ((await proximo.count()) === 0) break
    if (await proximo.isDisabled()) break
    await proximo.click()
  }

  const jogar = page.getByRole('button', { name: /Jogue a continuação/ })
  await expect(jogar).toBeVisible()
  await jogar.click()

  const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
  await expect(tabuleiro).toBeVisible()
  // A prática começa na posição que a demonstração deixou, e não na inicial.
  await expect(tabuleiro).toHaveAttribute('data-fen', percurso.linha.fenInicial)

  await page.locator('#lancezero-board-square-' + decisao.uci.slice(0, 2)).click()
  await page.locator('#lancezero-board-square-' + decisao.uci.slice(2, 4)).click()

  /*
    O TEXTO DE FIM NOMEIA O RAMO, e esta asserção existe porque a primeira
    versão dizia "Linha principal completa" aqui dentro — o app afirmando que o
    aluno tinha acabado outra coisa. O componente serve às duas telas; o texto,
    não.
  */
  await expect(page.getByText(`${ramo.nome} — praticada`)).toBeVisible()

  /*
    E O ESTADO MUDOU, e está gravado: voltar à lista mostra "praticado". Sem esta
    asserção o card poderia estar contando o clique de abrir.
  */
  await page.getByRole('button', { name: /Todas as variações/ }).click()
  await expect(
    page.getByRole('button', { name: new RegExp(`${ramo.nome}[\\s\\S]*praticado`) }),
  ).toBeVisible()
})

/**
 * OS DOIS LADOS VIRARAM MATRIZ — e a matriz diz o que o treino cobra.
 *
 * COMO ERA: dois parágrafos prometendo que "no treino final você vai jogar uma
 * rodada pelo lado oposto". Verdadeiro e vago: UMA rodada, sobre uma linha que a
 * etapa não nomeava. O aluno não tinha como saber o que seria cobrado.
 *
 * E ESTE TESTE GUARDA O PONTO CEGO FECHADO: a Húngara é `secondary` no conteúdo,
 * a biblioteca já dizia "complementar", e o treino a cobrava assim mesmo. As
 * duas metades do produto discordavam sobre o que é essencial.
 */
test('os dois lados mostram a matriz, e o complementar deixa de ser obrigatório', async ({
  page,
}) => {
  await page.goto('/aberturas/italiana')
  await irAteEtapa(page, /Jogar pelos dois lados/)

  const matriz = page.getByRole('table')
  await expect(matriz).toBeVisible()

  // A LINHA PRINCIPAL É A ÚNICA OBRIGATÓRIA NOS DOIS PAPÉIS.
  const principal = matriz.getByRole('row').filter({ hasText: 'Linha principal' })
  await expect(principal.getByText('○ obrigatório')).toHaveCount(2)

  // UM RAMO CORE: obrigatório do seu lado, recomendado do outro — §27.3, o curso
  // não dobra de tamanho por causa da perspectiva reversa.
  const doisCavalos = matriz.getByRole('row').filter({ hasText: 'Defesa dos Dois Cavalos' })
  await expect(doisCavalos.getByText('○ obrigatório')).toHaveCount(1)
  await expect(doisCavalos.getByText('· recomendado')).toHaveCount(1)

  /*
    A HÚNGARA É `secondary`: recomendada nos DOIS papéis. Antes da matriz ela
    entrava na lista de alvos exigidos como qualquer outra — a biblioteca dizia
    "complementar" e o treino cobrava assim mesmo.
  */
  const hungara = matriz.getByRole('row').filter({ hasText: 'Defesa Húngara' })
  await expect(hungara.getByText('· recomendado')).toHaveCount(2)
  await expect(hungara.getByText('○ obrigatório')).toHaveCount(0)

  // Estado nunca depende só de cor: cada célula traz símbolo E palavra.
  await expect(page.getByText('obrigatório').first()).toBeVisible()
})

/**
 * A PRÁTICA GUIADA TREINA MAIS DE UMA LINHA.
 *
 * O DEFEITO QUE ISTO FECHA: ela ensaiava só a linha principal, e o treino final
 * cobrava também os ramos. O degrau COM APOIO preparava para uma coisa e a prova
 * media outra — o aluno chegava ao treino tendo praticado metade do que seria
 * exigido, e descobria isso errando.
 */
test('a prática guiada passa pela principal e pelos ramos core', async ({ page }) => {
  const italiana = OPENING_COURSE_BY_SLUG.get('italiana')
  if (!italiana) throw new Error('conteúdo da Italiana ausente')

  await page.goto('/aberturas/italiana')
  await irAteEtapa(page, /Prática guiada/)

  // Ela ABRE na linha principal: treinar o desvio antes da linha que ele recusa
  // é ensinar a exceção antes da regra.
  await expect(page.getByText('Linha principal', { exact: true })).toBeVisible()

  // Joga a principal inteira pelo tabuleiro, sem nenhum botão entre lances.
  const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
  for (let i = 0; i < 12; i += 1) {
    if (!(await tabuleiro.isVisible().catch(() => false))) break
    const fen = await tabuleiro.getAttribute('data-fen')
    const lance = fen ? lanceDaPrincipal(fen) : undefined
    if (!lance) break
    await page.locator('#lancezero-board-square-' + lance.from).click()
    await page.locator('#lancezero-board-square-' + lance.to).click()
  }

  /*
    E ENTÃO VEM O RAMO. A transição é por botão, e não automática: o tabuleiro
    voltaria ao começo sem aviso, e o aluno leria isso como um erro dele.
  */
  await expect(page.getByText(/Linha principal completa/)).toBeVisible()
  const proxima = page.getByRole('button', { name: /Próxima linha →/ })
  await expect(proxima).toBeVisible()
  await proxima.click()

  // O nome do ramo aparece — é ele que está sendo treinado agora.
  const core = italiana.variations.find((v) => (v.importancia ?? 'core') === 'core')
  if (!core) throw new Error('a Italiana precisa de um ramo core')
  await expect(page.getByText(core.name, { exact: true })).toBeVisible()

  /*
    E O RAMO COMEÇA NO DESVIO, não do zero.

    O DEFEITO QUE ISTO PEGA JÁ ACONTECEU: a primeira versão montava a sequência
    com a linha INTEIRA do ramo, e o aluno tinha de rejogar e4, Cf3, Bc4 — os
    lances da principal que ele acabou de responder. Pior que a repetição: esses
    plies não têm item no ramo, então respondê-los não mexia na contagem. A
    etapa pedia lances que não contavam para nada.

    A posição de abertura do trecho tem de ser a do desvio, e não a inicial.
  */
  const posicoesDoRamo = posicoesDaLinha(italiana.rootFen, core.line)
  const fenDoTrecho = await tabuleiro.getAttribute('data-fen')
  expect(fenDoTrecho).not.toBe(italiana.rootFen)
  expect(posicoesDoRamo.indexOf(fenDoTrecho ?? '')).toBeGreaterThan(1)

  // A contagem da etapa cresceu junto: ela cobra o que a tela oferece.
  await expect(page.getByText(/Decisão \d+ de \d+ — sua vez/)).toBeVisible()
})

/**
 * A FRONTEIRA: o treino entrega o plano quando a linha acaba.
 *
 * O PLANO §23 nomeia o defeito que isto fecha: "sei 8 lances e depois não sei o
 * que fazer". Uma rodada que termina dizendo apenas "linha concluída" ensina que
 * a abertura é uma lista que acabou. O que ela precisa dizer é que o aluno
 * ALCANÇOU a posição que o repertório estava procurando — e qual é o plano dela.
 */
test('o fim da linha entrega o plano, e não só um aviso de conclusão', async ({ page }) => {
  const italiana = OPENING_COURSE_BY_SLUG.get('italiana')
  if (!italiana) throw new Error('conteúdo da Italiana ausente')

  await page.goto('/aberturas/italiana')
  await irAteEtapa(page, /Treino final/)

  /*
    JOGA A LINHA PRINCIPAL INTEIRA até a rodada terminar.

    O TABULEIRO SÓ É INTERATIVO NA VEZ DO ALUNO — enquanto o computador
    responde, o seletor `data-interactive="true"` deixa de casar. A primeira
    versão deste laço lia isso como "acabou" e saía no primeiro lance. Então ele
    ESPERA o tabuleiro voltar, em vez de checar uma vez e desistir.
  */
  const tabuleiro = page.locator('[data-testid="chessboard"][data-interactive="true"]').first()
  const fimDaRodada = page.getByText(/tipo de posição que esta abertura procura/)
  for (let i = 0; i < 16; i += 1) {
    if ((await fimDaRodada.count()) > 0) break
    try {
      await tabuleiro.waitFor({ state: 'visible', timeout: 4000 })
    } catch {
      break
    }
    const fen = await tabuleiro.getAttribute('data-fen')
    const lance = fen ? lanceDaPrincipal(fen) : undefined
    if (!lance) break
    await page.locator('#lancezero-board-square-' + lance.from).click()
    await page.locator('#lancezero-board-square-' + lance.to).click()
  }

  /*
    O TEXTO É O DA FRONTEIRA, e não "linha concluída". A diferença não é de
    estilo: uma diz que a lista acabou, a outra diz o que foi alcançado.
  */
  await expect(page.getByText(/tipo de posição que esta abertura procura/)).toBeVisible()
  await expect(page.getByText(/A abertura acaba aqui\./)).toBeVisible()

  // E o texto vem do CONTEÚDO, não de heurística.
  await expect(page.getByText(italiana.transitionToMiddlegame)).toBeVisible()
  const plano = italiana.plans[0]
  if (!plano) throw new Error('a Italiana precisa de um plano')
  await expect(page.getByText(new RegExp(plano.name))).toBeVisible()
})

/**
 * "DAS SUAS PARTIDAS" — e o silêncio de quem não importou nada.
 *
 * O QUE ESTE TESTE GUARDA é a AUSÊNCIA. Uma seção de diagnóstico que aparece
 * zerada ensina o aluno a ignorá-la: ele vê "0 partidas saíram da linha" na
 * primeira visita, conclui que ali não há nada, e não volta no dia em que
 * houver.
 *
 * Sem partidas importadas, a seção não existe — e não existe vazia.
 */
test('sem partidas importadas, a seção "Das suas partidas" não aparece', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  await expect(page.getByRole('heading', { name: 'Das suas partidas' })).toHaveCount(0)
  // E nada de contadores zerados sobrando na tela.
  await expect(page.getByText(/0 partidas saíram/)).toHaveCount(0)
})

/**
 * O SPARRING É ANUNCIADO ANTES DE EXISTIR.
 *
 * O plano §47 oferece duas saídas: mantê-lo como conteúdo pós-conclusão, ou
 * abri-lo cedo com uma recomendação. EU TENTEI A SEGUNDA e um portão a derrubou:
 * o sparring tem tabuleiro próprio e toda etapa também tem, então montar os dois
 * na mesma tela produz dois tabuleiros interativos e IDS DE DOM DUPLICADOS.
 *
 * Ficou a primeira saída — e com ela a obrigação de AVISAR. Um recurso que
 * aparece sem aviso depois da conclusão parece ter estado escondido, que é
 * exatamente a sensação que o ADR-0016 combateu.
 */
test('o treino anuncia a partida livre antes de ela existir', async ({ page }) => {
  await page.goto('/aberturas/italiana')

  // Antes do treino ele NÃO está na tela — e não há dois tabuleiros disputando.
  await expect(page.getByRole('heading', { name: 'Praticar contra o computador' })).toHaveCount(0)
  expect(await page.locator('[data-testid="chessboard"]').count()).toBeLessThanOrEqual(1)

  await irAteEtapa(page, /Treino final/)

  // E na etapa do treino, o aluno fica sabendo que ela existe.
  await expect(page.getByText(/abre a partida livre contra o computador/)).toBeVisible()
})
