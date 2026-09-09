/**
 * Tradução dos códigos do domínio de finais para PT-BR, e a apresentação de
 * cada estado na tela.
 *
 * DECISÃO 1 — a tradução é da TELA. `avaliarObjetivo` devolve CÓDIGO
 * (`MotivoDeObjetivo`), nunca frase: é isso que permite ao teste do domínio não
 * depender do idioma da interface. O tradutor mora aqui, e é um `Record` sobre
 * a união — motivo novo no domínio NÃO COMPILA sem frase. Um mapa indexado por
 * `string` com valor padrão seria o desenho em que o código novo aparece na
 * tela como "" e ninguém percebe.
 *
 * DECISÃO 2 — status nunca depende só de cor (regra de acessibilidade do
 * projeto). Por isso o que a tela recebe daqui é sempre o TRIO: ícone, texto e
 * tom. Não existe função que devolva só a cor, para não existir o caminho em
 * que alguém pinta um chip e esquece o resto.
 *
 * DECISÃO 3 — a procedência da resposta do adversário também é texto daqui, e
 * ela é dita ao aluno com todas as letras. Apresentar um lance de roteiro como
 * se fosse defesa perfeita seria mentir em silêncio; e "sem defesa perfeita" é
 * informação pedagógica, não detalhe técnico.
 */

import type { EstadoDoObjetivo, MotivoDeObjetivo, ObjetivoFinal } from '@/domain/endgames'
import type { PromotionPiece } from '@/lib/chess'
import type { FonteDaResposta } from './resposta-do-adversario'

/** Nome da peça de promoção em PT-BR. Exaustivo por tipo, como tudo aqui. */
const NOME_DA_PECA: Record<PromotionPiece, string> = {
  q: 'dama',
  r: 'torre',
  b: 'bispo',
  n: 'cavalo',
}

/**
 * O objetivo da posição em uma frase.
 *
 * O `default` chama uma função que recebe `never`: tipo novo de objetivo no
 * domínio reprova em COMPILAÇÃO aqui, e não vira uma frase vazia na tela.
 */
export function descreverObjetivo(objetivo: ObjetivoFinal): string {
  switch (objetivo.tipo) {
    case 'mate-em':
      return objetivo.lancesMaximos === 1
        ? 'Dar mate em 1 lance seu.'
        : `Dar mate em no máximo ${objetivo.lancesMaximos} lances seus.`
    case 'promocao':
      return objetivo.quantidadeMinima === 1
        ? `Promover um peão a ${NOME_DA_PECA[objetivo.peca]}.`
        : `Ter pelo menos ${objetivo.quantidadeMinima} ${NOME_DA_PECA[objetivo.peca]}s no tabuleiro.`
    case 'empate-defendido':
      return 'Segurar o empate: terminar a partida sem perder.'
    default:
      return objetivoNaoTratado(objetivo)
  }
}

function objetivoNaoTratado(objetivo: never): never {
  throw new Error(`Objetivo de final sem frase na tela: ${JSON.stringify(objetivo)}`)
}

/** Frase em PT-BR para cada motivo que o domínio sabe devolver. */
export const FRASE_POR_MOTIVO: Record<MotivoDeObjetivo, string> = {
  'mate-aplicado': 'Mate aplicado dentro do número de lances do objetivo.',
  'promocao-alcancada': 'Peão promovido: o objetivo desta posição está cumprido.',
  'empate-alcancado': 'A partida terminou empatada — que é exatamente o que você defendia.',
  'aluno-recebeu-mate': 'Você levou mate. Qualquer objetivo cai junto com o rei.',
  'afogamento-indevido': 'Afogamento: o adversário ficou sem lance legal e a partida empatou.',
  'empate-indevido':
    'A posição virou empate por material insuficiente ou pela regra dos 50 lances.',
  'lances-esgotados': 'Os lances previstos no objetivo acabaram antes de você chegar lá.',
  'sem-peao-para-promover': 'Não sobrou peão para promover.',
  'em-andamento': 'A posição continua: nem cumprida, nem perdida.',
}

export type TomDoEstado = 'ok' | 'ruim' | 'neutro'

export interface ApresentacaoDoEstado {
  /** Cor, ícone e texto andam juntos: status nunca é só cor. */
  tom: TomDoEstado
  icone: string
  rotulo: string
}

export const APRESENTACAO_POR_ESTADO: Record<EstadoDoObjetivo, ApresentacaoDoEstado> = {
  cumprido: { tom: 'ok', icone: '✓', rotulo: 'Objetivo cumprido' },
  falhou: { tom: 'ruim', icone: '✕', rotulo: 'Objetivo não cumprido' },
  'em-andamento': { tom: 'neutro', icone: '·', rotulo: 'Em andamento' },
}

export interface ApresentacaoDaFonte {
  tom: TomDoEstado
  icone: string
  rotulo: string
  /**
   * O que essa procedência significa para o aluno, em uma frase. Não é nota de
   * rodapé: é o que separa "eu bati a defesa perfeita" de "eu bati um roteiro".
   */
  explicacao: string
  /** `true` só quando o adversário jogou pela tablebase. */
  perfeita: boolean
}

export const APRESENTACAO_POR_FONTE: Record<FonteDaResposta, ApresentacaoDaFonte> = {
  tablebase: {
    tom: 'ok',
    icone: '◆',
    rotulo: 'Defesa perfeita',
    explicacao:
      'O adversário está jogando pela tablebase Syzygy: nesta posição não existe defesa melhor que a dele.',
    perfeita: true,
  },
  'linha-modelo': {
    tom: 'neutro',
    icone: '≡',
    rotulo: 'Roteiro, não defesa perfeita',
    explicacao:
      'A tablebase não respondeu agora. O adversário está seguindo a linha modelo desta posição — um roteiro escrito de antemão, que pode ser mais fácil de bater do que a defesa perfeita.',
    perfeita: false,
  },
  'lance-legal': {
    tom: 'neutro',
    icone: '?',
    rotulo: 'Lance legal qualquer',
    explicacao:
      'A tablebase não respondeu e a sua linha saiu do roteiro, então o adversário está jogando um lance legal escolhido por ordem alfabética. Cumprir o objetivo assim não prova que você o cumpriria contra defesa perfeita.',
    perfeita: false,
  },
}

/**
 * Aviso a mostrar no veredito quando o adversário não jogou perfeito o tempo
 * todo. `null` quando toda resposta veio da tablebase — nesse caso não há
 * ressalva a fazer, e inventar uma seria ruído.
 */
export function ressalvaDaDefesa(fontes: readonly FonteDaResposta[]): string | null {
  if (fontes.length === 0) {
    return null
  }
  const imperfeitas = fontes.filter((fonte) => !APRESENTACAO_POR_FONTE[fonte].perfeita)
  if (imperfeitas.length === 0) {
    return null
  }
  return `Atenção: ${imperfeitas.length} de ${fontes.length} resposta(s) do adversário não vieram da tablebase. Este resultado vale contra o adversário que você enfrentou, não contra defesa perfeita.`
}
