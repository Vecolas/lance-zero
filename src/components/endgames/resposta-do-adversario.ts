/**
 * Quem responde ao lance do aluno numa posição de final — e com que autoridade.
 *
 * DECISÃO CENTRAL: a resposta carrega a PROCEDÊNCIA junto do lance. Devolver só
 * o UCI seria o desenho em que a tela apresenta um lance de roteiro como se
 * fosse defesa perfeita: o aluno cumpre o objetivo, acredita que bateu a defesa
 * ótima, e nada em lugar nenhum contradiz isso. Mentira silenciosa é o defeito
 * caro deste projeto; por isso a fonte é campo obrigatório do retorno.
 *
 * ORDEM DE PREFERÊNCIA, e o porquê de cada degrau:
 *
 * 1. `tablebase` — defesa perfeita de verdade, quando o serviço cobre a posição
 *    e responde.
 * 2. `linha-modelo` — o roteiro que o autor do currículo escreveu. Só vale
 *    enquanto o aluno seguir a linha: fora dela o roteiro descreve OUTRA
 *    posição, e aplicar o lance seguinte seria ilegal ou sem sentido.
 * 3. `lance-legal` — o primeiro lance legal em ordem de UCI. Não é defesa: é o
 *    que impede a tela de travar quando a tablebase está fora do ar E o aluno
 *    já saiu do roteiro. É deliberadamente o degrau mais fraco, e a tela diz
 *    isso ao aluno.
 *
 * A degradação é o CONTRATO, não um extra: `docs` e o cabeçalho de
 * `@/lib/tablebase/provider` mandam a lição continuar utilizável com a
 * tablebase fora do ar.
 *
 * `probe` entra por parâmetro. Nada aqui conhece URL, `fetch` ou classe
 * concreta: o teste roda sem rede nenhuma e a tela decide o transporte.
 *
 * DETERMINISMO: com o mesmo `probe`, a mesma entrada dá sempre a mesma
 * resposta. O último degrau ordena por UCI em vez de sortear justamente para
 * não existir um teste que passa em quatro execuções de cinco.
 */

import { normalizeUci, parseUci } from '@/lib/chess'
import { legalMoves } from '@/lib/chess'
import type { TablebaseResult } from '@/domain/types'
import { melhorLanceDe } from '@/lib/tablebase'
import type { EndgameTrainingOpponent } from '@/domain/endgames/oponente'

/**
 * As procedências possíveis. É a FONTE que a tela e o portão varrem: fonte
 * nova aqui sem apresentação em `textos.ts` não compila.
 */
export const FONTES_DE_RESPOSTA = [
  'tablebase',
  'stockfish',
  'scripted',
  'linha-modelo',
  'lance-legal',
] as const

export type FonteDaResposta = (typeof FONTES_DE_RESPOSTA)[number]

export interface RespostaDoAdversario {
  /** UCI normalizado, já conferido contra os lances legais da posição. */
  uci: string
  fonte: FonteDaResposta
}

/** Consulta à tablebase, injetada. Devolve `null` quando não há resposta. */
export type Sonda = (fen: string) => Promise<TablebaseResult | null>

export interface EntradaDaResposta {
  /** Posição com a vez do ADVERSÁRIO. */
  fen: string
  /** Linha modelo da posição, em UCI, a partir do FEN inicial. */
  linhaModelo: readonly string[]
  /** UCIs já jogados desde o FEN inicial, dos dois lados, em ordem. */
  lancesJogados: readonly string[]
  probe: Sonda
  opponent?: EndgameTrainingOpponent
}

/**
 * O aluno (e o adversário) seguiram o roteiro até aqui?
 *
 * Comparação lance a lance, normalizada. Um único desvio invalida o resto: a
 * partir dele o roteiro fala de uma posição que não é mais esta.
 */
function seguiuORoteiro(lancesJogados: readonly string[], linhaModelo: readonly string[]): boolean {
  if (lancesJogados.length >= linhaModelo.length) {
    return false
  }
  return lancesJogados.every(
    (uci, indice) => normalizeUci(uci) === normalizeUci(linhaModelo[indice]),
  )
}

/**
 * Escolhe a resposta do adversário.
 *
 * Devolve `null` quando não há lance legal — posição terminada. Quem chama
 * trata isso como fim de partida, e não como falha do adversário.
 *
 * Todo candidato passa pelo mesmo filtro de legalidade, inclusive o da
 * tablebase: resposta externa com forma inesperada não vira lance aplicado às
 * cegas. A alternativa seria a exceção estourar três camadas abaixo, dentro do
 * adapter de xadrez.
 */
export async function escolherRespostaDoAdversario(
  entrada: EntradaDaResposta,
): Promise<RespostaDoAdversario | null> {
  const legais = legalMoves(entrada.fen)
  if (legais.length === 0) {
    return null
  }
  const permitidos = new Set(legais.map((lance) => normalizeUci(lance.uci)))

  if (entrada.opponent) {
    try {
      const resposta = await entrada.opponent.getMove(entrada.fen, { moves: entrada.lancesJogados })
      if (resposta && permitidos.has(normalizeUci(resposta.uci))) {
        const fonte: FonteDaResposta =
          resposta.source === 'stockfish'
            ? 'stockfish'
            : resposta.source === 'scripted'
              ? 'scripted'
              : 'lance-legal'
        return { uci: normalizeUci(resposta.uci), fonte }
      }
    } catch {
      /* degrada para tablebase/roteiro */
    }
  }

  const daTablebase = await consultarTablebase(entrada)
  if (daTablebase !== null && permitidos.has(daTablebase)) {
    return { uci: daTablebase, fonte: 'tablebase' }
  }

  if (seguiuORoteiro(entrada.lancesJogados, entrada.linhaModelo)) {
    const doRoteiro = normalizeUci(entrada.linhaModelo[entrada.lancesJogados.length])
    if (permitidos.has(doRoteiro)) {
      return { uci: doRoteiro, fonte: 'linha-modelo' }
    }
  }

  return { uci: [...permitidos].sort()[0], fonte: 'lance-legal' }
}

/**
 * Melhor lance da tablebase, ou `null`.
 *
 * O `catch` existe porque a tela não pode quebrar: o provider promete devolver
 * `null` para toda falha do mundo externo, mas ele também LANÇA de propósito
 * para FEN inválido, e um bug nosso ali não pode virar tela branca no meio de
 * um treino. Quem chama continua nos degraus seguintes, e o aluno é avisado de
 * que não está enfrentando defesa perfeita.
 */
async function consultarTablebase(entrada: EntradaDaResposta): Promise<string | null> {
  let resultado: TablebaseResult | null
  try {
    resultado = await entrada.probe(entrada.fen)
  } catch {
    return null
  }
  const melhor = melhorLanceDe(resultado)
  if (melhor === null) {
    return null
  }
  const normalizado = normalizeUci(melhor.uci)
  // Forma de UCI conferida antes de virar lance: string vinda de serviço
  // externo não entra no adapter sem passar pelo parser explícito.
  return parseUci(normalizado) === null ? null : normalizado
}
