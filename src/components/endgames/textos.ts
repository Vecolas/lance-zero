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
 *
 * DECISÃO 4 — o degrau do meio do julgamento (issue #62) tem TOM PRÓPRIO. Ele
 * não pode parecer erro nem parecer acerto limpo: o lance ganhou, e ainda assim
 * não é o da lição. Por isso `atencao` existe como tom, em vez de reaproveitar
 * `ok` ou `ruim` — e por isso a frase carrega OS NÚMEROS, não um "não foi o
 * melhor" que o aluno não tem como conferir.
 *
 * DECISÃO 5 — O EMPATE DIZ POR QUAL REGRA. O veredito do objetivo e a REGRA que
 * fechou a partida são duas informações, e a tela mostra as duas: "cumprido" +
 * "empate por repetição". Um "cumprido" mudo não ensina nada, e as quatro
 * regras de empate ensinam coisas diferentes. Ver
 * `APRESENTACAO_POR_REGRA_DE_EMPATE`.
 */

import { REGRAS_DO_EMPATE } from '@/domain/endgames'
import type {
  ComparacaoDeDistancia,
  EstadoDoObjetivo,
  GrauDoLance,
  JulgamentoDoLance,
  MotivoDeObjetivo,
  ObjetivoFinal,
  RegraDeEmpate,
  ResumoDosJulgamentos,
} from '@/domain/endgames'
import type { HistoricoDaPosicao } from '@/domain/endgames/persistencia'
import type { PromotionPiece } from '@/lib/chess'
import type { ResultadoTeorico } from '@/domain/types'
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
  'empate-indevido': 'A partida terminou empatada, e aqui empatar não era o objetivo.',
  'lances-esgotados': 'Os lances previstos no objetivo acabaram antes de você chegar lá.',
  'sem-peao-para-promover': 'Não sobrou peão para promover.',
  'em-andamento': 'A posição continua: nem cumprida, nem perdida.',
}

/**
 * Como cada regra de empate se apresenta ao aluno.
 *
 * POR QUE ISTO EXISTE, e por que não é um motivo a mais: "empate por repetição"
 * e "empate pela regra dos 50 lances" ensinam coisas DIFERENTES. A primeira é a
 * técnica que a lição de oposição ensina; a segunda é o relógio da partida
 * correndo contra quem tinha de progredir. Um "cumprido" mudo não ensina
 * nenhuma das duas, e foi assim que o app ficou anos sem dizer ao aluno por que
 * a defesa dele funcionou.
 *
 * A regra NÃO carrega tom. É de propósito: a MESMA regra é boa notícia quando o
 * objetivo era segurar o empate e má notícia quando era dar mate. O tom vem do
 * estado do objetivo, que é quem sabe disso; a regra só explica o tabuleiro.
 *
 * `Record` sobre a união: regra nova no domínio NÃO COMPILA sem frase aqui.
 */
export interface ApresentacaoDaRegraDeEmpate {
  /** Nome da regra, em PT-BR, para o aluno reconhecê-la num torneio. */
  rotulo: string
  /** O que aconteceu no tabuleiro, em uma frase conferível. */
  explicacao: string
}

export const APRESENTACAO_POR_REGRA_DE_EMPATE: Record<RegraDeEmpate, ApresentacaoDaRegraDeEmpate> =
  {
    afogamento: {
      rotulo: 'Empate por afogamento',
      explicacao:
        'Quem tinha a vez ficou sem nenhum lance legal, e sem estar em xeque. A partida acaba empatada na hora.',
    },
    'material-insuficiente': {
      rotulo: 'Empate por material insuficiente',
      explicacao:
        'O material que sobrou no tabuleiro não dá mate nem com a pior defesa do mundo. A partida acaba empatada na hora.',
    },
    repeticao: {
      rotulo: 'Empate por repetição',
      explicacao:
        `A mesma posição apareceu ${REGRAS_DO_EMPATE.ocorrenciasParaRepeticao} vezes — mesmas peças nas mesmas casas, ` +
        'mesma vez de jogar e os mesmos lances disponíveis. Em rei e peão, é assim que a defesa correta costuma terminar: ' +
        'o rei vai e volta na casa que segura, e o adversário não tem como progredir.',
    },
    'regra-dos-50-lances': {
      rotulo: 'Empate pela regra dos 50 lances',
      explicacao:
        `Passaram ${REGRAS_DO_EMPATE.meiosLancesSemProgresso / 2} lances de cada lado sem nenhuma captura e sem ` +
        'nenhum lance de peão. Sem progresso, a partida empata — quem precisava avançar não avançou.',
    },
    'nao-identificada': {
      rotulo: 'Empate por uma regra que não soube nomear',
      explicacao:
        'A partida terminou empatada e eu não consegui identificar por qual regra. Isto é um defeito nosso: prefiro dizer ' +
        'que não sei a inventar uma explicação.',
    },
  }

