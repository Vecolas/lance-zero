/**
 * Frequência das linhas que o usuário REALMENTE enfrenta.
 *
 * É a entrega que separa "repertório de livro" de "repertório do aluno". O que
 * importa para quem joga em 1100 não é a linha principal da teoria: é a resposta
 * que o adversário dele joga toda semana e que ele nunca estudou.
 *
 * DECISÃO 1 — FUNÇÃO PURA, PARTIDAS POR PARÂMETRO. Nada aqui lê repositório,
 * relógio ou rede. Isso é o que torna o resultado testável e o que permite ao
 * planner recalcular sem efeito colateral.
 *
 * DECISÃO 2 — SILÊNCIO NUNCA VIRA APROVAÇÃO. Partida com PGN ilegível não some:
 * ela é contada em `partidasIlegiveis`. Partida do outro lado também é contada
 * à parte. Um denominador que encolhe sem aviso transforma "não consegui ler
 * dez partidas" em "você domina o repertório", que é o pior erro possível aqui.
 *
 * DECISÃO 3 — DATA É INSTANTE, NUNCA TEXTO. `ultimaEm` sai de `instanteDe`
 * (`@/lib/tempo`), o dono da conversão neste projeto. Comparar `playedAt` como
 * string só coincide com a ordem cronológica enquanto todo mundo escrever em
 * UTC, e `2026-01-01T23:00:00-03:00` é ISO-8601 perfeito e ordena errado. O
 * sintoma seria "sua linha mais recente" apontando para a partida errada, sem
 * erro nenhum no caminho.
 *
 * DECISÃO 4 — SAIR DO LIVRO TEM DOIS NOMES DIFERENTES, e fundi-los apagaria o
 * diagnóstico. `lacuna` é o adversário jogando algo que o repertório não cobre:
 * é conteúdo a acrescentar. `desvio` é o usuário jogando diferente do próprio
 * repertório: é treino a fazer. As duas coisas pedem ações opostas do aluno.
 *
 * DECISÃO 5 — CHEGAR AO FIM DO LIVRO NÃO É SAIR DELE. Quando o nó não tem mais
 * ramos, a partida simplesmente passou da abertura. Contar isso como lacuna
 * encheria a tela de "linha desconhecida" para todo jogo que chegou ao
 * meio-jogo.
 */

import { parsePgn } from '@/lib/chess'
import { aberturaDosPlies, type IndiceEco } from '@/lib/openings'
import { instanteDe } from '@/lib/tempo'
import type { Abertura, Game } from '@/domain/types'
import type { ArvoreDeRepertorio, NoDeRepertorio } from './arvore'

/** Um ramo do repertório e quantas partidas reais passaram por ele. */
export interface OcorrenciaDeRamo {
  /** Identidade da posição de onde o ramo sai. */
  origem: string
  san: string
  doUsuario: boolean
  partidas: number
  /** `playedAt` da partida mais recente, escolhida por INSTANTE. */
  ultimaEm: string | null
  gameIds: readonly string[]
}

/** Um ponto em que a partida saiu do repertório. */
export interface SaidaDoLivro {
  /** Última posição do repertório antes da saída. */
  origem: string
  /** Lance jogado ali, que o repertório não prevê. */
  san: string
  partidas: number
  ultimaEm: string | null
  gameIds: readonly string[]
}

export interface FrequenciaDeRepertorio {
  repertorioId: string
  /** Quantas partidas entraram na função. */
  partidasRecebidas: number
  /** Partidas em que o usuário jogou do outro lado. Não dizem nada daqui. */
  partidasDeOutroLado: number
  /** Partidas cujo PGN não deu para ler. */
  partidasIlegiveis: number
  /** As que sobraram e foram efetivamente percorridas. */
  partidasConsideradas: number
  /** Das consideradas, quantas nunca saíram do repertório. */
  partidasNoLivro: number
  /** Ordenado por partidas (desc), depois posição e lance, para ser determinístico. */
  ramos: readonly OcorrenciaDeRamo[]
  /** O que o ADVERSÁRIO joga e o repertório não cobre. Conteúdo a acrescentar. */
  lacunas: readonly SaidaDoLivro[]
  /** O que o USUÁRIO joga fora do próprio repertório. Treino a fazer. */
  desvios: readonly SaidaDoLivro[]
}

