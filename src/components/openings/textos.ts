/**
 * Texto em PT-BR e apresentação dos estados da tela de aberturas.
 *
 * DECISÃO 1 — A TRADUÇÃO É DA TELA, e o domínio nunca devolve frase.
 * `frequenciaDoRepertorio` devolve contagens e o adapter do explorer devolve
 * CÓDIGO (`MotivoDeIndisponibilidade`). As frases moram aqui, num `Record` sobre
 * a união: motivo novo no adapter NÃO COMPILA sem frase escrita. Um mapa
 * indexado por `string` com valor padrão seria o desenho em que o código novo
 * aparece na tela como "" e ninguém percebe.
 *
 * DECISÃO 2 — LACUNA E DESVIO SÃO COISAS DIFERENTES E PEDEM AÇÕES OPOSTAS.
 * `frequencia.ts` já as separa no domínio (DECISÃO 4 de lá); esta tela é o lugar
 * onde a separação vira ou não vira produto. Lacuna é o ADVERSÁRIO jogando o que
 * o repertório não cobre: conteúdo a ESCREVER, e não erro do aluno. Desvio é o
 * aluno jogando diferente do próprio repertório: treino a FAZER. Fundir as duas
 * numa lista de "fora do livro" apagaria o diagnóstico inteiro e mandaria o
 * aluno estudar quando o que falta é escrever, ou o contrário. Por isso as duas
 * apresentações vivem no mesmo `Record` — para que ninguém escreva a terceira
 * sem decidir de qual das duas ela é.
 *
 * DECISÃO 3 — CADA MOTIVO DE INDISPONIBILIDADE DO EXPLORER TEM FRASE PRÓPRIA, e
 * a diferença que importa é uma só: insistir resolve ou não resolve. `timeout`
 * convida a tentar de novo; `sem-autorizacao` não, e oferecer um botão de
 * repetir ali seria convidar o aluno a bater na mesma porta fechada. Isso é
 * DERIVADO de `MOTIVOS_PASSAGEIROS`, não escrito duas vezes.
 *
 * DECISÃO 4 — "NÃO HÁ ESTATÍSTICA" NUNCA É "NÃO HÁ PARTIDAS". É o defeito que o
 * adapter foi desenhado para evitar (ver o cabeçalho de
 * `lib/openings/explorer.ts`) e que só a tela pode cometer: se qualquer frase de
 * indisponibilidade disser "esta posição não tem partidas", o app passa a
 * afirmar uma falsidade sobre o mundo inteiro sem uma linha no console. A frase
 * verdadeira de "nenhuma partida chegou aqui" existe separada, e só é alcançável
 * quando o serviço RESPONDEU. O portão varre as duas pontas.
 *
 * DECISÃO 5 — SEM PARTIDA IMPORTADA, NENHUM NÚMERO. O estado vazio da frequência
 * não tem dígito nenhum, e o portão cobra isso literalmente. Um "0 partidas fora
 * do livro" é uma afirmação sobre dados que não existem.
 *
 * DECISÃO 6 — STATUS NUNCA SÓ POR COR. O que a tela recebe daqui é sempre o trio
 * ícone + texto + tom, como em `components/endgames/textos.ts`. Não existe
 * função que devolva só o tom, para não existir o caminho em que alguém pinta um
 * chip e esquece o resto.
 */

import type { MotivoDeIndisponibilidade } from '@/lib/openings'
import { instanteDe } from '@/lib/tempo'
import type {
  Abertura,
  ExplorerFilters,
  ExplorerStats,
  Side,
  VelocidadeExplorer,
} from '@/domain/types'
import type { FrequenciaDeRepertorio } from '@/domain/repertoire'

/**
 * Tons possíveis nesta tela.
 *
 * Tom novo aqui sem classe correspondente no CSS apareceria sem cor nenhuma, em
 * silêncio — por isso o portão varre esta lista contra a folha de estilo.
 */
export const TONS_DA_ABERTURA = ['ok', 'atencao', 'ruim', 'neutro'] as const

export type TomDaAbertura = (typeof TONS_DA_ABERTURA)[number]

// -------------------------------------------------------------- básicos

/** Nome exibível de uma abertura: português quando existe, canônico quando não. */
export function nomeDaAbertura(abertura: Abertura): string {
  return abertura.nomePt ?? abertura.nome
}

/** "brancas" ou "pretas". Um lugar só, para não haver dois jeitos de escrever. */
export function nomeDoLado(lado: Side): string {
  return lado === 'w' ? 'brancas' : 'pretas'
}

/**
 * Número do lance a partir da profundidade em meios-lances.
 *
 * `nivel` é quantos meios-lances JÁ foram jogados antes deste: 0 é o primeiro
 * lance das brancas. A paridade decide se sai `1.` ou `1...`, e é ela que faz o
 * lance do adversário ser lido como lance do adversário.
 */