/**
 * Os tons possíveis. `atencao` não é enfeite: é o degrau do meio do julgamento,
 * que precisa ser visivelmente diferente de acerto E de erro. Tom novo aqui
 * sem classe correspondente no CSS apareceria sem cor nenhuma, em silêncio —
 * por isso o portão da tela varre esta lista contra a folha de estilo.
 */
export const TONS_DO_ESTADO = ['ok', 'atencao', 'ruim', 'neutro'] as const

export type TomDoEstado = (typeof TONS_DO_ESTADO)[number]

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
 * Os estados em que a GRAVAÇÃO da tentativa pode estar.
 *
 * É a FONTE que o portão varre: estado novo aqui sem apresentação não compila,
 * e apresentação sem estado correspondente reprova no teste.
 *
 * Existe porque gravar pode falhar — IndexedDB bloqueado em aba anônima, ou
 * permissão negada — e o aluno tem de SABER que não foi gravado. Uma tela que
 * some com o aviso e finge que gravou é pior que uma tela sem o recurso.
 */
export const ESTADOS_DA_GRAVACAO = [
  'gravando',
  'gravada',
  'na-revisao',
  'sem-armazenamento',
  'falhou',
] as const

export type EstadoDaGravacao = (typeof ESTADOS_DA_GRAVACAO)[number]

export interface ApresentacaoDaGravacao extends ApresentacaoDoEstado {
  /** O que aquele estado significa para o aluno, em uma frase. */
  explicacao: string
}

export const APRESENTACAO_DA_GRAVACAO: Record<EstadoDaGravacao, ApresentacaoDaGravacao> = {
  gravando: {
    tom: 'neutro',
    icone: '·',
    rotulo: 'Gravando',
    explicacao: 'Registrando esta tentativa no armazenamento local deste navegador.',
  },
  gravada: {
    tom: 'ok',
    icone: '✓',
    rotulo: 'Tentativa gravada',
    explicacao: 'Ela entrou no seu histórico e moveu o modelo da habilidade que esta lição treina.',
  },
  'na-revisao': {
    tom: 'ok',
    icone: '✓',
    rotulo: 'Tentativa gravada',
    explicacao:
      'Esta posição entrou na sua revisão espaçada: ela já está vencida e aparece no treino de hoje.',
  },
  'sem-armazenamento': {
    tom: 'ruim',
    icone: '!',
    rotulo: 'Nada foi gravado',
    explicacao:
      'O armazenamento local deste navegador está indisponível — em aba anônima ou com permissão negada isso é esperado. Você pode treinar a posição, mas ela não entra no seu histórico.',
  },
  falhou: {
    tom: 'ruim',
    icone: '✕',
    rotulo: 'Não consegui gravar',
    explicacao: 'A tentativa terminou, mas não entrou no seu histórico.',
  },
}

// ------------------------------------------------- julgamento do lance (#62)

/** Nome em PT-BR de cada resultado teórico. Exaustivo por tipo, como tudo aqui. */
const NOME_DO_RESULTADO: Record<ResultadoTeorico, string> = {
  vitoria: 'vitória',
  empate: 'empate',
  derrota: 'derrota',
}

