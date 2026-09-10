/**
 * Árvore de repertório: schema, construção e detecção de incompatibilidade.
 *
 * O QUE O PRODUTO QUER, e está escrito no `CLAUDE.md` e na issue #10: para ~1100
 * a experiência central NÃO é uma árvore profunda de memorização. É princípio,
 * poucas linhas, IDEIA escrita e prioridade para o que o aluno realmente
 * enfrenta. Este arquivo é o schema dessa decisão, não um motor de livro.
 *
 * DECISÃO 1 — TODO RAMO CARREGA UMA IDEIA, e ela é obrigatória. Um repertório
 * sem ideia é memorização, que é exatamente a coisa que a issue proíbe. Vale
 * também para o lance do ADVERSÁRIO: saber o que o outro lado está tentando é
 * metade do que falta a um jogador de 1100, e é a metade que nenhuma sequência
 * decorada entrega.
 *
 * DECISÃO 2 — A IDEIA É DECLARADA UMA VEZ SÓ. A ideia pertence ao par (posição,
 * lance), não à linha. Como duas linhas transpõem e passam pelo mesmo par,
 * declarar de novo — mesmo com texto IDÊNTICO — é conflito, e não conveniência:
 * duas cópias do mesmo texto divergem no dia em que alguém melhora uma delas.
 * Por isso `ideia` é opcional no schema e o portão morde dos dois lados: ausente
 * na primeira aparição reprova, presente numa repetição também reprova.
 *
 * DECISÃO 3 — O NÓ É A POSIÇÃO, NÃO O CAMINHO. É o critério de aceite mais
 * difícil da issue: "transposição não cria nós duplicados incompatíveis". Duas
 * ordens de lances que chegam à mesma posição são O MESMO nó, e a chave que faz
 * isso é `identidadeDePosicao` — leia o cabeçalho dele antes de mexer aqui.
 *
 * DECISÃO 4 — DOIS LANCES DO USUÁRIO NA MESMA POSIÇÃO É ERRO, não escolha. Um
 * repertório existe para responder "o que eu jogo aqui" com UM lance. Duas
 * respostas é a definição de nó duplicado incompatível, e o aluno descobriria
 * isso na hora do card de revisão, sem saber qual das duas contaria como acerto.
 * Ramos do ADVERSÁRIO são o contrário: vários são esperados, é para isso que a
 * árvore ramifica.
 *
 * DECISÃO 5 — PROFUNDIDADE TEM TETO, e o teto é o princípio do produto virado
 * portão. `profundidadeMaxima` não é limite técnico: é a recusa a virar livro de
 * variantes. Linha mais longa que isso não entra pela metade — ela é recusada
 * inteira e reportada, porque metade de uma linha é um repertório que termina no
 * meio de uma sequência tática.
 *
 * DECISÃO 6 — PROBLEMA VIRA LISTA, NÃO EXCEÇÃO. `construirRepertorio` devolve
 * `conflitos` e nunca lança por conteúdo ruim, do mesmo jeito que
 * `cruzarInventarios` devolve problemas: quem edita repertório quer ver TODOS os
 * erros de uma vez, não o primeiro. O portão do conteúdo exige lista vazia.
 */

import { applyMove, START_FEN } from '@/lib/chess'
import {
  aberturaDaPosicao,
  fenJogavelDe,
  identidadeDePosicao,
  type IndiceEco,
} from '@/lib/openings'
import type { Abertura, SkillId, Side } from '@/domain/types'

/**
 * Números ajustáveis do repertório.
 *
 * `profundidadeMaxima` é HEURÍSTICA DE PRODUTO com intenção pedagógica: doze
 * meios-lances são seis lances de cada lado, que é onde a abertura acaba e o
 * meio-jogo começa para o público-alvo. Subir este número é decidir que o
 * produto passou a ensinar variantes — decisão de produto, não de código.
 */
export const REPERTORIO_CONFIG = {
  /** Maior linha aceita, em meios-lances. */
  profundidadeMaxima: 12,
} as const

