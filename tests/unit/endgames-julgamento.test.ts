/**
 * Portão do JULGAMENTO DE LANCE de final (issue #62).
 *
 * O que ele existe para impedir, em ordem de gravidade:
 *
 * 1. QUE O DEGRAU DO MEIO SUMA. "Ganha, mas é pior" tem de ser um resultado
 *    próprio, distinto de acerto e de erro — nos três lugares: no grau, no tom
 *    e no rótulo. Achatar os três degraus em dois é justamente o desenho que o
 *    dono do produto descartou.
 *
 * 2. QUE A SINALIZAÇÃO NÃO DIGA O QUÊ. A frase do degrau do meio tem de trazer
 *    OS DOIS NÚMEROS. "Não foi o melhor" não é conferível pelo aluno, e frase
 *    não conferível não ensina. Por isso a asserção procura os números que saem
 *    da própria fixture, e não um texto cravado.
 *
 * 3. QUE A TELA INVENTE JUIZ. Sem tablebase não existe "melhor lance"; o
 *    veredito tem de ser `indeterminado`, nunca um degrau escolhido no escuro.
 *    É o caso mais fácil de quebrar sem ninguém ver, porque o sintoma é uma
 *    tela plausível.
 *
 * 4. QUE UM LANCE INDISTINGUÍVEL VIRE "PIOR". Onde a tablebase não distingue,
 *    nós também não distinguimos — senão o app afirma uma diferença que não
 *    consegue mostrar.
 *
 * A VARREDURA PARTE DA FONTE (`GRAUS_DO_LANCE`, `MOTIVOS_DO_JULGAMENTO`,
 * `TONS_DO_ESTADO`, o currículo), nunca de uma lista escrita aqui: lista escrita
 * à mão não acusa o que nunca entrou nela.
 *
 * O QUE ESTE PORTÃO NÃO PROVA: que a tablebase de verdade concorda com a linha
 * modelo do currículo. Isso é rede, e mora em
 * `tests/contrato/curriculo-vs-tablebase.test.ts`, fora do CI.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CURRICULO_FINAIS } from '@/content/endgames'
import {
  GRAUS_DO_LANCE,
  julgarLanceDeFinal,
  lancesAteOMate,
  MOTIVOS_DO_JULGAMENTO,
  resumirJulgamentos,
  type GrauDoLance,
  type JulgamentoDoLance,
  type MotivoDoJulgamento,
} from '@/domain/endgames'
import { posicoesDe, type PosicaoDeFinal } from '@/domain/endgames/licao'
import { legalMoves, normalizeFen } from '@/lib/chess'
import type { CategoriaTablebase, LanceTablebase, TablebaseResult } from '@/domain/types'
import {
  APRESENTACAO_POR_GRAU,
  descreverJulgamento,
  resumirEmTexto,
  TONS_DO_ESTADO,
} from '@/components/endgames/textos'

// --------------------------------------------------------------- fixtures

/**
 * O número INTEIRO, e não um pedaço de outro número.
 *
 * A borda de palavra não é preciosismo: sem ela `18` contém `1`, e uma frase
 * que mostrasse o mesmo número duas vezes passaria no portão. Isso já deixou
 * uma mutação passar aqui.
 */
function numeroSolto(valor: number): RegExp {
  return new RegExp('\\b' + valor + '\\b')
}

/**
 * Uma resposta de tablebase montada à mão.
 *
 * Ela IMITA a forma que `@/lib/tablebase/provider` produz — inclusive o par
 * `categoria`/`resultado`, que lá é derivado e aqui é escrito junto. Escrever os
 * dois é o preço de não depender de rede; o que confere se a derivação do
 * provider continua certa é `tests/unit/tablebase-provider.test.ts`.
 */
function lance(
  uci: string,
  categoria: CategoriaTablebase,
  resultado: LanceTablebase['resultado'],
  dtz: number | null,
  dtm: number | null = null,
  san: string | null = null,
): LanceTablebase {
  return { uci, san, categoria, resultado, dtz, dtm }
}

function resposta(
  fen: string,
  categoria: CategoriaTablebase,
  resultado: TablebaseResult['resultado'],
  lances: LanceTablebase[],
): TablebaseResult {
  return {
    fen: normalizeFen(fen),
    categoria,
    resultado,
    dtz: null,
    dtm: null,
    xequeMate: false,
    afogamento: false,
    lances,
    doCache: false,
  }
}