export function numeroDoLance(nivel: number): string {
  const numero = Math.floor(nivel / 2) + 1
  return nivel % 2 === 0 ? `${numero}.` : `${numero}...`
}

/** `1. e4` / `1... e5`. */
export function lanceComNumero(nivel: number, san: string): string {
  return `${numeroDoLance(nivel)} ${san}`
}

/**
 * Uma sequência de SAN como se escreve numa partida: `1. e4 e5 2. Nf3`.
 *
 * Caminho vazio é a posição inicial, e dizer isso com todas as letras é melhor
 * que devolver string vazia — a frase que a usa ficaria pela metade.
 */
export function caminhoLegivel(sans: readonly string[]): string {
  if (sans.length === 0) {
    return 'a posição inicial'
  }
  const partes: string[] = []
  for (let i = 0; i < sans.length; i += 1) {
    if (i % 2 === 0) {
      partes.push(`${Math.floor(i / 2) + 1}.`)
    }
    partes.push(sans[i])
  }
  return partes.join(' ')
}

/** `1 partida` / `N partidas`. */
export function contagemDePartidas(n: number): string {
  return n === 1 ? '1 partida' : `${n} partidas`
}

/** `1 vez` / `N vezes`. */
export function contagemDeVezes(n: number): string {
  return n === 1 ? '1 vez' : `${n} vezes`
}

/**
 * Data curta, ou `null` quando o `playedAt` não é legível.
 *
 * A conversão passa por `instanteDe` porque ele é o dono da regra neste projeto.
 * `null` em vez de um traço: quem exibe decide o que fazer com ilegível, em vez
 * de receber um traço que parece dado.
 */
export function dataCurta(iso: string | null): string | null {
  if (iso === null) {
    return null
  }
  const instante = instanteDe(iso)
  return instante === null ? null : new Date(instante).toLocaleDateString('pt-BR')
}

// --------------------------------------------------------- saídas do livro

/** Os dois jeitos de sair do repertório. Ver DECISÃO 2. */
export const TIPOS_DE_SAIDA = ['lacuna', 'desvio'] as const

export type TipoDeSaida = (typeof TIPOS_DE_SAIDA)[number]

export interface ApresentacaoDaSaida {
  titulo: string
  icone: string
  tom: TomDaAbertura
  /** O que aconteceu, sem culpar quem não tem culpa. */
  explicacao: string
  /** O que fazer. As duas ações apontam para lados OPOSTOS de propósito. */
  acao: string
  /** A frase de uma ocorrência, com a contagem real. Fonte única do texto. */
  frase: (partidas: number) => string
  /**
   * O que dizer quando a lista está vazia E há partidas lidas.
   *
   * Mora aqui, e não num `if` dentro do componente, porque um componente que
   * conhece os dois tipos por dentro nasce com o terceiro escrevendo a frase de
   * um dos outros dois.
   */
  vazio: string
}

export const APRESENTACAO_POR_SAIDA: Record<TipoDeSaida, ApresentacaoDaSaida> = {
  lacuna: {
    titulo: 'Lacunas do repertório',
    icone: '+',
    tom: 'neutro',
    explicacao:
      'O adversário jogou algo que o seu repertório não cobre. Não é erro seu: é conteúdo que ainda não foi escrito.',
    acao: 'Escrever a linha que falta, começando pela primeira da lista — ela é a que você mais encontra.',
    frase: (partidas) =>
      `Você enfrentou isto ${contagemDeVezes(partidas)} e o repertório não cobre.`,
    vazio: 'Nenhuma nas partidas lidas: o adversário não saiu do que está escrito.',
  },
  desvio: {
    titulo: 'Desvios do seu repertório',
    icone: '!',
    tom: 'atencao',
    explicacao:
      'Aqui quem saiu do repertório foi você: a linha existe, está escrita, e o lance jogado no tabuleiro foi outro.',
    acao: 'Treinar a posição. É revisão espaçada, não conteúdo novo — o lance já está decidido.',
    frase: (partidas) => `Você saiu do próprio repertório aqui ${contagemDeVezes(partidas)}.`,
    vazio: 'Nenhum nas partidas lidas: você jogou o que o repertório prescreve.',
  },
}

// --------------------------------------------------- situação da frequência

/**
 * O que dá para dizer sobre as partidas importadas.
 *
 * É união discriminada, e não um punhado de booleanos, porque cada situação pede
 * uma frase inteira diferente — e porque `sem-partidas` precisa ser um estado
 * que a tela sabe distinguir de "zero saídas do livro".
 */
export type SituacaoDaFrequencia =
  | { tipo: 'sem-partidas' }
  | { tipo: 'so-do-outro-lado'; recebidas: number }
  | { tipo: 'nada-legivel'; ilegiveis: number }
  | { tipo: 'com-partidas'; consideradas: number; noLivro: number; ilegiveis: number }

