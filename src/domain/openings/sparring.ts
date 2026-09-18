/**
 * O BOT QUE JOGA A ABERTURA CONTRA VOCÊ.
 *
 * O QUE ELE É: um adversário que conhece ESTA abertura — a linha principal e as
 * variações estudadas — e joga por ela. Não é uma engine, e isso é decisão de
 * produto, não limitação. Uma engine jogaria o melhor lance da posição, que
 * frequentemente NÃO é o lance da teoria; o aluno treinaria contra posições que
 * o repertório dele não prevê, e sairia achando que estudou errado.
 *
 * O ALUNO ESCOLHE O LADO, e os dois lados ensinam coisas diferentes:
 *
 * - jogando o LADO DO REPERTÓRIO, ele executa o que estudou;
 * - jogando o OUTRO LADO, ele descobre por que o adversário joga o que joga —
 *   que é a etapa "dois lados" da jornada virando prática.
 *
 * O BOT NUNCA SAI DA ÁRVORE. Ele só joga lances que a abertura declara. Quando a
 * posição sai do que foi estudado — porque o aluno jogou fora do repertório ou
 * porque a linha acabou —, ele diz isso em vez de inventar um lance: um bot que
 * improvisa transformaria o treino de repertório em partida livre, e o aluno não
 * teria como saber quando parou de treinar o que veio treinar.
 *
 * NADA AQUI DEPENDE DE REACT OU DE RELÓGIO. O sorteio entre duas continuações
 * igualmente teóricas recebe um `seed`, então a mesma partida é reproduzível e
 * o teste não precisa torcer.
 */

import { applyMove, normalizeUci, parseUci } from '@/lib/chess'
import type { OpeningDefinition, OpeningMoveLesson } from './index'

/** De que lado o aluno joga na sessão. */
export type LadoDoAluno = 'w' | 'b'

/**
 * Uma continuação que a abertura conhece, com o texto que a explica.
 *
 * `comment` vem do conteúdo e é o que transforma "o bot jogou Cf6" em "o bot
 * atacou e4 com tempo". Sem ele o sparring vira repetição muda.
 */
export interface ContinuacaoConhecida {
  uci: string
  san: string
  comment: string
  /** `true` quando o lance pertence à linha principal, e não a uma variação. */
  principal: boolean
}

export interface EstadoDoSparring {
  fen: string
  /** Lances jogados, do primeiro ao último. */
  historico: readonly string[]
  /** A posição ainda está dentro do que a abertura ensina? */
  naArvore: boolean
}

/**
 * Todas as linhas que a abertura conhece, cada uma como sequência de lances.
 *
 * A LINHA PRINCIPAL PRIMEIRO, e isso importa: ela é a que o repertório
 * recomenda, e é a que o bot joga na primeira partida (rodada 0). As variações
 * vêm em seguida, na ordem em que o conteúdo as declara.
 */
function linhas(opening: OpeningDefinition): { lances: OpeningMoveLesson[]; principal: boolean }[] {
  return [
    { lances: opening.mainline, principal: true },
    ...opening.variations.map((variacao) => ({ lances: variacao.line, principal: false })),
  ]
}

/**
 * A posição depois do lance, ou `null` se ele não for legal.
 *
 * `applyMove` devolve `{ move, fenAfter }` e não a FEN — passar o retorno
 * adiante como se fosse string produz um erro de parse três chamadas depois, com
 * a mensagem apontando para o lugar errado. O teste pegou.
 */
function fenApos(fen: string, uci: string): string | null {
  const lance = parseUci(uci)
  if (!lance) return null
  const resultado = applyMove(fen, lance)
  return resultado ? resultado.fenAfter : null
}

/**
 * O que a abertura oferece a partir do histórico jogado.
 *
 * A BUSCA É POR PREFIXO DE HISTÓRICO, e não por FEN. Duas ordens de lances
 * podem chegar à mesma posição (transposição), e comparar FEN faria o bot
 * oferecer a continuação de uma linha que o aluno não estava jogando — com o
 * comentário errado junto. O caminho percorrido é o que identifica a linha.
 */