interface Acumulador {
  partidas: number
  gameIds: string[]
  ultimaEm: string | null
  ultimoInstante: number | null
}

function novoAcumulador(): Acumulador {
  return { partidas: 0, gameIds: [], ultimaEm: null, ultimoInstante: null }
}

/**
 * Soma uma partida ao acumulador, mantendo a MAIS RECENTE por instante.
 *
 * Data ilegível não derruba a contagem: a partida conta, e só não concorre a
 * `ultimaEm`. Descartá-la inteira por causa de um cabeçalho torto seria perder
 * um dado bom por causa de um dado ruim.
 */
function acumular(acc: Acumulador, partida: Game): void {
  acc.partidas += 1
  acc.gameIds.push(partida.id)
  const instante = instanteDe(partida.playedAt)
  if (instante === null) {
    return
  }
  if (acc.ultimoInstante === null || instante > acc.ultimoInstante) {
    acc.ultimoInstante = instante
    acc.ultimaEm = partida.playedAt
  }
}

function chaveDe(origem: string, san: string): string {
  return `${origem}|${san}`
}

/** Ordem estável: mais frequente primeiro; empate resolvido pelo texto. */
function porFrequencia(
  a: { partidas: number; origem: string; san: string },
  b: { partidas: number; origem: string; san: string },
): number {
  if (a.partidas !== b.partidas) return b.partidas - a.partidas
  if (a.origem !== b.origem) return a.origem < b.origem ? -1 : 1
  return a.san < b.san ? -1 : a.san > b.san ? 1 : 0
}

/**
 * Percorre as partidas pela árvore e conta o que aconteceu de verdade.
 *
 * O relógio não entra porque não é preciso: tudo que se compara vem do
 * `playedAt` das próprias partidas.
 */
export function frequenciaDoRepertorio(
  arvore: ArvoreDeRepertorio,
  partidas: readonly Game[],
): FrequenciaDeRepertorio {
  const ramos = new Map<string, Acumulador & { origem: string; san: string; doUsuario: boolean }>()
  const lacunas = new Map<string, Acumulador & { origem: string; san: string }>()
  const desvios = new Map<string, Acumulador & { origem: string; san: string }>()

  let partidasDeOutroLado = 0
  let partidasIlegiveis = 0
  let partidasConsideradas = 0
  let partidasNoLivro = 0

  for (const partida of partidas) {
    if (partida.userColor !== arvore.lado) {
      partidasDeOutroLado += 1
      continue
    }

    let plies
    try {
      plies = parsePgn(partida.pgn).plies
    } catch {
      partidasIlegiveis += 1
      continue
    }

    partidasConsideradas += 1
    let no: NoDeRepertorio | undefined = arvore.nos.get(arvore.raiz)
    let saiu = false

    for (const ply of plies) {
      if (!no || no.ramos.length === 0) {
        break
      }
      const ramo = no.ramos.find((candidato) => candidato.san === ply.san)
      if (!ramo) {
        const doUsuario = ply.color === arvore.lado
        const destino = doUsuario ? desvios : lacunas
        const chave = chaveDe(no.identidade, ply.san)
        const acc =
          destino.get(chave) ??
          Object.assign(novoAcumulador(), { origem: no.identidade, san: ply.san })
        acumular(acc, partida)
        destino.set(chave, acc)
        saiu = true
        break
      }

      const chave = chaveDe(ramo.origem, ramo.san)
      const acc =
        ramos.get(chave) ??
        Object.assign(novoAcumulador(), {
          origem: ramo.origem,
          san: ramo.san,
          doUsuario: ramo.doUsuario,
        })
      acumular(acc, partida)
      ramos.set(chave, acc)

      no = arvore.nos.get(ramo.destino)
    }

    if (!saiu) {
      partidasNoLivro += 1
    }
  }

  const comoSaida = (mapa: Map<string, Acumulador & { origem: string; san: string }>) =>
    [...mapa.values()]
      .map((acc) => ({
        origem: acc.origem,
        san: acc.san,
        partidas: acc.partidas,
        ultimaEm: acc.ultimaEm,
        gameIds: acc.gameIds,
      }))
      .sort(porFrequencia)

  return {
    repertorioId: arvore.id,
    partidasRecebidas: partidas.length,
    partidasDeOutroLado,
    partidasIlegiveis,
    partidasConsideradas,
    partidasNoLivro,
    ramos: [...ramos.values()]
      .map((acc) => ({
        origem: acc.origem,
        san: acc.san,
        doUsuario: acc.doUsuario,
        partidas: acc.partidas,
        ultimaEm: acc.ultimaEm,
        gameIds: acc.gameIds,
      }))
      .sort(porFrequencia),
    lacunas: comoSaida(lacunas),
    desvios: comoSaida(desvios),
  }
}

