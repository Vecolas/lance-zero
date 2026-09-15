/**
 * Esquema de microlição.
 *
 * A REGRA DO PEDAGOGY QUE ESTE ARQUIVO EXISTE PARA IMPEDIR DE QUEBRAR: toda
 * lição termina em RECUPERAÇÃO ATIVA, nunca em texto solto. Ler a explicação
 * uma segunda vez não ensina; tentar responder ensina.
 *
 * E ela é impedida na FORMA, não cobrada num portão depois. Três travas, e cada
 * uma pega o que a anterior deixa passar:
 *
 * 1. `recuperacao` é uma TUPLA NÃO-VAZIA. Uma lição com a lista vazia não
 *    compila — o erro aparece enquanto se escreve o conteúdo, não no CI.
 * 2. `Licao` é um tipo MARCADO. Nenhum objeto literal satisfaz o tipo: a única
 *    forma de produzir uma lição é `definirLicao`, que confere no ato. Sem a
 *    marca, alguém montaria a lição na mão e furaria a trava 1 com um `as`.
 * 3. A ORDEM das etapas é derivada de `ETAPAS_DA_LICAO`, uma lista só, e a
 *    recuperação é a ÚLTIMA ETAPA QUE COBRA. Nenhuma tela escolhe a ordem por
 *    conta própria, então não existe a tela que mostra o exercício antes do
 *    conceito nem a que termina em explicação.
 *
 *    A PRECISÃO AQUI MUDOU NA V2 e vale registrar por quê. Antes a recuperação
 *    era literalmente a última etapa da lista. Agora há uma etapa depois dela: o
 *    `resumo`. Isso NÃO afrouxa a regra do PEDAGOGY, e a diferença é o que o
 *    resumo é — uma lista de verificação para levar para a partida, não a
 *    explicação relida. O que a regra proíbe é a lição terminar reexpondo o
 *    conteúdo, porque reler não ensina; o que ela quer garantir é que o aluno
 *    TENTE antes de sair, e ele tenta.
 *
 *    Para que a garantia continue sendo VERIFICÁVEL em vez de virar uma questão
 *    de interpretação, ela é afirmada como `ultimaEtapaQueCobra()`, derivada da
 *    mesma lista. Uma etapa nova que cobrasse resposta depois da recuperação
 *    reprovaria o portão — que é exatamente o caso que a regra existe para
 *    impedir.
 *
 * A segunda regra do PEDAGOGY que a forma carrega: RECUPERAÇÃO ANTES DA
 * EXPLICAÇÃO. O enunciado do exercício não nomeia o tema, e a explicação só
 * existe depois da resposta — por isso ela é campo do exercício e não do
 * enunciado. Dizer "garfo" antes destrói exatamente o que a etapa mede.
 *
 * ---
 *
 * O QUE MUDOU NA V2 (plano definitivo, §13), e por quê.
 *
 * A lição tinha TRÊS etapas: conceito, exemplo resolvido, recuperação. Entre
 * "vi a solução pronta" e "resolva sozinho sem dica" havia um degrau alto
 * demais, e o aluno que caía nele só tinha tentativa e erro — a mesma dívida
 * que o resto deste trabalho veio pagar, dentro da própria lição.
 *
 * As etapas novas são degraus INTERMEDIÁRIOS, e cada uma existe contra um
 * defeito nomeado:
 *
 * - `objetivo` — dizer o que se vai aprender e por que importa. Sem isso a
 *   lição começa no meio.
 * - `processoMental` — a pergunta REUTILIZÁVEL. É a diferença entre ensinar
 *   este problema e ensinar a resolver problemas desta classe. Se eu tivesse de
 *   escolher uma única etapa nova, seria esta.
 * - `contraste` — uma posição PARECIDA em que a conclusão MUDA. Sem contraste,
 *   o aluno aprende a forma visual e não a ideia: passa a jogar cavalo em f7
 *   sempre que houver torre em d8, e não entende por que às vezes perde peça.
 * - `completion` — parte do raciocínio vem pronta e o aluno só fecha. É o
 *   degrau que faltava entre ver e fazer.
 * - `guiada` — exercício COM dicas disponíveis, antes do sem dicas.
 * - `resumo` — a lista mental que o aluno leva para a partida.
 *
 * TODAS SÃO OBRIGATÓRIAS. Opcional seria o mesmo que inexistente: a primeira
 * lição escrita com pressa omitiria o contraste, a segunda copiaria a primeira,
 * e em um mês o esquema descreveria uma lição que nenhuma lição tem.
 *
 * ONDE ISTO MORA, e por quê: em `@/domain/lessons`. Um esquema não é conteúdo.
 * `@/content/lessons` guarda as lições ESCRITAS; a forma que elas têm de ter, e
 * o verificador que confere isso, são domínio. Ver a issue #74.
 */

