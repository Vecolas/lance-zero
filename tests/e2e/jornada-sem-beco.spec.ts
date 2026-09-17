/**
 * NENHUMA JORNADA TEM BECO SEM SAÍDA — medido no navegador, etapa por etapa.
 *
 * O DEFEITO QUE ESTE ARQUIVO EXISTE PARA MATAR: abrir qualquer final e avançar
 * uma vez deixava o aluno preso na etapa 2 de 10, com "Continuar" desabilitado e
 * a frase "Faltam 1 de 1 exercícios para seguir." debaixo dele — e nada na tela
 * para responder. Depois de `reconhecer` vinham `variacoes` e `dois-lados`, que
 * trancavam de novo. Vinte finais, três portas, zero erro no console.
 *
 * POR QUE OS PORTÕES EXISTENTES FICARAM VERDES, e esta é a parte que interessa:
 * `jornadas.spec.ts` percorria a jornada com
 *
 *     if (await continuar.isDisabled()) break
 *
 * Ele DESISTIA exatamente no beco. Um `break` diante da condição que o teste
 * deveria medir não é tolerância: é o portão desligado. `jornada-etapa-unica`
 * parava de clicar assim que o painel de instrução aparecia — o que acontece
 * justamente em `reconhecer`.
 *
 * A REGRA QUE ESTE ARQUIVO AFIRMA, e ela é a inversão daquele `break`: numa
 * etapa com "Continuar" desabilitado, TEM de existir o que fazer, e fazer TEM de
 * liberar o botão. O teste não confia em encontrar um controle: ele usa o
 * controle e confere que a porta abriu.
 *
 * O QUE ELE NÃO PROVA: o TREINO FINAL. Ele é etapa de cobertura, depende de
 * tablebase e é entrega à parte — a varredura para na etapa anterior e diz isso.
 * Também não prova que o arraste funciona: os lances entram por clique, que é o
 * caminho acessível, e é de propósito (ver `finais.spec.ts`).
 */

import { expect, test, type Locator, type Page } from '@playwright/test'

const COLUNAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

/** Quantos pares origem→destino tentar antes de desistir e REPROVAR. */
const TENTATIVAS_MAXIMAS_DE_LANCE = 80

/** Teto de itens de uma etapa. Existe para o laço não virar infinito num defeito. */
const ITENS_MAXIMOS_POR_ETAPA = 12

function botaoContinuar(page: Page): Locator {
  return page.getByRole('button', { name: /^Continuar →$/ })
}

/** O "Continuar" DE DENTRO do exercício — o que registra o item respondido. */
function continuarDoExercicio(page: Page): Locator {
  return page.getByRole('button', { name: /^Continuar$/ })
}

/** Os vizinhos de uma casa, mais os saltos de cavalo e o avanço duplo do peão. */
function destinosPlausiveis(casa: string): string[] {
  const coluna = COLUNAS.indexOf(casa[0] as (typeof COLUNAS)[number])
  const linha = Number(casa[1])
  const deltas: [number, number][] = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
    // saltos de cavalo
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
    // avanço duplo do peão, nos dois sentidos
    [0, -2],
    [0, 2],
  ]
  const saida: string[] = []
  for (const [dc, dl] of deltas) {
    const c = COLUNAS[coluna + dc]
    const l = linha + dl
    if (c && l >= 1 && l <= 8) saida.push(`${c}${l}`)
  }
  return saida
}

/**
 * As casas ocupadas por quem está na vez, lidas do FEN que o tabuleiro publica.
 *
 * Ler a posição em vez de varrer as 64 casas não é otimização: a varredura cega
 * estourava o timeout de 30 s do Playwright, e portão lento é portão que alguém
 * desliga. Cravar o UCI no teste seria pior — amarraria o portão a uma FEN do
 * catálogo e ele reprovaria quando o CONTEÚDO mudasse.
 */