/** Um lance dentro de uma linha declarada. */
export interface LanceDeRepertorio {
  /** Lance em SAN, como se escreve numa partida (`Nf3`, `O-O`, `exd5`). */
  san: string
  /**
   * Por que este lance, em uma ou duas frases. Obrigatória na PRIMEIRA vez que
   * o par (posição, lance) aparece; proibida nas repetições — ver DECISÃO 2.
   */
  ideia?: string
}

/** Uma linha declarada, do primeiro lance em diante, alternando os dois lados. */
export interface LinhaDeRepertorio {
  /** Único dentro do repertório. */
  id: string
  lances: readonly LanceDeRepertorio[]
}

/** Um repertório declarado, para um dos lados. */
export interface DefinicaoDeRepertorio {
  /** Único entre os repertórios. */
  id: string
  /** Título em PT-BR. */
  titulo: string
  /** Lado do usuário. Só os lances DELE viram nó de estudo. */
  lado: Side
  /** O princípio que rege o repertório inteiro, acima de qualquer sequência. */
  principio: string
  /** Habilidades do catálogo que este repertório treina. */
  habilidades: readonly SkillId[]
  linhas: readonly LinhaDeRepertorio[]
}

/** Um lance saindo de um nó. */
export interface RamoDeRepertorio {
  san: string
  uci: string
  /** Nunca vazia num repertório sem conflitos. */
  ideia: string
  /** Identidade da posição de onde o ramo sai. */
  origem: string
  /** Identidade da posição a que o ramo leva. */
  destino: string
  /** `true` quando é lance do usuário; `false` quando é resposta do adversário. */
  doUsuario: boolean
  /** Linhas declaradas que passam por este ramo. Mais de uma = transposição. */
  linhaIds: readonly string[]
}

/** Uma posição do repertório. */
export interface NoDeRepertorio {
  /** Chave estável sob transposição. */
  identidade: string
  /** FEN carregável no tabuleiro. Derivado da identidade, nunca guardado à parte. */
  fen: string
  /** De quem é a vez nesta posição. */
  vez: Side
  /** Menor número de meios-lances até aqui, entre todos os caminhos. */
  profundidade: number
  ramos: readonly RamoDeRepertorio[]
  /**
   * Sequências de SAN que chegam a esta posição. Mais de uma é TRANSPOSIÇÃO, e
   * é dado de produto: a tela pode dizer "você também chega aqui por…".
   */
  caminhos: readonly (readonly string[])[]
  /** Abertura reconhecida, quando um índice ECO foi fornecido. */
  abertura: Abertura | null
}

export type TipoDeConflito =
  | 'linha-vazia'
  | 'linha-repetida'
  | 'lance-ilegal'
  | 'ideia-ausente'
  | 'ideia-vazia'
  | 'ideia-repetida'
  | 'dois-lances-do-usuario'
  | 'linha-profunda-demais'

export interface ConflitoDeRepertorio {
  tipo: TipoDeConflito
  /** Linha declarada em que o problema apareceu. */
  linhaId: string
  /** Posição onde o problema aparece, ou `null` quando é da linha inteira. */
  identidade: string | null
  /** Frase em PT-BR para quem edita o conteúdo. */
  mensagem: string
}

export interface ArvoreDeRepertorio {
  id: string
  titulo: string
  lado: Side
  principio: string
  habilidades: readonly SkillId[]
  /** Identidade da posição inicial. */
  raiz: string
  nos: ReadonlyMap<string, NoDeRepertorio>
  /** Vazio significa repertório coerente. Ver DECISÃO 6. */
  conflitos: readonly ConflitoDeRepertorio[]
}

export interface OpcoesDeConstrucao {
  /** Índice ECO para nomear as posições. Sem ele, `abertura` fica `null`. */
  indiceEco?: IndiceEco
  /** Sobrescreve o teto de profundidade. Existe para o portão poder mordê-lo. */
  profundidadeMaxima?: number
}

/** Ramo ainda mutável: `linhaIds` cresce a cada linha que transpõe para cá. */
interface RamoEmConstrucao extends Omit<RamoDeRepertorio, 'linhaIds'> {
  linhaIds: string[]
}

interface NoEmConstrucao {
  identidade: string
  vez: Side
  profundidade: number
  ramos: RamoEmConstrucao[]
  caminhos: string[][]
  caminhosVistos: Set<string>
}

