/**
 * A ponte entre a TELA de finais e o repositório.
 *
 * Até aqui a tentativa de final morria na tela: não virava registro, não movia
 * o modelo de maestria e sumia ao recarregar. Este arquivo é o caminho de volta,
 * e ele é puro — não conhece IndexedDB, React nem relógio implícito.
 *
 * DECISÕES QUE ESTE ARQUIVO CARREGA
 *
 * 1. UMA CHAVE SÓ, DERIVADA DO ID DA POSIÇÃO. O registro da tentativa e o card
 *    de revisão daquela posição usam a MESMA chave (`chaveDaPosicao`), e o
 *    caminho de volta (`posicaoIdDaChave`) existe para a tela reconstruir o
 *    histórico a partir do que está gravado, em vez de guardar uma segunda
 *    cópia do id em algum lugar. `encodeURIComponent` mantém a ida e volta
 *    injetiva mesmo se um id de posição ganhar `:` amanhã.
 *
 * 2. LER ANTES DE GRAVAR. `saveReviewCard` é um upsert cego. Salvar o card
 *    recém-criado por cima do que já existe zeraria o agendamento do FSRS em
 *    SILÊNCIO: quem já revisou aquela posição por semanas voltaria à estaca
 *    zero e nenhuma tela, log ou teste acusaria. Por isso a gravação passa por
 *    `preservarProgresso`, a mesma função que a revisão de partidas usa — é uma
 *    regra só, num lugar só. (Ela mora em `@/domain/games/para-treino` por
 *    acidente de ordem de implementação; a casa dela é `@/lib/fsrs/cards`.
 *    Mover exige mexer no arquivo de outra frente, então fica como dívida
 *    declarada — copiar aqui seria criar a segunda fonte da mesma verdade.)
 *
 * 3. CARD SÓ QUANDO A TENTATIVA NÃO FOI LIMPA. Cumprir o objetivo sem pedir
 *    dica não vira dever de casa: um card nasce vencido (ver `createReviewCard`)
 *    e mandaria o aluno refazer HOJE a técnica que ele acabou de executar, que é
 *    repetição massada — o oposto do que a revisão espaçada existe para fazer.
 *    É a mesma regra que já governa os puzzles.
 *
 * 4. A SOLUÇÃO DO CARD É O PRIMEIRO LANCE DA LINHA MODELO, e isso não é botão
 *    de ajuste. A sessão de revisão compara UCI exato; quanto mais fundo na
 *    linha, mais lances igualmente vencedores existem, e reprovar um lance
 *    correto do aluno seria mentir para ele. O primeiro lance de uma posição
 *    didática é o lance sobre o qual a lição é.
 *
 * 5. RELÓGIO POR PARÂMETRO. Nada aqui chama `Date.now`. Mesma entrada e mesmo
 *    relógio produzem exatamente o mesmo registro.
 *
 * LIMITE DECLARADO: `MasteryEventKind` não tem `'final'`. Uma tentativa de
 * final entra no modelo de maestria como `'puzzle'`, que é o vizinho honesto —
 * treino que não é revisão espaçada nem partida real. `'partida'` inflaria
 * `realGameOccurrences` e `'revisao'` inflaria `retentionAccuracy`, os dois
 * mentindo para o planner. Abrir o tipo é trabalho do dono de
 * `src/domain/skills/`.
 */

import { preservarProgresso } from '@/domain/games/para-treino'
import { createMastery, updateMastery, type MasteryEvent } from '@/domain/skills/mastery'
import type { PuzzleAttempt, ReviewCard, SkillId, SkillMastery } from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import type { LicaoDeFinal, PosicaoDeFinal } from './licao'

// -------------------------------------------------------------------- config

/**
 * Números ajustáveis desta ponte.
 *
 * `historicoLido` é LIMITE DE DESIGN, não heurística de produto: é quantas
 * tentativas recentes a tela varre para montar o histórico das posições. Subir
 * o número não melhora o ensino, só custa leitura — e descer demais faria uma
 * posição resolvida há muito tempo voltar a parecer nunca tentada.
 */
