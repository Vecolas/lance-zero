/**
 * Máquina de estado de uma tentativa de puzzle. Pura: sem relógio, sem
 * aleatoriedade, sem React. Quem chama injeta `agora` e `thinkTimeMs`.
 *
 * A alternância vem do dataset: em `solutionUci`, os índices PARES são lances
 * do jogador e os ÍMPARES são a resposta do adversário. A resposta do
 * adversário é aplicada automaticamente logo depois do acerto do jogador.
 *
 * ---------------------------------------------------------------------------
 * DECISÃO QUE ESTE ARQUIVO PASSOU A CARREGAR (issue #17): o lance que NÃO está
 * na linha do dataset deixa de ser erro por decreto.
 *
 * `submitMove` continua SÍNCRONA E PURA — é ela que o teste de máquina de
 * estado exercita, e ela não pode passar a depender de engine. O julgamento
 * mora em `submitMoveComJuiz`, que é assíncrona, recebe a avaliação INJETADA e
 * envolve `submitMove` em vez de duplicá-la.
 *
 * A POLÍTICA VEM DA ISSUE E NÃO SE REABRE AQUI (tabela em `EFEITO_DA_ALTERNATIVA`):
 * - `equivalente` → acerto limpo;
 * - `pior` → ACERTO COM DESCONTO, e a tela diz o que foi pior, com número;
 * - `indeterminado` → NÃO é erro, não é acerto, e a tela diz que não deu para
 *   confirmar.
 *
 * `indeterminado` É CAMINHO NORMAL, não exceção. Nos finais existe juiz
 * perfeito (a tablebase) e o indeterminado só aparece se o serviço cair; aqui
 * existe só a engine, que dá ORDENAÇÃO e não verdade — avaliação rasa, sem
 * conteúdo ou não confiável vai ser comum. Por isso o indeterminado não
 * encerra a tentativa nem gasta uma das vidas: o jogador continua de onde
 * estava, sem penalidade nenhuma.
 *
 * POR QUE UM LANCE ACEITO ENCERRA A TENTATIVA COMO RESOLVIDA. O dataset guarda
 * UMA linha; a partir de uma alternativa não há continuação para o adversário
 * responder. É o mesmo caminho que `aceitarMateAlternativo` já usava. LIMITE
 * DECLARADO: o jogador que dá uma alternativa equivalente no primeiro de
 * quatro meios-lances não demonstrou o resto da linha, e ainda assim a
 * tentativa conta como resolvida. Fazer diferente exigiria a engine jogando o
 * lado do adversário, que é outro produto.
 *
 * O DESCONTO NÃO NASCE AQUI. `MasteryEvent.porCaminhoMaisLongo` e
 * `MASTERY_CONFIG.penalidadeLanceVencedorPior` já existem, já são a família
 * multiplicativa dos outros descontos e já são usados pelos finais. Este
 * arquivo só diz QUE aconteceu; o quanto vale continua sendo decisão de
 * `MASTERY_CONFIG`.
 */

import { applyMove, normalizeUci, parseUci, positionStatus } from '@/lib/chess'
import type {
  PuzzleAlternativaRegistro,
  PuzzleAttempt,
  SolvablePuzzle,
  VereditoAlternativa,
} from '@/domain/types'
import {
  julgarAlternativa,
  valeConsultarEngine,
  type AlternativaConfig,
  type AvaliarPosicao,
  type JulgamentoAlternativa,
} from './alternativa'
import { MAX_HINT_LEVEL, type HintLevel } from './hints'

/**
 * Pesos e limiares da tentativa.
 *
 * São heurísticas de produto, a calibrar com dados reais de uso. Nenhum destes
 * números tem base empírica ainda.
 */
export const ATTEMPT_CONFIG = {
  /** Quantos lances errados o jogador pode dar antes da tentativa falhar. */
  maxErrosAntesDeFalhar: 2,
  /**
   * Aceita qualquer lance legal que dê mate, mesmo fora da linha do dataset.
   * O dump guarda uma linha só; recusar um mate correto seria mentir para o
   * jogador.
   */
  aceitarMateAlternativo: true,
} as const

/**
 * O que cada veredito faz com o resto do sistema.
 *
 * É a FONTE que a máquina de estado e a tela varrem, em vez de cada uma
 * escrever o seu próprio `if`. `Record` sobre `VereditoAlternativa`: veredito
 * novo sem efeito declarado NÃO COMPILA, e um `if` espalhado por tela seria a
 * segunda cópia da política, livre para divergir da primeira.
 */
