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
import { legalMoves } from '@/lib/chess'

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

/**
 * O texto de quantos itens faltam, ou string vazia quando não há.
 *
 * É o sinal mais barato de "o item contou" numa tela em que o lance certo já
 * avança sozinho: ele muda a cada item registrado, sem depender de botão nenhum.
 */
async function textoDoPendente(page: Page): Promise<string> {
  const pendente = page.getByText(/Faltam \d+ de \d+ exercícios para seguir\./)
  if ((await pendente.count()) === 0) return ''
  return (await pendente.first().textContent()) ?? ''
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
  //
  //    O SINAL DE QUE O LANCE CONTOU TEM TRÊS FORMAS, e aceitar as três é o que
  //    mantém este portão medindo a PROPRIEDADE em vez do mecanismo:
  //
  //      a. a tela pede confirmação do item — o `Continuar` de dentro;
  //      b. o lance conta sozinho e o rodapé destrava, quando era o último item;
  //      c. o lance conta sozinho e o texto do pendente anda ("Faltam 4 de 5").
  //
  //    A versão anterior só conhecia (a), e reprovou a prática guiada da
  //    abertura no dia em que ela deixou de pedir um clique por lance. O botão
  //    por lance era o defeito, não o contrato: quem responde é o tabuleiro.
  /*
    OS CANDIDATOS SÃO OS LANCES LEGAIS DA POSIÇÃO, e não uma geometria chutada.

    A versão anterior tentava vizinhos, saltos de cavalo e avanço duplo para cada
    peça — dezenas de cliques por etapa, quase todos em lances que não existem. Na
    prática guiada da abertura, que tem cinco decisões, isso estourava o tempo do
    teste antes de achar a quinta.

    Ler as regras do xadrez NÃO é copiar a implementação: o portão continua sem
    saber QUAL lance a etapa quer — ele tenta os que a posição permite, na ordem
    em que vierem, e para no primeiro que contar.

    DUAS PASSADAS POR LANCE, e não é desperdício: as duas telas limpam a seleção
    de jeitos opostos. Na abertura, recusar um destino MANTÉM a peça selecionada;
    no treino de final, a tela limpa. Um clique na origem antes da tentativa,
    então, seleciona numa e desseleciona na outra. Com duas passadas a fase
    inverte, e todo lance recebe ao menos uma tentativa de verdade.
  */
  const fen = await page
    .locator('[data-testid="chessboard"][data-interactive="true"]')
    .first()
    .getAttribute('data-fen')
  if (!fen) throw new Error('etapa com tabuleiro interativo sem `data-fen`')

  const pendenteAntes = await textoDoPendente(page)
  let tentativas = 0
  for (const lance of legalMoves(fen)) {
    tentativas += 1
    if (tentativas > TENTATIVAS_MAXIMAS_DE_LANCE) break

    for (let passe = 0; passe < 2; passe += 1) {
      await page.locator(`#lancezero-board-square-${lance.from}`).click()
      await page.locator(`#lancezero-board-square-${lance.to}`).click()

      /*
        OS TRÊS SINAIS, E A ORDEM IMPORTA.

        O botão de confirmação vem PRIMEIRO porque, na tela que o usa, o item só
        conta depois do clique — o pendente ainda diz "Faltam 1 de 1" enquanto
        ele está na tela. Uma versão anterior deste ajudante só olhava o botão
        quando o pendente já tinha sumido, e por isso nunca o via: a etapa de
        variações dos finais virou beco sem saída no teste, e não no produto.

        Os outros dois cobrem a tela em que o lance certo conta sozinho: o texto
        do pendente anda, ou o rodapé destrava quando era o último item.
      */
      if ((await continuarDoExercicio(page).count()) > 0) {
        await continuarDoExercicio(page).click()
        return
      }
      const pendenteAgora = await textoDoPendente(page)
      if (pendenteAgora !== pendenteAntes) return
      if (pendenteAgora === '' && (await botaoContinuar(page).isEnabled())) return
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

    /*
      UMA ETAPA PODE TER MAIS DE UMA LINHA, e entre elas não há tabuleiro.

      A prática guiada da abertura passou a treinar a principal E os ramos core
      (plano VNext §28). Ao fim de cada linha a tela fica passiva e oferece
      "Próxima linha" — o rodapé continua travado, porque ainda faltam itens.

      Sem este ramo o ajudante chamava `responderUmItem`, que fica esperando um
      tabuleiro interativo que não existe, e o teste morria por RELÓGIO em vez de
      acusar um beco. O erro parecia lentidão e era falta de um passo.
    */
    const proximaLinha = page.getByRole('button', { name: /Próxima linha →/ })
    if ((await proximaLinha.count()) > 0) {
      await proximaLinha.first().click()
      continue
    }

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
  test.setTimeout(120_000)
  await page.goto('/finais/atividade-do-rei')
  await expect(page.getByText(/Etapa 1 de 10/)).toBeVisible()

  const visitadas = await percorrerAteOTreino(page, 10)

  // NOVE, e não "alguma": a décima é o treino, que esconde o rodapé. Um número
  // menor significa que a varredura parou no meio — que é o defeito de origem.
  expect(visitadas, 'a jornada não chegou ao treino').toBe(9)
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('Treino')
})

test('a jornada de uma abertura atravessa todas as etapas até o treino', async ({ page }) => {
  // A travessia é uma varredura por força bruta de nove etapas: ela é lenta por
  // desenho, e o relógio padrão de 30s mede a máquina, não o beco sem saída.
  test.setTimeout(120_000)
  await page.goto('/aberturas/italiana')
  await expect(page.getByText(/Etapa 1 de 8/)).toBeVisible()

  const visitadas = await percorrerAteOTreino(page, 8)

  // SETE, e não oito: a travessia PARA no treino, que esconde o rodapé inteiro.
  // A jornada de abertura tem oito etapas desde que "Respostas do adversário"
  // foi fundida em "Variações" — ver ADR-0022.
  expect(visitadas, 'a jornada não chegou ao treino').toBe(7)
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