async function casasDeQuemJoga(page: Page): Promise<string[]> {
  const fen = await page.getByTestId('chessboard').first().getAttribute('data-fen')
  if (!fen) throw new Error('o tabuleiro não publicou a posição em `data-fen`')

  const [posicao, vez] = fen.split(' ')
  const brancas = vez !== 'b'
  const casas: string[] = []
  posicao!.split('/').forEach((fileira, indice) => {
    const linha = 8 - indice
    let coluna = 0
    for (const caractere of fileira) {
      if (/\d/.test(caractere)) {
        coluna += Number(caractere)
        continue
      }
      const ehBranca = caractere === caractere.toUpperCase()
      if (ehBranca === brancas) casas.push(`${COLUNAS[coluna]}${linha}`)
      coluna += 1
    }
  })
  return casas
}

/**
 * Responde o exercício da etapa atual, seja ele qual for.
 *
 * Duas formas, e o teste NÃO sabe qual a etapa usa — de propósito. Saber qual
 * exercício cada etapa tem transformaria este portão numa cópia da
 * implementação, e ele passaria a aprovar o que a implementação diz sobre si
 * mesma.
 */
async function responderUmItem(page: Page): Promise<void> {
  // 1. Múltipla escolha: a lista de respostas possíveis.
  const opcoes = page.getByRole('list', { name: /Respostas possíveis|Lances possíveis/ })
  if ((await opcoes.count()) > 0) {
    await opcoes.first().getByRole('button').first().click()
    await continuarDoExercicio(page).click()
    return
  }

  // 2. Lance no tabuleiro: origem entre as peças de quem joga, destino entre os
  //    alcançáveis por um lance qualquer de uma peça qualquer.
  let tentativas = 0
  for (const origem of await casasDeQuemJoga(page)) {
    await page.locator(`#lancezero-board-square-${origem}`).click()
    for (const destino of destinosPlausiveis(origem)) {
      tentativas += 1
      if (tentativas > TENTATIVAS_MAXIMAS_DE_LANCE) break
      await page.locator(`#lancezero-board-square-${destino}`).click()
      if ((await continuarDoExercicio(page).count()) > 0) {
        await continuarDoExercicio(page).click()
        return
      }
      await page.locator(`#lancezero-board-square-${origem}`).click()
    }
  }

  throw new Error('etapa com "Continuar" desabilitado e sem exercício que a libere: beco sem saída')
}

/**
 * Responde a etapa INTEIRA — uma etapa pode ter vários itens.
 *
 * A primeira versão respondia um item e já exigia o botão liberado; ela
 * reprovou a prática guiada da Italiana, que tem um item por decisão da linha
 * principal. Era o teste medindo errado, e não a tela travada.
 */
async function responderAEtapa(page: Page): Promise<void> {
  for (let i = 0; i < ITENS_MAXIMOS_POR_ETAPA; i += 1) {
    if (await botaoContinuar(page).isEnabled()) return
    await responderUmItem(page)
  }
}

/**
 * Percorre a jornada até a etapa de treino, exigindo saída em cada etapa.
 *
 * Para no TREINO, que esconde o rodapé inteiro: ele é cobertura, depende de
 * tablebase, e é entrega à parte.
 */
async function percorrerAteOTreino(page: Page, totalDeEtapas: number): Promise<number> {
  let visitadas = 0

  for (let i = 0; i < totalDeEtapas; i += 1) {
    const cabecalho = page.getByRole('heading', { level: 2 }).first()
    await expect(cabecalho).toBeVisible()
    const titulo = (await cabecalho.textContent()) ?? ''

    // O treino final esconde o rodapé inteiro: chegar nele é o fim da varredura.
    if ((await botaoContinuar(page).count()) === 0) return visitadas

    if (await botaoContinuar(page).isDisabled()) {
      /*
        AQUI ESTAVA O `break`. Agora é o coração do portão: a etapa DIZ que falta
        exercício, então tem de existir exercício, e respondê-lo tem de destravar
        o botão. Se não existir, `responderUmItem` lança com o nome do beco.
      */
      await expect(
        page.getByText(/Faltam \d+ de \d+ exercícios para seguir\./),
        `${titulo}: botão travado sem explicação`,
      ).toBeVisible()

      await responderAEtapa(page)

      await expect(
        botaoContinuar(page),
        `${titulo}: responder o exercício não liberou o Continuar`,
      ).toBeEnabled()
    }

    await botaoContinuar(page).click()
    visitadas += 1
  }

  return visitadas
}

