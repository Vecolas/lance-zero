/**
 * A escada de ajuda e o que acontece quando o aluno erra.
 *
 * ESTE ARQUIVO REMOVE O "TENTE NOVAMENTE" (plano §17). O laço proibido é:
 *
 *     errou → tente novamente → errou → tente novamente → …
 *
 * Ele não é apenas inútil: ele ENSINA FORÇA BRUTA. O aluno descobre que clicar
 * em peças até o app aceitar é uma estratégia que funciona, e passa a usá-la —
 * inclusive na partida real, onde ninguém valida o lance antes de ele valer.
 *
 * A substituição não é "menos tentativas". É ASSISTÊNCIA CRESCENTE: cada erro
 * entrega mais estrutura de raciocínio, e depois de esgotada a escada o app
 * mostra a solução e TROCA a posição em vez de pedir o mesmo lance de novo.
 *
 * O QUE ISTO NÃO FAZ, e é deliberado: não decide se o aluno acertou. A prova
 * mora em `@/domain/exercicios` e é a mesma do diagnóstico e das lições. Aqui
 * mora só o que fazer DEPOIS do veredito.
 */

/**
 * Os degraus da dica, do mais vago ao mais específico (plano §16).
 *
 * A ORDEM É A ESCADA, como em `./estagio`. E a escada é de PROCESSO para
 * RESPOSTA de propósito: o primeiro degrau não fala da posição, fala do que
 * fazer diante de qualquer posição. Uma dica que já aponta a peça no primeiro
 * degrau ensina aquele problema; uma que começa em "procure xeques, capturas e
 * ameaças" ensina um hábito que o aluno leva para a partida.
 */
export const DEGRAUS_DE_DICA = ['direcao', 'area', 'ideia', 'candidato'] as const

export type DegrauDeDica = (typeof DEGRAUS_DE_DICA)[number]

/** Uma dica escrita, presa ao seu degrau. */
export interface Dica {
  degrau: DegrauDeDica
  texto: string
}

/**
 * Quanto apoio o aluno usou até resolver.
 *
 * MUITO MAIS INFORMATIVO QUE `certo/errado`, e é o ponto da §16: "acertou" diz
 * quase nada quando pode significar tanto "viu de imediato" quanto "recebeu o
 * lance de bandeja". Estes cinco valores são o que alimenta a distinção entre
 * tentativa guiada e independente em `./skill-state`.
 */
export const NIVEIS_DE_APOIO = [
  'sem-dica',
  'dica-1',
  'dica-2',
  'dica-3',
  'dica-4',
  'solucao-revelada',
] as const

export type NivelDeApoio = (typeof NIVEIS_DE_APOIO)[number]

/**
 * O nível de apoio a partir de quantas dicas foram abertas.
 *
 * Um lugar só converte contagem em nível. Espalhar esse `if` faria duas telas
 * discordarem sobre o que é "sem dica".
 */
export function nivelDeApoio(dicasAbertas: number, solucaoRevelada: boolean): NivelDeApoio {
  if (solucaoRevelada) return 'solucao-revelada'
  const indice = Math.min(Math.max(dicasAbertas, 0), DEGRAUS_DE_DICA.length)
  return NIVEIS_DE_APOIO[indice]
}

/**
 * A tentativa conta como INDEPENDENTE?
 *
 * Só quem resolveu sem abrir dica nenhuma. É a pergunta que `./skill-state`
 * faz para decidir qual contador mover, e ela mora aqui porque é sobre apoio,
 * não sobre estágio.
 */
export function foiIndependente(nivel: NivelDeApoio): boolean {
  return nivel === 'sem-dica'
}

/**
 * O que a tela faz depois de um erro.
 *
 * `trocar-posicao` é o degrau que não existia. Sem ele, a última resposta
 * possível a um erro seria "tente de novo" — e a escada inteira terminaria
 * de volta no laço que ela veio desfazer. Mostrar a solução e seguir para uma
 * posição EQUIVALENTE é o que fecha o ciclo: o aluno vê o raciocínio e depois
 * tem onde aplicá-lo, em vez de repetir o lance que já sabe que é a resposta.
 */
export type RespostaAoErro =
  /** 1º erro: feedback curto e a dica conceitual do degrau seguinte. */
  | { acao: 'dica'; degrau: DegrauDeDica }
  /** 2º erro: quebrar o problema numa pergunta intermediária. */
  | { acao: 'decompor' }
  /** 3º erro: mostrar o raciocínio inteiro e a solução. */
  | { acao: 'mostrar-solucao' }
  /** Depois disso: posição nova que treina a mesma ideia. */
  | { acao: 'trocar-posicao' }

