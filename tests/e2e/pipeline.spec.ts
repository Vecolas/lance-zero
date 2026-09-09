/**
 * O pipeline de revisão de partida contra o Stockfish REAL.
 *
 * POR QUE ESTE ARQUIVO EXISTE. `analyzeGame` tinha onze testes unitários, todos
 * com engine falsa. Um duble prova a SUA lógica e nunca a integração: se o
 * Stockfish real reportasse score na perspectiva errada, ignorasse o orçamento
 * de nós ou não parasse ao receber `stop`, aqueles onze testes continuariam
 * verdes e a revisão diria ao jogador que o lance bom dele foi ruim. Este
 * arquivo é a outra metade — sobe `/debug/pipeline` e roda a partida inteira.
 *
 * DUAS FERRAMENTAS DIFERENTES CONVIVEM AQUI, e é bom que fique explícito:
 *
 * - PORTÕES (todos os testes menos o último): afirmam invariantes. Reprovam.
 * - RÉGUA (o último teste, `medição`): imprime números para a issue #21 e NÃO
 *   afirma valor nenhum. Tempo depende de máquina; travar um número aqui seria
 *   um portão que envelhece e passa a reprovar o código certo. A única asserção
 *   dele é "terminou", com um teto absurdamente generoso.
 *
 * REGRA DE ASSERÇÃO, herdada de `engine.spec.ts`: nada de centipeão exato e
 * nada de tempo exato. Asserta-se ORDENAÇÃO, PROPRIEDADE e FAIXA.
 *
 * O QUE ESTE ARQUIVO NÃO PROVA:
 * - desempenho em celular mediano. Ele mede a máquina que o roda, e só ela.
 * - que os orçamentos atuais são os CERTOS. Ele os mede; escolher é outra coisa.
 * - a tela de revisão do produto (`/games/[gameId]`). Aqui é o pipeline puro.
 */

import { expect, test, type Page } from '@playwright/test'

/**
 * O que cada exemplo do painel existe para provar.
 *
 * Esta tabela é cruzada com os exemplos RENDERIZADOS, não com uma lista escrita
 * à mão em dois lugares: exemplo novo que ninguém decidiu o que prova reprova o
 * portão em vez de sumir da conta.
 */
const PROVA_DE_CADA_EXEMPLO: Record<string, 'com-erro' | 'limpa'> = {
  'dama-de-graca': 'com-erro',
  'abertura-limpa': 'limpa',
}

/**
 * Exemplos conscientemente sem cobertura. Morde dos dois lados: nome aqui NÃO
 * pode aparecer em `PROVA_DE_CADA_EXEMPLO`, e nome fora daqui tem de aparecer.
 */
const SEM_COBERTURA_AINDA: readonly string[] = []

/** Baixar e instanciar 7 MB de WASM leva alguns segundos em máquina fria. */
const ESPERA_ANALISE = 180_000

/**
 * Teto generoso da régua: só existe para o teste terminar em vez de pendurar.
 * Não é um alvo de desempenho — ver o cabeçalho.
 */
const TETO_ABSURDO_MS = 150_000

test.describe.configure({ mode: 'serial' })
test.setTimeout(300_000)

interface PainelLido {
  fase: string
  engineStatus: string
  tempoMs: number | null
  tempoCargaMs: number | null
  varreduraNodes: number | null
  aprofundamentoNodes: number | null
  pliesUsuario: number | null
  pliesAnalisados: number | null
  pliesAprofundados: number | null
  pliesFalha: number | null
  aprofundamentosFalha: number | null
  momentos: number | null
  unknownRate: number | null
  orcamentos: { nodes: number; chamadas: number; msTotal: number }[]
}

interface MomentoLido {
  ply: number
  severidade: string
  lance: string
  melhor: string
  perdaPp: number
  explicacao: string
}