test('a jornada de um final atravessa todas as etapas até o treino', async ({ page }) => {
  await page.goto('/finais/atividade-do-rei')
  await expect(page.getByText(/Etapa 1 de 10/)).toBeVisible()

  const visitadas = await percorrerAteOTreino(page, 10)

  // NOVE, e não "alguma": a décima é o treino, que esconde o rodapé. Um número
  // menor significa que a varredura parou no meio — que é o defeito de origem.
  expect(visitadas, 'a jornada não chegou ao treino').toBe(9)
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('Treino')
})

test('a jornada de uma abertura atravessa todas as etapas até o treino', async ({ page }) => {
  await page.goto('/aberturas/italiana')
  await expect(page.getByText(/Etapa 1 de 9/)).toBeVisible()

  const visitadas = await percorrerAteOTreino(page, 9)

  expect(visitadas, 'a jornada não chegou ao treino').toBe(8)
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('Treino')
})

test('o progresso do aluno sobrevive ao recarregar no meio da jornada', async ({ page }) => {
  /*
    Complementa a varredura: destravar a etapa não vale nada se o item respondido
    não for gravado. Sem isto, um exercício que só mexe em estado de React
    passaria em tudo que não recarrega — e o aluno refaria a etapa toda vez.
  */
  await page.goto('/finais/atividade-do-rei')
  await botaoContinuar(page).click()
  await expect(page.getByText(/Etapa 2 de 10/)).toBeVisible()

  await responderAEtapa(page)
  await expect(botaoContinuar(page)).toBeEnabled()

  await page.reload()
  await expect(page.getByText(/Etapa 2 de 10/)).toBeVisible()
  await expect(botaoContinuar(page), 'o item respondido não sobreviveu ao recarregar').toBeEnabled()
})

/**
 * O TREINO FINAL TERMINA — a segunda metade do beco.
 *
 * As etapas 1 a 9 destravaram; a 10 continuava sem saída por outro motivo: a
 * página montava a jornada SEM juiz, `objetivo` era sempre `null`, nenhuma
 * rodada alcançava `sucesso` e a cobertura nunca fechava. Como o treino esconde
 * o rodapé, não havia nem "Continuar" para clicar.
 *
 * A TABLEBASE É DERRUBADA DE PROPÓSITO. Não é simplificação: é a afirmação mais
 * forte que este arquivo faz. O desfecho vem de `avaliarObjetivo`, que é local,
 * então a rodada tem de concluir mesmo sem rede. Se um dia o "cumprido" passar a
 * depender da tablebase, este teste cai — e é exatamente o que deve acontecer.
 */
test('o treino de um final conclui, e conclui offline', async ({ page }) => {
  await page.route('https://tablebase.lichess.ovh/**', (rota) => rota.abort())

  // Mate de rei e dama: as duas posições da família são mate em UM lance, o que
  // mantém o portão rápido sem tirar nada do que ele mede.
  await page.goto('/finais/rei-dama-vs-rei')
  await percorrerAteOTreino(page, 10)
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('Treino')

  // Primeira rodada: Db8#.
  await page.locator('#lancezero-board-square-b1').click()
  await page.locator('#lancezero-board-square-b8').click()
  await expect(
    page.getByText('Objetivo cumprido. A posição foi conduzida até o fim.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Próxima rodada' }).click()

  // Segunda rodada: a posição espelhada, Dg8#.
  await page.locator('#lancezero-board-square-g1').click()
  await page.locator('#lancezero-board-square-g8').click()

  await expect(page.getByText('✓ Treino concluído.')).toBeVisible()
})