export function continuacoesConhecidas(
  opening: OpeningDefinition,
  historico: readonly string[],
): ContinuacaoConhecida[] {
  const vistas = new Map<string, ContinuacaoConhecida>()

  for (const { lances, principal } of linhas(opening)) {
    if (lances.length <= historico.length) continue

    const casa = historico.every(
      (jogado, i) => normalizeUci(jogado) === normalizeUci(lances[i]?.uci ?? ''),
    )
    if (!casa) continue

    const proximo = lances[historico.length]
    if (!proximo) continue

    const chave = normalizeUci(proximo.uci)
    const existente = vistas.get(chave)
    // A linha principal ganha o comentário quando o mesmo lance aparece nas duas.
    if (!existente || (principal && !existente.principal)) {
      vistas.set(chave, {
        uci: chave,
        san: proximo.san,
        comment: proximo.comment,
        principal,
      })
    }
  }

  return [...vistas.values()].sort((a, b) => {
    if (a.principal !== b.principal) return a.principal ? -1 : 1
    return a.uci.localeCompare(b.uci)
  })
}

/** Começa uma sessão de sparring na posição inicial da abertura. */
export function iniciarSparring(opening: OpeningDefinition): EstadoDoSparring {
  return { fen: opening.rootFen, historico: [], naArvore: true }
}

/**
 * O lance do BOT nesta posição, ou `null` quando a abertura acabou.
 *
 * O BOT JOGA AS VARIAÇÕES, e não só a linha principal. Ele escolhe entre TODAS
 * as continuações que a abertura declara, e o `seed` — a rodada da sessão —
 * decide qual.
 *
 * ISTO JÁ FOI DIFERENTE, e estava errado: a versão anterior filtrava as opções
 * para a linha principal e só caía nas variações quando a principal acabava.
 * Como uma variação existe justamente para ramificar ONDE a principal continua,
 * o filtro a tornava inalcançável — o aluno estudava a Defesa dos Dois Cavalos
 * numa etapa e jamais a encontrava no treino. Variação que o adversário nunca
 * joga é decoração.
 *
 * A RODADA 0 É A LINHA PRINCIPAL, porque `continuacoesConhecidas` ordena com
 * ela primeiro. A primeira partida confirma o que foi ensinado; recomeçar traz
 * os desvios. As rodadas seguintes ciclam, então praticar várias vezes percorre
 * o repertório inteiro em vez de repetir a mesma partida.
 *
 * O SORTEIO É DETERMINÍSTICO. Um `Math.random()` aqui tornaria impossível
 * escrever o teste que prova "o bot nunca sai da árvore".
 */
export function lanceDoBot(
  opening: OpeningDefinition,
  estado: EstadoDoSparring,
  seed = 0,
): ContinuacaoConhecida | null {
  const opcoes = continuacoesConhecidas(opening, estado.historico)
  if (opcoes.length === 0) return null
  const base = baseDasBifurcacoes(opening, estado.historico)
  return opcoes[indiceDaEscolha(seed, base, opcoes.length)] ?? null
}