/**
 * Limites da escada.
 *
 * HEURÍSTICA DE PRODUTO, nunca calibrada. Três erros antes de mostrar a solução
 * é um palpite sobre a paciência de um aluno de ~1100 — não um achado.
 */
export const AJUDA_CONFIG = {
  /** Erros antes de decompor o problema. */
  errosAteDecompor: 2,
  /** Erros antes de mostrar o raciocínio e a solução. */
  errosAteMostrarSolucao: 3,
} as const

export type AjudaConfig = Record<keyof typeof AJUDA_CONFIG, number>

/**
 * A resposta ao erro número `erros`, contando a partir de 1.
 *
 * PURA. A tela pergunta, ela não decide — e é por isso que "nunca há tentativa
 * cega infinita" pode ser provado por um teste desta função, em vez de
 * inspecionado num componente.
 */
export function responderAoErro(
  erros: number,
  dicasAbertas: number,
  config: AjudaConfig = AJUDA_CONFIG,
): RespostaAoErro {
  if (erros >= config.errosAteMostrarSolucao) {
    // O terceiro erro mostra a solução; do quarto em diante não há mais o que
    // mostrar, e insistir na mesma posição é o laço proibido.
    return erros > config.errosAteMostrarSolucao
      ? { acao: 'trocar-posicao' }
      : { acao: 'mostrar-solucao' }
  }
  if (erros >= config.errosAteDecompor) return { acao: 'decompor' }

  const proximo = DEGRAUS_DE_DICA[Math.min(dicasAbertas, DEGRAUS_DE_DICA.length - 1)]
  return { acao: 'dica', degrau: proximo }
}

/**
 * Feedback explicativo (plano §18).
 *
 * OS QUATRO CAMPOS SÃO OBRIGATÓRIOS, e a obrigatoriedade é o ponto. Um tipo
 * com `oQueAconteceu?` opcional permitiria de volta o `❌ Incorreto` — bastaria
 * omitir tudo. O tipo recusa isso: quem escreve conteúdo tem de responder as
 * quatro perguntas, inclusive a terceira, que é a que costuma faltar.
 *
 * `porQueParecia` é a que quase ninguém escreve e a que mais ensina: um lance
 * errado quase sempre tem uma razão boa por trás, e nomeá-la é o que faz o
 * aluno reconhecer o próprio raciocínio em vez de se achar distraído.
 */
export interface FeedbackExplicativo {
  /** 1. O que aconteceu no tabuleiro. Fato, não julgamento. */
  oQueAconteceu: string
  /** 2. Por que o lance parecia plausível. */
  porQueParecia: string
  /** 3. O que ele deixou passar. */
  oQuePassouBatido: string
  /** 4. A pergunta mental reutilizável que teria evitado o erro. */
  perguntaQueEvitaria: string
}

/**
 * Feedback do ACERTO. Também explica.
 *
 * A §18 termina dizendo que a resposta certa precisa explicar brevemente o
 * princípio, e não só mostrar ✓. Um acerto sem explicação deixa o aluno sem
 * saber SE acertou pelo motivo certo — e acertar pelo motivo errado é a coisa
 * mais difícil de detectar sozinho.
 */
export interface FeedbackDeAcerto {
  /** O princípio em uma frase. */
  principio: string
  /** O que torna esta posição um caso dele. */
  porQueFuncionaAqui: string
}

/**
 * Feedback genérico, para quando o conteúdo não escreveu um específico.
 *
 * É o `unknown` desta camada: o CLAUDE.md manda preferir "não sei" a um motivo
 * inventado, e um feedback que afirma qual peça ficou pendurada sem ter
 * conferido seria exatamente o motivo inventado. Este texto não afirma nada
 * sobre a posição — ele devolve o PROCESSO, que é verdadeiro em qualquer
 * posição.
 */
export function feedbackGenerico(): FeedbackExplicativo {
  return {
    oQueAconteceu: 'Esse lance não cumpre o objetivo da posição.',
    porQueParecia:
      'Lances que desenvolvem, atacam ou parecem naturais costumam ser a primeira ideia — e ' +
      'quase sempre há uma razão boa por trás deles.',
    oQuePassouBatido:
      'Alguma resposta do adversário desfaz o plano. Ainda não sei dizer qual nesta posição, e ' +
      'preferi não inventar.',
    perguntaQueEvitaria:
      'Depois que eu jogar, qual é o melhor lance do adversário? E alguma peça minha fica sem ' +
      'defesa?',
  }
}
