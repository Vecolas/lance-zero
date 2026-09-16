/**
 * Portão da integração das jornadas com Roadmap e Hoje (plano §144–151).
 *
 * O QUE ESTE ARQUIVO PROTEGE, e é o que acontece quando telas diferentes
 * traduzem o mesmo estado por conta própria: o catálogo escreve "Continuar
 * estudo", o Roadmap escreve "Continuar", o Hoje escreve "Aprender" — e o aluno
 * lê três produtos que discordam sobre onde ele parou.
 *
 * O TESTE MAIS IMPORTANTE é `o deep link NÃO é atalho`. Um link que abrisse o
 * treino direto desfaria a sequência inteira: bastaria colar a URL para cair na
 * cobrança sem ter recebido o repertório, que é a dívida que este trabalho veio
 * pagar.
 */

import { describe, expect, it } from 'vitest'
import {
  ROTA_DO_DOMINIO,
  concluirEtapa,
  criarJornada,
  podeIrDiretoAoTreino,
  registrarRodada,
  resumoDaJornada,
  rotaDaEtapa,
  rotaDaJornada,
  verboDoHoje,
  voltarParaEtapa,
  type StudyStage,
} from '@/domain/jornada'
import { conteudoDoNo, jornadasComConteudoAusente } from '@/lib/training/jornadas-do-roadmap'
import { etapasDoConteudo } from '@/lib/training/etapas-do-conteudo'
import { ROADMAP_DEFINITION } from '@/domain/roadmap'

const AGORA = new Date('2026-03-10T12:00:00.000Z')

const ETAPAS: StudyStage[] = [
  {
    id: 'visao',
    tipo: 'visao',
    titulo: 'Visão',
    rotuloCurto: 'Visão',
    objetivo: 'ver',
    regra: { tipo: 'leitura' },
  },
  {
    id: 'linha',
    tipo: 'linha',
    titulo: 'Linha',
    rotuloCurto: 'Linha',
    objetivo: 'linha',
    regra: { tipo: 'leitura' },
  },
  {
    id: 'treino-final',
    tipo: 'treino',
    titulo: 'Treino final',
    rotuloCurto: 'Treino',
    objetivo: 'demonstrar',
    regra: { tipo: 'cobertura', alvosExigidos: ['mainline'] },
    ehTreinoFinal: true,
  },
]

function nova() {
  return criarJornada('abertura:italiana', 'italiana', 'abertura', ETAPAS)
}

/** Avança até o treino, cumprindo as etapas de leitura. */
function ateOTreino() {
  let jornada = nova()
  jornada = concluirEtapa(jornada, ETAPAS, AGORA)
  jornada = concluirEtapa(jornada, ETAPAS, AGORA)
  return jornada
}

describe('as rotas de jornada', () => {
  it('mantêm Aberturas e Finais em abas separadas', () => {
    expect(ROTA_DO_DOMINIO.abertura).toBe('/aberturas')
    expect(ROTA_DO_DOMINIO.final).toBe('/finais')
    // Não existe uma terceira rota agregando os dois.
    expect(Object.values(ROTA_DO_DOMINIO)).toHaveLength(2)
  })

  it('montam o endereço do conteúdo e da etapa', () => {
    expect(rotaDaJornada('abertura', 'italiana')).toBe('/aberturas/italiana')
    expect(rotaDaEtapa('final', 'oposicao', 'treino-final')).toBe(
      '/finais/oposicao?etapa=treino-final',
    )
  })

  it('escapam o id da etapa na URL', () => {
    expect(rotaDaEtapa('abertura', 'italiana', 'a b')).toContain('a%20b')
  })
})

describe('O DEEP LINK NÃO É ATALHO', () => {
  it('pedir o treino sem ter estudado NÃO abre o treino', () => {
    const jornada = nova()
    // É o que a URL faria: `voltarParaEtapa` é a porta única, e ela recusa
    // etapa futura. Sem isso, colar o link puloria o aprendizado inteiro.
    expect(voltarParaEtapa(jornada, 'treino-final').currentStageId).toBe('visao')
  })

  it('pedir o treino DEPOIS de estudar abre o treino', () => {
    const jornada = ateOTreino()
    expect(voltarParaEtapa(jornada, 'treino-final').currentStageId).toBe('treino-final')
  })

  it('podeIrDiretoAoTreino exige TODAS as etapas anteriores', () => {
    expect(podeIrDiretoAoTreino(nova(), ETAPAS)).toBe(false)
    expect(podeIrDiretoAoTreino(concluirEtapa(nova(), ETAPAS, AGORA), ETAPAS)).toBe(false)
    expect(podeIrDiretoAoTreino(ateOTreino(), ETAPAS)).toBe(true)
  })

  it('jornada inexistente nunca autoriza o treino', () => {
    expect(podeIrDiretoAoTreino(null, ETAPAS)).toBe(false)
  })
})