import {
  avaliarLance,
  verificarExercicio,
  type ExercicioPosicional,
  type FalhaDeItem,
  type NaoVazia,
  type ObjetivoDeDiagnostico,
} from '@/domain/exercicios'
import type { Dica } from '@/domain/aprendizado'
import {
  applyMove,
  legalMoves,
  normalizeUci,
  parseUci,
  posicaoEhJogavel,
  positionStatus,
} from '@/lib/chess'
import type { SkillId, Side } from '@/domain/types'

/**
 * Números das lições.
 *
 * HEURÍSTICA DE PRODUTO: os minutos servem para a tela dimensionar a lição
 * antes de existir telemetria. Recalibrar com o tempo real medido, não com
 * opinião.
 */
export const LICAO_CONFIG = {
  /** Minutos estimados de leitura do conceito, do exemplo e do contraste. */
  minutosDeLeitura: 3,
  /** Minutos estimados por exercício, de qualquer etapa. */
  minutosPorExercicio: 2,
} as const

export type LicaoConfig = Record<keyof typeof LICAO_CONFIG, number>

/**
 * A ORDEM das etapas de uma lição. É a FONTE, e a última é a recuperação.
 *
 * Uma tela que quisesse outra ordem teria de mexer aqui, onde o portão olha —
 * em vez de mexer no JSX, onde ninguém olharia.
 *
 * A ordem é a do guidance fading (plano §14): a ajuda começa total e termina
 * em zero. Nenhuma etapa oferece MAIS apoio que a anterior.
 */
export const ETAPAS_DA_LICAO = [
  'objetivo',
  'conceito',
  'processo',
  'exemplo',
  'contraste',
  'completion',
  'guiada',
  'recuperacao',
  'resumo',
] as const

export type EtapaDaLicao = (typeof ETAPAS_DA_LICAO)[number]

/** Título em PT-BR de cada etapa, para a tela e para o sumário. */
export const TITULO_DA_ETAPA: Record<EtapaDaLicao, string> = {
  objetivo: 'O que você vai aprender',
  conceito: 'A ideia',
  processo: 'A pergunta que você leva para a partida',
  exemplo: 'Resolvido passo a passo',
  contraste: 'Parecido, mas diferente',
  completion: 'Termine o raciocínio',
  guiada: 'Tente, com apoio',
  recuperacao: 'Agora sozinho',
  resumo: 'Para levar',
}

/**
 * A etapa cobra resposta do aluno?
 *
 * Deriva de uma lista só, e é o que a tela usa para decidir se mostra tabuleiro
 * interativo ou botão de avançar. Sem isto, cada tela decidiria por conta
 * própria e uma delas acabaria pedindo lance na etapa de leitura.
 */
const ETAPAS_QUE_COBRAM: readonly EtapaDaLicao[] = ['completion', 'guiada', 'recuperacao']

export function etapaCobraResposta(etapa: EtapaDaLicao): boolean {
  return ETAPAS_QUE_COBRAM.includes(etapa)
}

/**
 * A última etapa que COBRA resposta do aluno.
 *
 * É AQUI QUE A REGRA DO PEDAGOGY VIROU VERIFICÁVEL. "A lição termina em
 * recuperação ativa" deixou de poder ser afirmada como "a última da lista"
 * quando o resumo entrou depois dela; afirmá-la sobre o último degrau que exige
 * resposta mantém o conteúdo da regra e volta a dar ao portão algo para medir.
 *
 * DERIVADA das duas listas, e de nenhuma terceira. Acrescentar uma etapa que
 * cobre depois da recuperação muda o que esta função devolve, e o portão cai.
 */