/**
 * Qual das continuações conhecidas o bot joga (plano VNext §48).
 *
 * O QUE ISTO CORRIGE, EM TRÊS ETAPAS E TRÊS DEFEITOS DIFERENTES.
 *
 * A primeira versão era `seed % opcoes`, e o `seed` é a RODADA — o mesmo valor
 * em todos os lances. O bot ficava previsível de um jeito chato: na rodada 1 ele
 * pegava a SEGUNDA opção em toda bifurcação, e o aluno aprendia o padrão do
 * sorteio em vez do repertório. A correção foi somar o ply.
 *
 * SOMAR O PLY TROUXE UM DEFEITO PIOR, e ele custou dois ramos de conteúdo antes
 * de ser entendido. Com `(seed + ply) % opcoes`, a escolha de uma bifurcação
 * fica amarrada à de outra. O caso mínimo é a Escandinava:
 *
 *   ply 3: opções [Qxd5, Nf6] -> (seed+3) % 2  =>  Qxd5 exige seed ÍMPAR
 *   ply 5: opções [Qa5, Qd6]  -> (seed+5) % 2  =>  Qd6  exige seed PAR
 *
 * Chegar a `Qd6` exige passar por `Qxd5`, e nenhum seed é par e ímpar ao mesmo
 * tempo. O ramo era inalcançável para sempre — não para alguns seeds.
 *
 * TROCAR A FÓRMULA POR UM HASH NÃO SERVE, e essa tentativa também foi feita e
 * desfeita. Um hash espalha, mas não PROMETE nada: o teste que cobra "alguma
 * rodada traz esta variação" dá ao aluno um orçamento pequeno de partidas, e
 * espalhamento aleatório erra uma combinação específica com folga dentro dele.
 * Seis variações do catálogo pararam de ser jogadas.
 *
 * A RESPOSTA É ENUMERAR, E NÃO SORTEAR. A rodada é lida como um número em BASE
 * MISTA sobre as bifurcações do caminho: cada bifurcação é uma casa, e o número
 * de opções dela é a base daquela casa. Assim as rodadas 0, 1, 2... percorrem
 * cada combinação exatamente uma vez, a rodada 0 continua sendo a linha
 * principal inteira (todos os dígitos em zero), e nenhuma combinação fica de
 * fora por aritmética.
 *
 * DETERMINÍSTICO. Um `Math.random()` tornaria impossível escrever o teste que
 * prova "o bot nunca sai da árvore".
 */
export function indiceDaEscolha(seed: number, base: number, opcoes: number): number {
  if (opcoes <= 1) return 0
  return Math.floor(seed / Math.max(1, base)) % opcoes
}

/**
 * Quantas combinações de bifurcação já foram gastas no caminho até aqui.
 *
 * É o "peso" do dígito desta casa na numeração de base mista: se o caminho já
 * passou por uma bifurcação de 2 opções e outra de 3, esta casa só troca de
 * valor a cada 6 rodadas. O produto é o que faz a contagem enumerar cada
 * combinação uma vez, em vez de repetir umas e pular outras.
 */
function baseDasBifurcacoes(opening: OpeningDefinition, historico: readonly string[]): number {
  /*
    SÓ AS BIFURCAÇÕES DO BOT CONTAM. Contando também as do aluno, a base inflaria
    com escolhas que o bot não faz: o dígito dele iria para uma casa alta, e o
    desvio passaria a exigir rodadas que ninguém joga.

    O lado do bot se deduz da paridade — esta função só é chamada na vez dele, e
    `historico.length` diz qual é essa vez.
  */
  const vezDoBot = historico.length % 2
  let base = 1
  for (let i = vezDoBot; i < historico.length; i += 2) {
    const quantas = continuacoesConhecidas(opening, historico.slice(0, i)).length
    if (quantas > 1) base *= quantas
  }
  return base
}

export type ResultadoDoLance =
  | { tipo: 'ilegal' }
  /** Jogado e ainda dentro da teoria. */
  | { tipo: 'na-teoria'; estado: EstadoDoSparring; continuacao: ContinuacaoConhecida }
  /**
   * Legal, mas fora do que esta abertura ensina.
   *
   * NÃO É "ERRADO" NO SENTIDO ABSOLUTO — pode ser um lance excelente. O que o
   * app pode afirmar é que ele sai do repertório estudado, e é só isso que ele
   * diz. Chamar de erro um lance que a abertura simplesmente não cobre seria a
   * explicação inventada que o CLAUDE.md proíbe.
   */
  | { tipo: 'fora-do-repertorio'; estado: EstadoDoSparring }