export const PERSISTENCIA_DE_FINAIS_CONFIG = {
  historicoLido: 400,
} as const

// ----------------------------------------------------------------- identidade

/**
 * Prefixo das chaves de final.
 *
 * O registro da tentativa divide o armazém com os puzzles (o contrato do
 * repositório tem um caminho só para tentativa). O prefixo é o que mantém os
 * dois universos separados sem inventar um armazém novo.
 */
export const PREFIXO_CHAVE_FINAL = 'final'

/** Chave estável de uma posição de final. Serve ao registro e ao card. */
export function chaveDaPosicao(posicaoId: string): string {
  return `${PREFIXO_CHAVE_FINAL}:${encodeURIComponent(posicaoId)}`
}

/**
 * Caminho de volta: dado o que está gravado, qual posição é.
 *
 * Devolve `null` para qualquer chave que não seja de final — é assim que a tela
 * separa tentativa de final de tentativa de puzzle sem manter uma lista à parte.
 */
export function posicaoIdDaChave(chave: string): string | null {
  const separador = chave.indexOf(':')
  if (separador === -1 || chave.slice(0, separador) !== PREFIXO_CHAVE_FINAL) {
    return null
  }
  try {
    return decodeURIComponent(chave.slice(separador + 1))
  } catch {
    // Chave corrompida no armazenamento não pode derrubar a lista de lições.
    return null
  }
}

// ------------------------------------------------------------------ tentativa

/**
 * O que a tela sabe quando uma tentativa de final termina.
 *
 * Todos os campos são obrigatórios de propósito. Campo opcional aqui seria o
 * desenho em que alguém esquece de passar `dicasUsadas` e toda tentativa vira
 * "resolveu sozinho" — inflando a maestria sem uma linha no console.
 */
export interface TentativaDeFinal {
  /** Cumpriu o objetivo, no julgamento do domínio. Desistir nunca cumpre. */
  cumpriu: boolean
  /** Quantas dicas o aluno revelou nesta tentativa. */
  dicasUsadas: number
  /** Quantas vezes o aluno recomeçou a posição antes desta tentativa. */
  recomecos: number
  /** Meios-lances do aluno até o fim da tentativa. */
  lancesDoAluno: number
  /**
   * Quantos lances do aluno mantiveram o resultado mas NÃO foram o melhor
   * (issue #62). Ausente vale zero: campo novo nasce neutro, senão toda
   * tentativa antiga passaria a ser lida como caminho torto.
   */
  lancesPorCaminhoMaisLongo?: number
  thinkTimeMs: number
}

/**
 * Tentativa limpa: cumpriu o objetivo sem pedir dica.
 *
 * É o predicado ÚNICO de "não precisa virar dever de casa". O conversor e o
 * decisor do card leem o mesmo lugar, para as duas metades nunca divergirem.
 */
export function tentativaFoiLimpa(tentativa: TentativaDeFinal): boolean {
  return tentativa.cumpriu && tentativa.dicasUsadas === 0
}

/** Card só nasce quando a tentativa NÃO foi limpa. Ver decisão 3 do cabeçalho. */
export function mereceCard(tentativa: TentativaDeFinal): boolean {
  return !tentativaFoiLimpa(tentativa)
}

export interface RegistroOptions {
  /** Relógio injetado. */
  agora: Date
}

/**
 * Converte a tentativa no registro que o repositório guarda.
 *
 * O `id` carrega o instante porque tentativa é HISTÓRICO: a segunda tentativa
 * da mesma posição é um fato novo e não pode sobrescrever a primeira. Já o
 * `puzzleId` é a chave estável da posição, que é o que permite reconstruir o
 * histórico dela.
 */