export function ultimaEtapaQueCobra(): EtapaDaLicao {
  const cobram = ETAPAS_DA_LICAO.filter(etapaCobraResposta)
  return cobram[cobram.length - 1]
}

/**
 * Exercício de recuperação: o aluno responde SEM dica e sem o tema na tela.
 *
 * Herda `ExercicioPosicional` (de `@/domain/exercicios`) porque a prova de que
 * ele é conferível é a mesma do banco de diagnóstico, e ela mora num lugar só.
 */
export interface ExercicioDeRecuperacao extends ExercicioPosicional {
  /** O que se pede, em uma frase. NÃO nomeia o tema. */
  enunciado: string
  /** O que o exercício ensina. Só aparece DEPOIS da resposta. */
  explicacao: string
}

/**
 * Exercício GUIADO: o mesmo contrato, com a escada de dicas disponível.
 *
 * As dicas são TUPLA NÃO-VAZIA: um exercício guiado sem dica é um exercício
 * independente com outro nome, e a etapa inteira perderia o sentido.
 */
export interface ExercicioGuiado extends ExercicioPosicional {
  enunciado: string
  /** A escada, do mais vago ao mais específico. Ver `@/domain/aprendizado`. */
  dicas: NaoVazia<Dica>
  explicacao: string
}

/**
 * Completion problem (plano §13.6): parte do raciocínio vem pronta.
 *
 * `raciocinioJaFeito` é o que o app já concluiu POR ele, e é o que torna a
 * etapa mais fácil que a guiada. A pergunta que sobra é sempre a última.
 */
export interface ExercicioDeCompletion extends ExercicioPosicional {
  /** Os passos já resolvidos, em ordem. O aluno lê antes de responder. */
  raciocinioJaFeito: NaoVazia<string>
  /** A única pergunta que sobrou. */
  enunciado: string
  explicacao: string
}

/**
 * Exemplo resolvido: a solução à mostra, de propósito.
 *
 * É o "guidance" que o PEDAGOGY manda começar forte e desvanecer. O aluno vê a
 * linha inteira aqui, e depois responde sozinho na etapa seguinte.
 */
export interface ExemploResolvido {
  fen: string
  ladoDoAluno: Side
  objetivo: ObjetivoDeDiagnostico
  /**
   * Linha em UCI a partir de `fen`, alternando os lados e começando pelo aluno.
   * O PRIMEIRO lance é o que cumpre o objetivo, e é ele que o portão confere.
   */
  linhaModelo: NaoVazia<string>
  /**
   * O raciocínio, passo a passo, na ordem em que a cabeça o faz.
   *
   * NÃO é a linha comentada: é o caminho até ESCOLHER a linha. A diferença
   * importa — "1. Cf7+ ataca o rei e a torre" descreve o lance; "procurei
   * xeques primeiro, e este xeque toca outra peça" descreve como achá-lo, e é
   * isso que transfere para uma posição que o aluno nunca viu.
   */
  raciocinio: NaoVazia<string>
  /** Por que a linha funciona, em uma ou duas frases. */
  comentario: string
}

/**
 * Contraste (plano §13.5): a posição parecida em que a conclusão MUDA.
 *
 * `objetivo` é o MESMO tipo de objetivo do exemplo, e `lanceQueFalha` é a
 * jogada análoga à do exemplo — a que o aluno tentaria por semelhança visual. O
 * portão exige que ela FALHE aqui. É o lado do portão que morde para dentro: um
 * contraste cujo lance análogo também ganha não contrasta com nada, e ensinaria
 * ao aluno que a diferença que ele viu não existe.
 */
export interface Contraste {
  fen: string
  ladoDoAluno: Side
  objetivo: ObjetivoDeDiagnostico
  /** O lance análogo ao do exemplo. TEM de falhar aqui. */
  lanceQueFalha: string
  /** O que mudou na posição, em uma ou duas frases. */
  oQueMudou: string
}

/**
 * Marca de validação. NÃO é exportada de propósito: sem acesso à chave, nenhum
 * módulo de fora consegue montar um objeto que satisfaça `Licao` — o único
 * caminho é `definirLicao`.
 */
const LICAO_VALIDADA: unique symbol = Symbol('licao-validada')

