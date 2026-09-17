/**
 * O JUIZ DA RODADA DE TREINO — quem tem o IO na mão.
 *
 * O DEFEITO QUE ELE EXISTE PARA MATAR: `/finais/[slug]` montava a jornada SEM
 * passar `julgar`. No modo sem juiz, `VereditoDeLanceDeFinal.objetivo` é sempre
 * `null`, então `jogarNaRodadaDeFinal` nunca devolve `sucesso`, a rodada nunca
 * encerra, `registrarRodadaDeFinal` nunca é chamado, a cobertura da etapa 10
 * nunca fecha — e, como o treino esconde o rodapé, o aluno também não tinha por
 * onde sair. O computador tampouco respondia: o aluno jogava os dois lados.
 *
 * ONDE ESTE ARQUIVO MORA, e por quê: em `components/`, não em `domain/`. Ele é o
 * lugar do IO — tablebase e rede. O domínio recebe o veredito PRONTO, por
 * parâmetro, e continua testável sem WASM e sem rede. É a mesma fronteira que
 * `EndgameTrainer` respeita.
 *
 * O QUE ELE COMPÕE, e nada disso é reimplementado aqui:
 *
 * - `julgarLanceDeFinal` — o grau do lance (preserva / mantém-mas-é-pior / perde);
 * - `escolherLancePratico` — a resposta do computador. Esta função estava
 *   ESCRITA E TESTADA no domínio desde a entrega da jornada, e NUNCA tinha sido
 *   ligada. É ela que evita as duas formas de adversário que não ensinam: o que
 *   se deixa dar mate e o que anda de um lado para o outro até o empate;
 * - `avaliarObjetivo` + `objetivoDaPosicao` — o desfecho;
 * - `percorrerTentativa` — o contexto (repetição e regra dos 50 lances), que é
 *   DERIVADO dos lances da rodada e nunca guardado em paralelo.
 *
 * SEM REDE ELE NÃO INVENTA. Tablebase muda: o julgamento vira `null` (a tela diz
 * que não deu para comparar) e a resposta do computador cai para um lance legal.
 * O DESFECHO continua sendo avaliado, porque `avaliarObjetivo` é local — é o que
 * garante que a rodada TERMINA mesmo offline, que é o ponto desta entrega.
 */

import {
  avaliarObjetivo,
  avancarContexto,
  julgarLanceDeFinal,
  objetivoDaPosicao,
  percorrerTentativa,
  type ContextoObjetivo,
  type EndgamePosition,
  type ObjetivoFinal,
} from '@/domain/endgames'
import {
  escolherLancePratico,
  papelDaPosicao,
  type CandidatoPratico,
  type VereditoDeLanceDeFinal,
} from '@/domain/endgames/jornada'
import { applyMove, legalMoves, normalizeUci, parseUci } from '@/lib/chess'
import type { LanceTablebase, Side, TablebaseResult } from '@/domain/types'

/** Consulta à tablebase, injetada. Devolve `null` quando não há resposta. */
export type Sonda = (fen: string) => Promise<TablebaseResult | null>

export interface EntradaDoJuiz {
  posicao: EndgamePosition
  /** Posição ANTES do lance do aluno. */
  fenAntes: string
  uciDoAluno: string
  /**
   * UCIs desde o FEN INICIAL da rodada, dos dois lados, na ordem.
   *
   * É daqui que sai o contexto de repetição e da regra dos 50 lances. Um
   * contador guardado ao lado seria a segunda fonte da mesma verdade — e no dia
   * em que discordasse, a defesa correta em rei e peão (que termina em tríplice
   * repetição) deixaria de ser reconhecida, punindo quem fez certo.
   */
  lancesJogados: readonly string[]
}

export type JulgarLanceDeFinal = (entrada: EntradaDoJuiz) => Promise<VereditoDeLanceDeFinal>

/**
 * A sonda de produção, carregada SÓ no primeiro lance.
 *
 * `import()` dinâmico e não estático, pela regra de desempenho do CLAUDE.md:
 * nada de IO no pacote inicial antes da primeira necessidade real dele. Com o
 * import no topo, o módulo da tablebase entrava no pacote do cliente da rota
 * `/finais` — e o menu do app pré-carrega essa rota a partir de qualquer tela,
 * então o custo era pago por quem nunca abriu um final.
 *
 * O QUE ISTO NÃO CONSERTOU, e vale escrever para ninguém procurar aqui de novo:
 * `tests/e2e/biblioteca.spec.ts` perde o primeiro clique em "Continuar" numa
 * lição quando a página ainda não hidratou. Isso foi medido também no `HEAD` de
 * `main`, três vezes em três, com esta rota inteira ausente — é corrida de
 * hidratação do leitor de lições, não custo de pacote, e tem issue própria.
 *
 * O provider é criado UMA vez e reaproveitado — ele carrega o cache das
 * consultas, e recriá-lo a cada lance jogaria fora tudo que já foi perguntado.
 */
