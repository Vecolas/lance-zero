/**
 * Julgamento de UM lance do aluno numa posição de final, contra a tablebase.
 *
 * A REGRA DE PRODUTO QUE ESTE ARQUIVO CARREGA (issue #62, decidida pelo dono do
 * produto): por mais que mais de um lance vença, quase sempre há o MELHOR
 * lance, e é ele que carrega o espírito da lição. Então o veredito tem TRÊS
 * degraus, e não dois:
 *
 * 1. `melhor` — o lance que a tablebase põe em primeiro lugar (ou um que ela
 *    não sabe distinguir dele);
 * 2. `mantem-mas-e-pior` — ainda ganha (ou ainda segura o empate), e por isso
 *    NÃO é erro; mas é um caminho mais longo, e isso é dito com todas as
 *    letras;
 * 3. `perde-o-resultado` — joga fora a vitória ou o empate que a posição tinha.
 *
 * O desenho descartado, registrado aqui para ninguém voltar a ele: "aceitar
 * qualquer lance que preserve o resultado teórico". Achata os degraus 1 e 2 e
 * joga fora justamente o que a lição existe para ensinar.
 *
 * DECISÃO A — O JUIZ É A ORDEM DA TABLEBASE, NÃO UMA CONTA NOSSA. `lances[0]` é
 * o melhor porque a Lichess devolve a lista ordenada; este arquivo não
 * reordena, não deduz a ordem a partir de DTZ/DTM e não inventa desempate.
 * Recalcular a ordem sem as tabelas na mão produziria um "melhor lance" errado,
 * e errado em silêncio. DTZ/DTM entram só para DESCREVER a diferença, nunca
 * para decidi-la.
 *
 * DECISÃO B — SEM JUIZ NÃO HÁ JULGAMENTO. Tablebase muda, posição fora do
 * alcance, categoria `unknown`, lance que não está na lista: tudo isso vira
 * `indeterminado`, e quem chama tem de dizer ao aluno que não consegue
 * comparar. Fingir o degrau do meio sem juiz é pior que não julgar — é a
 * mentira silenciosa que este projeto persegue.
 *
 * DECISÃO C — "PIOR" SÓ SE DÁ PARA DIZER O QUÊ. "Ganha em 12 lances; o melhor
 * ganha em 4" é conferível pelo aluno. "Não foi o melhor" não é. Por isso,
 * quando não existe métrica comparável entre os dois lances, o resultado é
 * `indeterminado` e não `mantem-mas-e-pior`.
 *
 * DECISÃO D — EMPATE DE NÚMEROS É `melhor`, NÃO `pior`. Dois lances com a mesma
 * categoria, o mesmo DTZ e o mesmo DTM são indistinguíveis PARA A TABLEBASE; a
 * ordem entre eles é arbitrária. Rotular o segundo de "pior" seria afirmar uma
 * diferença que ninguém consegue mostrar. É o que faz uma posição de empate
 * defendido (onde todo lance que segura tem os mesmos números) não produzir um
 * degrau do meio inventado.
 *
 * DECISÃO E — TUDO ENTRA POR PARÂMETRO, inclusive o resultado da tablebase.
 * Nada aqui fala com a rede, com o relógio ou com React. O teste fixa a
 * resposta do serviço e o julgamento é determinístico.
 *
 * O QUE ESTE ARQUIVO NÃO DECIDE: como o degrau do meio conta na MAESTRIA
 * (acerto com desconto? acerto sem crédito de primeira?). É decisão de produto
 * em aberto, e escolher calado aqui seria inventar produto.
 */

import { normalizeFen, normalizeUci } from '@/lib/chess'
import type { LanceTablebase, ResultadoTeorico, TablebaseResult } from '@/domain/types'

/**
 * Os degraus do veredito. É a FONTE que a tela e o portão varrem: degrau novo
 * aqui sem apresentação em `textos.ts` não compila.
 *
 * `indeterminado` NÃO é um quarto degrau de qualidade — é a ausência de juiz.
 * Ele existe para a tela ter como dizer "não consigo comparar" em vez de
 * escolher um degrau no escuro.
 */
export const GRAUS_DO_LANCE = [
  'melhor',
  'mantem-mas-e-pior',
  'perde-o-resultado',
  'indeterminado',
] as const

export type GrauDoLance = (typeof GRAUS_DO_LANCE)[number]