export interface EfeitoDaAlternativa {
  /** Conta como erro: entra em `wrongMoves` e pode reprovar a tentativa. */
  ehErro: boolean
  /** O lance é aceito no tabuleiro e encerra a tentativa como resolvida. */
  aceitaOLance: boolean
  /** Entra no evento de maestria como acerto COM DESCONTO. */
  comDesconto: boolean
  /**
   * Houve juiz para este lance. `false` OBRIGA a tela a dizer que não deu para
   * confirmar: silêncio aqui lê como aprovação, e o jogador concluiria que o
   * lance estava certo.
   */
  temJuiz: boolean
}

export const EFEITO_DA_ALTERNATIVA: Record<VereditoAlternativa, EfeitoDaAlternativa> = {
  equivalente: { ehErro: false, aceitaOLance: true, comDesconto: false, temJuiz: true },
  pior: { ehErro: false, aceitaOLance: true, comDesconto: true, temJuiz: true },
  // Sem juiz não se reprova E não se aprova. Ver o cabeçalho do arquivo.
  indeterminado: { ehErro: false, aceitaOLance: false, comDesconto: false, temJuiz: false },
}

export type AttemptStatus = 'em-andamento' | 'resolvido' | 'falhou'

export interface AttemptState {
  readonly solvable: SolvablePuzzle
  readonly status: AttemptStatus
  /** Posição atual no tabuleiro. */
  readonly currentFen: string
  /** Índice do próximo lance esperado do jogador em `solutionUci`. Sempre par. */
  readonly solutionIndex: number
  /** Lances aplicados desde `startFen`, incluindo as respostas automáticas. */
  readonly playedUci: readonly string[]
  /** Lances errados do jogador, em ordem. */
  readonly wrongMoves: readonly string[]
  /** Maior nível de dica já pedido: 0 a 3. */
  readonly hintsUsed: number
  /** Ainda sem dica e sem lance errado. */
  readonly firstTry: boolean
  readonly gaveUp: boolean
  /**
   * Lances alternativos julgados nesta tentativa, em ordem (issue #17).
   *
   * É a ÚNICA fonte do que aconteceu com alternativa: o desconto da maestria,
   * o texto da tela e o que vai para o armazenamento saem todos daqui. Nenhum
   * contador paralelo de "houve desconto" ou "quantos indeterminados" é
   * mantido em lugar nenhum — eles são derivados na hora.
   */
  readonly alternativas: readonly PuzzleAlternativaRegistro[]
}

export function createAttemptState(solvable: SolvablePuzzle): AttemptState {
  return {
    solvable,
    status: 'em-andamento',
    currentFen: solvable.startFen,
    solutionIndex: 0,
    playedUci: [],
    wrongMoves: [],
    hintsUsed: 0,
    firstTry: true,
    gaveUp: false,
    alternativas: [],
  }
}

export interface SubmitMoveResult {
  state: AttemptState
  /** `true` quando o lance do jogador foi aceito. */
  correto: boolean
  /** Resposta do adversário aplicada automaticamente, quando houve. */
  respostaDoAdversarioUci: string | null
  /** Preenchido quando o lance foi recusado, para a UI explicar. */
  motivo?:
    | 'tentativa-encerrada'
    | 'formato-invalido'
    | 'lance-ilegal'
    | 'lance-errado'
    /**
     * O lance saiu da linha, foi julgado e o juiz não soube dizer. NÃO é erro:
     * a tentativa continua exatamente de onde estava. Só `submitMoveComJuiz`
     * produz este motivo.
     */
    | 'alternativa-nao-confirmada'
  /**
   * O julgamento do lance alternativo, quando houve um. `undefined` no caminho
   * síncrono e no lance que nem chegou a ser julgado.
   */
  alternativa?: PuzzleAlternativaRegistro
}

function daMate(fen: string, uci: string): boolean {
  const entrada = parseUci(uci)
  if (entrada === null) return false
  const aplicado = applyMove(fen, entrada)
  return aplicado !== null && positionStatus(aplicado.fenAfter).isCheckmate
}