function vezDe(identidade: string): Side {
  return identidade.split(' ')[1] === 'b' ? 'b' : 'w'
}

function criarNo(identidade: string, profundidade: number): NoEmConstrucao {
  return {
    identidade,
    vez: vezDe(identidade),
    profundidade,
    ramos: [],
    caminhos: [],
    caminhosVistos: new Set<string>(),
  }
}

function registrarCaminho(no: NoEmConstrucao, caminho: readonly string[]): void {
  const chave = caminho.join(' ')
  if (no.caminhosVistos.has(chave)) {
    return
  }
  no.caminhosVistos.add(chave)
  no.caminhos.push([...caminho])
}

/**
 * Monta a árvore a partir da definição.
 *
 * Determinística: mesma definição, mesma árvore, na mesma ordem. A ordem dos
 * ramos é a de declaração, e é ela que decide quem vence num conflito de dois
 * lances do usuário — o primeiro declarado fica, o segundo é recusado e o resto
 * daquela linha não entra, porque seria uma subárvore que o repertório afirma
 * nunca alcançar.
 */
export function construirRepertorio(
  definicao: DefinicaoDeRepertorio,
  opcoes: OpcoesDeConstrucao = {},
): ArvoreDeRepertorio {
  const tetoDeProfundidade = opcoes.profundidadeMaxima ?? REPERTORIO_CONFIG.profundidadeMaxima
  const conflitos: ConflitoDeRepertorio[] = []
  const nos = new Map<string, NoEmConstrucao>()

  /** Devolve o nó, criando-o se ainda não existe. Nunca devolve `undefined`. */
  function noPara(identidade: string, profundidade: number): NoEmConstrucao {
    const existente = nos.get(identidade)
    if (existente) {
      existente.profundidade = Math.min(existente.profundidade, profundidade)
      return existente
    }
    const novo = criarNo(identidade, profundidade)
    nos.set(identidade, novo)
    return novo
  }

  const raiz = identidadeDePosicao(START_FEN)
  registrarCaminho(noPara(raiz, 0), [])

  const linhasVistas = new Set<string>()

  for (const linha of definicao.linhas) {
    if (linhasVistas.has(linha.id)) {
      conflitos.push({
        tipo: 'linha-repetida',
        linhaId: linha.id,
        identidade: null,
        mensagem: `A linha "${linha.id}" foi declarada mais de uma vez.`,
      })
      continue
    }
    linhasVistas.add(linha.id)

    if (linha.lances.length === 0) {
      conflitos.push({
        tipo: 'linha-vazia',
        linhaId: linha.id,
        identidade: null,
        mensagem: `A linha "${linha.id}" não tem lance nenhum.`,
      })
      continue
    }

    if (linha.lances.length > tetoDeProfundidade) {
      conflitos.push({
        tipo: 'linha-profunda-demais',
        linhaId: linha.id,
        identidade: null,
        mensagem:
          `A linha "${linha.id}" tem ${linha.lances.length} meios-lances e o teto é ` +
          `${tetoDeProfundidade}. Repertório para este público não vira livro de variantes.`,
      })
      continue
    }

    let fen = START_FEN
    const caminho: string[] = []

    for (const lance of linha.lances) {
      const origem = identidadeDePosicao(fen)
      const noOrigem = noPara(origem, caminho.length)

      const aplicado = applyMove(fen, lance.san)
      if (aplicado === null) {
        conflitos.push({
          tipo: 'lance-ilegal',
          linhaId: linha.id,
          identidade: origem,
          mensagem: `Lance ilegal "${lance.san}" na linha "${linha.id}", na posição ${origem}.`,
        })
        break
      }

      const doUsuario = aplicado.move.color === definicao.lado
      const destino = identidadeDePosicao(aplicado.fenAfter)
      const existente = noOrigem.ramos.find((ramo) => ramo.san === lance.san)

      if (existente) {
        if (lance.ideia !== undefined) {
          conflitos.push({
            tipo: 'ideia-repetida',
            linhaId: linha.id,
            identidade: origem,
            mensagem:
              `A ideia de "${lance.san}" já foi declarada em outra linha. ` +
              'Ela pertence ao par posição+lance e é escrita uma vez só.',
          })
        }
        if (!existente.linhaIds.includes(linha.id)) {
          existente.linhaIds.push(linha.id)
        }
      } else {
        const outroDoUsuario = noOrigem.ramos.find((ramo) => ramo.doUsuario)
        if (doUsuario && outroDoUsuario) {
          conflitos.push({
            tipo: 'dois-lances-do-usuario',
            linhaId: linha.id,
            identidade: origem,
            mensagem:
              `Nesta posição o repertório já joga "${outroDoUsuario.san}" e a linha ` +
              `"${linha.id}" pede "${lance.san}". Um repertório responde com um lance só.`,
          })
          break
        }

        if (lance.ideia === undefined) {
          conflitos.push({
            tipo: 'ideia-ausente',
            linhaId: linha.id,
            identidade: origem,
            mensagem: `O lance "${lance.san}" da linha "${linha.id}" não tem ideia escrita.`,
          })
        } else if (lance.ideia.trim().length === 0) {
          conflitos.push({
            tipo: 'ideia-vazia',
            linhaId: linha.id,
            identidade: origem,
            mensagem: `A ideia de "${lance.san}" na linha "${linha.id}" está em branco.`,
          })
        }

        noOrigem.ramos.push({
          san: lance.san,
          uci: aplicado.move.uci,
          ideia: lance.ideia ?? '',
          origem,
          destino,
          doUsuario,
          linhaIds: [linha.id],
        })
      }

      caminho.push(lance.san)
      registrarCaminho(noPara(destino, caminho.length), caminho)

      fen = aplicado.fenAfter
    }
  }

  const finais = new Map<string, NoDeRepertorio>()
  for (const [identidade, no] of nos) {
    const fen = fenJogavelDe(identidade)
    finais.set(identidade, {
      identidade,
      fen,
      vez: no.vez,
      profundidade: no.profundidade,
      ramos: no.ramos,
      caminhos: no.caminhos,
      abertura: opcoes.indiceEco ? aberturaDaPosicao(opcoes.indiceEco, fen) : null,
    })
  }

  return {
    id: definicao.id,
    titulo: definicao.titulo,
    lado: definicao.lado,
    principio: definicao.principio,
    habilidades: definicao.habilidades,
    raiz,
    nos: finais,
    conflitos,
  }
}