// -------------------------------------------------- frequência por abertura

/** Uma abertura e quantas partidas do usuário chegaram a ela. */
export interface FrequenciaDeAbertura {
  /** Identidade da posição em que a abertura foi reconhecida. */
  identidade: string
  abertura: Abertura
  partidas: number
  comoBrancas: number
  comoPretas: number
  ultimaEm: string | null
  gameIds: readonly string[]
}

export interface FrequenciaDeAberturas {
  partidasRecebidas: number
  partidasIlegiveis: number
  /** Partidas cuja linha não bateu com nenhuma entrada do índice. */
  partidasSemAbertura: number
  aberturas: readonly FrequenciaDeAbertura[]
}

/**
 * O que o usuário enfrenta, por NOME de abertura, independente de repertório.
 *
 * Existe separado de `frequenciaDoRepertorio` porque responde antes: no primeiro
 * dia, quando ainda não há repertório montado, esta é a única resposta possível
 * para "o que eu jogo de verdade". Os dois lados contam juntos de propósito, e o
 * recorte por cor vem nos campos `comoBrancas`/`comoPretas` — o mesmo nome de
 * abertura aparece dos dois lados do tabuleiro.
 */
export function frequenciaDeAberturas(
  partidas: readonly Game[],
  indice: IndiceEco,
): FrequenciaDeAberturas {
  const acumuladores = new Map<
    string,
    Acumulador & { identidade: string; abertura: Abertura; comoBrancas: number; comoPretas: number }
  >()
  let partidasIlegiveis = 0
  let partidasSemAbertura = 0

  for (const partida of partidas) {
    let plies
    try {
      plies = parsePgn(partida.pgn).plies
    } catch {
      partidasIlegiveis += 1
      continue
    }

    const reconhecida = aberturaDosPlies(indice, plies)
    if (reconhecida === null) {
      partidasSemAbertura += 1
      continue
    }

    const acc =
      acumuladores.get(reconhecida.identidade) ??
      Object.assign(novoAcumulador(), {
        identidade: reconhecida.identidade,
        abertura: reconhecida.abertura,
        comoBrancas: 0,
        comoPretas: 0,
      })
    acumular(acc, partida)
    if (partida.userColor === 'w') {
      acc.comoBrancas += 1
    } else {
      acc.comoPretas += 1
    }
    acumuladores.set(reconhecida.identidade, acc)
  }

  const aberturas = [...acumuladores.values()]
    .map((acc) => ({
      identidade: acc.identidade,
      abertura: acc.abertura,
      partidas: acc.partidas,
      comoBrancas: acc.comoBrancas,
      comoPretas: acc.comoPretas,
      ultimaEm: acc.ultimaEm,
      gameIds: acc.gameIds,
    }))
    .sort((a, b) => {
      if (a.partidas !== b.partidas) return b.partidas - a.partidas
      if (a.abertura.nome !== b.abertura.nome) return a.abertura.nome < b.abertura.nome ? -1 : 1
      return a.identidade < b.identidade ? -1 : 1
    })

  return {
    partidasRecebidas: partidas.length,
    partidasIlegiveis,
    partidasSemAbertura,
    aberturas,
  }
}