export interface Licao {
  readonly [LICAO_VALIDADA]: true
  /** Único no catálogo. */
  id: string
  titulo: string
  /** Habilidade do catálogo que esta lição treina. */
  habilidade: SkillId
  /**
   * Versão do conteúdo. Sobe quando a lição muda de forma que um checkpoint
   * antigo deixe de fazer sentido. Ver `ActivityDefinition.contentVersion`.
   */
  versao: number
  /** O que o aluno vai aprender e por que importa. Uma ou duas frases. */
  objetivo: string
  /** O conceito em uma ou duas frases. Não é aula: é o que fica na cabeça. */
  conceito: string
  /** A pergunta reutilizável, em passos. O que o aluno leva para a partida. */
  processoMental: NaoVazia<string>
  exemploResolvido: ExemploResolvido
  contraste: Contraste
  completion: ExercicioDeCompletion
  /** Exercícios COM dica. Vêm antes dos sem dica. */
  guiada: NaoVazia<ExercicioGuiado>
  /** O FECHO. Tupla não-vazia: lição sem recuperação não existe. */
  recuperacao: NaoVazia<ExercicioDeRecuperacao>
  /** A lista mental de fechamento. Curta. */
  resumo: NaoVazia<string>
}

/** Uma lição antes de passar pela validação. */
export type EntradaDeLicao = Omit<Licao, typeof LICAO_VALIDADA>

/**
 * Única forma de produzir uma `Licao`.
 *
 * LANÇA em vez de devolver erro: aqui quem erra é quem escreve o conteúdo, e o
 * módulo nem chega a carregar — a varredura de módulos e qualquer tela que
 * importe o catálogo acusam na hora. Erro de conteúdo que vira valor de retorno
 * é erro que alguém esquece de olhar.
 *
 * O que ele confere é ESTRUTURA (listas não vazias, ids únicos). O que é
 * XADREZ — posição jogável, lance legal, objetivo cumprido — é
 * `verificarLicao`, que roda no portão do catálogo: rodar `chess.js` no tempo
 * de importação de todo módulo que toca uma lição sairia caro sem pegar nada
 * que o portão não pegue.
 */