function sondaPreguicosa(): Sonda {
  let pendente: Promise<(fen: string) => Promise<TablebaseResult | null>> | null = null

  return async function probe(fen) {
    pendente ??= import('@/lib/tablebase').then(({ LichessTablebaseProvider }) => {
      const provider = new LichessTablebaseProvider({
        fetchFn: (...args) => globalThis.fetch(...args),
      })
      return (alvo: string) => provider.probe(alvo)
    })
    const consultar = await pendente
    return consultar(fen)
  }
}

/** Veredito de lance ilegal. A rodada morre sem julgar mais nada. */
function ilegal(fenAntes: string): VereditoDeLanceDeFinal {
  return { legal: false, fenDepois: fenAntes, julgamento: null, objetivo: null, alvoTecnico: null }
}

/**
 * Normaliza uma distância em 0..1, com maior = mais longe.
 *
 * `null` vira 0 e não 0,5: distância desconhecida não é distância média, e
 * chutar o meio faria um lance sem DTM competir de igual para igual com um
 * medido. O teto é uma escala de normalização, não um limite de produto — é só
 * o que transforma "45 lances" num número que soma com os outros critérios.
 */
const TETO_DE_DISTANCIA = 60

function distanciaNormalizada(valor: number | null): number {
  if (valor === null) return 0
  return Math.min(Math.abs(valor), TETO_DE_DISTANCIA) / TETO_DE_DISTANCIA
}

/**
 * Traduz os lances da tablebase em candidatos pontuáveis.
 *
 * `resultado` de um lance é do ponto de vista de QUEM JOGA DEPOIS dele — ou
 * seja, do aluno. Então o computador preserva o próprio resultado quando o lance
 * NÃO entrega vitória ao aluno.
 *
 * Os três critérios que o domínio pede e a tablebase não tem — atividade,
 * simplicidade e valor pedagógico — entram como ZERO, e isso está escrito em vez
 * de disfarçado: eles não são medidos ainda. Como entram com o mesmo valor para
 * todos os candidatos, não distorcem a ordem; quando houver medida, entram sem
 * mexer no resto.
 */
function candidatosDaTablebase(
  depoisDoAluno: TablebaseResult | null,
  computadorDefende: boolean,
): CandidatoPratico[] {
  if (!depoisDoAluno) return []
  return depoisDoAluno.lances.map((lance: LanceTablebase) => ({
    uci: normalizeUci(lance.uci),
    // O lance é bom para o COMPUTADOR quando não deixa o aluno ganhar.
    preserveOutcome: lance.resultado !== 'vitoria',
    // Defendendo, resistir é obrigar o aluno a um caminho LONGO até o mate.
    defensiveResistance: computadorDefende ? distanciaNormalizada(lance.dtm ?? lance.dtz) : 0,
    // Atacando, progredir é ENCURTAR a própria distância até a conversão.
    conversionProgress: computadorDefende ? 0 : 1 - distanciaNormalizada(lance.dtm ?? lance.dtz),
    activity: 0,
    simplicity: 0,
    pedagogicalValue: 0,
  }))
}

export interface OpcoesDoJuiz {
  /**
   * A sonda. O padrão é o provider REAL — isto é produção.
   *
   * É opcional porque o padrão é o comportamento de produção, e não porque
   * alguém pode esquecê-la. Mesmo desenho de `EndgameTrainer`.
   */
  probe?: Sonda
}

/**
 * Monta o juiz.
 *
 * A semente do desempate entre lances equivalentes é o NÚMERO DE LANCES já
 * jogados — determinística e diferente a cada meio-lance. `Math.random()` aqui
 * tornaria a rodada irreprodutível, e bug de final só se conserta reproduzindo a
 * sequência exata.
 */