/**
 * Submete um lance do jogador.
 *
 * Acerto: aplica o lance e, se a linha continuar, aplica também a resposta do
 * adversário. Erro: registra e, passado o limite de erros, a tentativa falha.
 * Nunca lança — lance ilegal é entrada de usuário, não bug.
 *
 * POR QUE ISTO NÃO DELEGA A `@/domain/exercicios/sequencia`, apesar de o
 * esqueleto ser o mesmo — e a decisão foi tomada lendo os dois, não de longe.
 *
 * O núcleo compartilhado é pequeno: aplicar o lance e aplicar a resposta. Tudo
 * o que sobra aqui é POLÍTICA DE PUZZLE, e nenhuma delas vale para uma linha
 * autorada de lição:
 *
 *   - `aceitarMateAlternativo` — um mate fora da linha é aceito, porque o dump
 *     guarda UMA linha e recusar um mate correto seria mentir para o jogador.
 *     Numa lição, o lance fora da linha é justamente o que se quer corrigir;
 *   - `maxErrosAntesDeFalhar` — a tentativa REPROVA depois de dois erros,
 *     porque puzzle mede. A lição ensina: lá o erro devolve a peça e o aluno
 *     tenta de novo, sem limite;
 *   - mate encerra a tentativa antes do fim da linha;
 *   - linha do dataset quebrada no meio encerra como resolvida, porque o dado
 *     é de terceiro. Linha de lição quebrada é defeito nosso, e quem reprova é
 *     o portão de conteúdo.
 *
 * Empurrar esses quatro comportamentos para o motor compartilhado, atrás de
 * bandeiras, produziria exatamente o desenho que `@/domain/openings/jornada`
 * recusa por escrito: "um trainer genérico com condicionais para os dois
 * domínios". O que de fato era duplicado — a regra de promoção — mudou-se para
 * `@/domain/exercicios/lances` e hoje tem um dono só.
 */
export function submitMove(state: AttemptState, uci: string): SubmitMoveResult {
  if (state.status !== 'em-andamento') {
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'tentativa-encerrada' }
  }

  const lance = normalizeUci(uci)
  const entrada = parseUci(lance)
  if (entrada === null) {
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'formato-invalido' }
  }

  const esperado = state.solvable.solutionUci[state.solutionIndex]
  if (esperado === undefined) {
    // Não deveria acontecer: o estado vira 'resolvido' antes de acabar a linha.
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'tentativa-encerrada' }
  }

  const mateAlternativo =
    ATTEMPT_CONFIG.aceitarMateAlternativo && lance !== esperado && daMate(state.currentFen, lance)

  if (lance !== esperado && !mateAlternativo) {
    const aplicavel = applyMove(state.currentFen, entrada) !== null
    const wrongMoves = [...state.wrongMoves, lance]
    const excedeu = wrongMoves.length >= ATTEMPT_CONFIG.maxErrosAntesDeFalhar
    return {
      state: {
        ...state,
        wrongMoves,
        firstTry: false,
        status: excedeu ? 'falhou' : 'em-andamento',
      },
      correto: false,
      respostaDoAdversarioUci: null,
      motivo: aplicavel ? 'lance-errado' : 'lance-ilegal',
    }
  }

  const aplicado = applyMove(state.currentFen, entrada)
  if (aplicado === null) {
    // Solução do dataset ilegal na posição atual: dado podre, não erro do jogador.
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'lance-ilegal' }
  }

  const playedUci = [...state.playedUci, lance]
  let fen = aplicado.fenAfter

  if (mateAlternativo || positionStatus(fen).isCheckmate) {
    return {
      state: {
        ...state,
        status: 'resolvido',
        currentFen: fen,
        playedUci,
        solutionIndex: state.solvable.solutionUci.length,
      },
      correto: true,
      respostaDoAdversarioUci: null,
    }
  }

  const indiceDaResposta = state.solutionIndex + 1
  const resposta = state.solvable.solutionUci[indiceDaResposta]

  if (resposta === undefined) {
    return {
      state: {
        ...state,
        status: 'resolvido',
        currentFen: fen,
        playedUci,
        solutionIndex: indiceDaResposta,
      },
      correto: true,
      respostaDoAdversarioUci: null,
    }
  }

  const entradaResposta = parseUci(resposta)
  const respostaAplicada = entradaResposta === null ? null : applyMove(fen, entradaResposta)
  if (respostaAplicada === null) {
    // Linha do dataset quebrada no meio: encerra como resolvido em vez de
    // travar o jogador numa posição sem continuação.
    return {
      state: {
        ...state,
        status: 'resolvido',
        currentFen: fen,
        playedUci,
        solutionIndex: state.solvable.solutionUci.length,
      },
      correto: true,
      respostaDoAdversarioUci: null,
    }
  }

  fen = respostaAplicada.fenAfter

  return {
    state: {
      ...state,
      currentFen: fen,
      playedUci: [...playedUci, resposta],
      solutionIndex: indiceDaResposta + 1,
    },
    correto: true,
    respostaDoAdversarioUci: resposta,
  }
}

