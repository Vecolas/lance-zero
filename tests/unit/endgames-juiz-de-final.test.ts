/**
 * O PORTÃO DO JUIZ: a rodada de treino TERMINA.
 *
 * O defeito que ele mata: `/finais/[slug]` montava a jornada sem juiz, e no modo
 * sem juiz `VereditoDeLanceDeFinal.objetivo` é sempre `null`. Nenhuma rodada
 * alcançava `sucesso`, `registrarRodadaDeFinal` nunca era chamado, a cobertura
 * da etapa 10 nunca fechava — e o treino esconde o rodapé, então o aluno também
 * não tinha por onde sair. Uma etapa que não conclui por nenhum caminho é o
 * mesmo beco do ADR-0020, só que no fim da jornada em vez do começo.
 *
 * A TABLEBASE É FIXADA em todos os casos. Teste que depende de rede não é
 * portão, é sorteio — e a orientação oficial da Lichess é uma requisição por
 * vez. Quem confere o serviço real é `tests/contrato/`.
 *
 * O QUE ELE NÃO PROVA:
 *
 * - que a tablebase real responde o que a sonda falsa responde. Isso é contrato,
 *   e mora em `tests/contrato/biblioteca-vs-tablebase.test.ts`;
 * - que o adversário joga BEM. Ele prova que o adversário joga, e que não escolhe
 *   um lance que entrega o resultado; a qualidade da escolha é de
 *   `escolherLancePratico`, com portão próprio em `endgames-jornada.test.ts`;
 * - nada sobre a tela. O juiz é uma função.
 */

import { describe, expect, it } from 'vitest'
import { criarJuizDeFinal, type Sonda } from '@/components/endgames/juiz-de-final'
import type { EndgamePosition } from '@/domain/endgames'
import {
  iniciarRodadaDeFinal,
  jogarNaRodadaDeFinal,
  registrarRodadaDeFinal,
  type EndgameTrainingRound,
} from '@/domain/endgames/jornada'
import { criarJornada, type StudyJourney, type StudyStage } from '@/domain/jornada'
import type { TablebaseResult } from '@/domain/types'

/** Mate de rei e dama: o aluno dá mate em um lance com Qb8#. */
const MATE_EM_UM: EndgamePosition = {
  id: 'mate-em-um',
  fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1',
  sideToTrain: 'white',
  objective: 'mate',
  conceptIds: ['queen-mate'],
  validationSource: 'curated',
  difficulty: 1,
}

/** Rei e peão com o rei à frente: promover é o objetivo. */
const PROMOVER: EndgamePosition = {
  id: 'promover',
  fen: '8/3P4/3K4/8/8/8/8/6k1 w - - 0 1',
  sideToTrain: 'white',
  objective: 'promote',
  conceptIds: ['king-pawn'],
  validationSource: 'curated',
  difficulty: 1,
}

/** Sonda muda: a tablebase não respondeu. É o modo offline. */
const SEM_TABLEBASE: Sonda = async () => null

/** Sonda que devolve um resultado fixo para qualquer posição. */
function sondaFixa(resultado: Partial<TablebaseResult>): Sonda {
  return async (fen) => ({
    fen,
    categoria: 'win',
    resultado: 'vitoria',
    dtz: 1,
    dtm: 2,
    xequeMate: false,
    afogamento: false,
    lances: [],
    doCache: false,
    ...resultado,
  })
}

function rodadaDe(posicao: EndgamePosition): EndgameTrainingRound {
  return iniciarRodadaDeFinal({
    id: `teste:${posicao.id}`,
    endgameId: 'teste',
    positionFamilyId: 'teste-set',
    posicao,
  })
}

