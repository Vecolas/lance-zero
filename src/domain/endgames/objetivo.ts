/**
 * Objetivo de uma posição de final, e a sua verificação.
 *
 * DECISÃO CENTRAL: o objetivo de um final é VERIFICÁVEL POR CÓDIGO, nunca por
 * opinião. "Converter a vantagem" e "jogar bem" não entram aqui — só condições
 * que `avaliarObjetivo` sabe decidir olhando o tabuleiro. Um objetivo que só um
 * humano sabe julgar vira, na prática, um objetivo que ninguém julga: a lição
 * fica verde para qualquer coisa que o aluno faça.
 *
 * Segunda decisão: nada aqui chama engine nem rede. A função é pura e roda em
 * milissegundos, para poder ser aplicada a cada lance do treino e para o portão
 * do currículo poder varrer todas as posições sem depender de serviço externo.
 *
 * TERCEIRA DECISÃO — O EMPATE TEM UMA REGRA, E ELA SE DIZ (issue do empate por
 * repetição). Duas metades:
 *
 * 1. AS QUATRO REGRAS DE EMPATE SÃO RECONHECIDAS, inclusive as duas que dependem
 *    de HISTÓRICO. Afogamento e material insuficiente saem do próprio FEN; a
 *    regra dos 50 lances sai do contador de meios-lances do FEN; a REPETIÇÃO sai
 *    do `ContextoObjetivo`, que carrega as identidades das posições anteriores.
 *
 *    O defeito que isto conserta é do pior tipo: as três posições de
 *    `empate-defendido` do currículo são empate teórico, e a defesa natural em
 *    rei-e-peão termina em TRÍPLICE REPETIÇÃO. Antes disto, o aluno segurava o
 *    empate exatamente como a lição ensina e a tela nunca dizia "cumprido" — o
 *    app punia quem fez certo.
 *
 * 2. QUAL regra fechou a partida é DADO DE RETORNO (`regraDoEmpate`), e não um
 *    motivo a mais na união. "Empate por repetição" e "empate pela regra dos 50
 *    lances" ensinam coisas diferentes, e um "cumprido" mudo não ensina
 *    nenhuma. Ficar fora do motivo é de propósito: a mesma regra pode ser boa
 *    notícia (defendi o empate) ou má (era para dar mate e eu repeti), e
 *    duplicar cada regra em dois motivos criaria uma união combinatória com
 *    duas fontes para a mesma verdade.
 *
 * O QUE ESTA FUNÇÃO CONTINUA NÃO FAZENDO, declarado para ninguém supor o
 * contrário: ela não reconhece o aluno GANHANDO uma posição de
 * `empate-defendido` (dar mate no adversário também é "não perder"). No
 * currículo de hoje o aluno defende com rei sozinho ou rei e peão contra rei, e
 * mate ali é impossível — então o caminho é inalcançável. Vira produto no dia
 * em que existir uma posição de defesa com material que dê mate.
 */

import type { Side } from '@/domain/types'
import { positionStatus, type PieceType, type PromotionPiece } from '@/lib/chess'
import { identidadeDePosicao } from '@/lib/openings/identidade'

/**
 * Os tipos de objetivo que existem.
 *
 * É a FONTE que o portão do currículo varre: um tipo novo que entre aqui e não
 * seja tratado em `avaliarObjetivo` ou não apareça no currículo reprova. Lista
 * escrita à mão em outro lugar nunca acusaria o que nunca entrou nela.
 */
export const TIPOS_DE_OBJETIVO = ['mate-em', 'promocao', 'empate-defendido'] as const

export type TipoDeObjetivo = (typeof TIPOS_DE_OBJETIVO)[number]

/** Dar mate em no máximo `lancesMaximos` lances do aluno. */
export interface ObjetivoMateEm {
  tipo: 'mate-em'
  /** Meios-lances DO ALUNO permitidos até o mate. */
  lancesMaximos: number
}

