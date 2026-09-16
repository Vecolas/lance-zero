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
import { conteudoDoNo, nosSemJornada } from '@/lib/training/jornadas-do-roadmap'
import { etapasDoConteudo } from '@/lib/training/etapas-do-conteudo'

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
    expect(verboDoHoje(null, ETAPAS)).toBe('Aprender')
    expect(verboDoHoje(nova(), ETAPAS)).toBe('Aprender')
    expect(verboDoHoje(concluirEtapa(nova(), ETAPAS, AGORA), ETAPAS)).toBe('Continuar')
    expect(verboDoHoje(ateOTreino(), ETAPAS)).toBe('Treinar')
  })

  it('o resumo conta etapas cumpridas, não visitadas', () => {
    const resumo = resumoDaJornada(concluirEtapa(nova(), ETAPAS, AGORA), ETAPAS)
    expect(resumo.progresso).toBe('1 de 3 etapas')
    expect(resumo.rotulo).toBe('Continuar estudo')
    expect(resumo.concluida).toBe(false)
  })

  it('sem jornada, o resumo diz o tamanho do estudo', () => {
    const resumo = resumoDaJornada(null, ETAPAS)
    expect(resumo.progresso).toBe('3 etapas')
    expect(resumo.rotulo).toBe('Estudar')
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
    expect(verboDoHoje(falhou, ETAPAS)).toBe('Treinar')
  })
})

describe('a ponte entre o Roadmap e os conteúdos', () => {
  it('liga o nó da Italiana à jornada da Italiana', () => {
    const conteudo = conteudoDoNo({ title: 'Abertura Italiana', contentType: 'opening' })
    expect(conteudo).not.toBeNull()
    expect(conteudo?.dominio).toBe('abertura')
    expect(conteudo?.rota).toBe('/aberturas/italiana')
    expect(conteudo?.jornadaId).toBe('abertura:italiana')
  })

  it('ignora acento e caixa, porque os dois catálogos escrevem diferente', () => {
    // O Roadmap grafa "Jogo Escoces" sem acento; o catálogo, com.
    expect(conteudoDoNo({ title: 'jogo escocês', contentType: 'opening' })?.dominio).toBe(
      'abertura',
    )
  })

  it('devolve null para nó de HABILIDADE, que não tem jornada', () => {
    expect(conteudoDoNo({ title: 'Garfo', contentType: 'tactic' })).toBeNull()
    expect(conteudoDoNo({ title: 'Abertura Italiana', contentType: 'concept' })).toBeNull()
  })

  it('devolve null para conteúdo que não existe, em vez de inventar rota', () => {
    expect(conteudoDoNo({ title: 'Abertura Inexistente', contentType: 'opening' })).toBeNull()
  })

  /**
   * A correspondência é EXATA, e isto é o portão dessa decisão.
   *
   * Existiu aqui uma busca aproximada (nome do catálogo terminando com o nome
   * do nó) para acomodar "Caro-Kann" contra "Defesa Caro-Kann". Com os dois
   * catálogos alinhados ela saiu — e este teste impede que volte. Busca
   * aproximada resolveria a divergência de hoje e esconderia a de amanhã: uma
   * abertura nova com grafia diferente casaria por acidente, e `nosSemJornada`
   * deixaria de reprovar exatamente quando deveria.
   */
  it('NÃO casa por aproximação: nome parcial não acha a abertura', () => {
    expect(conteudoDoNo({ title: 'Caro-Kann', contentType: 'opening' })).toBeNull()
    expect(conteudoDoNo({ title: 'Italiana', contentType: 'opening' })).toBeNull()
  })

  /**
   * O PORTÃO DA PONTE.
   *
   * A ligação é por nome normalizado e degrada com segurança — mas "degrada em
   * silêncio" é falso verde. Este teste transforma a divergência em número, e
   * número reprova: um nó de abertura sem par no catálogo aparece aqui.
   */
  it('todo nó de abertura/final do Roadmap acha o seu conteúdo', () => {
    expect(nosSemJornada()).toEqual([])
  })
})

describe('as etapas de um conteúdo real', () => {
  it('a Italiana tem as nove etapas da jornada de abertura', () => {
    const conteudo = conteudoDoNo({ title: 'Abertura Italiana', contentType: 'opening' })
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