/**
 * Como cada degrau do julgamento se apresenta.
 *
 * O degrau do meio usa `atencao` e o rótulo diz as DUAS metades ("mantém o
 * resultado" + "não é o melhor"). Um rótulo com só uma delas empurraria o aluno
 * para a leitura errada: "errei" ou "acertei limpo", e nenhuma das duas é
 * verdade.
 */
export const APRESENTACAO_POR_GRAU: Record<GrauDoLance, ApresentacaoDoEstado> = {
  melhor: { tom: 'ok', icone: '✓', rotulo: 'Melhor lance' },
  'mantem-mas-e-pior': {
    tom: 'atencao',
    icone: '≈',
    rotulo: 'Mantém o resultado, mas não é o melhor lance',
  },
  'perde-o-resultado': { tom: 'ruim', icone: '✕', rotulo: 'Este lance joga o resultado fora' },
  indeterminado: { tom: 'neutro', icone: '?', rotulo: 'Sem tablebase, não dá para comparar' },
}

/** Como o aluno continua, do ponto de vista dele, depois do lance. */
function comoVoceSegue(resultado: ResultadoTeorico | null): string {
  if (resultado === 'vitoria') {
    return 'Você continua ganhando'
  }
  if (resultado === 'empate') {
    return 'Você continua segurando o empate'
  }
  return 'A posição já estava perdida'
}

/** O melhor lance como o aluno o lê: SAN quando existe, senão o UCI. */
function melhorLegivel(julgamento: JulgamentoDoLance): string {
  return julgamento.melhorSan ?? julgamento.melhorUci ?? 'o melhor lance'
}

/**
 * A frase que diz O QUE foi pior, com os números na mão.
 *
 * "Ganha em 12 lances; o melhor ganha em 4" é conferível pelo aluno no
 * tabuleiro. "Não foi o melhor" não é — e frase não conferível não ensina.
 */
function descreverDiferenca(julgamento: JulgamentoDoLance, c: ComparacaoDeDistancia): string {
  const inicio = comoVoceSegue(julgamento.resultadoDepois)
  if (c.lancesAteOMate !== null) {
    return (
      `${inicio}: por este caminho o mate sai em ${c.lancesAteOMate.doAluno} lances seus, ` +
      `contando este. Por ${melhorLegivel(julgamento)} sai em ${c.lancesAteOMate.doMelhor}.`
    )
  }
  return (
    `${inicio}: a tablebase conta ${c.doAluno} meios-lances até a próxima captura ou lance de ` +
    `peão (DTZ). Por ${melhorLegivel(julgamento)} são ${c.doMelhor}. Menos é caminho mais direto.`
  )
}

/**
 * A frase de um julgamento.
 *
 * `switch` com `default` sobre `never`: motivo novo no domínio REPROVA em
 * compilação aqui, em vez de virar um parágrafo vazio na tela.
 */
export function descreverJulgamento(julgamento: JulgamentoDoLance): string {
  switch (julgamento.motivo) {
    case 'e-o-melhor-lance':
      return 'É o lance que a tablebase põe em primeiro lugar nesta posição: não há caminho mais direto.'
    case 'empata-com-o-melhor':
      return (
        `A tablebase não vê diferença entre ele e ${melhorLegivel(julgamento)}: mesma avaliação e ` +
        'mesma distância. Onde ela não distingue, nós também não distinguimos.'
      )
    case 'mais-longo-que-o-melhor':
      return julgamento.comparacao === null
        ? // Inalcançável por construção: este motivo só nasce com comparação.
          // A frase existe para o caminho não devolver texto vazio se mudar.
          'Este lance mantém o resultado, mas é mais longo que o melhor.'
        : descreverDiferenca(julgamento, julgamento.comparacao)
    case 'perde-o-resultado-teorico':
      return (
        `A posição valia ${NOME_DO_RESULTADO[julgamento.resultadoAntes ?? 'derrota']} e, depois ` +
        `deste lance, vale ${NOME_DO_RESULTADO[julgamento.resultadoDepois ?? 'derrota']}. ` +
        `O melhor lance aqui era ${melhorLegivel(julgamento)}.`
      )
    case 'e-o-lance-da-licao':
      return (
        'É a técnica que esta lição ensina. A tablebase põe ' +
        `${melhorLegivel(julgamento)} na frente por chegar ao mate um pouco antes, mas o caminho ` +
        'que você jogou é o que vale a pena guardar: ele se repete em posições parecidas.'
      )
    case 'sem-tablebase':
      return (
        'A tablebase não respondeu para esta posição, então não há como dizer qual era o melhor ' +
        'lance. O objetivo da posição continua sendo julgado normalmente.'
      )
    case 'resultado-desconhecido':
      return (
        'Esta posição está fora do alcance da tablebase, então não há resultado teórico para ' +
        'comparar lances.'
      )
    case 'sem-lances-na-resposta':
      return 'A tablebase respondeu sem nenhum lance para esta posição: não há com o que comparar.'
    case 'lance-fora-da-lista':
      return 'Este lance não está na lista que a tablebase devolveu, então não dá para compará-lo com o melhor.'
    case 'sem-metrica-comparavel':
      return (
        'Este lance não é o primeiro da lista da tablebase, mas ela não devolveu distância que ' +
        'permita dizer o quanto ele é pior. Sinalizar sem poder mostrar o quê não ensina nada.'
      )
    default:
      return motivoNaoTratado(julgamento.motivo)
  }
}