async function abrirBancada(page: Page): Promise<void> {
  await page.goto('/debug/pipeline')
  await expect(page.getByRole('heading', { name: 'Bancada do pipeline' })).toBeVisible()
  // A engine é sob demanda: antes do primeiro clique nada foi carregado e nada
  // foi analisado. Sem esta âncora, um painel que já viesse com resultado velho
  // deixaria os testes seguintes medindo a coisa errada.
  await expect(page.getByTestId('pipeline-painel')).toHaveAttribute('data-fase', 'ocioso')
  await expect(page.getByTestId('pipeline-vazio')).toBeVisible()
}

function exemplo(page: Page, id: string) {
  return page.locator(`[data-testid="pipeline-exemplo"][data-exemplo-id="${id}"]`)
}

async function escolherExemplo(page: Page, id: string): Promise<void> {
  await exemplo(page, id).click()
}

async function configurarOrcamentos(
  page: Page,
  orcamentos: { varredura?: number; aprofundamento?: number },
): Promise<void> {
  if (orcamentos.varredura !== undefined) {
    await page.getByLabel('Nós da varredura').fill(String(orcamentos.varredura))
  }
  if (orcamentos.aprofundamento !== undefined) {
    await page.getByLabel('Nós do aprofundamento').fill(String(orcamentos.aprofundamento))
  }
}

async function lerPainel(page: Page): Promise<PainelLido> {
  return page.getByTestId('pipeline-painel').evaluate((node) => {
    const el = node as HTMLElement
    const num = (valor: string | undefined): number | null =>
      valor === undefined || valor === '' ? null : Number(valor)
    return {
      fase: el.dataset.fase ?? '',
      engineStatus: el.dataset.engineStatus ?? '',
      tempoMs: num(el.dataset.tempoMs),
      tempoCargaMs: num(el.dataset.tempoCargaMs),
      varreduraNodes: num(el.dataset.varreduraNodes),
      aprofundamentoNodes: num(el.dataset.aprofundamentoNodes),
      pliesUsuario: num(el.dataset.pliesUsuario),
      pliesAnalisados: num(el.dataset.pliesAnalisados),
      pliesAprofundados: num(el.dataset.pliesAprofundados),
      pliesFalha: num(el.dataset.pliesFalha),
      aprofundamentosFalha: num(el.dataset.aprofundamentosFalha),
      momentos: num(el.dataset.momentos),
      unknownRate: num(el.dataset.unknownRate),
      orcamentos: JSON.parse(el.dataset.orcamentos ?? '[]') as {
        nodes: number
        chamadas: number
        msTotal: number
      }[],
    }
  })
}

async function lerMomentos(page: Page): Promise<MomentoLido[]> {
  return page.getByTestId('pipeline-momento').evaluateAll((nodes) =>
    nodes.map((node) => {
      const el = node as HTMLElement
      return {
        ply: Number(el.dataset.ply ?? '0'),
        severidade: el.dataset.severidade ?? '',
        lance: el.dataset.lance ?? '',
        melhor: el.dataset.melhor ?? '',
        perdaPp: Number(el.dataset.perdaPp ?? '0'),
        explicacao: el.dataset.explicacao ?? '',
      }
    }),
  )
}

/**
 * Roda a análise e espera o painel sair do estado de trabalho.
 *
 * Espera `pronto|erro|cancelado` e só DEPOIS confere que deu `pronto`: se
 * esperasse direto por `pronto`, uma engine que falhou viraria "timeout de 3
 * minutos" em vez de dizer o que aconteceu.
 */
async function analisar(page: Page): Promise<PainelLido> {
  await page.getByRole('button', { name: 'Analisar partida' }).click()
  await expect(page.getByTestId('pipeline-painel')).toHaveAttribute(
    'data-fase',
    /pronto|erro|cancelado/,
    { timeout: ESPERA_ANALISE },
  )
  await expect(page.getByTestId('pipeline-erro')).toHaveCount(0)
  const painel = await lerPainel(page)
  expect(painel.fase, 'a análise precisa ter concluído para o resto do teste valer').toBe('pronto')
  return painel
}