describe('o verbo e o resumo são os MESMOS em toda tela', () => {
  it('cobre os três estados do Hoje', () => {
    // O VERBO É UMA ESCOLHA, NÃO UMA PALAVRA: quem escreve "Aprender" ou "Learn"
    // é a tela, que sabe o idioma. O domínio devolve a decisão.
    expect(verboDoHoje(null, ETAPAS)).toBe('aprender')
    expect(verboDoHoje(nova(), ETAPAS)).toBe('aprender')
    expect(verboDoHoje(concluirEtapa(nova(), ETAPAS, AGORA), ETAPAS)).toBe('continuar')
    expect(verboDoHoje(ateOTreino(), ETAPAS)).toBe('treinar')
  })

  /**
   * O RESUMO DEVOLVE NÚMEROS, NÃO FRASE.
   *
   * Ele já devolveu "1 de 3 etapas" pronto, e a frase não atravessa idioma: em
   * inglês a ordem muda e o plural de "etapa" muda com o número. Quem monta o
   * texto é a tela, que sabe o idioma; aqui ficam os dois números, que não mudam.
   */
  it('o resumo conta etapas cumpridas, não visitadas', () => {
    const resumo = resumoDaJornada(concluirEtapa(nova(), ETAPAS, AGORA), ETAPAS)
    expect(resumo.concluidas).toBe(1)
    expect(resumo.total).toBe(3)
    expect(resumo.rotulo).toBe('continuar')
    expect(resumo.concluida).toBe(false)
  })

  it('sem jornada, o resumo diz o tamanho do estudo', () => {
    const resumo = resumoDaJornada(null, ETAPAS)
    expect(resumo.concluidas).toBe(0)
    expect(resumo.total).toBe(3)
    expect(resumo.rotulo).toBe('estudar')
    expect(resumo.etapaAtual).toBeNull()
  })

  it('CONCLUÍDA é derivada das etapas, e não do campo `status`', () => {
    // Um `status` mentiroso não engana o resumo: quem manda é a cobertura.
    const mentiroso = { ...ateOTreino(), status: 'concluida' as const }
    expect(resumoDaJornada(mentiroso, ETAPAS).concluida).toBe(false)

    const real = registrarRodada(ateOTreino(), 'treino-final', 'mainline', 'sucesso')
    expect(resumoDaJornada(concluirEtapa(real, ETAPAS, AGORA), ETAPAS).concluida).toBe(true)
  })

  it('rodada FALHA não deixa a jornada parecer concluída', () => {
    const falhou = registrarRodada(ateOTreino(), 'treino-final', 'mainline', 'falhou')
    expect(resumoDaJornada(falhou, ETAPAS).concluida).toBe(false)
    expect(verboDoHoje(falhou, ETAPAS)).toBe('treinar')
  })
})

/**
 * A PONTE DEIXOU DE SER POR NOME, e esta seção mudou junto.
 *
 * Ela comparava títulos normalizados, e os testes daqui cobravam o comportamento
 * dessa comparação — acento, caixa, recusa de nome parcial. Nada disso existe
 * mais: a ligação vem de `LEARNING_OBJECTS`, declarada por id.
 *
 * O que os testes cobram agora é o que passou a valer: o id do nó leva ao
 * conteúdo certo, e um alvo que aponte para conteúdo inexistente aparece como
 * número em vez de degradar calado.
 */
describe('a ponte entre o Roadmap e os conteúdos', () => {
  it('liga o nó da Italiana à jornada da Italiana', () => {
    const conteudo = conteudoDoNo({ id: 'opening.italian' })
    expect(conteudo).not.toBeNull()
    expect(conteudo?.dominio).toBe('abertura')
    expect(conteudo?.rota).toBe('/aberturas/italiana')
    expect(conteudo?.jornadaId).toBe('abertura:italiana')
  })

  it('liga o nó da Oposição à jornada de final da Oposição', () => {
    const conteudo = conteudoDoNo({ id: 'skill.endgame.king-pawn-opposition' })
    expect(conteudo?.dominio).toBe('final')
    expect(conteudo?.rota).toBe('/finais/oposicao')
    expect(conteudo?.jornadaId).toBe('final:opposition')
  })

  it('devolve null para nó de LIÇÃO, que não tem jornada de etapas', () => {
    expect(conteudoDoNo({ id: 'skill.tactics.fork' })).toBeNull()
    expect(conteudoDoNo({ id: 'fundamentos.loose' })).toBeNull()
  })

  it('devolve null para nó ainda sem conteúdo', () => {
    expect(conteudoDoNo({ id: 'strategy.outpost' })).toBeNull()
  })

  /**
   * NÓ FORA DO REGISTRO LANÇA, e é a diferença entre esquecer e decidir.
   *
   * Devolver `null` aqui apagaria essa diferença: um nó novo que ninguém mapeou
   * ficaria indistinguível de um nó que alguém marcou como "ainda sem conteúdo".
   */
  it('nó que ninguém declarou é ERRO, não silêncio', () => {
    expect(() => conteudoDoNo({ id: 'nao.existe' })).toThrow(/não declara um LearningTarget/)
  })

  /**
   * O PORTÃO DA PONTE, agora sobre IDs.
   *
   * Um id de abertura ou final escrito errado em `LEARNING_OBJECTS` não pode
   * degradar em silêncio — o card mostraria "Aprender" e o link levaria a lugar
   * nenhum. Aqui a divergência vira número, e número reprova.
   */
  it('todo alvo de jornada aponta para conteúdo que existe', () => {
    expect(jornadasComConteudoAusente(ROADMAP_DEFINITION.nodes)).toEqual([])
  })
})

describe('as etapas de um conteúdo real', () => {
  it('a Italiana tem as nove etapas da jornada de abertura', () => {
    const conteudo = conteudoDoNo({ id: 'opening.italian' })
    const stages = etapasDoConteudo(conteudo!)
    expect(stages).toHaveLength(9)
    expect(stages[stages.length - 1]?.ehTreinoFinal).toBe(true)
  })

  it('conteúdo que não vira jornada devolve lista VAZIA, e não derruba a tela', () => {
    // `construirJornadaDeFinal` lança para conteúdo incompleto — decisão certa
    // lá. Aqui vira lista vazia: uma listagem não é lugar de falhar por causa
    // de um item.
    const stages = etapasDoConteudo({
      dominio: 'final',
      slug: 'nao-existe',
      jornadaId: 'final:nao-existe',
      rota: '/finais/nao-existe',
    })
    expect(stages).toEqual([])
  })
})
