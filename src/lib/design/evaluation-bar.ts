/**
 * Leitura da barra de avaliação — seção 27 do guia.
 *
 * DECISÃO DE PRODUTO QUE ESTE ARQUIVO CARREGA: a barra mostra a AVALIAÇÃO DA
 * ENGINE, não "sua chance de vitória". O CLAUDE.md proíbe apresentar o WDL do
 * Stockfish como probabilidade humana, e a mesma proibição vale para qualquer
 * número derivado dele. Por isso nenhum rótulo produzido aqui fala em chance,
 * probabilidade ou percentual de vitória: fala em vantagem, em peões e em
 * mate. Se o rótulo mudar, ele muda aqui, num lugar só.
 *
 * SEGUNDA DECISÃO: `perspectiva` é obrigatória. A engine reporta score na
 * perspectiva de quem joga, e `PositionAnalysis.scoreCp` guarda esse número
 * como veio. Uma barra que aceitasse só `scoreCp` inverteria a vantagem em
 * metade das posições sem erro nenhum aparecer — é o tipo de falha que fica
 * verde para sempre. Aqui, quem chama tem de declarar de quem é o número.
 *
 * A fração da barra NASCE da pontuação esperada do domínio
 * (`expectedScoreFromEval`), em vez de uma segunda curva logística só para a
 * UI. Duas curvas seriam duas verdades para a mesma coisa, e a barra e a
 * classificação de severidade poderiam discordar na mesma tela.
 */

import { expectedScoreFromEval } from '@/domain/games/severity'

/** De quem é a perspectiva dos números recebidos. */
export type EvaluationPerspective = 'brancas' | 'pretas'

export type EvaluationSide = 'brancas' | 'pretas' | 'equilibrio'

export interface EvaluationInput {
  /** Centipeões na perspectiva declarada. `null` quando há mate ou nada. */
  scoreCp: number | null
  /** Lances até o mate na perspectiva declarada. `null` quando não há mate. */
  mateIn: number | null
  perspectiva: EvaluationPerspective
}

export interface EvaluationReading {
  /** `false` quando não há número nenhum: a barra não pode fingir equilíbrio. */
  avaliado: boolean
  /** Quanto da barra pertence às brancas, 0..1. */
  fracaoBrancas: number
  lado: EvaluationSide
  /** Número discreto, como aparece ao lado da barra. */
  numero: string
  /** Nome do ícone direcional, para o lado não depender só do preenchimento. */
  icone: 'brancas' | 'pretas' | 'equilibrio'
  /** Frase completa e honesta sobre o que a barra mede. */
  rotulo: string
}

export const EVALUATION_BAR_CONFIG = {
  /**
   * Heurística de produto: abaixo disto a diferença não muda decisão nenhuma
   * do jogador, e chamar de vantagem seria falsa precisão.
   */
  limiarDeEquilibrioCp: 20,
  /**
   * Limite de design: nem branco nem preto some por completo, senão a barra
   * deixa de ser lida como barra em posições decididas.
   */
  fracaoMinimaVisivel: 0.02,
} as const

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

/** Formata em peões com vírgula decimal, como se escreve em português. */
function emPeoes(cp: number): string {
  return (Math.abs(cp) / 100).toFixed(1).replace('.', ',')
}

/**
 * Converte uma avaliação em tudo o que a barra precisa mostrar de uma vez:
 * tamanho, número, ícone e frase. Devolve a unidade inteira de propósito —
 * quem quiser só a cor não tem por onde.
 */
export function readEvaluation(
  input: EvaluationInput,
  config = EVALUATION_BAR_CONFIG,
): EvaluationReading {
  const sinal = input.perspectiva === 'brancas' ? 1 : -1
  const mate = input.mateIn === null ? null : input.mateIn * sinal
  const cp = input.scoreCp === null ? null : input.scoreCp * sinal

  if (mate !== null) {
    // Mate 0 é mate já dado; o lado é o do sinal, e "em 0 lances" não se diz.
    const brancasMatam = mate > 0
    const lances = Math.abs(mate)
    const quem = brancasMatam ? 'brancas' : 'pretas'
    return {
      avaliado: true,
      fracaoBrancas: brancasMatam ? 1 - config.fracaoMinimaVisivel : config.fracaoMinimaVisivel,
      lado: quem,
      numero: `M${lances}`,
      icone: quem,
      rotulo:
        lances === 0
          ? `Avaliação da engine: mate consumado a favor das ${quem}.`
          : `Avaliação da engine: mate em ${lances} para as ${quem}.`,
    }
  }

  if (cp === null) {
    return {
      avaliado: false,
      fracaoBrancas: 0.5,
      lado: 'equilibrio',
      numero: '—',
      icone: 'equilibrio',
      rotulo: 'Posição ainda não avaliada pela engine.',
    }
  }

  const bruta = expectedScoreFromEval({ scoreCp: cp, mateIn: null })
  const fracaoBrancas = limitar(bruta, config.fracaoMinimaVisivel, 1 - config.fracaoMinimaVisivel)

  // O número acompanha o `cp` mesmo dentro da faixa de equilíbrio: cravar
  // "0,0" num +0,19 seria esconder do jogador o que a engine de fato disse.
  const numero = cp === 0 ? '0,0' : `${cp > 0 ? '+' : '−'}${emPeoes(cp)}`

  if (Math.abs(cp) < config.limiarDeEquilibrioCp) {
    return {
      avaliado: true,
      fracaoBrancas,
      lado: 'equilibrio',
      numero,
      icone: 'equilibrio',
      rotulo: 'Avaliação da engine: posição equilibrada.',
    }
  }

  const quem: EvaluationSide = cp > 0 ? 'brancas' : 'pretas'
  return {
    avaliado: true,
    fracaoBrancas,
    lado: quem,
    numero,
    icone: quem,
    // O rótulo diz o que a barra mede e para. A ressalva de que isto não é
    // chance de vitória fica em texto visível na tela que usa a barra: aqui
    // ela ficaria repetida em cada momento crítico, e um portão varre estas
    // saídas exigindo que a palavra "chance" não apareça em nenhuma delas.
    rotulo: `Avaliação da engine: vantagem das ${quem}, ${emPeoes(cp)} de peão.`,
  }
}