test('todo exemplo do painel declara o que prova', async ({ page }) => {
  await abrirBancada(page)

  const exemplos = await page.getByTestId('pipeline-exemplo').evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: (node as HTMLElement).dataset.exemploId ?? '',
      proposito: (node as HTMLElement).dataset.proposito ?? '',
    })),
  )

  // Tabela vazia não é aprovação: sem exemplo nenhum, tudo abaixo passaria sem
  // ter medido nada.
  expect(exemplos.length, 'o painel precisa renderizar pelo menos um exemplo').toBeGreaterThan(0)

  for (const { id, proposito } of exemplos) {
    expect(id, 'exemplo sem id não pode ser endereçado pelo teste').not.toBe('')
    expect(proposito.length, `o exemplo ${id} não diz o que existe para provar`).toBeGreaterThan(20)
    const coberto = id in PROVA_DE_CADA_EXEMPLO
    const dividaDeclarada = SEM_COBERTURA_AINDA.includes(id)
    expect(
      coberto || dividaDeclarada,
      `o exemplo ${id} não está coberto nem declarado como dívida`,
    ).toBe(true)
  }

  // O outro lado da dívida: nome declarado como descoberto tem de continuar
  // descoberto, senão a linha fica cobrindo em silêncio para sempre.
  for (const id of SEM_COBERTURA_AINDA) {
    expect(id in PROVA_DE_CADA_EXEMPLO, `${id} está na dívida E na cobertura`).toBe(false)
  }

  // E entrada órfã na tabela: exemplo removido do painel deixaria uma promessa
  // de cobertura que nada exercita.
  const idsNoPainel = new Set(exemplos.map((e) => e.id))
  for (const id of Object.keys(PROVA_DE_CADA_EXEMPLO)) {
    expect(idsNoPainel.has(id), `${id} está na tabela mas não existe no painel`).toBe(true)
  }
})

test('a partida com erro grosseiro produz momento crítico com a engine real', async ({ page }) => {
  await abrirBancada(page)
  await escolherExemplo(page, 'dama-de-graca')

  const painel = await analisar(page)

  // A partida tem 10 meios-lances, 5 deles das brancas — e só os do usuário vão
  // à engine. Se este número mudar, a partida do exemplo mudou.
  expect(painel.pliesUsuario).toBe(5)
  expect(painel.pliesAnalisados).toBe(5)
  expect(painel.pliesFalha, 'engine real falhando em lance isolado invalida o resto').toBe(0)
  expect(painel.aprofundamentosFalha).toBe(0)
  expect(painel.pliesAprofundados, 'sem aprofundamento não existe momento').toBeGreaterThan(0)

  const momentos = await lerMomentos(page)
  expect(momentos.length, 'dar a dama de graça tem de aparecer na revisão').toBeGreaterThan(0)
  expect(painel.momentos).toBe(momentos.length)

  // `Qxf7+` em UCI é `h5f7`: é ele que o pipeline precisa destacar.
  const dama = momentos.find((momento) => momento.lance === 'h5f7')
  expect(
    dama,
    `o lance da dama não foi destacado; vieram: ${JSON.stringify(momentos)}`,
  ).toBeTruthy()
  if (!dama) return

  // Entregar a dama por um peão é a pior categoria que o produto tem. Não é um
  // número mágico: é a banda mais grave da configuração de severidade.
  expect(dama.severidade).toBe('erro-grave')

  // E relativo, que é o que não envelhece com tuning: nenhum outro lance da
  // partida pode ser considerado pior que este.
  const pior = Math.max(...momentos.map((momento) => momento.perdaPp))
  expect(dama.perdaPp).toBe(pior)

  // O melhor lance segundo a engine não pode ser o lance jogado — senão o
  // "momento crítico" está apontando para o próprio acerto do jogador.
  expect(dama.melhor).not.toBe(dama.lance)
  expect(dama.melhor).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/)
})