/**
 * Uma posição real do currículo, escolhida por PROPRIEDADE e não por id: assim
 * o teste sobrevive a uma reordenação do conteúdo e reprova alto se o currículo
 * perder esse tipo de posição.
 */
function posicaoComObjetivoDeMate(): PosicaoDeFinal {
  const achada = posicoesDe([...CURRICULO_FINAIS]).find(
    (posicao) => posicao.objetivo.tipo === 'mate-em',
  )
  if (achada === undefined) {
    throw new Error('O currículo não tem mais nenhum objetivo de mate: reescreva este teste.')
  }
  return achada
}

const POSICAO = posicaoComObjetivoDeMate()
const FEN = POSICAO.fen
const MELHOR = POSICAO.linhaModelo[0]

/** DTZ do melhor lance e do lance pior. Números da fixture, não do produto. */
const DTZ_DO_MELHOR = -1
const DTZ_DO_PIOR = -18

/** Um lance legal que NÃO é o melhor, derivado da própria posição. */
const OUTRO = (() => {
  const outro = legalMoves(FEN).find((legal) => legal.uci !== MELHOR)
  if (outro === undefined) {
    throw new Error('A posição escolhida só tem um lance legal: reescreva este teste.')
  }
  return outro.uci
})()

/** Vitória em que `OUTRO` ainda ganha, só que por um caminho mais longo. */
function vitoriaComAlternativaPior(): TablebaseResult {
  return resposta(FEN, 'win', 'vitoria', [
    lance(MELHOR, 'loss', 'derrota', DTZ_DO_MELHOR, null, 'Melhor'),
    lance(OUTRO, 'loss', 'derrota', DTZ_DO_PIOR),
  ])
}

// ------------------------------------------------------------ os três degraus

describe('os três degraus do julgamento', () => {
  it('o primeiro lance da lista da tablebase é o melhor', () => {
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: MELHOR,
      antes: vitoriaComAlternativaPior(),
    })

    expect(julgamento.grau).toBe('melhor')
    expect(julgamento.motivo).toBe('e-o-melhor-lance')
  })

  it('lance que ganha por caminho mais longo é ACEITO e SINALIZADO, não é erro', () => {
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: vitoriaComAlternativaPior(),
    })

    // A regra inteira em três asserções: não é erro, não é acerto limpo, e
    // continua ganhando.
    expect(julgamento.grau).toBe('mantem-mas-e-pior')
    expect(julgamento.resultadoDepois).toBe('vitoria')
    expect(julgamento.melhorUci).toBe(MELHOR)
  })

  it('lance que joga a vitória fora é erro', () => {
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: resposta(FEN, 'win', 'vitoria', [
        lance(MELHOR, 'loss', 'derrota', DTZ_DO_MELHOR),
        lance(OUTRO, 'draw', 'empate', null),
      ]),
    })

    expect(julgamento.grau).toBe('perde-o-resultado')
    expect(julgamento.resultadoAntes).toBe('vitoria')
    expect(julgamento.resultadoDepois).toBe('empate')
  })

  it('numa posição de empate defendido, segurar o empate é o melhor — não um degrau do meio', () => {
    // Todos os lances que seguram têm os MESMOS números: a tablebase não os
    // distingue, e inventar uma diferença aqui seria precisão falsa.
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: resposta(FEN, 'draw', 'empate', [
        lance(MELHOR, 'draw', 'empate', null),
        lance(OUTRO, 'draw', 'empate', null),
      ]),
    })

    expect(julgamento.grau).toBe('melhor')
    expect(julgamento.motivo).toBe('empata-com-o-melhor')
  })

  it('numa posição de empate defendido, o lance que entrega a derrota é erro', () => {
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: resposta(FEN, 'draw', 'empate', [
        lance(MELHOR, 'draw', 'empate', null),
        lance(OUTRO, 'win', 'vitoria', 12),
      ]),
    })

    expect(julgamento.grau).toBe('perde-o-resultado')
    expect(julgamento.resultadoDepois).toBe('derrota')
  })
})