export function tentativaParaRegistro(
  licao: LicaoDeFinal,
  posicao: PosicaoDeFinal,
  tentativa: TentativaDeFinal,
  { agora }: RegistroOptions,
): PuzzleAttempt {
  const chave = chaveDaPosicao(posicao.id)
  return {
    id: `${chave}:${agora.getTime()}`,
    puzzleId: chave,
    skillIds: [licao.habilidade],
    attemptedAt: agora.toISOString(),
    solved: tentativa.cumpriu,
    // Recomeçar conta: quem falhou e refez a posição não acertou "de primeira".
    firstTry: tentativaFoiLimpa(tentativa) && tentativa.recomecos === 0,
    hintsUsed: tentativa.dicasUsadas,
    thinkTimeMs: Math.max(0, Math.round(tentativa.thinkTimeMs)),
  }
}

/** O evento que move o modelo de maestria. Ver o limite declarado no cabeçalho. */
export function tentativaParaEvento(
  tentativa: TentativaDeFinal,
  { agora }: RegistroOptions,
): MasteryEvent {
  return {
    tipo: 'puzzle',
    acertou: tentativa.cumpriu,
    usouDica: tentativa.dicasUsadas > 0,
    primeiraTentativa: tentativa.recomecos === 0,
    // Acerto COM DESCONTO, não erro: o objetivo foi cumprido, e o caminho mais
    // longo desconta em vez de zerar. Quem decide o quanto é `MASTERY_CONFIG`;
    // aqui só se diz que aconteceu.
    porCaminhoMaisLongo: (tentativa.lancesPorCaminhoMaisLongo ?? 0) > 0,
    thinkTimeMs: Math.max(0, Math.round(tentativa.thinkTimeMs)),
    ocorridoEm: agora.toISOString(),
  }
}

// ----------------------------------------------------------------------- card

/**
 * Pergunta do card.
 *
 * Sai do enunciado da posição e do título da lição, que já estão escritos no
 * currículo: um texto próprio aqui seria uma segunda descrição da mesma posição,
 * livre para divergir da primeira no dia em que alguém editar só uma.
 */
export function promptDaPosicao(licao: LicaoDeFinal, posicao: PosicaoDeFinal): string {
  return `Final — ${licao.titulo}. ${posicao.enunciado} Jogue o primeiro lance da técnica.`
}

/**
 * Converte a posição no card de revisão dela.
 *
 * Recusa em voz alta a posição sem linha modelo. Card com solução vazia seria
 * aprovado sem o aluno jogar nada (`createReviewSession` já nasce em 'acertou'),
 * e o defeito só apareceria semanas depois, dentro da fila de revisão.
 */
export function posicaoParaReviewCard(
  licao: LicaoDeFinal,
  posicao: PosicaoDeFinal,
  { agora }: RegistroOptions,
): ReviewCard {
  const primeiroLance = posicao.linhaModelo[0]
  if (primeiroLance === undefined || primeiroLance.trim() === '') {
    throw new Error(
      `Posição de final ${posicao.id} não tem linha modelo: sem primeiro lance não há card.`,
    )
  }
  return createReviewCard(
    {
      id: chaveDaPosicao(posicao.id),
      kind: 'final',
      skillIds: [licao.habilidade],
      fen: posicao.fen,
      // Ver decisão 4: só o primeiro lance, e por um motivo, não por preguiça.
      solutionUci: [primeiroLance],
      prompt: promptDaPosicao(licao, posicao),
    },
    agora,
  )
}

// ------------------------------------------------------------------- histórico

/** O que a lista de lições mostra sobre uma posição já treinada. */
export interface HistoricoDaPosicao {
  posicaoId: string
  tentativas: number
  /** Cumpriu o objetivo pelo menos uma vez. */
  cumpriu: boolean
  /** ISO 8601 da tentativa mais recente. */
  ultimaEm: string
}

/**
 * Reconstrói o histórico das posições a partir dos registros gravados.
 *
 * Deriva TUDO do que está no armazenamento: nenhuma contagem paralela é mantida
 * em outro lugar para depois divergir. Registro que não é de final é ignorado
 * pela chave, não por uma lista de exceções.
 */