test('a partida limpa não inventa momento crítico', async ({ page }) => {
  await abrirBancada(page)
  await escolherExemplo(page, 'abertura-limpa')

  const painel = await analisar(page)

  expect(painel.pliesUsuario).toBe(5)
  expect(painel.pliesFalha, 'falha de engine mascararia um lance ruim como partida limpa').toBe(0)
  expect(painel.pliesAnalisados).toBe(5)

  // Zero é o resultado certo: `completarAteMinimo` está desligado justamente
  // para uma partida sem erro poder terminar sem nenhum momento. Se este teste
  // reprovar um dia, a resposta é recalibrar os limiares — nunca afrouxar aqui.
  expect(painel.momentos, 'cinco lances de livro não contêm erro').toBe(0)
  await expect(page.getByTestId('pipeline-sem-momentos')).toBeVisible()
  expect(await lerMomentos(page)).toHaveLength(0)
})

test('a varredura usa menos nós que o aprofundamento', async ({ page }) => {
  await abrirBancada(page)
  await escolherExemplo(page, 'dama-de-graca')

  // Orçamentos deliberadamente diferentes dos padrões: assim o teste prova que
  // o campo chega à engine, e não apenas que dois números constantes diferem.
  const VARREDURA = 20_000
  const APROFUNDAMENTO = 400_000
  await configurarOrcamentos(page, { varredura: VARREDURA, aprofundamento: APROFUNDAMENTO })

  const painel = await analisar(page)

  expect(painel.varreduraNodes).toBe(VARREDURA)
  expect(painel.aprofundamentoNodes).toBe(APROFUNDAMENTO)
  expect(painel.pliesAprofundados).toBeGreaterThan(0)

  // `orcamentos` é o que o pipeline REALMENTE pediu à engine, chamada a chamada.
  // Duas famílias distintas: se o aprofundamento não existisse, viria uma só.
  const orcamentos = painel.orcamentos
  expect(orcamentos.length, `orçamentos observados: ${JSON.stringify(orcamentos)}`).toBe(2)

  const [rasa, profunda] = orcamentos
  expect(rasa.nodes).toBe(VARREDURA)
  expect(profunda.nodes).toBe(APROFUNDAMENTO)
  expect(rasa.nodes).toBeLessThan(profunda.nodes)

  // A varredura passa por todos os lances; o aprofundamento, só pelos
  // candidatos. Analisar tudo fundo é exatamente o que o pipeline evita.
  expect(rasa.chamadas).toBeGreaterThan(profunda.chamadas)

  // Nenhuma busca sem orçamento: uma chamada com `nodes` ausente cairia no
  // balde 0 e rodaria até o timeout do provider, sem ninguém perceber.
  for (const orcamento of orcamentos) {
    expect(orcamento.nodes).toBeGreaterThan(0)
    expect(orcamento.chamadas).toBeGreaterThan(0)
  }
})