// ------------------------------------------------- a sinalização diz O QUÊ

describe('a sinalização diz o que foi pior, não só que foi pior', () => {
  it('a comparação por DTZ carrega as duas distâncias, e a frase mostra as duas', () => {
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: vitoriaComAlternativaPior(),
    })

    expect(julgamento.comparacao).toEqual({
      metrica: 'dtz',
      // Valores ABSOLUTOS: o sinal é perspectiva da tablebase e não diz nada
      // ao aluno. Derivados da fixture, nunca cravados.
      doAluno: Math.abs(DTZ_DO_PIOR),
      doMelhor: Math.abs(DTZ_DO_MELHOR),
      lancesAteOMate: null,
    })

    const frase = descreverJulgamento(julgamento)
    // Borda de palavra: sem ela `18` contém `1`, e a frase que mostrasse o
    // mesmo número duas vezes passaria no portão.
    expect(frase).toMatch(numeroSolto(Math.abs(DTZ_DO_PIOR)))
    expect(frase).toMatch(numeroSolto(Math.abs(DTZ_DO_MELHOR)))
  })

  it('a comparação por DTM vira lances do ALUNO até o mate, e a frase mostra os dois', () => {
    const dtmDoAluno = -8
    const dtmDoMelhor = -2
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: resposta(FEN, 'win', 'vitoria', [
        lance(MELHOR, 'loss', 'derrota', DTZ_DO_MELHOR, dtmDoMelhor),
        lance(OUTRO, 'loss', 'derrota', DTZ_DO_PIOR, dtmDoAluno),
      ]),
    })

    expect(julgamento.comparacao?.metrica).toBe('dtm')
    // A REGRA, não um número cravado: meia distância do filho, mais o lance
    // que o aluno acabou de jogar.
    expect(julgamento.comparacao?.lancesAteOMate).toEqual({
      doAluno: lancesAteOMate(dtmDoAluno),
      doMelhor: lancesAteOMate(dtmDoMelhor),
    })

    const frase = descreverJulgamento(julgamento)
    expect(frase).toMatch(numeroSolto(lancesAteOMate(dtmDoAluno)))
    expect(frase).toMatch(numeroSolto(lancesAteOMate(dtmDoMelhor)))
  })

  it('a conversão de DTM em lances do aluno segue a regra, para todo valor', () => {
    for (const dtm of [-2, -4, -6, -8, -12, 2, 4]) {
      expect(lancesAteOMate(dtm)).toBe(Math.ceil(Math.abs(dtm) / 2) + 1)
    }
    // Morde: um lance que dá mate em seguida é "mate em 2 lances seus,
    // contando este", nunca em 1 — o lance jogado conta.
    expect(lancesAteOMate(-2)).toBe(2)
  })

  it('DTM só entra quando os DOIS lances a têm: o lance que já dá mate vem sem DTM', () => {
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: resposta(FEN, 'win', 'vitoria', [
        // Como o serviço real devolve o lance de mate: dtz -1 e dtm nulo.
        lance(MELHOR, 'loss', 'derrota', DTZ_DO_MELHOR, null),
        lance(OUTRO, 'loss', 'derrota', DTZ_DO_PIOR, -6),
      ]),
    })

    expect(julgamento.comparacao?.metrica).toBe('dtz')
    expect(julgamento.comparacao?.lancesAteOMate).toBeNull()
  })

  it('sem métrica comparável NÃO sinaliza "pior": não dá para mostrar o quê', () => {
    const julgamento = julgarLanceDeFinal({
      fenAntes: FEN,
      uciDoAluno: OUTRO,
      antes: resposta(FEN, 'win', 'vitoria', [
        lance(MELHOR, 'loss', 'derrota', null, null),
        lance(OUTRO, 'maybe-loss', 'derrota', null, null),
      ]),
    })

    expect(julgamento.grau).toBe('indeterminado')
    expect(julgamento.motivo).toBe('sem-metrica-comparavel')
  })
})

// ------------------------------------------------------------- degradação