/**
 * Motivos, como CÓDIGO e não como frase — mesma regra de `objetivo.ts`. Quem
 * desenha a tela traduz; função de domínio não tem tradutor e não deve inventar
 * um, e o teste não passa a depender do idioma da interface.
 */
export const MOTIVOS_DO_JULGAMENTO = [
  'e-o-melhor-lance',
  'e-o-lance-da-licao',
  'empata-com-o-melhor',
  'mais-longo-que-o-melhor',
  'perde-o-resultado-teorico',
  'sem-tablebase',
  'resultado-desconhecido',
  'sem-lances-na-resposta',
  'lance-fora-da-lista',
  'sem-metrica-comparavel',
] as const

export type MotivoDoJulgamento = (typeof MOTIVOS_DO_JULGAMENTO)[number]

/** As métricas de distância que a tablebase devolve. */
export const METRICAS_DE_DISTANCIA = ['dtm', 'dtz'] as const

export type MetricaDeDistancia = (typeof METRICAS_DE_DISTANCIA)[number]

/**
 * O QUE foi pior, em número, e não só QUE foi pior.
 *
 * Os valores são ABSOLUTOS: a tablebase devolve DTZ/DTM negativos nos lances
 * (a perspectiva ali é de quem joga DEPOIS do lance), e o sinal não diz nada ao
 * aluno. O que diz é a distância.
 */
export interface ComparacaoDeDistancia {
  metrica: MetricaDeDistancia
  /** Distância do lance do aluno, em meios-lances. */
  doAluno: number
  /** Distância do melhor lance, na mesma unidade. */
  doMelhor: number
  /**
   * Só quando a métrica é `dtm`: quantos lances DO ALUNO até o mate, contando
   * o lance que ele acabou de jogar. `null` em `dtz`, porque DTZ mede distância
   * até captura ou lance de peão — converter isso em "lances até o mate" seria
   * precisão falsa.
   */
  lancesAteOMate: { doAluno: number; doMelhor: number } | null
}

export interface JulgamentoDoLance {
  grau: GrauDoLance
  motivo: MotivoDoJulgamento
  /** UCI normalizado do lance julgado. */
  uciDoAluno: string
  /** Resultado teórico ANTES do lance, do ponto de vista do ALUNO. */
  resultadoAntes: ResultadoTeorico | null
  /** Resultado teórico DEPOIS do lance, do ponto de vista do ALUNO. */
  resultadoDepois: ResultadoTeorico | null
  /** Melhor lance segundo a tablebase. `null` quando não há juiz. */
  melhorUci: string | null
  /** Notação curta do melhor lance, quando o serviço mandou. */
  melhorSan: string | null
  /** `null` quando não há o que comparar em número. Ver decisão C. */
  comparacao: ComparacaoDeDistancia | null
}

export interface EntradaDoJulgamento {
  /** Posição ANTES do lance: é a vez do aluno. */
  fenAntes: string
  /** Lance do aluno, em UCI. */
  uciDoAluno: string
  /**
   * Resposta da tablebase PARA `fenAntes`. `null` quando não houve resposta —
   * serviço fora do ar, posição fora do alcance, 404. Ver decisão B.
   */
  antes: TablebaseResult | null
  /**
   * O lance que a LIÇÃO ensina naquela posição — o primeiro da linha modelo.
   * Opcional: fora do currículo não existe lição, e aí só a tablebase julga.
   *
   * DECISÃO E — o lance da lição conta como MELHOR, mesmo quando a tablebase
   * põe outro na frente. Ela mede caminho até o mate; a lição existe para
   * ensinar uma técnica.
   *
   * O caso que forçou isto é real e foi encontrado por portão: em Lucena, a
   * ponte (Rd4) é a NONA de dezesseis na ordem da tablebase — ganha, em DTM 40
   * contra 34 do Re1+. Sem esta regra, o app diria ao aluno que o lance que a
   * própria lição acabou de ensinar "não é o melhor".
   *
   * O inverso também vale e é o motivo de os DOIS contarem: quem acha o caminho
   * mais rápido tem razão, e ouvir que errou seria pior ainda. Só é sinalizado
   * quem é pior que os dois.
   *
   * PRÉ-CONDIÇÃO: tem de ser um lance legal em `fenAntes`. Lance de outra
   * posição simplesmente não casa e o julgamento segue pela tablebase — não há
   * como detectar isso aqui sem reimplementar as regras do xadrez.
   */
  uciDaLicao?: string
}