describe('a rodada TERMINA — o defeito de origem', () => {
  it('mate do aluno encerra a rodada em sucesso, mesmo sem tablebase', async () => {
    /*
      SEM REDE E MESMO ASSIM CONCLUSIVO. É a afirmação central desta entrega: o
      desfecho vem de `avaliarObjetivo`, que é local. Se ele dependesse da
      tablebase, ficar offline devolveria o aluno ao treino sem fim.
    */
    const juiz = criarJuizDeFinal({ probe: SEM_TABLEBASE })
    const round = rodadaDe(MATE_EM_UM)

    const veredito = await juiz({
      posicao: MATE_EM_UM,
      fenAntes: round.currentFen,
      uciDoAluno: 'b1b8',
      lancesJogados: [],
    })

    expect(veredito.legal).toBe(true)
    expect(veredito.objetivo?.estado).toBe('cumprido')
    expect(veredito.objetivo?.motivo).toBe('mate-aplicado')
    // E o julgamento é `null`, não um veredito inventado: sem tablebase não há
    // com o que comparar, e dizer "não sei" é o contrato deste projeto.
    expect(veredito.julgamento).toBeNull()
  })

  it('o sucesso atravessa a rodada e vira cobertura da etapa', async () => {
    // O caminho inteiro, e é ele que estava cortado: veredito → rodada →
    // `registrarRodadaDeFinal` → `alvosCobertos`.
    const juiz = criarJuizDeFinal({ probe: SEM_TABLEBASE })
    const round = rodadaDe(MATE_EM_UM)
    const veredito = await juiz({
      posicao: MATE_EM_UM,
      fenAntes: round.currentFen,
      uciDoAluno: 'b1b8',
      lancesJogados: [],
    })

    const { round: proximo } = jogarNaRodadaDeFinal(round, 'b1b8', veredito)
    expect(proximo.desfecho).toBe('sucesso')

    const stages: StudyStage[] = [
      {
        id: 'treino-final',
        tipo: 'treino-final',
        titulo: 'Treino',
        rotuloCurto: 'Treino',
        objetivo: 'x',
        regra: { tipo: 'cobertura', alvosExigidos: [round.alvoDeCobertura] },
        ehTreinoFinal: true,
      },
    ]
    const jornada: StudyJourney = criarJornada('j', 'teste', 'final', stages)
    const depois = registrarRodadaDeFinal(jornada, 'treino-final', proximo)

    expect(depois.alvosCobertos['treino-final']).toEqual([round.alvoDeCobertura])
  })

  it('a promoção encerra a rodada de um final de peão', async () => {
    const juiz = criarJuizDeFinal({ probe: SEM_TABLEBASE })
    const round = rodadaDe(PROMOVER)

    const veredito = await juiz({
      posicao: PROMOVER,
      fenAntes: round.currentFen,
      // O UCI da promoção carrega a peça. Sem ela o lance é ILEGAL, e o juiz o
      // recusa — que é o comportamento certo e um jeito fácil de escrever um
      // teste que passa medindo outra coisa.
      uciDoAluno: 'd7d8q',
      lancesJogados: [],
    })

    expect(veredito.objetivo?.estado).toBe('cumprido')
    expect(veredito.objetivo?.motivo).toBe('promocao-alcancada')
  })
})

describe('o computador responde', () => {
  it('a posição devolvida já tem a resposta do adversário — o aluno não joga os dois lados', async () => {
    /*
      O defeito que isto mata: o modo sem juiz devolvia `aplicado.fenAfter`, a
      posição logo depois do lance do ALUNO. Como a vez passava para o outro
      lado e ninguém jogava por ele, o aluno conduzia a partida sozinho — e
      "converter contra ninguém" não mede técnica nenhuma.
    */
    const juiz = criarJuizDeFinal({ probe: SEM_TABLEBASE })
    const round = rodadaDe(PROMOVER)

    const veredito = await juiz({
      posicao: PROMOVER,
      fenAntes: round.currentFen,
      uciDoAluno: 'd6c6',
      lancesJogados: [],
    })

    // Depois do lance do aluno seria a vez das pretas; com a resposta aplicada,
    // a vez volta a ser do aluno.
    expect(veredito.fenDepois.split(' ')[1]).toBe('w')
  })

  it('defendendo, não escolhe o lance que entrega a vitória ao aluno', async () => {
    /*
      A política prática em uso. `escolherLancePratico` veta por `preserveOutcome`
      e nunca pontua: um lance que entrega o final não pode vencer por ser
      "ativo" ou "simples". Aqui a tablebase oferece os dois, e o veto tem de
      morder.
    */
    const entrega = 'g1g2'
    const resiste = 'g1h2'
    const juiz = criarJuizDeFinal({
      probe: sondaFixa({
        lances: [
          { uci: entrega, san: null, categoria: 'loss', resultado: 'vitoria', dtz: 1, dtm: 2 },
          { uci: resiste, san: null, categoria: 'draw', resultado: 'empate', dtz: 0, dtm: null },
        ],
      }),
    })

    const veredito = await juiz({
      posicao: PROMOVER,
      fenAntes: PROMOVER.fen,
      uciDoAluno: 'd6c6',
      lancesJogados: [],
    })

    // O rei preto foi para h2 — o lance que RESISTE —, e não para g2, que a
    // tablebase marcou como entrega. A fileira 2 é a sétima do campo de posição.
    const fileira2 = veredito.fenDepois.split(' ')[0]?.split('/')[6]
    expect(fileira2, `resposta escolhida: ${veredito.fenDepois}`).toBe('7k')
  })
})

describe('o juiz não inventa', () => {
  it('lance ilegal é recusado sem julgar mais nada', async () => {
    const juiz = criarJuizDeFinal({ probe: SEM_TABLEBASE })
    const veredito = await juiz({
      posicao: MATE_EM_UM,
      fenAntes: MATE_EM_UM.fen,
      uciDoAluno: 'b1b9',
      lancesJogados: [],
    })

    expect(veredito.legal).toBe(false)
    expect(veredito.objetivo).toBeNull()
    expect(veredito.julgamento).toBeNull()
    // A posição não andou: lance ilegal não foi jogado.
    expect(veredito.fenDepois).toBe(MATE_EM_UM.fen)
  })

  it('a rodada segue ATIVA num lance que só preserva — um bom lance não conclui', async () => {
    // A regra que separa final de puzzle: conversão se joga até o fim.
    const juiz = criarJuizDeFinal({ probe: SEM_TABLEBASE })
    const veredito = await juiz({
      posicao: MATE_EM_UM,
      fenAntes: MATE_EM_UM.fen,
      uciDoAluno: 'b1b7',
      lancesJogados: [],
    })

    expect(veredito.objetivo?.estado).toBe('em-andamento')
  })
})
