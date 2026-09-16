/**
 * Portão dos quatro níveis de conclusão.
 *
 * ESTE ARQUIVO EXISTE POR CAUSA DE UM BUG ESPECÍFICO, e o teste que mais
 * importa é o que o reproduz:
 *
 *     o aluno sai do repertório
 *     → a rodada termina
 *     → a tela mostra "Atividade concluída ✓"
 *
 * Em `OpeningCourse` a condição era `if (!result.nextNodeId || …) setDone(true)`
 * seguida de `completeOpeningActivity(...)`, e `!result.nextNodeId` é
 * exatamente o caso FORA DO REPERTÓRIO. O único caminho de ERRO era também o
 * que gravava conclusão.
 *
 * O defeito não aparece como exceção nem como tela quebrada: aparece como
 * elogio. É por isso que ele precisa de portão — nada mais no app discorda dele.
 */

import { describe, expect, it } from 'vitest'
import {
  FRASES_PROIBIDAS_NA_RODADA,
  NIVEIS_DE_CONCLUSAO,
  TITULO_DA_RODADA,
  concluirEtapa,
  criarJornada,
  efeitoDaRodada,
  estadoNoTrilho,
  etapaCumprida,
  jornadaConcluida,
  progressoDaJornada,
  registrarItem,
  registrarRodada,
  rodadaFoiSucesso,
  rodadaTerminou,
  rotuloDeRetomada,
  voltarParaEtapa,
  type StudyStage,
} from '@/domain/jornada'

const AGORA = new Date('2026-03-10T12:00:00.000Z')

const ETAPAS: StudyStage[] = [
  {
    id: 'visao',
    tipo: 'visao',
    titulo: 'Visão e objetivo',
    rotuloCurto: 'Visão',
    objetivo: 'Entender o que a abertura procura.',
    regra: { tipo: 'leitura' },
  },
  {
    id: 'guiada',
    tipo: 'pratica-guiada',
    titulo: 'Prática guiada',
    rotuloCurto: 'Guiada',
    objetivo: 'Responder com apoio.',
    regra: { tipo: 'itens', total: 2 },
  },
  {
    id: 'treino',
    tipo: 'treino-final',
    titulo: 'Treino final',
    rotuloCurto: 'Treino',
    objetivo: 'Demonstrar o repertório inteiro.',
    regra: { tipo: 'cobertura', alvosExigidos: ['mainline', 'variacao-a', 'perspectiva-reversa'] },
    ehTreinoFinal: true,
  },
]

function jornadaNova() {
  return criarJornada('j1', 'italiana', 'abertura', ETAPAS)
}

describe('os quatro níveis são quatro, e não um', () => {
  it('a lista nomeia step, round, stage e journey', () => {
    expect([...NIVEIS_DE_CONCLUSAO]).toEqual(['step', 'round', 'stage', 'journey'])
  })

  it('uma rodada encerrada NUNCA se chama "atividade concluída"', () => {
    // A frase do bug, e as variações que alguém escreveria sem perceber que
    // está recriando o mesmo defeito com outras palavras.
    for (const desfecho of ['sucesso', 'falhou'] as const) {
      const titulo = TITULO_DA_RODADA[desfecho].toLocaleLowerCase('pt-BR')
      for (const proibida of FRASES_PROIBIDAS_NA_RODADA) {
        expect(titulo, `${desfecho} usa "${proibida}"`).not.toContain(proibida)
      }
    }
  })

  it('sucesso e falha AMBOS encerram a rodada; só um avança a cobertura', () => {
    expect(rodadaTerminou('ativa')).toBe(false)
    expect(rodadaTerminou('sucesso')).toBe(true)
    expect(rodadaTerminou('falhou')).toBe(true)

    expect(efeitoDaRodada('sucesso').avancaCobertura).toBe(true)
    expect(efeitoDaRodada('falhou').avancaCobertura).toBe(false)
    expect(rodadaFoiSucesso('falhou')).toBe(false)
  })
})