/** Ordem dos resultados, para saber se o lance PIOROU o que a posição valia. */
const VALOR_DO_RESULTADO: Record<ResultadoTeorico, number> = {
  derrota: 0,
  empate: 1,
  vitoria: 2,
}

/**
 * O resultado de um lance vem do ponto de vista de quem joga DEPOIS dele.
 * Inverter é o que traz tudo para o ponto de vista do aluno, que é o único que
 * a tela pode mostrar sem confundir.
 */
function pontoDeVistaDoAluno(resultado: ResultadoTeorico | null): ResultadoTeorico | null {
  if (resultado === null) {
    return null
  }
  if (resultado === 'vitoria') {
    return 'derrota'
  }
  return resultado === 'derrota' ? 'vitoria' : 'empate'
}

/**
 * Lances do aluno até o mate, contando o lance já jogado.
 *
 * `dtm` aqui é o da POSIÇÃO FILHA, onde quem joga é o adversário: os
 * meios-lances contados incluem o do adversário. Daí a metade — e o `+1` é o
 * lance que o aluno acabou de jogar, que não está no DTM do filho.
 *
 * Exportada porque é regra conferível, e regra conferível merece teste próprio.
 */
export function lancesAteOMate(dtmDoFilho: number): number {
  return Math.ceil(Math.abs(dtmDoFilho) / 2) + 1
}

function indeterminado(
  uciDoAluno: string,
  motivo: MotivoDoJulgamento,
  resultadoAntes: ResultadoTeorico | null,
  resultadoDepois: ResultadoTeorico | null = null,
  melhor: LanceTablebase | null = null,
): JulgamentoDoLance {
  return {
    grau: 'indeterminado',
    motivo,
    uciDoAluno,
    resultadoAntes,
    resultadoDepois,
    melhorUci: melhor?.uci ?? null,
    melhorSan: melhor?.san ?? null,
    comparacao: null,
  }
}

/**
 * Compara as distâncias dos dois lances.
 *
 * DTM só entra quando os DOIS lances a têm: a tablebase devolve `dtm: null` no
 * lance que JÁ dá mate, e comparar "sem DTM" com "DTM 2" produziria uma frase
 * errada. Fora isso, DTZ, que existe em toda posição dentro do alcance.
 *
 * `null` quando nem uma nem outra está disponível nos dois lados — e aí quem
 * chama não tem o que mostrar ao aluno (decisão C).
 */
function compararDistancias(
  doAluno: LanceTablebase,
  melhor: LanceTablebase,
): ComparacaoDeDistancia | null {
  if (doAluno.dtm !== null && melhor.dtm !== null) {
    return {
      metrica: 'dtm',
      doAluno: Math.abs(doAluno.dtm),
      doMelhor: Math.abs(melhor.dtm),
      lancesAteOMate: {
        doAluno: lancesAteOMate(doAluno.dtm),
        doMelhor: lancesAteOMate(melhor.dtm),
      },
    }
  }
  if (doAluno.dtz !== null && melhor.dtz !== null) {
    return {
      metrica: 'dtz',
      doAluno: Math.abs(doAluno.dtz),
      doMelhor: Math.abs(melhor.dtz),
      lancesAteOMate: null,
    }
  }
  return null
}

/**
 * A tablebase não distingue estes dois lances?
 *
 * Igualdade nos TRÊS campos que ela publica. É comparação simétrica de
 * propósito: não assume que menor é melhor, e por isso não depende de nenhuma
 * convenção de sinal.
 */
function indistinguiveis(doAluno: LanceTablebase, melhor: LanceTablebase): boolean {
  return (
    doAluno.categoria === melhor.categoria &&
    doAluno.dtz === melhor.dtz &&
    doAluno.dtm === melhor.dtm
  )
}

/**
 * Classifica o lance do aluno em um dos três degraus — ou diz que não sabe.
 *
 * LANÇA quando `antes` é de OUTRA posição. Não é preciosismo: a tela consulta a
 * tablebase de forma assíncrona, e julgar o lance de uma posição contra a
 * resposta de outra daria um veredito plausível e errado, sem uma linha no
 * console. FEN inválido também lança, pelo mesmo motivo de sempre: é bug de
 * quem chama, não situação de treino.
 */
