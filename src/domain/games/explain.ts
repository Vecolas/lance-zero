/**
 * Explicação determinística de um erro.
 *
 * A explicação tem sempre as quatro partes do PEDAGOGY.md, nesta ordem: o que
 * aconteceu, qual sinal estava visível, qual hábito teria evitado, qual treino
 * nasceu disso.
 *
 * Regra do produto: quando nenhum detector passa do limiar, o código é
 * `unknown` e o texto diz isso com todas as letras. Inventar um tema plausível
 * seria pior do que admitir que não identificamos o padrão — e a taxa de
 * `unknown` é medida por `unknownRate`, não escondida.
 *
 * Tom: analítico, calmo, direto. Explica o erro sem humilhar o jogador.
 */

import type { CriticalMoment, MistakeExplanation, SkillId } from '@/domain/types'
import { applyMove } from '@/lib/chess'
import {
  DETECTOR_CONFIG,
  type DetectorCode,
  type DetectorConfig,
  type DetectorResult,
} from './detectors'

/** Código usado quando nenhuma detecção passa do limiar. */
export const UNKNOWN_CODE = 'unknown'

export type ExplanationCode = DetectorCode | typeof UNKNOWN_CODE

/** Habilidades treinadas a partir de cada motivo detectado. */
export const CODE_TO_SKILLS: Record<ExplanationCode, SkillId[]> = {
  'hanging-piece': ['tactics.hanging-piece', 'calculation.opponent-best-response'],
  'missed-capture': ['calculation.checks-captures-threats', 'tactics.hanging-piece'],
  fork: ['tactics.fork', 'calculation.candidate-moves'],
  pin: ['tactics.pin'],
  'back-rank': ['tactics.back-rank'],
  'missed-mate': ['tactics.mating-net', 'calculation.checks-captures-threats'],
  'king-safety': ['opening.king-safety', 'calculation.opponent-best-response'],
  unknown: [],
}

/** Limiar de confiança de cada detector, para a explicação reconferir. */
function limiarDe(code: DetectorCode, config: DetectorConfig): number {
  switch (code) {
    case 'hanging-piece':
      return config.hangingPiece.limiarConfianca
    case 'missed-capture':
      return config.missedCapture.limiarConfianca
    case 'fork':
      return config.fork.limiarConfianca
    case 'pin':
      return config.pin.limiarConfianca
    case 'back-rank':
      return config.backRank.limiarConfianca
    case 'missed-mate':
      return config.missedMate.limiarConfianca
    case 'king-safety':
      return config.kingSafety.limiarConfianca
  }
}

/** O que a explicação precisa saber do momento. `CriticalMoment` serve inteiro. */
export type ExplainableMoment = Pick<
  CriticalMoment,
  'fenBefore' | 'userMoveUci' | 'bestMoveUci' | 'expectedScoreLossPp'
>

interface TextoBase {
  sanUsuario: string
  sanMelhor: string
  detalhe: string
  perdaPp: string
}

function san(fen: string, uci: string): string {
  if (!uci) return '(sem lance)'
  return applyMove(fen, uci)?.move.san ?? uci
}

type Partes = Omit<MistakeExplanation, 'code' | 'confidence'>