describe('O BUG: erro de rodada não conclui nada acima dele', () => {
  it('rodada falha NÃO acrescenta alvo de cobertura', () => {
    const antes = jornadaNova()
    const depois = registrarRodada(antes, 'treino', 'mainline', 'falhou')

    expect(depois.alvosCobertos.treino ?? []).toEqual([])
    // Devolve a MESMA jornada: nada mudou, nem um carimbo de tempo.
    expect(depois).toBe(antes)
  })

  it('rodada falha deixa a etapa de treino INCOMPLETA', () => {
    let jornada = jornadaNova()
    jornada = registrarRodada(jornada, 'treino', 'mainline', 'falhou')
    jornada = registrarRodada(jornada, 'treino', 'variacao-a', 'falhou')

    expect(etapaCumprida(jornada, ETAPAS[2])).toBe(false)
    expect(jornadaConcluida(jornada, ETAPAS)).toBe(false)
  })

  it('e a jornada não conclui nem quando o aluno tenta avançar à força', () => {
    let jornada = jornadaNova()
    jornada = { ...jornada, currentStageId: 'treino' }
    jornada = registrarRodada(jornada, 'treino', 'mainline', 'falhou')

    // `concluirEtapa` RECUSA: a regra de cobertura não foi cumprida.
    const tentativa = concluirEtapa(jornada, ETAPAS, AGORA)
    expect(tentativa.completedStageIds).not.toContain('treino')
    expect(tentativa.status).not.toBe('concluida')
    expect(tentativa.completedAt).toBeNull()
  })

  it('só a cobertura COMPLETA conclui o treino', () => {
    let jornada = jornadaNova()
    for (const alvo of ['mainline', 'variacao-a']) {
      jornada = registrarRodada(jornada, 'treino', alvo, 'sucesso')
    }
    // Falta a perspectiva reversa: ainda não fecha.
    expect(etapaCumprida(jornada, ETAPAS[2])).toBe(false)

    jornada = registrarRodada(jornada, 'treino', 'perspectiva-reversa', 'sucesso')
    expect(etapaCumprida(jornada, ETAPAS[2])).toBe(true)
  })
})

describe('erro não apaga sucesso anterior', () => {
  it('errar a variação B mantém mainline e variação A cobertas', () => {
    let jornada = jornadaNova()
    jornada = registrarRodada(jornada, 'treino', 'mainline', 'sucesso')
    jornada = registrarRodada(jornada, 'treino', 'variacao-a', 'sucesso')
    jornada = registrarRodada(jornada, 'treino', 'perspectiva-reversa', 'falhou')

    // Zerar tudo a cada erro seria punição, e transformaria o treino numa
    // corrida de sorte em vez de uma medida de cobertura.
    expect(jornada.alvosCobertos.treino).toEqual(['mainline', 'variacao-a'])
  })

  it('o mesmo alvo duas vezes não duplica', () => {
    let jornada = jornadaNova()
    jornada = registrarRodada(jornada, 'treino', 'mainline', 'sucesso')
    jornada = registrarRodada(jornada, 'treino', 'mainline', 'sucesso')
    expect(jornada.alvosCobertos.treino).toEqual(['mainline'])
  })
})

describe('a etapa de itens conclui por RESPONDER, não por acertar', () => {
  it('responder os itens previstos conclui, sem ninguém perguntar se acertou', () => {
    let jornada = jornadaNova()
    // `registrarItem` nem recebe se acertou: a assinatura é o portão.
    jornada = registrarItem(jornada, 'guiada', 'i1')
    expect(etapaCumprida(jornada, ETAPAS[1])).toBe(false)
    jornada = registrarItem(jornada, 'guiada', 'i2')
    expect(etapaCumprida(jornada, ETAPAS[1])).toBe(true)
  })

  it('o mesmo item repetido não conclui a etapa sozinho', () => {
    let jornada = jornadaNova()
    for (let i = 0; i < 5; i += 1) jornada = registrarItem(jornada, 'guiada', 'i1')
    expect(etapaCumprida(jornada, ETAPAS[1])).toBe(false)
  })
})