export function historicoDasPosicoes(
  registros: readonly PuzzleAttempt[],
): Map<string, HistoricoDaPosicao> {
  const porPosicao = new Map<string, HistoricoDaPosicao>()
  for (const registro of registros) {
    const posicaoId = posicaoIdDaChave(registro.puzzleId)
    if (posicaoId === null) {
      continue
    }
    const anterior = porPosicao.get(posicaoId)
    porPosicao.set(posicaoId, {
      posicaoId,
      tentativas: (anterior?.tentativas ?? 0) + 1,
      cumpriu: (anterior?.cumpriu ?? false) || registro.solved,
      ultimaEm:
        anterior === undefined || registro.attemptedAt > anterior.ultimaEm
          ? registro.attemptedAt
          : anterior.ultimaEm,
    })
  }
  return porPosicao
}

// ---------------------------------------------------------------- orquestração

/**
 * O mínimo do repositório que gravar uma tentativa de final precisa.
 *
 * Porta estreita de propósito: o domínio não conhece `TrainingRepository`
 * inteiro, e o teste não precisa de um banco para exercitar a regra.
 */
export interface RepositorioDeFinais {
  savePuzzleAttempt(attempt: PuzzleAttempt): Promise<void>
  listReviewCards(): Promise<ReviewCard[]>
  saveReviewCard(card: ReviewCard): Promise<void>
  getSkillMastery(): Promise<SkillMastery[]>
  saveSkillMastery(mastery: SkillMastery[]): Promise<void>
}

export interface GravacaoDeTentativa {
  /** Id do registro criado. */
  registroId: string
  habilidade: SkillId
  /** O card passou a existir agora. */
  cardCriado: boolean
  /** O card já existia e teve o agendamento PRESERVADO. */
  cardAtualizado: boolean
}

/**
 * Grava a tentativa: registro, maestria e, quando é o caso, card de revisão.
 *
 * A ordem importa. O registro vem primeiro porque é o fato bruto — se a
 * gravação falhar no meio, o que ficou no banco é o que de fato aconteceu, e
 * não um card de uma tentativa que ninguém sabe se existiu.
 *
 * Chamar duas vezes com o mesmo relógio grava DUAS tentativas: esta função não
 * tem como saber se foi o aluno que treinou duas vezes ou a tela que se
 * confundiu. Quem chama é responsável por chamar uma vez por tentativa, e é a
 * tela que carrega o portão disso.
 */
export async function gravarTentativaDeFinal(
  repo: RepositorioDeFinais,
  entrada: { licao: LicaoDeFinal; posicao: PosicaoDeFinal; tentativa: TentativaDeFinal },
  { agora }: RegistroOptions,
): Promise<GravacaoDeTentativa> {
  const { licao, posicao, tentativa } = entrada

  const registro = tentativaParaRegistro(licao, posicao, tentativa, { agora })
  await repo.savePuzzleAttempt(registro)

  const mastery = await repo.getSkillMastery()
  const porId = new Map<SkillId, SkillMastery>(mastery.map((item) => [item.skillId, item]))
  const base = porId.get(licao.habilidade) ?? createMastery(licao.habilidade)
  porId.set(licao.habilidade, updateMastery(base, tentativaParaEvento(tentativa, { agora })))
  await repo.saveSkillMastery([...porId.values()])

  if (!mereceCard(tentativa)) {
    return {
      registroId: registro.id,
      habilidade: licao.habilidade,
      cardCriado: false,
      cardAtualizado: false,
    }
  }

  const novo = posicaoParaReviewCard(licao, posicao, { agora })
  const existente = (await repo.listReviewCards()).find((card) => card.id === novo.id)
  await repo.saveReviewCard(preservarProgresso(novo, existente))

  return {
    registroId: registro.id,
    habilidade: licao.habilidade,
    cardCriado: existente === undefined,
    cardAtualizado: existente !== undefined,
  }
}