const TEMPLATES: Record<ExplanationCode, (base: TextoBase) => Partes> = {
  'hanging-piece': ({ sanUsuario, sanMelhor, detalhe }) => ({
    oQueAconteceu: `Depois de ${sanUsuario}, ${detalhe} ficou atacada sem defesa suficiente e o adversário podia ganhar material. ${sanMelhor} evitava isso.`,
    sinalVisivel: `${detalhe} estava na mira de uma peça adversária e nenhuma peça sua cobria essa casa.`,
    habitoQuePreveniria:
      'Antes de soltar o lance, percorrer as suas peças e perguntar quais ficam sem defensor na posição que você vai criar.',
    treinoGerado:
      'Puzzles de peça pendurada e o hábito de varrer peças desprotegidas antes de cada lance.',
  }),
  'missed-capture': ({ sanUsuario, detalhe }) => ({
    oQueAconteceu: `Havia uma captura que ganhava material — ${detalhe} — e ${sanUsuario} deixou ela passar.`,
    sinalVisivel:
      'Uma peça adversária estava atacada por você e defendida de menos. Era uma captura limpa, não um sacrifício.',
    habitoQuePreveniria:
      'Listar xeques, capturas e ameaças antes de escolher o lance, mesmo quando a posição parece calma.',
    treinoGerado: 'Treino de xeques, capturas e ameaças e puzzles de ganho material direto.',
  }),
  fork: ({ sanUsuario, detalhe }) => ({
    oQueAconteceu: `${sanUsuario} desperdiçou um ataque duplo: ${detalhe}.`,
    sinalVisivel:
      'Duas peças adversárias estavam em casas que uma peça sua alcançava ao mesmo tempo.',
    habitoQuePreveniria:
      'Ao ver duas peças adversárias sem defesa ou desalinhadas, procurar a casa que ataca as duas antes de decidir.',
    treinoGerado: 'Puzzles de garfo e exercícios de geração de lances candidatos.',
  }),
  pin: ({ sanUsuario, detalhe }) => ({
    oQueAconteceu: `${sanUsuario} ignorou uma cravada na posição: ${detalhe}.`,
    sinalVisivel:
      'Havia peça adversária na mesma linha, coluna ou diagonal de uma peça mais valiosa, com um bispo, torre ou dama apontando para as duas.',
    habitoQuePreveniria:
      'Olhar as linhas abertas e perguntar quem está preso na frente de quem antes de escolher o lance.',
    treinoGerado: 'Puzzles de cravada e leitura de linhas.',
  }),
  'back-rank': ({ sanUsuario, detalhe }) => ({
    oQueAconteceu: `Depois de ${sanUsuario}, ${detalhe}, e o seu rei continuou preso atrás dos próprios peões.`,
    sinalVisivel:
      'O rei estava na última fileira com as três casas à frente ocupadas, e o adversário tinha torre ou dama para entrar.',
    habitoQuePreveniria:
      'Quando o adversário tem peça pesada e o seu rei está na última fileira, checar a casa de fuga antes de mover outra coisa.',
    treinoGerado: 'Puzzles de mate do corredor e a checagem de casa de fuga do rei.',
  }),
  'missed-mate': ({ sanUsuario, detalhe }) => ({
    oQueAconteceu: `${sanUsuario} deixou passar um mate forçado: ${detalhe}.`,
    sinalVisivel:
      'O rei adversário tinha poucas casas e as suas peças já cobriam a rede de mate. Era um xeque forçado, não uma tentativa.',
    habitoQuePreveniria:
      'Quando o rei adversário tem duas casas ou menos, testar todos os xeques antes de qualquer outro lance.',
    treinoGerado: 'Puzzles de rede de mate e treino de xeques forçados.',
  }),
  'king-safety': ({ sanUsuario, detalhe }) => ({
    oQueAconteceu: `${sanUsuario} abriu o seu próprio rei: ${detalhe}.`,
    sinalVisivel:
      'O adversário já tinha peças apontadas para essa região e o lance tirou um defensor ou abriu uma linha até o rei.',
    habitoQuePreveniria:
      'Antes de mexer os peões da frente do rei, contar quantas peças adversárias apontam para lá e quantas suas defendem.',
    treinoGerado: 'Lições de segurança do rei e puzzles de ataque contra o rei exposto.',
  }),
  unknown: ({ sanUsuario, sanMelhor, perdaPp }) => ({
    oQueAconteceu: `${sanUsuario} custou ${perdaPp} pontos percentuais em relação a ${sanMelhor}, mas não consegui identificar o padrão com segurança.`,
    sinalVisivel:
      'Nenhum motivo tático foi reconhecido com confiança suficiente aqui. Preferimos dizer isso a chutar um tema.',
    habitoQuePreveniria:
      'Comparar o seu lance com a linha sugerida no tabuleiro e perguntar, concretamente, o que ela melhora.',
    treinoGerado: 'Nenhum treino automático foi criado a partir deste lance.',
  }),
}

const DETALHE_PADRAO: Record<ExplanationCode, string> = {
  'hanging-piece': 'uma peça sua',
  'missed-capture': 'a captura disponível',
  fork: 'o melhor lance atacava duas peças ao mesmo tempo',
  pin: 'havia uma peça presa na frente de outra mais valiosa',
  'back-rank': 'a última fileira ficou vulnerável',
  'missed-mate': 'havia mate forçado curto',
  'king-safety': 'a zona do rei ficou mais exposta',
  unknown: '',
}

/**
 * Escolhe a detecção de maior confiança acima do limiar e monta a explicação.
 *
 * Se nenhuma detecção passar, devolve `unknown` — com confiança zero e um
 * texto que assume a limitação em vez de disfarçá-la.
 */
export function explainMistake(
  momento: ExplainableMoment,
  deteccoes: readonly DetectorResult[],
  config: DetectorConfig = DETECTOR_CONFIG,
): MistakeExplanation {
  const validas = [...deteccoes]
    .filter((deteccao) => deteccao.confidence >= limiarDe(deteccao.code, config))
    .sort((a, b) => b.confidence - a.confidence || a.code.localeCompare(b.code))

  const escolhida = validas[0]
  const code: ExplanationCode = escolhida?.code ?? UNKNOWN_CODE

  const base: TextoBase = {
    sanUsuario: san(momento.fenBefore, momento.userMoveUci),
    sanMelhor: san(momento.fenBefore, momento.bestMoveUci),
    detalhe: escolhida?.detalhe ?? DETALHE_PADRAO[code],
    perdaPp: momento.expectedScoreLossPp.toFixed(1).replace('.', ','),
  }

  return {
    code,
    confidence: escolhida?.confidence ?? 0,
    ...TEMPLATES[code](base),
  }
}

/** Habilidades a atualizar a partir de uma explicação. */
export function skillsForExplanation(explicacao: MistakeExplanation): SkillId[] {
  const code = explicacao.code as ExplanationCode
  return CODE_TO_SKILLS[code] ?? []
}

/**
 * Fração de explicações que ficaram em `unknown`, de 0 a 1.
 *
 * É a métrica de honestidade dos detectores: se ela sobe, a resposta é
 * melhorar detector, nunca afrouxar limiar para "explicar mais".
 */
export function unknownRate(explicacoes: readonly MistakeExplanation[]): number {
  if (explicacoes.length === 0) return 0
  const desconhecidas = explicacoes.filter((item) => item.code === UNKNOWN_CODE).length
  return desconhecidas / explicacoes.length
}