/** O nó desta posição, ou `null` quando o repertório não a cobre. */
export function noDaPosicao(arvore: ArvoreDeRepertorio, fen: string): NoDeRepertorio | null {
  return arvore.nos.get(identidadeDePosicao(fen)) ?? null
}

/**
 * O lance que o repertório prescreve nesta posição, ou `null`.
 *
 * Devolve `null` também quando a vez não é do usuário: perguntar "o que eu
 * jogo" numa posição em que quem joga é o adversário não tem resposta, e
 * devolver o lance dele seria mentir com forma de verdade.
 */
export function lanceDoRepertorio(
  arvore: ArvoreDeRepertorio,
  no: NoDeRepertorio,
): RamoDeRepertorio | null {
  if (no.vez !== arvore.lado) {
    return null
  }
  return no.ramos.find((ramo) => ramo.doUsuario) ?? null
}

/** Nós em que é a vez do usuário e há lance prescrito. São os nós de estudo. */
export function nosDeEstudo(arvore: ArvoreDeRepertorio): NoDeRepertorio[] {
  return [...arvore.nos.values()]
    .filter((no) => lanceDoRepertorio(arvore, no) !== null)
    .sort((a, b) => a.profundidade - b.profundidade || (a.identidade < b.identidade ? -1 : 1))
}

/** Nós alcançados por mais de um caminho. É a transposição, já detectada. */
export function nosTranspostos(arvore: ArvoreDeRepertorio): NoDeRepertorio[] {
  return [...arvore.nos.values()]
    .filter((no) => no.caminhos.length > 1)
    .sort((a, b) => a.profundidade - b.profundidade || (a.identidade < b.identidade ? -1 : 1))
}
