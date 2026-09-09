/**
 * Estados de feedback de acerto e erro — seções 30 e 31 do guia.
 *
 * DECISÃO DE TOM QUE ESTE ARQUIVO CARREGA: o erro é informação, não veredito.
 * O rótulo do estado incorreto não diz "errado" nem "você falhou": diz que
 * apareceu algo para treinar. É a frase que o guia usa e é o que o produto
 * promete — "treine o que perde suas partidas". Quem quiser mudar esse tom
 * muda aqui, não espalhado por cada tela.
 *
 * SEGUNDA DECISÃO: o catálogo é fechado em dois estados porque o guia define
 * dois. Não existe "parcialmente correto" inventado sem regra pedagógica que
 * o sustente.
 *
 * O ícone do estado incorreto é uma lupa, e não um X: o gesto que queremos
 * provocar é "olhe aqui", não "reprovado".
 */

export type FeedbackTone = 'correto' | 'incorreto'

export interface FeedbackToneDescriptor {
  readonly tone: FeedbackTone
  /** Palavra do estado. É ela que impede o status de depender só de cor. */
  readonly label: string
  /** Papel semântico legível nos dois temas. */
  readonly colorVar: string
  readonly icon: { readonly viewBox: string; readonly path: string }
}

export const feedbackToneCatalog: Record<FeedbackTone, FeedbackToneDescriptor> = {
  correto: {
    tone: 'correto',
    label: 'Correto',
    colorVar: 'var(--positive)',
    icon: {
      viewBox: '0 0 16 16',
      path: 'M8 0.8A7.2 7.2 0 1 0 8 15.2 7.2 7.2 0 0 0 8 0.8Zm3.6 5.1-4.4 4.4a0.9 0.9 0 0 1-1.3 0L3.9 8.3l1.3-1.3 1.4 1.4 3.7-3.8Z',
    },
  },
  incorreto: {
    tone: 'incorreto',
    label: 'Achamos algo para treinar',
    colorVar: 'var(--danger)',
    icon: {
      viewBox: '0 0 16 16',
      path: 'M6.9 1.2a5.7 5.7 0 0 1 4.5 9.2l3.6 3.6-1.4 1.4-3.6-3.6A5.7 5.7 0 1 1 6.9 1.2Zm0 2a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4Z',
    },
  },
}