/**
 * Lê a situação a partir do resultado do domínio. Derivação, não segunda fonte.
 *
 * A ordem dos testes importa: `partidasIlegiveis` só é contado para partidas do
 * lado certo, então "nenhuma considerada e algumas ilegíveis" quer dizer que as
 * partidas certas existiam e não deram para ler — bem diferente de "todas as
 * partidas eram do outro lado".
 */
export function situacaoDaFrequencia(frequencia: FrequenciaDeRepertorio): SituacaoDaFrequencia {
  if (frequencia.partidasRecebidas === 0) {
    return { tipo: 'sem-partidas' }
  }
  if (frequencia.partidasConsideradas === 0) {
    return frequencia.partidasIlegiveis > 0
      ? { tipo: 'nada-legivel', ilegiveis: frequencia.partidasIlegiveis }
      : { tipo: 'so-do-outro-lado', recebidas: frequencia.partidasRecebidas }
  }
  return {
    tipo: 'com-partidas',
    consideradas: frequencia.partidasConsideradas,
    noLivro: frequencia.partidasNoLivro,
    ilegiveis: frequencia.partidasIlegiveis,
  }
}

/**
 * A frase da situação.
 *
 * `sem-partidas` não tem dígito nenhum, e o portão cobra isso: inventar um zero
 * ali seria afirmar alguma coisa sobre dados que não existem.
 */
export function fraseDaSituacao(situacao: SituacaoDaFrequencia, lado: Side): string {
  const cor = nomeDoLado(lado)
  switch (situacao.tipo) {
    case 'sem-partidas':
      return (
        'Nenhuma partida importada ainda. Sem partidas, não dá para dizer o que você enfrenta — ' +
        'e prefiro não dizer nada a inventar. Importe as suas em Partidas.'
      )
    case 'so-do-outro-lado':
      return (
        `Você importou ${contagemDePartidas(situacao.recebidas)}, e nenhuma delas foi jogada ` +
        `de ${cor}. Este repertório ainda não tem o que medir.`
      )
    case 'nada-legivel':
      return (
        `Não consegui ler o PGN de ${contagemDePartidas(situacao.ilegiveis)} suas de ${cor}. ` +
        'Nenhuma entrou na conta, e por isso não há frequência para mostrar aqui.'
      )
    case 'com-partidas': {
      const inteiras =
        situacao.noLivro === 1
          ? '1 ficou inteira dentro do repertório'
          : `${situacao.noLivro} ficaram inteiras dentro do repertório`
      const base = `${contagemDePartidas(situacao.consideradas)} suas de ${cor} entraram na conta, e ${inteiras}.`
      return situacao.ilegiveis === 0
        ? base
        : `${base} Outras ${contagemDePartidas(situacao.ilegiveis)} não deram para ler e ficaram de fora.`
    }
    default:
      return situacaoNaoTratada(situacao)
  }
}

function situacaoNaoTratada(situacao: never): never {
  throw new Error(`Situação de frequência sem frase na tela: ${JSON.stringify(situacao)}`)
}

// ------------------------------------------------------------------ explorer

/**
 * Motivos em que insistir pode resolver.
 *
 * É a FONTE de `podeTentarDeNovo`. Fora desta lista, o botão de repetir não
 * aparece: oferecer "tentar de novo" para um `sem-autorizacao` é convidar o
 * aluno a bater na mesma porta fechada, e ele não tem como saber disso.
 */
export const MOTIVOS_PASSAGEIROS: readonly MotivoDeIndisponibilidade[] = [
  'timeout',
  'rede',
  'limite-de-taxa',
  'servico',
]

export interface ApresentacaoDaIndisponibilidade {
  tom: TomDaAbertura
  icone: string
  rotulo: string
  frase: string
}

/**
 * Uma frase por motivo. NENHUMA delas pode falar em partidas: ausência de
 * estatística não é ausência de partidas. Ver DECISÃO 4.
 */
export const APRESENTACAO_POR_INDISPONIBILIDADE: Record<
  MotivoDeIndisponibilidade,
  ApresentacaoDaIndisponibilidade