/**
 * Promover um peão.
 *
 * A condição é expressa como "ter pelo menos N peças do tipo X", e não como
 * "promoveu", porque essa é a forma que se decide olhando só o FEN atual. O
 * portão do currículo exige que a condição NÃO esteja satisfeita na posição
 * inicial — senão o objetivo nasceria cumprido e a lição aprovaria qualquer
 * lance.
 */
export interface ObjetivoPromocao {
  tipo: 'promocao'
  peca: PromotionPiece
  quantidadeMinima: number
}

/** Segurar o empate com a posição inferior. */
export interface ObjetivoEmpateDefendido {
  tipo: 'empate-defendido'
}

export type ObjetivoFinal = ObjetivoMateEm | ObjetivoPromocao | ObjetivoEmpateDefendido

/**
 * Motivos possíveis, como CÓDIGO e não como frase.
 *
 * Quem desenha a tela traduz; função de domínio não tem tradutor e não deve
 * inventar um. De quebra, o teste não passa a depender do idioma da máquina.
 *
 * NÃO existe motivo por regra de empate. A regra vem em `regraDoEmpate`, ao
 * lado do motivo — ver a terceira decisão do cabeçalho. `afogamento-indevido`
 * morava aqui e SAIU por isso: ele era a segunda fonte de "qual regra empatou",
 * e ficava mudo sobre as outras três.
 */
export const MOTIVOS_DE_OBJETIVO = [
  'mate-aplicado',
  'promocao-alcancada',
  'empate-alcancado',
  'aluno-recebeu-mate',
  'empate-indevido',
  'lances-esgotados',
  'sem-peao-para-promover',
  'em-andamento',
] as const

export type MotivoDeObjetivo = (typeof MOTIVOS_DE_OBJETIVO)[number]

/**
 * As regras do xadrez que fecham uma partida em empate.
 *
 * É a FONTE que a tela varre: regra nova aqui sem apresentação em PT-BR não
 * compila.
 *
 * `nao-identificada` NÃO é uma regra do xadrez — é a ausência de nome. Ela
 * existe para o caso em que o `chess.js` reconhece um empate que as quatro
 * regras acima não explicam (uma regra nova na biblioteca, por exemplo). Dizer
 * "empatou, e não sei por qual regra" é honesto; escolher uma regra no escuro
 * seria a mentira silenciosa. Um portão prova que as quatro conhecidas nunca
 * caem aqui.
 */
export const REGRAS_DE_EMPATE = [
  'afogamento',
  'material-insuficiente',
  'repeticao',
  'regra-dos-50-lances',
  'nao-identificada',
] as const

export type RegraDeEmpate = (typeof REGRAS_DE_EMPATE)[number]

/**
 * Os números das regras de empate.
 *
 * NÃO são heurística de produto nem limite de design: são AS REGRAS DO XADREZ.
 * Estão exportados para o teste poder afirmar a regra em vez de repetir o
 * número, e não para alguém girar o botão. Mexer aqui é mudar o xadrez.
 *
 * Os dois valores são os da reivindicação (três ocorrências, 50 lances), e não
 * os do empate automático da FIDE (cinco ocorrências, 75 lances). É a mesma
 * escolha do `chess.js` e a que o aluno vai fazer num torneio: quando a posição
 * aparece pela terceira vez, o empate é dele se ele quiser. No treino não há
 * adversário para recusar, então ela é dada.
 */
export const REGRAS_DO_EMPATE = {
  /** Ocorrências da MESMA posição que consumam a repetição. */
  ocorrenciasParaRepeticao: 3,
  /** Meios-lances sem captura nem lance de peão que consumam a regra dos 50 lances. */
  meiosLancesSemProgresso: 100,
} as const

/**
 * Estado tri-valorado de propósito.
 *
 * Booleano esconderia a diferença entre "ainda dá" e "já era", que é
 * exatamente o que a tela precisa saber para oferecer recomeçar a posição.
 */
export type EstadoDoObjetivo = 'cumprido' | 'falhou' | 'em-andamento'