export function definirLicao(entrada: EntradaDeLicao): Licao {
  if (entrada.recuperacao.length === 0) {
    throw new Error(`Lição ${entrada.id} não termina em recuperação ativa.`)
  }
  if (entrada.guiada.length === 0) {
    throw new Error(`Lição ${entrada.id} não tem prática guiada antes da independente.`)
  }
  if (entrada.processoMental.length === 0) {
    throw new Error(`Lição ${entrada.id} não ensina uma pergunta reutilizável.`)
  }

  // Ids únicos ATRAVÉS das etapas, e não dentro de cada uma: o progresso da
  // atividade guarda `completedItemIds` numa lista só, e dois exercícios com o
  // mesmo id em etapas diferentes fariam um marcar o outro como feito.
  const ids = [
    entrada.completion.id,
    ...entrada.guiada.map((e) => e.id),
    ...entrada.recuperacao.map((e) => e.id),
  ]
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Lição ${entrada.id} repete o id de um exercício.`)
  }

  return { ...entrada, [LICAO_VALIDADA]: true }
}

/** Todos os exercícios da lição, na ordem das etapas. Um lugar só os junta. */
export function exerciciosDaLicao(licao: Licao): ExercicioPosicional[] {
  return [licao.completion, ...licao.guiada, ...licao.recuperacao]
}

/** Minutos estimados. Derivado na hora, nunca gravado no conteúdo. */
export function estimarMinutos(licao: Licao, config: LicaoConfig = LICAO_CONFIG): number {
  return config.minutosDeLeitura + exerciciosDaLicao(licao).length * config.minutosPorExercicio
}

/**
 * As etapas da lição, na ordem em que a tela deve mostrá-las.
 *
 * A tela consome ISTO. Ela não monta a sequência por conta própria, e é por
 * isso que "termina em recuperação" vale para toda tela sem ninguém repetir a
 * regra em cada componente.
 */
export function etapasDaLicao(): readonly EtapaDaLicao[] {
  return ETAPAS_DA_LICAO
}

/** Problema encontrado numa lição. */
export type FalhaDeLicao = FalhaDeItem

/**
 * Confere uma lição inteira e devolve TODOS os problemas dela.
 *
 * O exemplo resolvido é conferido como o banco: o primeiro lance da linha tem
 * de CUMPRIR o objetivo declarado, e o resto da linha tem de ser jogável. Um
 * exemplo resolvido com linha ilegal é pior que nenhum exemplo — ele ensina
 * errado e parece certo.
 *
 * O CONTRASTE é conferido ao contrário, e essa é a parte que mais importa: o
 * lance análogo tem de FALHAR. Um contraste em que ele também ganha passaria
 * despercebido para sempre — a tela mostraria as duas posições lado a lado
 * afirmando que uma é diferente da outra, e nada no app discordaria.
 */
export function verificarLicao(licao: Licao): FalhaDeLicao[] {
  const falhas: FalhaDeLicao[] = []
  const exemplo = licao.exemploResolvido

  const veredito = avaliarLance(
    exemplo.fen,
    exemplo.ladoDoAluno,
    exemplo.linhaModelo[0],
    exemplo.objetivo,
  )
  if (!veredito.cumpre) {
    falhas.push({
      itemId: `${licao.id}/exemplo`,
      problema: `o exemplo resolvido não cumpre o objetivo: ${veredito.motivo}`,
    })
  }

  let fen = exemplo.fen
  for (const [indice, uci] of exemplo.linhaModelo.entries()) {
    const entrada = parseUci(normalizeUci(uci))
    const aplicado = entrada === null ? null : applyMove(fen, entrada)
    if (aplicado === null) {
      falhas.push({
        itemId: `${licao.id}/exemplo`,
        problema: `lance ${indice + 1} (${uci}) é ilegal em ${fen}`,
      })
      break
    }
    fen = aplicado.fenAfter
  }

  falhas.push(...verificarContraste(licao))

  for (const exercicio of exerciciosDaLicao(licao)) {
    falhas.push(...verificarExercicio(exercicio))
  }

  return falhas
}

/**
 * Confere o contraste: posição jogável, vez certa, e o lance análogo FALHANDO.
 *
 * Separado de `verificarLicao` para que o teste possa chamá-lo sozinho e a
 * mensagem de falha aponte o contraste, e não a lição inteira.
 */
export function verificarContraste(licao: Licao): FalhaDeLicao[] {
  const itemId = `${licao.id}/contraste`
  const { fen, ladoDoAluno, objetivo, lanceQueFalha } = licao.contraste

  if (!posicaoEhJogavel(fen)) {
    return [{ itemId, problema: `FEN inválido ou posição impossível: ${fen}` }]
  }
  const estado = positionStatus(fen)
  if (estado.turn !== ladoDoAluno) {
    return [{ itemId, problema: `o FEN do contraste não está na vez de ${ladoDoAluno}` }]
  }
  if (estado.isGameOver) {
    return [{ itemId, problema: 'a posição do contraste já está terminada' }]
  }

  // LEGALIDADE ANTES DO OBJETIVO, e a ordem importa. `avaliarLance` devolve
  // `cumpre: false` tanto para "é legal e não ganha" quanto para "não existe" —
  // e "não cumpre" é exatamente o que se espera do lance do contraste. Sem esta
  // checagem, um contraste cujo lance análogo é IMPOSSÍVEL ali passa em
  // silêncio, e a tela afirma ao aluno "o mesmo lance do exemplo não funciona
  // aqui" apontando para um lance que não existe na posição.
  if (!legalMoves(fen).some((lance) => lance.uci === normalizeUci(lanceQueFalha))) {
    return [
      {
        itemId,
        problema:
          `o lance análogo (${lanceQueFalha}) não é legal no contraste, então ele não é o ` +
          'mesmo lance do exemplo — é um lance que não existe',
      },
    ]
  }

  const veredito = avaliarLance(fen, ladoDoAluno, lanceQueFalha, objetivo)
  if (veredito.cumpre) {
    return [
      {
        itemId,
        problema:
          `o lance análogo (${lanceQueFalha}) TAMBÉM cumpre o objetivo no contraste, ` +
          'então não há contraste nenhum',
      },
    ]
  }

  return []
}