export function criarJuizDeFinal(opcoes: OpcoesDoJuiz = {}): JulgarLanceDeFinal {
  const probe: Sonda = opcoes.probe ?? sondaPreguicosa()

  return async function julgar(entrada: EntradaDoJuiz): Promise<VereditoDeLanceDeFinal> {
    const lance = parseUci(normalizeUci(entrada.uciDoAluno))
    const aplicado = lance === null ? null : applyMove(entrada.fenAntes, lance)
    if (aplicado === null) return ilegal(entrada.fenAntes)

    const lado: Side = entrada.posicao.sideToTrain === 'white' ? 'w' : 'b'
    const { objetivo } = objetivoDaPosicao(entrada.posicao)

    // O contexto da rodada, reconstruído dos lances. Ver `EntradaDoJuiz`.
    const percorrida = percorrerTentativa({
      fenInicial: entrada.posicao.fen,
      ladoDoAluno: lado,
      lancesJogados: entrada.lancesJogados,
    })

    const antes = await probe(entrada.fenAntes)
    const julgamento = antes
      ? julgarLanceDeFinal({ fenAntes: entrada.fenAntes, uciDoAluno: aplicado.move.uci, antes })
      : null

    /*
      O CONTEXTO AVANÇA PELA PRIMITIVA DO DOMÍNIO, e não por uma conta local.

      `avancarContexto` é o único lugar do projeto que sabe como um lance muda o
      contexto — ele conta o lance do aluno pela COR de quem jogou e guarda a
      identidade da posição ANTES do lance. Uma segunda implementação aqui
      divergiria no dia em que só uma fosse corrigida, e o sintoma seria a
      tríplice repetição saindo um lance cedo ou tarde: a defesa correta em rei e
      peão deixaria de ser reconhecida, punindo quem fez certo.
    */
    const contexto = avancarContexto(percorrida.contexto, entrada.fenAntes, aplicado.move.color)

    const depoisDoAluno = avaliar(objetivo, aplicado.fenAfter, contexto)

    // Objetivo resolvido: a rodada acabou, e o computador não responde a uma
    // partida encerrada. Responder aqui poria um lance depois do mate.
    if (depoisDoAluno !== null && depoisDoAluno.estado !== 'em-andamento') {
      return {
        legal: true,
        fenDepois: aplicado.fenAfter,
        julgamento,
        objetivo: depoisDoAluno,
        alvoTecnico: null,
      }
    }

    const resposta = await responder(
      probe,
      aplicado.fenAfter,
      papelDaPosicao(entrada.posicao) === 'defensor',
      entrada.lancesJogados.length + 1,
    )
    if (resposta === null) {
      return {
        legal: true,
        fenDepois: aplicado.fenAfter,
        julgamento,
        objetivo: depoisDoAluno,
        alvoTecnico: null,
      }
    }

    const contextoFinal = avancarContexto(contexto, aplicado.fenAfter, resposta.cor)
    return {
      legal: true,
      fenDepois: resposta.fenDepois,
      julgamento,
      objetivo: avaliar(objetivo, resposta.fenDepois, contextoFinal),
      alvoTecnico: null,
    }
  }
}

/** Avalia o objetivo, ou devolve `null` quando a posição não tem um avaliável. */
function avaliar(objetivo: ObjetivoFinal | null, fen: string, contexto: ContextoObjetivo) {
  return objetivo === null ? null : avaliarObjetivo(fen, objetivo, contexto)
}

/**
 * A resposta do computador.
 *
 * Tenta a política prática sobre os lances da tablebase; sem tablebase, cai para
 * o primeiro lance legal. Cair para "qualquer lance" é pior que a política e
 * melhor que travar a rodada — e a tela já avisa que não houve comparação.
 */
async function responder(
  probe: Sonda,
  fen: string,
  computadorDefende: boolean,
  semente: number,
): Promise<{ fenDepois: string; cor: 'w' | 'b' } | null> {
  const depois = await probe(fen)
  const candidatos = candidatosDaTablebase(depois, computadorDefende)

  const escolhido = escolherLancePratico(candidatos, {
    papelDoComputador: computadorDefende ? 'defensor' : 'atacante',
    lancesJaJogados: [],
    seed: semente,
  })

  const uci = escolhido?.uci ?? primeiroLegal(fen)
  if (uci === null) return null

  const lance = parseUci(uci)
  const aplicado = lance === null ? null : applyMove(fen, lance)
  if (aplicado === null) return null
  return { fenDepois: aplicado.fenAfter, cor: aplicado.move.color }
}

function primeiroLegal(fen: string): string | null {
  const primeiro = legalMoves(fen)[0]
  return primeiro ? normalizeUci(primeiro.uci) : null
}