export interface ResultadoObjetivo {
  estado: EstadoDoObjetivo
  motivo: MotivoDeObjetivo
  /**
   * A regra do xadrez que fechou a partida em empate, ou `null` quando não
   * houve empate. É o que permite à tela ensinar POR QUE o empate valeu, em vez
   * de um "cumprido" mudo.
   */
  regraDoEmpate: RegraDeEmpate | null
}

/**
 * O que a avaliação precisa saber além do tabuleiro.
 *
 * Os três campos são OBRIGATÓRIOS de propósito. Campo opcional aqui seria o
 * desenho em que alguém esquece de passar `lancesDoAluno` e todo mate em 2 vira
 * mate em qualquer número de lances, sem uma linha no console — ou esquece
 * `identidadesAnteriores` e a repetição volta a nunca ser reconhecida, que é o
 * defeito que este arquivo acabou de consertar.
 *
 * NÃO MONTE ESTE OBJETO À MÃO em código de produção. Ele é DERIVADO da
 * tentativa, e quem o deriva é `historico.ts` (`contextoInicial`,
 * `avancarContexto`, `percorrerTentativa`). Montá-lo à mão em cinco lugares é
 * como `lancesDoAluno` e `identidadesAnteriores` passam a discordar entre si.
 */
export interface ContextoObjetivo {
  /** Lado que o aluno joga. */
  ladoDoAluno: Side
  /** Meios-lances DO ALUNO já jogados a partir da posição inicial. */
  lancesDoAluno: number
  /**
   * Identidades (`identidadeDePosicao`) de todas as posições da tentativa
   * ANTERIORES à que está sendo avaliada, da inicial em diante, na ordem.
   * Array vazio na posição inicial.
   *
   * São IDENTIDADES, e não FENs, porque repetição se conta por POSIÇÃO: mesma
   * disposição de peças, mesma vez de jogar, mesmos direitos de roque e mesma
   * casa de en passant — e os contadores de fora. Comparar FEN inteiro nunca
   * acharia repetição nenhuma (o contador de meios-lances muda a cada lance) e
   * comparar só o tabuleiro acharia repetição onde não há.
   */
  identidadesAnteriores: readonly string[]
}

/** Tipos de peça que podem aparecer num FEN. É a fonte da contagem. */
const TIPOS_DE_PECA: readonly PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k']

export type ContagemDePecas = Record<PieceType, number>

/**
 * Conta as peças de uma cor lendo o campo de tabuleiro do FEN.
 *
 * Mora aqui, e não em `@/lib/chess`, porque o adapter de xadrez ainda não expõe
 * o tabuleiro e este arquivo não pode editá-lo. Quando expuser, esta função
 * muda de casa — é uma dívida conhecida, não um desenho.
 */
export function contarPecas(fen: string, cor: Side): ContagemDePecas {
  const contagem: ContagemDePecas = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }
  const tabuleiro = fen.trim().split(/\s+/)[0] ?? ''
  for (const caractere of tabuleiro) {
    const ehBranca = caractere >= 'A' && caractere <= 'Z'
    const tipo = caractere.toLowerCase() as PieceType
    if (!TIPOS_DE_PECA.includes(tipo)) {
      continue
    }
    if ((cor === 'w') !== ehBranca) {
      continue
    }
    contagem[tipo] += 1
  }
  return contagem
}

/** Índice do campo de meios-lances sem progresso no FEN (o quinto). */
const CAMPO_DE_MEIOS_LANCES = 4

/**
 * Meios-lances desde a última captura ou lance de peão, lidos do FEN.
 *
 * Exportada porque é regra conferível, e regra conferível merece teste próprio.
 *
 * LANÇA quando o campo não é um número. O FEN que chega aqui já passou pelo
 * `positionStatus`, então isso é bug de quem chama; devolver 0 faria a regra
 * dos 50 lances simplesmente parar de existir, sem uma linha no console.
 */
