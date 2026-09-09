/**
 * Como um veredito de retenção é DITO ao aluno.
 *
 * A redação aqui importa mais que o normal, e é por isso que ela mora num
 * arquivo próprio, com portão, em vez de solta dentro de um componente.
 *
 * A DECISÃO QUE ESTE ARQUIVO CARREGA: `nao-reincidiu` NÃO vira "você domina
 * esse padrão". Ele significa, literalmente, "não apareceu nas N partidas
 * analisadas depois do treino" — e é assim que a frase é escrita, com o N
 * dentro dela. A diferença não é modéstia: o modelo não sabe quantas
 * OPORTUNIDADES a habilidade teve. `PositionAnalysis.skillIds` só é preenchido
 * nos lances que o pipeline aprofundou, que são os candidatos a erro; um lance
 * CERTO com garfo disponível não deixa rastro nenhum. Dizer "você domina" seria
 * afirmar uma coisa que o dado não sustenta, e o aluno pararia de treinar um
 * padrão que talvez nunca tenha aparecido.
 *
 * `evidencia-insuficiente` e `sem-evidencia` também são distintos de propósito:
 * "jogou e não errou, mas foi pouco" pede uma ação diferente de "não jogou nada
 * analisado". Fundir os dois em "ainda não sei" apagaria a única parte
 * acionável da mensagem.
 *
 * Nenhum descritor devolve só a cor: rótulo, cor e ícone saem juntos, numa
 * entrada indivisível. O caminho de pintar o chip e esquecer o texto não existe.
 */

import type { RetencaoDeHabilidade, VereditoDeRetencao } from '@/domain/types'

export const VEREDITOS_DE_RETENCAO = [
  'voltou-a-falhar',
  'nao-reincidiu',
  'evidencia-insuficiente',
  'sem-evidencia',
] as const satisfies readonly VereditoDeRetencao[]

export interface VereditoDescritor {
  readonly veredito: VereditoDeRetencao
  /** Rótulo curto, do jeito que aparece no chip. */
  readonly label: string
  readonly colorVar: string
  readonly icon: { readonly viewBox: string; readonly path: string }
  /** `true` só quando o veredito afirma alguma coisa sobre o aprendizado. */
  readonly afirma: boolean
}

export const catalogoDeRetencao: Record<VereditoDeRetencao, VereditoDescritor> = {
  'voltou-a-falhar': {
    veredito: 'voltou-a-falhar',
    label: 'Voltou a falhar',
    colorVar: 'var(--warning-text)',
    // Triângulo: o mesmo desenho de atenção usado na classificação de lance.
    icon: { viewBox: '0 0 16 16', path: 'M8 1.8 15 14.2H1Z' },
    afirma: true,
  },
  'nao-reincidiu': {
    veredito: 'nao-reincidiu',
    label: 'Não reincidiu',
    colorVar: 'var(--positive-text)',
    icon: { viewBox: '0 0 16 16', path: 'M14.2 8A6.2 6.2 0 1 1 1.8 8a6.2 6.2 0 0 1 12.4 0Z' },
    afirma: true,
  },
  'evidencia-insuficiente': {
    veredito: 'evidencia-insuficiente',
    label: 'Ainda não dá para dizer',
    colorVar: 'var(--text-muted)',
    // Losango vazado: presente, mas sem afirmar nada.
    icon: { viewBox: '0 0 16 16', path: 'M8 2.4 13.6 8 8 13.6 2.4 8Z' },
    afirma: false,
  },
  'sem-evidencia': {
    veredito: 'sem-evidencia',
    label: 'Sem partida analisada',
    colorVar: 'var(--text-muted)',
    icon: { viewBox: '0 0 16 16', path: 'M2.4 8h11.2' },
    afirma: false,
  },
}

/**
 * A frase que acompanha o chip, já com os números que a sustentam.
 *
 * Os contadores entram no texto de propósito: um veredito sozinho não é
 * explicável depois, e "em 3 partidas analisadas desde o treino, nenhuma
 * falhou" é uma afirmação que o aluno pode conferir. "Melhorou" não é.
 */
export function fraseDeRetencao(retencao: RetencaoDeHabilidade): string {
  const n = retencao.partidasVerificadas
  const partidas = `${n} ${n === 1 ? 'partida analisada' : 'partidas analisadas'}`

  switch (retencao.veredito) {
    case 'voltou-a-falhar': {
      const f = retencao.partidasComFalha
      return `Aconteceu de novo depois do treino: ${f} ${
        f === 1 ? 'partida' : 'partidas'
      } com esse erro, de ${partidas}.`
    }
    case 'nao-reincidiu':
      return `Não apareceu nas ${partidas} desde o treino. Isso não quer dizer que o padrão esteja dominado — quer dizer que ele não voltou a custar pontos ainda.`
    case 'evidencia-insuficiente':
      return `${partidas} desde o treino, sem esse erro. É pouco para afirmar qualquer coisa: jogue e analise mais partidas.`
    case 'sem-evidencia':
      return 'Você ainda não analisou nenhuma partida depois desse treino. Importe uma partida para o LanceZero ter o que verificar.'
  }
}