function motivoNaoTratado(motivo: never): never {
  throw new Error(`Motivo de julgamento sem frase na tela: ${JSON.stringify(motivo)}`)
}

/**
 * O balanço da tentativa inteira, em uma frase. `null` quando não há lance
 * julgado — silêncio é a informação certa aí.
 *
 * O degrau do meio aparece SEMPRE que existir, inclusive numa tentativa
 * cumprida: é exatamente o caso que a issue #62 existe para deixar de esconder.
 */
export function resumirEmTexto(resumo: ResumoDosJulgamentos): string | null {
  if (resumo.total === 0) {
    return null
  }
  const partes: string[] = []
  const lances = (n: number) => (n === 1 ? '1 lance' : `${n} lances`)

  if (resumo.porGrau['mantem-mas-e-pior'] > 0) {
    partes.push(
      `${lances(resumo.porGrau['mantem-mas-e-pior'])} de ${resumo.total} mantiveram o resultado, ` +
        'mas por um caminho mais longo que o melhor.',
    )
  }
  if (resumo.porGrau['perde-o-resultado'] > 0) {
    partes.push(
      `${lances(resumo.porGrau['perde-o-resultado'])} jogaram fora o resultado que a posição valia.`,
    )
  }
  if (resumo.porGrau.indeterminado > 0) {
    partes.push(
      `Não consegui comparar ${lances(resumo.porGrau.indeterminado)} com a tablebase: sem ela não ` +
        'há como dizer qual era o melhor.',
    )
  }
  if (partes.length === 0) {
    return resumo.total === 1
      ? 'O seu único lance foi o melhor da posição.'
      : `Todos os seus ${resumo.total} lances foram os melhores da posição.`
  }
  return partes.join(' ')
}

/**
 * O histórico de uma posição, como a lista de lições o mostra.
 *
 * `null` quando não há tentativa gravada: silêncio é a informação certa aí.
 * Escrever "nunca tentada" em onze posições transformaria a lista num painel de
 * cobrança, e o CLAUDE.md proíbe esse tom.
 *
 * O número de tentativas entra junto do rótulo de propósito: "Resolvida" na
 * sétima tentativa não é a mesma coisa que "Resolvida" na primeira, e esconder
 * isso deixaria o aluno com uma leitura melhor do que a realidade.
 */
export function descreverHistorico(
  historico: HistoricoDaPosicao | undefined,
): ApresentacaoDoEstado | null {
  if (historico === undefined || historico.tentativas === 0) {
    return null
  }
  const contagem = historico.tentativas === 1 ? '1 tentativa' : `${historico.tentativas} tentativas`
  return historico.cumpriu
    ? { tom: 'ok', icone: '✓', rotulo: `Resolvida · ${contagem}` }
    : { tom: 'neutro', icone: '·', rotulo: `Tentada, ainda não cumprida · ${contagem}` }
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