export function meiosLancesSemProgresso(fen: string): number {
  const campo = fen.trim().split(/\s+/)[CAMPO_DE_MEIOS_LANCES]
  const valor = Number(campo)
  if (campo === undefined || !Number.isInteger(valor) || valor < 0) {
    throw new Error(`FEN sem contador de meios-lances utilizável: ${fen}`)
  }
  return valor
}

/**
 * Quantas vezes ESTA posição já apareceu na tentativa, contando a atual.
 *
 * Exportada pelo mesmo motivo de `meiosLancesSemProgresso`: a contagem da
 * repetição é a regra que este arquivo passou a reconhecer, e ela merece um
 * teste que não dependa do resto da avaliação.
 */
export function ocorrenciasDaPosicao(fen: string, contexto: ContextoObjetivo): number {
  const identidade = identidadeDePosicao(fen)
  let ocorrencias = 1
  for (const anterior of contexto.identidadesAnteriores) {
    if (anterior === identidade) {
      ocorrencias += 1
    }
  }
  return ocorrencias
}

function adversarioDe(lado: Side): Side {
  return lado === 'w' ? 'b' : 'w'
}

type Status = ReturnType<typeof positionStatus>

/**
 * A regra que fechou a partida em empate, ou `null` se ela não terminou
 * empatada.
 *
 * A ORDEM É UMA DECISÃO, e é da mais imediata para a mais acumulada: o
 * afogamento e o material insuficiente descrevem O TABULEIRO DE AGORA, enquanto
 * a repetição e os 50 lances descrevem um HISTÓRICO. Uma posição pode satisfazer
 * mais de uma; contar ao aluno a que ele acabou de ver no tabuleiro ensina mais
 * que contar a que se acumulou há quarenta lances.
 *
 * O ÚLTIMO `if` É UM CANÁRIO, não um caso de uso. Se o `chess.js` disser
 * "empate" e nenhuma das quatro regras tiver explicado, alguma coisa
 * discordou — e o aluno lê "não sei por qual regra" em vez de uma regra
 * inventada. É também o que pega um erro nosso ao ler o contador de
 * meios-lances: a regra dos 50 lances sairia daqui como `nao-identificada` em
 * vez de sumir em silêncio.
 */
function regraDoEmpateEm(
  fen: string,
  status: Status,
  contexto: ContextoObjetivo,
): RegraDeEmpate | null {
  if (status.isStalemate) {
    return 'afogamento'
  }
  if (status.isInsufficientMaterial) {
    return 'material-insuficiente'
  }
  // Com menos posições anteriores do que a regra pede, três ocorrências são
  // aritmeticamente impossíveis — e calcular a identidade custa duas cargas de
  // FEN. O atalho não muda veredito nenhum: é a mesma conta, sem fazê-la.
  if (
    contexto.identidadesAnteriores.length >= REGRAS_DO_EMPATE.ocorrenciasParaRepeticao - 1 &&
    ocorrenciasDaPosicao(fen, contexto) >= REGRAS_DO_EMPATE.ocorrenciasParaRepeticao
  ) {
    return 'repeticao'
  }
  if (meiosLancesSemProgresso(fen) >= REGRAS_DO_EMPATE.meiosLancesSemProgresso) {
    return 'regra-dos-50-lances'
  }
  return status.isDraw ? 'nao-identificada' : null
}

/**
 * Diz se a posição atual cumpre o objetivo.
 *
 * FEN inválido LANÇA (via `positionStatus`), de propósito: FEN inválido
 * chegando aqui é bug de quem chama, não situação de treino. Devolver
 * `em-andamento` para um FEN quebrado seria o desenho em que o erro passa.
 */