/** Aplica o lance do aluno e diz se ele continua dentro da teoria. */
export function jogarNoSparring(
  opening: OpeningDefinition,
  estado: EstadoDoSparring,
  uci: string,
): ResultadoDoLance {
  const canonico = normalizeUci(uci)
  const depois = fenApos(estado.fen, canonico)
  if (!depois) return { tipo: 'ilegal' }

  const historico = [...estado.historico, canonico]
  const conhecido = continuacoesConhecidas(opening, estado.historico).find(
    (opcao) => opcao.uci === canonico,
  )

  const proximo: EstadoDoSparring = {
    fen: depois,
    historico,
    naArvore: estado.naArvore && conhecido !== undefined,
  }

  return conhecido
    ? { tipo: 'na-teoria', estado: proximo, continuacao: conhecido }
    : { tipo: 'fora-do-repertorio', estado: proximo }
}

/** Aplica um lance do bot. Ele só joga o que a abertura conhece. */
export function aplicarLanceDoBot(
  estado: EstadoDoSparring,
  continuacao: ContinuacaoConhecida,
): EstadoDoSparring {
  const depois = fenApos(estado.fen, continuacao.uci)
  if (!depois) return estado
  return {
    fen: depois,
    historico: [...estado.historico, continuacao.uci],
    naArvore: estado.naArvore,
  }
}

/** O resultado de deixar o bot jogar até voltar a ser a vez do aluno. */
export interface AvancoDoBot {
  estado: EstadoDoSparring
  /** O comentário do último lance do bot, quando houve algum. */
  comentario: string | null
  /** A teoria acabou: o bot não tem mais o que jogar. */
  fimDaTeoria: boolean
}

/**
 * Deixa o bot jogar até a vez voltar ao aluno.
 *
 * POR QUE ISTO É UMA FUNÇÃO DE DOMÍNIO e não um efeito na tela: o bot responder
 * é CONSEQUÊNCIA do lance do aluno, não efeito de renderização. A primeira
 * versão vivia num `useEffect` que escrevia estado — o lint do projeto reprovou,
 * com razão, e o desenho aqui é melhor de qualquer forma: a sequência
 * "aluno joga → bot responde" vira uma transição só, testável sem React.
 *
 * O LAÇO TEM TETO. A abertura é finita e `lanceDoBot` devolve `null` no fim,
 * mas um conteúdo com uma linha circular travaria o navegador — e travar é pior
 * que parar cedo demais.
 */
export function deixarBotJogar(
  opening: OpeningDefinition,
  inicial: EstadoDoSparring,
  ladoDoAluno: LadoDoAluno,
  seed = 0,
): AvancoDoBot {
  let estado = inicial
  let comentario: string | null = null

  for (let passo = 0; passo < 64; passo += 1) {
    if (!estado.naArvore) return { estado, comentario, fimDaTeoria: false }
    if (!ehVezDoBot(estado, ladoDoAluno)) return { estado, comentario, fimDaTeoria: false }

    const escolha = lanceDoBot(opening, estado, seed)
    if (!escolha) return { estado, comentario, fimDaTeoria: true }

    estado = aplicarLanceDoBot(estado, escolha)
    comentario = escolha.comment
  }

  return { estado, comentario, fimDaTeoria: false }
}

/**
 * De quem é a vez, lido da posição.
 *
 * DERIVADO DA FEN e não contado de cabeça: o número de lances jogados diria a
 * mesma coisa só enquanto a raiz fosse sempre das brancas, e várias aberturas
 * de repertório de pretas começam com o lance branco já feito.
 */
export function vezDe(estado: EstadoDoSparring): LadoDoAluno {
  return estado.fen.split(' ')[1] === 'b' ? 'b' : 'w'
}

/** O bot joga agora? */
export function ehVezDoBot(estado: EstadoDoSparring, ladoDoAluno: LadoDoAluno): boolean {
  return vezDe(estado) !== ladoDoAluno
}