describe('a sequência é do sistema; a navegação é do aluno', () => {
  it('concluir a etapa move o cursor para a seguinte', () => {
    const jornada = concluirEtapa(jornadaNova(), ETAPAS, AGORA)
    expect(jornada.currentStageId).toBe('guiada')
    expect(jornada.completedStageIds).toEqual(['visao'])
    expect(jornada.startedAt).toBe(AGORA.toISOString())
  })

  it('voltar para uma etapa concluída NÃO apaga progresso', () => {
    let jornada = concluirEtapa(jornadaNova(), ETAPAS, AGORA)
    jornada = registrarItem(jornada, 'guiada', 'i1')

    const voltou = voltarParaEtapa(jornada, 'visao')
    expect(voltou.currentStageId).toBe('visao')
    // Reler não é refazer: o item respondido continua lá.
    expect(voltou.itensRespondidos.guiada).toEqual(['i1'])
    expect(voltou.completedStageIds).toEqual(['visao'])
  })

  it('NÃO deixa pular para o treino sem cumprir o caminho', () => {
    const jornada = jornadaNova()
    // Etapa futura não é destino: sem isto, "sequência automática" seria
    // decorativa e o aluno cairia no treino sem ter recebido nada.
    expect(voltarParaEtapa(jornada, 'treino').currentStageId).toBe('visao')
  })

  it('entrar no treino final muda o status para em-treino', () => {
    let jornada = concluirEtapa(jornadaNova(), ETAPAS, AGORA)
    jornada = registrarItem(jornada, 'guiada', 'i1')
    jornada = registrarItem(jornada, 'guiada', 'i2')
    jornada = concluirEtapa(jornada, ETAPAS, AGORA)

    expect(jornada.currentStageId).toBe('treino')
    expect(jornada.status).toBe('em-treino')
  })
})

describe('o progresso e o trilho são derivados', () => {
  it('conta as etapas cumpridas, não as visitadas', () => {
    let jornada = concluirEtapa(jornadaNova(), ETAPAS, AGORA)
    jornada = registrarItem(jornada, 'guiada', 'i1')

    const progresso = progressoDaJornada(jornada, ETAPAS)
    expect(progresso.total).toBe(3)
    expect(progresso.concluidas).toBe(1)
    expect(progresso.atual).toBe(2)
  })

  it('o trilho distingue concluída, atual e futura', () => {
    const jornada = concluirEtapa(jornadaNova(), ETAPAS, AGORA)
    expect(estadoNoTrilho(jornada, ETAPAS[0])).toBe('concluida')
    expect(estadoNoTrilho(jornada, ETAPAS[1])).toBe('atual')
    expect(estadoNoTrilho(jornada, ETAPAS[2])).toBe('futura')
  })

  it('jornada vazia NÃO é jornada concluída', () => {
    // Regra 3 dos portões: zero de zero não é 100%.
    expect(jornadaConcluida(criarJornada('x', 'y', 'abertura', []), [])).toBe(false)
  })
})

describe('o rótulo do botão diz o estado sem o aluno precisar deduzir', () => {
  it('cobre os três estados', () => {
    expect(rotuloDeRetomada(null)).toBe('Estudar')
    expect(rotuloDeRetomada(jornadaNova())).toBe('Estudar')

    const comecada = concluirEtapa(jornadaNova(), ETAPAS, AGORA)
    expect(rotuloDeRetomada(comecada)).toBe('Continuar estudo')

    expect(rotuloDeRetomada({ ...comecada, status: 'concluida' })).toBe('Treinar novamente')
  })
})

describe('as funções não mutam a entrada', () => {
  it('registrarRodada, registrarItem e concluirEtapa devolvem cópias', () => {
    const original = jornadaNova()
    const copia = structuredClone(original)

    registrarRodada(original, 'treino', 'mainline', 'sucesso')
    registrarItem(original, 'guiada', 'i1')
    concluirEtapa(original, ETAPAS, AGORA)

    expect(original).toEqual(copia)
  })
})
