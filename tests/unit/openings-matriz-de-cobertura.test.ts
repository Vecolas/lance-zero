/**
 * A COBERTURA DOS DOIS LADOS VIRA MATRIZ: cada ramo, em cada papel.
 *
 * O QUE ELA SUBSTITUI é um alvo único chamado `perspectiva-reversa`, que o plano
 * VNext §27.1 diagnostica como "amplo demais". Ele significava "jogou a abertura
 * pelo outro lado uma vez", e não dizia NADA sobre qual linha foi enfrentada —
 * o aluno podia demonstrar a principal pelo lado de lá e o app registrava que
 * ele sabia defender a abertura inteira.
 *
 * E ELA FECHA UM PONTO CEGO DECLARADO NO ADR-0022: a cobertura derivava de
 * `opening.variations` INTEIRO, então um ramo `secondary` — que o curso diz não
 * ser necessário para concluir — era cobrado no treino assim mesmo. As duas
 * metades do produto discordavam sobre o que é essencial, e quem pagava era
 * quem não conseguia fechar a jornada.
 */

import { describe, expect, it } from 'vitest'
import { OPENING_COURSES } from '@/content/openings/course'
import {
  ALVO_MAINLINE,
  ALVO_PERSPECTIVA_REVERSA,
  alvoReverso,
  alvosDeTreinoFinal,
  alvosRecomendados,
  ehAlvoReverso,
  iniciarRodadaDeAbertura,
  ladoDoAlvo,
  matrizDeCobertura,
  ramoDoAlvo,
} from '@/domain/openings/jornada'
import { ramosCore, ramosDaAbertura } from '@/domain/openings/ramos'

const ITALIANA = OPENING_COURSES.find((o) => o.slug === 'italiana')!

describe('a matriz de cobertura', () => {
  it('lista a linha principal e todos os ramos, nos dois papéis', () => {
    for (const opening of OPENING_COURSES) {
      const matriz = matrizDeCobertura(opening)
      expect(matriz.length, `${opening.slug}`).toBe(ramosDaAbertura(opening).length + 1)
      expect(matriz[0]?.ramoId).toBe(ALVO_MAINLINE)
      for (const linha of matriz) {
        expect(linha.alvoNoSeuLado, `${opening.slug} / ${linha.nome}`).not.toBe(
          linha.alvoNoOutroLado,
        )
      }
    }
  })

  it('a linha principal é exigida nos DOIS papéis', () => {
    /*
      Saber jogar e saber enfrentar são coisas diferentes, e a principal é a
      única linha em que as duas são obrigatórias — é o mínimo que prova que o
      aluno entendeu a posição em vez de decorar a sequência do lado dele.
    */
    for (const opening of OPENING_COURSES) {
      const principal = matrizDeCobertura(opening)[0]
      expect(principal?.exigidoNoSeuLado, `${opening.slug}`).toBe(true)
      expect(principal?.exigidoNoOutroLado, `${opening.slug}`).toBe(true)
    }
  })

  it('só ramo core é exigido — e este é o ponto cego do ADR-0022 fechado', () => {
    for (const opening of OPENING_COURSES) {
      for (const linha of matrizDeCobertura(opening).slice(1)) {
        expect(linha.exigidoNoSeuLado, `${opening.slug} / ${linha.nome}`).toBe(
          linha.importancia === 'core',
        )
      }
    }
  })

  it('a Italiana deixa de cobrar a Húngara, que é complementar', () => {
    /*
      O CASO CONCRETO, e é por isso que ele está cravado: `italiana-hungara` é
      `secondary` no conteúdo, e antesda matriz ela entrava na lista de alvos
      exigidos como qualquer outra. A biblioteca dizia "complementar" e o treino
      cobrava assim mesmo.
    */
    const exigidos = alvosDeTreinoFinal(ITALIANA)
    expect(exigidos).not.toContain('italiana-hungara')
    expect(alvosRecomendados(ITALIANA)).toContain('italiana-hungara')
  })

  it('nenhum ramo core do curso fica de fora dos alvos exigidos', () => {
    for (const opening of OPENING_COURSES) {
      const exigidos = alvosDeTreinoFinal(opening)
      for (const ramo of ramosCore(opening)) {
        expect(exigidos, `${opening.slug} / ${ramo.nome}`).toContain(ramo.id)
      }
    }
  })

  it('o curso NÃO dobra: o lado de lá só é exigido na principal', () => {
    /*
      §27.3. Exigir todo ramo core nos dois papéis transformaria uma jornada de
      seis rodadas numa de dez sem que o conteúdo tivesse crescido — e a etapa
      que ensina viraria a etapa que cansa.
    */
    for (const opening of OPENING_COURSES) {
      const reversosExigidos = alvosDeTreinoFinal(opening).filter(ehAlvoReverso)
      expect(reversosExigidos, `${opening.slug}`).toEqual([ALVO_PERSPECTIVA_REVERSA])
    }
  })

  it('exigido e recomendado não se sobrepõem, e juntos cobrem a matriz', () => {
    for (const opening of OPENING_COURSES) {
      const exigidos = alvosDeTreinoFinal(opening)
      const recomendados = alvosRecomendados(opening)
      for (const alvo of recomendados) {
        expect(exigidos, `${opening.slug}: ${alvo}`).not.toContain(alvo)
      }
      const todos = matrizDeCobertura(opening).flatMap((linha) => [
        linha.alvoNoSeuLado,
        linha.alvoNoOutroLado,
      ])
      for (const alvo of todos) {
        expect([...exigidos, ...recomendados], `${opening.slug}: ${alvo}`).toContain(alvo)
      }
    }
  })
})