describe('sem juiz não há julgamento', () => {
  const semJuiz: { caso: string; antes: TablebaseResult | null; motivo: MotivoDoJulgamento }[] = [
    { caso: 'tablebase muda', antes: null, motivo: 'sem-tablebase' },
    {
      caso: 'posição fora do alcance (categoria unknown)',
      antes: resposta(FEN, 'unknown', null, []),
      motivo: 'resultado-desconhecido',
    },
    {
      caso: 'resposta sem lance nenhum',
      antes: resposta(FEN, 'win', 'vitoria', []),
      motivo: 'sem-lances-na-resposta',
    },
    {
      caso: 'lance do aluno fora da lista',
      antes: resposta(FEN, 'win', 'vitoria', [lance(MELHOR, 'loss', 'derrota', DTZ_DO_MELHOR)]),
      motivo: 'lance-fora-da-lista',
    },
  ]

  it('a varredura encontrou casos para checar', () => {
    expect(semJuiz.length).toBeGreaterThan(0)
  })

  for (const { caso, antes, motivo } of semJuiz) {
    it(`${caso}: vira indeterminado, e nunca o degrau do meio`, () => {
      const julgamento = julgarLanceDeFinal({ fenAntes: FEN, uciDoAluno: OUTRO, antes })

      expect(julgamento.grau).toBe('indeterminado')
      expect(julgamento.motivo).toBe(motivo)
      // O que não pode acontecer de jeito nenhum: afirmar um caminho melhor
      // que ninguém consultou.
      expect(julgamento.comparacao).toBeNull()
    })
  }

  it('o degrau da degradação não se parece com o degrau do meio nem com acerto', () => {
    const semTablebase = APRESENTACAO_POR_GRAU.indeterminado
    const doMeio = APRESENTACAO_POR_GRAU['mantem-mas-e-pior']

    expect(semTablebase.tom).not.toBe(doMeio.tom)
    expect(semTablebase.tom).not.toBe(APRESENTACAO_POR_GRAU.melhor.tom)
    expect(semTablebase.rotulo).not.toBe(doMeio.rotulo)
  })

  it('julgar com a tablebase de OUTRA posição lança, em vez de dar veredito plausível', () => {
    const outraPosicao = posicoesDe([...CURRICULO_FINAIS]).find((p) => p.fen !== FEN)
    if (outraPosicao === undefined) {
      throw new Error('O currículo tem uma posição só: reescreva este teste.')
    }

    expect(() =>
      julgarLanceDeFinal({
        fenAntes: FEN,
        uciDoAluno: MELHOR,
        antes: resposta(outraPosicao.fen, 'win', 'vitoria', [
          lance(MELHOR, 'loss', 'derrota', DTZ_DO_MELHOR),
        ]),
      }),
    ).toThrow(/outra posição/i)
  })
})

// ------------------------------------------------------- apresentação e varreduras