export function avaliarObjetivo(
  fen: string,
  objetivo: ObjetivoFinal,
  contexto: ContextoObjetivo,
): ResultadoObjetivo {
  const status = positionStatus(fen)
  const adversario = adversarioDe(contexto.ladoDoAluno)

  // Levar mate derruba qualquer objetivo, inclusive o de segurar empate.
  if (status.isCheckmate && status.turn === contexto.ladoDoAluno) {
    return { estado: 'falhou', motivo: 'aluno-recebeu-mate', regraDoEmpate: null }
  }

  const regraDoEmpate = regraDoEmpateEm(fen, status, contexto)

  switch (objetivo.tipo) {
    case 'mate-em':
      return avaliarMate(status, objetivo, contexto, adversario, regraDoEmpate)
    case 'promocao':
      return avaliarPromocao(fen, objetivo, contexto, regraDoEmpate)
    case 'empate-defendido':
      return avaliarEmpate(regraDoEmpate)
    default:
      // Tipo novo no union sem tratamento aqui: o compilador reprova nesta linha.
      return objetivoNaoTratado(objetivo)
  }
}

function objetivoNaoTratado(objetivo: never): never {
  throw new Error(`Objetivo de final sem tratamento: ${JSON.stringify(objetivo)}`)
}

/** Nem cumprido, nem falhado, e sem empate nenhum para explicar. */
const EM_ANDAMENTO: ResultadoObjetivo = {
  estado: 'em-andamento',
  motivo: 'em-andamento',
  regraDoEmpate: null,
}

function avaliarMate(
  status: Status,
  objetivo: ObjetivoMateEm,
  contexto: ContextoObjetivo,
  adversario: Side,
  regraDoEmpate: RegraDeEmpate | null,
): ResultadoObjetivo {
  if (status.isCheckmate && status.turn === adversario) {
    return contexto.lancesDoAluno <= objetivo.lancesMaximos
      ? { estado: 'cumprido', motivo: 'mate-aplicado', regraDoEmpate: null }
      : { estado: 'falhou', motivo: 'lances-esgotados', regraDoEmpate: null }
  }
  if (regraDoEmpate !== null) {
    return { estado: 'falhou', motivo: 'empate-indevido', regraDoEmpate }
  }
  if (contexto.lancesDoAluno >= objetivo.lancesMaximos) {
    return { estado: 'falhou', motivo: 'lances-esgotados', regraDoEmpate: null }
  }
  return EM_ANDAMENTO
}

function avaliarPromocao(
  fen: string,
  objetivo: ObjetivoPromocao,
  contexto: ContextoObjetivo,
  regraDoEmpate: RegraDeEmpate | null,
): ResultadoObjetivo {
  const contagem = contarPecas(fen, contexto.ladoDoAluno)
  // Vem ANTES do empate de propósito: promover a dama que afoga o rei adversário
  // cumpre o objetivo declarado desta posição. Inverter a ordem transformaria o
  // lance que a lição pede em falha.
  if (contagem[objetivo.peca] >= objetivo.quantidadeMinima) {
    return { estado: 'cumprido', motivo: 'promocao-alcancada', regraDoEmpate }
  }
  // Sem peão não há promoção possível: é falha, não "ainda dá".
  if (contagem.p === 0) {
    return { estado: 'falhou', motivo: 'sem-peao-para-promover', regraDoEmpate }
  }
  if (regraDoEmpate !== null) {
    return { estado: 'falhou', motivo: 'empate-indevido', regraDoEmpate }
  }
  return EM_ANDAMENTO
}

/**
 * Segurar o empate: cumprido SÓ quando o empate está CONSUMADO.
 *
 * Enquanto nenhuma regra fechou a partida, a resposta certa é `em-andamento`,
 * mesmo numa posição que a tablebase já sabe empatada. Antecipar o "cumprido"
 * seria o mesmo defeito de sinal trocado que este arquivo existe para
 * consertar, só que ao contrário: dizer que o aluno segurou o empate quando ele
 * apenas ainda não perdeu.
 */
function avaliarEmpate(regraDoEmpate: RegraDeEmpate | null): ResultadoObjetivo {
  return regraDoEmpate === null
    ? EM_ANDAMENTO
    : { estado: 'cumprido', motivo: 'empate-alcancado', regraDoEmpate }
}