> = {
  timeout: {
    tom: 'atencao',
    icone: '⏱',
    rotulo: 'O explorador demorou demais',
    frase:
      'A consulta passou do tempo previsto e foi cancelada antes de responder. Costuma ser passageiro.',
  },
  rede: {
    tom: 'atencao',
    icone: '⚠',
    rotulo: 'Não consegui falar com o explorador',
    frase: 'A consulta não chegou ao serviço. Verifique a conexão deste aparelho.',
  },
  'limite-de-taxa': {
    tom: 'atencao',
    icone: '⏳',
    rotulo: 'O explorador pediu para esperar',
    frase:
      'A Lichess limita consultas seguidas. Espere cerca de um minuto antes de consultar de novo.',
  },
  'sem-autorizacao': {
    tom: 'neutro',
    icone: '🔒',
    rotulo: 'O explorador não autorizou a consulta',
    frase:
      'O serviço respondeu que esta consulta não está autorizada. Insistir não resolve: o acesso ' +
      'anônimo ao explorador está fechado a partir daqui. Nada nesta tela depende dele — o ' +
      'repertório, as ideias e a frequência das suas partidas continuam inteiros.',
  },
  'nao-encontrado': {
    tom: 'neutro',
    icone: '🔎',
    rotulo: 'O explorador não reconheceu o endereço da consulta',
    frase: 'É problema do LanceZero, não seu, e repetir a consulta não muda o resultado.',
  },
  servico: {
    tom: 'atencao',
    icone: '⚠',
    rotulo: 'O explorador respondeu com erro',
    frase: 'A falha foi do lado do serviço. Pode ser passageiro.',
  },
  'resposta-invalida': {
    tom: 'neutro',
    icone: '⚠',
    rotulo: 'O explorador respondeu num formato que não sei ler',
    frase:
      'Preferi não mostrar número nenhum a mostrar um número que talvez esteja errado. Repetir a ' +
      'consulta não muda o formato da resposta.',
  },
}

/** Insistir resolve? Derivado de `MOTIVOS_PASSAGEIROS`, nunca escrito de novo. */
export function podeTentarDeNovo(motivo: MotivoDeIndisponibilidade): boolean {
  return MOTIVOS_PASSAGEIROS.includes(motivo)
}

/**
 * A ÚNICA frase que afirma ausência de partidas — e ela só é alcançável quando o
 * serviço RESPONDEU. Ver DECISÃO 4.
 */
export const SEM_PARTIDAS_NA_POSICAO =
  'O explorador respondeu, e nenhuma partida da base escolhida chegou a esta posição.'

/**
 * O aviso que acompanha toda estatística exibida.
 *
 * Não é rodapé jurídico: é a regra "sem falsa precisão" do `CLAUDE.md` no ponto
 * exato em que ela seria violada. `ExplorerStats` documenta a mesma coisa —
 * "70% de vitórias das brancas" não quer dizer que o lance é bom.
 */
export const AVISO_DE_FREQUENCIA =
  'Estes números dizem o que se joga e como as partidas terminaram, não se o lance é bom. Frequência não é avaliação.'

/** Amostra pequena demais para virar porcentagem. Ver `participacaoDe`. */
export function fraseDeAmostraPequena(total: number): string {
  return `Amostra pequena (${contagemDePartidas(total)}): não dá para afirmar porcentagem.`
}

/** Participação em porcentagem inteira, ou a frase da amostra pequena. */
export function participacaoLegivel(participacao: number | null, total: number): string {
  return participacao === null
    ? fraseDeAmostraPequena(total)
    : `${Math.round(participacao * 100)}% das partidas`
}

/** Placar de uma posição ou de um lance, sempre com os três números. */
export function placarLegivel(
  stats: Pick<ExplorerStats, 'brancas' | 'empates' | 'pretas'>,
): string {
  return `${stats.brancas} vitórias das brancas · ${stats.empates} empates · ${stats.pretas} vitórias das pretas`
}

/** Nome PT-BR de cada cadência. `Record` sobre a união: cadência nova não compila. */
const NOME_DA_VELOCIDADE: Record<VelocidadeExplorer, string> = {
  ultraBullet: 'ultrabullet',
  bullet: 'bullet',
  blitz: 'blitz',
  rapid: 'rápidas',
  classical: 'clássicas',
  correspondence: 'correspondência',
}

/**
 * Qual recorte de partidas está sendo mostrado, em uma frase.
 *
 * É DERIVADO do filtro que a consulta usa de verdade, e não uma descrição
 * escrita à mão ao lado dele. Girar `FILTRO_PADRAO` sem mexer aqui é o desenho
 * em que a tela promete "1000 a 1400" e o serviço responde outra coisa — falsa
 * precisão pela porta dos fundos, e sem erro nenhum no caminho.
 */
export function descreverFiltro(filtros: ExplorerFilters): string {
  if (filtros.base === 'masters') {
    return 'Base: partidas de grandes mestres.'
  }
  const cadencias =
    filtros.velocidades.length === 0
      ? 'todas as cadências'
      : filtros.velocidades.map((v) => NOME_DA_VELOCIDADE[v]).join(', ')
  const ratings =
    filtros.ratings.length === 0
      ? 'todos os ratings'
      : `ratings a partir de ${[...filtros.ratings].sort((a, b) => a - b).join(', ')}`
  return `Base: partidas do Lichess em ${cadencias}, ${ratings}.`
}