describe('apresentação dos degraus', () => {
  it('a varredura encontrou degraus e motivos para checar', () => {
    expect(GRAUS_DO_LANCE.length).toBeGreaterThan(0)
    expect(MOTIVOS_DO_JULGAMENTO.length).toBeGreaterThan(0)
  })

  it('todo degrau traz tom, ícone e texto — status nunca é só cor', () => {
    for (const grau of GRAUS_DO_LANCE) {
      const apresentacao = APRESENTACAO_POR_GRAU[grau]
      expect(apresentacao, grau).toBeDefined()
      expect(TONS_DO_ESTADO, `${grau} usa um tom que não existe`).toContain(apresentacao.tom)
      expect(apresentacao.icone.length, `${grau} sem ícone`).toBeGreaterThan(0)
      expect(apresentacao.rotulo.length, `${grau} sem texto`).toBeGreaterThan(0)
    }
  })

  it('não tem apresentação órfã: toda chave apresentada é um degrau do domínio', () => {
    expect(Object.keys(APRESENTACAO_POR_GRAU).sort()).toEqual([...GRAUS_DO_LANCE].sort())
  })

  it('os três degraus de veredito têm tons DIFERENTES entre si', () => {
    // O degrau do meio não pode parecer erro nem acerto limpo. Sem esta
    // asserção, achatar os tons é uma mudança de uma linha que nada acusa.
    const tons = [
      APRESENTACAO_POR_GRAU.melhor.tom,
      APRESENTACAO_POR_GRAU['mantem-mas-e-pior'].tom,
      APRESENTACAO_POR_GRAU['perde-o-resultado'].tom,
    ]
    expect(new Set(tons).size).toBe(tons.length)
  })

  it('todo tom tem classe na folha de estilo do treinador', () => {
    // Sem isto, um tom novo aparece SEM COR nenhuma e nada acusa: o texto e o
    // ícone continuam lá, e a revisão de código não vê a diferença.
    const css = readFileSync(
      join(process.cwd(), 'src/components/endgames/EndgameTrainer.module.css'),
      'utf8',
    )
    for (const tom of TONS_DO_ESTADO) {
      expect(css, `falta a classe .${tom} no CSS do treinador`).toContain(`.${tom} {`)
    }
  })

  it('todo motivo do domínio tem frase própria na tela', () => {
    const frases = new Map<MotivoDoJulgamento, string>()
    for (const motivo of MOTIVOS_DO_JULGAMENTO) {
      const julgamento: JulgamentoDoLance = {
        grau: 'indeterminado',
        motivo,
        uciDoAluno: OUTRO,
        resultadoAntes: 'vitoria',
        resultadoDepois: 'vitoria',
        melhorUci: MELHOR,
        melhorSan: null,
        comparacao: {
          metrica: 'dtz',
          doAluno: Math.abs(DTZ_DO_PIOR),
          doMelhor: Math.abs(DTZ_DO_MELHOR),
          lancesAteOMate: null,
        },
      }
      const frase = descreverJulgamento(julgamento)
      expect(frase.length, `${motivo} sem frase`).toBeGreaterThan(0)
      frases.set(motivo, frase)
    }
    // Frase repetida é copy-paste: dois motivos diferentes dizendo a mesma
    // coisa não informam nada.
    expect(new Set(frases.values()).size).toBe(MOTIVOS_DO_JULGAMENTO.length)
  })
})

// ------------------------------------------------------------------- resumo

describe('resumo da tentativa', () => {
  function comGrau(grau: GrauDoLance): JulgamentoDoLance {
    return {
      grau,
      motivo: 'e-o-melhor-lance',
      uciDoAluno: MELHOR,
      resultadoAntes: 'vitoria',
      resultadoDepois: 'vitoria',
      melhorUci: MELHOR,
      melhorSan: null,
      comparacao: null,
    }
  }

  it('o resumo tem um contador por degrau, vindos da FONTE', () => {
    const resumo = resumirJulgamentos([])
    expect(Object.keys(resumo.porGrau).sort()).toEqual([...GRAUS_DO_LANCE].sort())
    expect(resumo.total).toBe(0)
  })

  it('sem lance julgado, o resumo cala', () => {
    expect(resumirEmTexto(resumirJulgamentos([]))).toBeNull()
  })

  it('conta cada degrau na proporção certa', () => {
    const resumo = resumirJulgamentos([
      comGrau('melhor'),
      comGrau('mantem-mas-e-pior'),
      comGrau('mantem-mas-e-pior'),
      comGrau('indeterminado'),
    ])

    expect(resumo.total).toBe(4)
    expect(resumo.porGrau['mantem-mas-e-pior']).toBe(2)
    expect(resumo.porGrau.melhor).toBe(1)
    expect(resumo.porGrau.indeterminado).toBe(1)
  })

  it('o texto do resumo mostra QUANTOS lances foram do degrau do meio', () => {
    const resumo = resumirJulgamentos([
      comGrau('melhor'),
      comGrau('mantem-mas-e-pior'),
      comGrau('mantem-mas-e-pior'),
    ])
    const texto = resumirEmTexto(resumo) ?? ''

    expect(texto).toContain(String(resumo.porGrau['mantem-mas-e-pior']))
    expect(texto).toContain(String(resumo.total))
  })

  it('tentativa toda no melhor lance não inventa ressalva', () => {
    const texto = resumirEmTexto(resumirJulgamentos([comGrau('melhor'), comGrau('melhor')])) ?? ''
    expect(texto).toMatch(/melhores/i)
    expect(texto).not.toMatch(/mais longo/i)
  })

  it('lance sem juiz aparece no resumo como não comparado, não como acerto', () => {
    const texto = resumirEmTexto(resumirJulgamentos([comGrau('indeterminado')])) ?? ''
    expect(texto).toMatch(/comparar/i)
  })
})