describe('o alvo carrega o papel sem perder o ramo', () => {
  it('a perspectiva reversa MANTÉM o id antigo', () => {
    /*
      `alvosCobertos` é PERSISTIDO. Renomear este id para `reverso:mainline`
      descartaria em silêncio a cobertura de quem já demonstrou os dois lados —
      e a jornada dele voltaria a ficar incompleta sem nada ter acontecido.
    */
    expect(alvoReverso(ALVO_MAINLINE)).toBe(ALVO_PERSPECTIVA_REVERSA)
    expect(ramoDoAlvo(ALVO_PERSPECTIVA_REVERSA)).toBe(ALVO_MAINLINE)
  })

  it('o alvo reverso de um ramo volta a dar o ramo', () => {
    for (const ramo of ramosDaAbertura(ITALIANA)) {
      const reverso = alvoReverso(ramo.id)
      expect(ehAlvoReverso(reverso)).toBe(true)
      expect(ramoDoAlvo(reverso)).toBe(ramo.id)
    }
  })

  it('o alvo reverso inverte o lado do aluno', () => {
    for (const opening of OPENING_COURSES) {
      const outro = opening.side === 'white' ? 'black' : 'white'
      expect(ladoDoAlvo(opening, ALVO_MAINLINE)).toBe(opening.side)
      expect(ladoDoAlvo(opening, ALVO_PERSPECTIVA_REVERSA)).toBe(outro)
      const ramo = ramosDaAbertura(opening)[0]
      if (!ramo) continue
      expect(ladoDoAlvo(opening, ramo.id)).toBe(opening.side)
      expect(ladoDoAlvo(opening, alvoReverso(ramo.id))).toBe(outro)
    }
  })

  it('a rodada de um ramo pelo outro lado começa NO RAMO, e não na principal', () => {
    /*
      O DEFEITO SILENCIOSO QUE ISTO PEGA: `raizDoAlvo` e `profundidadeDoAlvo`
      procuram a variação por id. Um alvo `reverso:<ramo>` não casaria com
      nenhuma, as duas cairiam na linha principal, e o aluno que pediu para
      enfrentar a Defesa dos Dois Cavalos receberia a principal — sem exceção,
      sem log, sem nada na tela dizendo que o pedido foi ignorado.
    */
    for (const ramo of ramosDaAbertura(ITALIANA)) {
      const reverso = alvoReverso(ramo.id)
      const doLado = iniciarRodadaDeAbertura(
        ITALIANA,
        ramo.id,
        ladoDoAlvo(ITALIANA, ramo.id),
        'ramo',
      )
      const doOutro = iniciarRodadaDeAbertura(
        ITALIANA,
        reverso,
        ladoDoAlvo(ITALIANA, reverso),
        'ramo',
      )

      expect(doOutro.startNodeId, `${ramo.nome}`).toBe(doLado.startNodeId)
      expect(doOutro.startFen, `${ramo.nome}`).toBe(doLado.startFen)
      expect(doOutro.targetPly, `${ramo.nome}`).toBe(doLado.targetPly)
      // E o lado de quem joga é o único que muda.
      expect(doOutro.userSide).not.toBe(doLado.userSide)
    }
  })
})