// ------------------------------------------------- julgamento de alternativa

/**
 * Converte o julgamento no registro que a tentativa guarda — e que vai para o
 * armazenamento.
 *
 * `margemPp` só entra quando é NÚMERO. O domínio usa `NaN` em memória para
 * ninguém ler "sem perda" por acidente, e `NaN` viraria `null` em
 * `JSON.stringify`: campo ausente é o jeito honesto de dizer que não há número.
 */
function registroDoJulgamento(
  uci: string,
  julgamento: JulgamentoAlternativa,
): PuzzleAlternativaRegistro {
  const registro: PuzzleAlternativaRegistro = { uci, veredito: julgamento.veredito }
  if (Number.isFinite(julgamento.margemPp)) registro.margemPp = julgamento.margemPp
  if (julgamento.motivo !== undefined) registro.motivo = julgamento.motivo
  return registro
}

/**
 * Houve lance aceito porém PIOR nesta tentativa? É o que vira
 * `MasteryEvent.porCaminhoMaisLongo`.
 *
 * Derivado do registro, lido na hora. Um sinalizador guardado à parte seria a
 * segunda verdade sobre o mesmo fato — e a que fica para trás não dá erro, só
 * desconta (ou deixa de descontar) em silêncio.
 */
export function houveDesconto(state: AttemptState): boolean {
  return state.alternativas.some((item) => EFEITO_DA_ALTERNATIVA[item.veredito].comDesconto)
}

/** O último lance julgado nesta tentativa, ou `null`. É dele que a tela fala. */
export function ultimaAlternativa(state: AttemptState): PuzzleAlternativaRegistro | null {
  return state.alternativas[state.alternativas.length - 1] ?? null
}

export interface SubmitMoveComJuizOptions {
  /**
   * Avaliação INJETADA. O domínio não instancia engine e não conhece worker.
   *
   * Sem engine disponível, quem chama passa uma função que devolve avaliação
   * vazia: o julgamento então cai em `indeterminado`, que é o caminho honesto.
   * Não existe aqui um terceiro desenho para "não tem engine".
   */
  avaliar: AvaliarPosicao
  config?: AlternativaConfig
}

/**
 * Submete um lance PASSANDO PELO JUIZ quando ele sai da linha do dataset.
 *
 * Envolve `submitMove`, não a substitui: acerto, lance ilegal, formato inválido
 * e tentativa encerrada continuam decididos lá, de graça e sem engine. Só o
 * lance LEGAL e diferente do esperado — o único que a issue #17 acusa de ser
 * carimbado como erro — chega ao julgamento, e mesmo assim depois do filtro
 * barato de `valeConsultarEngine`: lance quieto e sem indício de ganho continua
 * sendo erro, sem pagar análise.
 *
 * Nunca lança: `julgarAlternativa` já engole a falha da avaliação e devolve
 * `indeterminado`.
 */