export function julgarLanceDeFinal(entrada: EntradaDoJulgamento): JulgamentoDoLance {
  const uciDoAluno = normalizeUci(entrada.uciDoAluno)
  const fen = normalizeFen(entrada.fenAntes)
  const { antes } = entrada

  if (antes === null) {
    return indeterminado(uciDoAluno, 'sem-tablebase', null)
  }
  if (antes.fen !== fen) {
    throw new Error(
      `Julgamento com tablebase de outra posição: pedida ${fen}, respondida ${antes.fen}.`,
    )
  }
  if (antes.resultado === null) {
    return indeterminado(uciDoAluno, 'resultado-desconhecido', null)
  }

  const melhor = antes.lances[0]
  if (melhor === undefined) {
    return indeterminado(uciDoAluno, 'sem-lances-na-resposta', antes.resultado)
  }

  const doAluno = antes.lances.find((lance) => normalizeUci(lance.uci) === uciDoAluno)
  if (doAluno === undefined) {
    return indeterminado(uciDoAluno, 'lance-fora-da-lista', antes.resultado, null, melhor)
  }

  const resultadoDepois = pontoDeVistaDoAluno(doAluno.resultado)
  if (resultadoDepois === null) {
    return indeterminado(uciDoAluno, 'resultado-desconhecido', antes.resultado, null, melhor)
  }

  const base = {
    uciDoAluno,
    resultadoAntes: antes.resultado,
    resultadoDepois,
    melhorUci: melhor.uci,
    melhorSan: melhor.san,
  }

  if (VALOR_DO_RESULTADO[resultadoDepois] < VALOR_DO_RESULTADO[antes.resultado]) {
    return {
      ...base,
      grau: 'perde-o-resultado',
      motivo: 'perde-o-resultado-teorico',
      comparacao: null,
    }
  }

  if (uciDoAluno === normalizeUci(melhor.uci)) {
    return { ...base, grau: 'melhor', motivo: 'e-o-melhor-lance', comparacao: null }
  }
  // Ver decisão E. Vem DEPOIS do teste de resultado, de propósito: se a linha
  // modelo algum dia jogar fora a vitória, isso tem de aparecer como
  // `perde-o-resultado` e não ser abafado por "é o lance da lição".
  if (entrada.uciDaLicao !== undefined && uciDoAluno === normalizeUci(entrada.uciDaLicao)) {
    return { ...base, grau: 'melhor', motivo: 'e-o-lance-da-licao', comparacao: null }
  }
  if (indistinguiveis(doAluno, melhor)) {
    return { ...base, grau: 'melhor', motivo: 'empata-com-o-melhor', comparacao: null }
  }

  const comparacao = compararDistancias(doAluno, melhor)
  if (comparacao === null) {
    // Sabemos que é diferente do melhor, e não sabemos dizer em quê. Ver
    // decisão C: sinalizar sem poder mostrar o quê não ensina nada.
    return { ...base, grau: 'indeterminado', motivo: 'sem-metrica-comparavel', comparacao: null }
  }

  return { ...base, grau: 'mantem-mas-e-pior', motivo: 'mais-longo-que-o-melhor', comparacao }
}

/** Contagem dos degraus de uma sequência de lances. */
export interface ResumoDosJulgamentos {
  total: number
  /** Um contador por degrau. As chaves saem de `GRAUS_DO_LANCE`, não da mão. */
  porGrau: Record<GrauDoLance, number>
}

/**
 * Conta os degraus de uma tentativa inteira.
 *
 * Calculado na hora a partir da lista, nunca guardado em paralelo: contador que
 * alguém incrementa à mão é a segunda fonte da mesma verdade, e diverge no dia
 * em que um caminho novo esquecer de incrementá-lo.
 *
 * A tabela nasce varrendo `GRAUS_DO_LANCE`: degrau novo entra no resumo sozinho,
 * em vez de ficar de fora até alguém lembrar de somá-lo.
 */
export function resumirJulgamentos(
  julgamentos: readonly JulgamentoDoLance[],
): ResumoDosJulgamentos {
  const porGrau = Object.fromEntries(GRAUS_DO_LANCE.map((grau) => [grau, 0])) as Record<
    GrauDoLance,
    number
  >
  for (const julgamento of julgamentos) {
    porGrau[julgamento.grau] += 1
  }
  return { total: julgamentos.length, porGrau }
}