test('cancelar no meio interrompe e não deixa resultado pela metade', async ({ page }) => {
  await abrirBancada(page)
  await escolherExemplo(page, 'dama-de-graca')

  // PRIMEIRO uma análise que dá certo. Sem ela, "não deixa resultado pela
  // metade" seria uma asserção que não consegue falhar: a tela já nasce vazia, e
  // um painel que nunca limpasse nada passaria igual. Com um resultado anterior
  // na tela, a asserção volta a ter o que reprovar.
  const anterior = await analisar(page)
  expect(anterior.momentos, 'a rodada de referência precisa deixar algo na tela').toBeGreaterThan(0)
  await expect(page.getByTestId('pipeline-momento').first()).toBeVisible()

  // Orçamento grande de propósito: a varredura precisa continuar rodando
  // enquanto o teste clica em Cancelar. Sem isso, a análise terminaria antes e o
  // teste cancelaria o nada.
  await configurarOrcamentos(page, { varredura: 6_000_000, aprofundamento: 6_000_000 })

  const painel = page.getByTestId('pipeline-painel')
  await page.getByRole('button', { name: 'Analisar partida' }).click()
  await expect(painel).toHaveAttribute('data-fase', 'analisando', { timeout: ESPERA_ANALISE })
  await expect(page.getByTestId('pipeline-progresso')).toBeVisible()

  const inicio = Date.now()
  await page.getByTestId('pipeline-cancelar').click()
  await expect(painel).toHaveAttribute('data-fase', 'cancelado', { timeout: 30_000 })
  const decorrido = Date.now() - inicio

  // Interromper de verdade, e não esperar os 6 milhões de nós × 10 posições
  // terminarem. O teto é folgado; o ponto é a ordem de grandeza.
  expect(decorrido, 'cancelamento precisa cortar a busca, não aguardá-la').toBeLessThan(30_000)

  // Nada pela metade: meia revisão na tela parece uma revisão inteira e mente
  // sobre a partida.
  await expect(page.getByTestId('pipeline-vazio')).toBeVisible()
  await expect(page.getByTestId('pipeline-momento')).toHaveCount(0)
  const depois = await lerPainel(page)
  expect(depois.momentos).toBeNull()
  expect(depois.pliesAnalisados).toBeNull()
  expect(depois.pliesAprofundados).toBeNull()

  // Cancelamento não é falha: não pode aparecer mensagem de erro.
  await expect(page.getByTestId('pipeline-erro')).toHaveCount(0)
})

/**
 * RÉGUA da issue #21 — mede, não aprova.
 *
 * `PIPELINE_CONFIG.varreduraNodes` (60k) e `aprofundamentoNodes` (600k) foram
 * lidos do CLAUDE.md e nunca medidos. Este teste roda com os padrões e imprime
 * o custo real, para a calibração deixar de ser folclore.
 *
 * O número impresso vale para a máquina que rodou. Ele NÃO substitui medir em
 * celular mediano, que é o alvo declarado do orçamento.
 */
test('medição: quanto custa uma revisão com os orçamentos padrão', async ({ page }) => {
  await abrirBancada(page)
  await escolherExemplo(page, 'dama-de-graca')

  const painel = await analisar(page)
  const momentos = await lerMomentos(page)

  const linhas = [
    '',
    '--- MEDIÇÃO DO PIPELINE (issue #21) — uma máquina, não um celular mediano ---',
    `orçamento varredura ......... ${painel.varreduraNodes} nós`,
    `orçamento aprofundamento .... ${painel.aprofundamentoNodes} nós`,
    `carga da engine (fora da conta) ${painel.tempoCargaMs} ms`,
    `TEMPO TOTAL DA ANÁLISE ...... ${painel.tempoMs} ms`,
    `lances do usuário ........... ${painel.pliesUsuario}`,
    `posições analisadas ......... ${painel.pliesAnalisados}`,
    `posições aprofundadas ....... ${painel.pliesAprofundados}`,
    `falhas (varredura/aprof.) ... ${painel.pliesFalha} / ${painel.aprofundamentosFalha}`,
    `momentos críticos ........... ${momentos.length}`,
    `taxa de "unknown" ........... ${painel.unknownRate}`,
    'custo por orçamento:',
    ...painel.orcamentos.map(
      (orcamento) =>
        `  ${String(orcamento.nodes).padStart(9)} nós · ${String(orcamento.chamadas).padStart(3)} chamadas · ${String(orcamento.msTotal).padStart(7)} ms · ${Math.round(orcamento.msTotal / Math.max(1, orcamento.chamadas))} ms/chamada`,
    ),
    '---------------------------------------------------------------------------',
    '',
  ]
  // A régua existe para imprimir: esta linha é a saída dela, não um debug esquecido.
  console.log(linhas.join('\n'))

  // A única asserção: terminou. Tempo vira portão quando alguém tiver medido em
  // hardware alvo e escolhido um alvo — hoje não temos nenhum dos dois.
  expect(painel.tempoMs).not.toBeNull()
  expect(painel.tempoMs ?? 0).toBeGreaterThan(0)
  expect(painel.tempoMs ?? 0).toBeLessThan(TETO_ABSURDO_MS)
})