export async function submitMoveComJuiz(
  state: AttemptState,
  uci: string,
  { avaliar, config }: SubmitMoveComJuizOptions,
): Promise<SubmitMoveResult> {
  const direto = submitMove(state, uci)
  // Acerto, lance ilegal, formato podre e tentativa encerrada: nada a julgar.
  if (direto.correto || direto.motivo !== 'lance-errado') return direto

  const lance = normalizeUci(uci)
  if (!valeConsultarEngine(state, lance, config).vale) return direto

  const esperado = state.solvable.solutionUci[state.solutionIndex]
  // Inalcançável por construção: sem lance esperado `submitMove` teria devolvido
  // 'tentativa-encerrada'. O ramo existe para a mudança futura não cair na
  // análise de uma comparação contra `undefined`.
  if (esperado === undefined) return direto

  const julgamento = await julgarAlternativa({
    fenAntes: state.currentFen,
    uciDoJogador: lance,
    uciEsperado: esperado,
    avaliar,
    config,
  })

  const registro = registroDoJulgamento(lance, julgamento)
  const efeito = EFEITO_DA_ALTERNATIVA[registro.veredito]
  const alternativas = [...state.alternativas, registro]

  if (efeito.ehErro) return { ...direto, alternativa: registro }

  if (!efeito.aceitaOLance) {
    // NÃO É ERRO: o estado volta a ser o de ANTES de `submitMove` — sem lance
    // errado somado, sem `firstTry` derrubado, sem vida gasta. O único traço é
    // o registro, que existe para a taxa de "não deu para confirmar" poder ser
    // medida depois. Sem ela a política vira folclore.
    return {
      state: { ...state, alternativas },
      correto: false,
      respostaDoAdversarioUci: null,
      motivo: 'alternativa-nao-confirmada',
      alternativa: registro,
    }
  }

  const entrada = parseUci(lance)
  const aplicado = entrada === null ? null : applyMove(state.currentFen, entrada)
  if (aplicado === null) {
    // Inalcançável: 'lance-errado' já provou que o lance é legal nesta posição.
    return { ...direto, alternativa: registro }
  }

  // `firstTry` continua verdadeiro DE PROPÓSITO, inclusive no veredito `pior`.
  // O desconto do lance pior é `porCaminhoMaisLongo`, uma vez só; derrubar
  // `firstTry` somaria `penalidadeSegundaTentativa` por cima e puniria duas
  // vezes o mesmo fato — e a segunda punição não apareceria em tela nenhuma.
  return {
    state: {
      ...state,
      status: 'resolvido',
      currentFen: aplicado.fenAfter,
      playedUci: [...state.playedUci, lance],
      solutionIndex: state.solvable.solutionUci.length,
      alternativas,
    },
    correto: true,
    respostaDoAdversarioUci: null,
    alternativa: registro,
  }
}

/**
 * Sobe um nível de dica. `hintsUsed` guarda o maior nível pedido, então pedir
 * a mesma dica de novo não conta duas vezes.
 */
export function useHint(state: AttemptState): AttemptState {
  if (state.status !== 'em-andamento') return state
  if (state.hintsUsed >= MAX_HINT_LEVEL) return state
  return { ...state, hintsUsed: state.hintsUsed + 1, firstTry: false }
}

/** O nível da próxima dica, ou `null` quando as três já foram usadas. */
export function nextHintLevel(state: AttemptState): HintLevel | null {
  if (state.hintsUsed >= MAX_HINT_LEVEL) return null
  return (state.hintsUsed + 1) as HintLevel
}

export function giveUp(state: AttemptState): AttemptState {
  if (state.status !== 'em-andamento') return state
  return { ...state, status: 'falhou', firstTry: false, gaveUp: true }
}

export interface ToPuzzleAttemptOptions {
  /** Relógio injetado. Nada de `new Date()` aqui dentro. */
  agora: Date
  thinkTimeMs: number
  /** Id do registro. Quando omitido, é derivado do puzzle e do relógio. */
  id?: string
}

/** Converte o estado no registro que a persistência e o modelo de skill leem. */
export function toPuzzleAttempt(
  state: AttemptState,
  { agora, thinkTimeMs, id }: ToPuzzleAttemptOptions,
): PuzzleAttempt {
  const { puzzle } = state.solvable
  const solved = state.status === 'resolvido'
  const registro: PuzzleAttempt = {
    id: id ?? `${puzzle.id}:${agora.getTime()}`,
    puzzleId: puzzle.id,
    skillIds: puzzle.skillIds,
    attemptedAt: agora.toISOString(),
    solved,
    firstTry: solved && state.hintsUsed === 0 && state.wrongMoves.length === 0,
    hintsUsed: state.hintsUsed,
    thinkTimeMs: Math.max(0, Math.round(thinkTimeMs)),
    puzzleRating: puzzle.rating,
  }
  // O campo só existe quando houve julgamento: tentativa sem alternativa grava
  // exatamente o mesmo registro de antes da issue #17, sem chave a mais.
  //
  // É AQUI que `equivalente` e `indeterminado` deixam de ser indistinguíveis no
  // armazenamento. Os dois podem terminar em `solved: true` (o segundo quando o
  // jogador acha a linha depois), e sem esta lista ninguém conseguiria medir com
  // que frequência a engine deixou de responder — que é o sinal que diz se a
  // tolerância está calibrada.
  if (state.alternativas.length > 0) registro.alternativas = [...state.alternativas]
  return registro
}
