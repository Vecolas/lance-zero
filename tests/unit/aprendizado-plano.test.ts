/**
 * Portão do plano do dia persistido e da conclusão de atividade.
 *
 * O QUE ESTE ARQUIVO PROVA, e é a promessa que a tela do Hoje faz ao aluno:
 *
 * 1. concluir na ORDEM QUE QUISER não quebra nada e não mexe nos outros cards;
 * 2. o ✓ SOBREVIVE a recarga, a navegação e à fusão de sync;
 * 3. concluir NÃO é dominar — terminar errando tudo ainda conclui.
 *
 * O item 3 é o que mais precisa de portão, porque o defeito oposto é invisível:
 * um `if (acertou)` na conclusão não gera erro nenhum, só prende o aluno numa
 * tela até ele chutar certo. Aqui ele vira teste que falha.
 */

import { describe, expect, it } from 'vitest'
import {
  atividadeDoPlano,
  chaveDoDia,
  concluiu,
  fundirAtividade,
  fundirPlanos,
  marcarIniciada,
  progressoDoDia,
  progressoInicial,
  registrarItem,
  substituirAtividade,
  type ActivityDefinition,
  type DailyActivity,
  type PlanoDoDia,
} from '@/domain/aprendizado'

const AGORA = new Date('2026-03-10T12:00:00.000Z')
const DEPOIS = new Date('2026-03-10T12:30:00.000Z')

function definicao(id: string, total = 3): ActivityDefinition {
  return {
    id,
    kind: 'pratica-independente',
    title: `Atividade ${id}`,
    description: 'teste',
    skillIds: ['tactics.fork'],
    pedagogicalStage: 'independent',
    estimatedMinutes: 6,
    contentVersion: 1,
    completionRule: { tipo: 'itens', total },
    href: `/train/pratica/tactics.fork?a=${id}`,
  }
}

function atividade(id: string, total = 3): DailyActivity {
  return {
    id,
    dateKey: '2026-03-10',
    definition: definicao(id, total),
    status: 'pendente',
    generatedReason: 'motivo de teste com tamanho suficiente',
    createdAt: AGORA.toISOString(),
    startedAt: null,
    completedAt: null,
    progress: progressoInicial(AGORA),
  }
}

function plano(ids: string[]): PlanoDoDia {
  return {
    dateKey: '2026-03-10',
    activities: ids.map((id) => atividade(id)),
    generatedAt: AGORA.toISOString(),
    plannerVersion: 2,
    seed: '2026-03-10',
  }
}

/** Conclui uma atividade inteira, item por item. */
function concluirTudo(inicial: DailyActivity, quando = DEPOIS): DailyActivity {
  let atual = inicial
  for (let i = 0; i < inicial.definition.completionRule.total; i += 1) {
    atual = registrarItem(atual, `item-${i}`, quando)
  }
  return atual
}

// ------------------------------------------------- teste 5: concluir ≠ dominar

describe('teste 5 — concluir não é dominar', () => {
  it('a regra de conclusão não tem como ler acerto', () => {
    const regra = definicao('x').completionRule
    // A prova estrutural: a forma não tem campo de desempenho. Um `total` e um
    // `tipo`, e mais nada por onde um `acertou` entraria.
    expect(Object.keys(regra).sort()).toEqual(['tipo', 'total'])
  })

  it('errar todos os itens ainda conclui a atividade', () => {
    // `registrarItem` nem recebe se acertou. É a assinatura que garante isso —
    // quem quisesse prender a saída no acerto teria de mudar o TIPO, que é
    // visível na revisão.
    const feita = concluirTudo(atividade('a'))
    expect(feita.status).toBe('concluida')
    expect(feita.completedAt).not.toBeNull()
  })

  it('registrar menos itens que o previsto NÃO conclui', () => {
    const parcial = registrarItem(atividade('a', 3), 'item-0', DEPOIS)
    expect(parcial.status).toBe('em-andamento')
    expect(parcial.completedAt).toBeNull()
    expect(concluiu(parcial.definition.completionRule, parcial.progress)).toBe(false)
  })

  it('o mesmo item duas vezes não conta duas vezes', () => {
    let atual = atividade('a', 3)
    atual = registrarItem(atual, 'item-0', DEPOIS)
    atual = registrarItem(atual, 'item-0', DEPOIS)
    atual = registrarItem(atual, 'item-0', DEPOIS)
    // Com um contador simples isto teria concluído. O conjunto de ids é o que
    // impede a atividade de terminar sem o aluno ter visto os outros itens.
    expect(atual.status).toBe('em-andamento')
    expect(atual.progress.completedItemIds).toEqual(['item-0'])
  })
})

// --------------------------------------------- teste 3: qualquer ordem

describe('teste 3 — concluir um card não mexe nos outros', () => {
  it('concluir o quarto primeiro deixa os demais intactos e na mesma ordem', () => {
    const original = plano(['a', 'b', 'c', 'd', 'e'])
    const quarta = atividadeDoPlano(original, 'd')
    expect(quarta).not.toBeNull()

    const depois = substituirAtividade(original, concluirTudo(quarta as DailyActivity))

    expect(depois.activities.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(depois.dateKey).toBe(original.dateKey)
    expect(depois.generatedAt).toBe(original.generatedAt)
    expect(depois.seed).toBe(original.seed)

    for (const id of ['a', 'b', 'c', 'e']) {
      expect(atividadeDoPlano(depois, id)).toEqual(atividadeDoPlano(original, id))
    }
    expect(atividadeDoPlano(depois, 'd')?.status).toBe('concluida')
  })

  it('qualquer ordem de conclusão leva ao mesmo plano final', () => {
    const ordens = [
      ['a', 'b', 'c'],
      ['c', 'b', 'a'],
      ['b', 'a', 'c'],
      ['c', 'a', 'b'],
    ]

    const finais = ordens.map((ordem) => {
      let atual = plano(['a', 'b', 'c'])
      for (const id of ordem) {
        const alvo = atividadeDoPlano(atual, id) as DailyActivity
        atual = substituirAtividade(atual, concluirTudo(alvo))
      }
      return atual
    })

    // É a promessa da tela, provada: 1→2→3 e 3→2→1 terminam idênticos.
    for (const final of finais) expect(final).toEqual(finais[0])
    expect(progressoDoDia(finais[0]).tudoConcluido).toBe(true)
  })

  it('atividade de fora do plano é ignorada em vez de enxertada', () => {
    const original = plano(['a', 'b'])
    const intrusa = { ...atividade('z'), status: 'concluida' as const }
    expect(substituirAtividade(original, intrusa)).toEqual(original)
  })
})

// ------------------------------------------------- teste 4: o ✓ persiste

describe('teste 4 — o ✓ não se desfaz', () => {
  it('atividade concluída ignora novos itens e não volta para em-andamento', () => {
    const feita = concluirTudo(atividade('a'))
    const depois = registrarItem(feita, 'item-extra', new Date('2026-03-11T00:00:00.000Z'))
    expect(depois).toBe(feita)
    expect(depois.status).toBe('concluida')
  })

  it('marcarIniciada não rebaixa uma concluída', () => {
    const feita = concluirTudo(atividade('a'))
    expect(marcarIniciada(feita, DEPOIS).status).toBe('concluida')
  })

  it('a fusão de sync é monotônica: pendente + concluída = concluída', () => {
    const local = atividade('a')
    const remoto = concluirTudo(atividade('a'))

    expect(fundirAtividade(local, remoto).status).toBe('concluida')
    // Nos DOIS sentidos: qual aparelho sincroniza primeiro não pode decidir se
    // o trabalho do aluno sobreviveu.
    expect(fundirAtividade(remoto, local).status).toBe('concluida')
  })

  it('a fusão une os itens, e a união pode concluir sozinha', () => {
    const umAparelho = registrarItem(registrarItem(atividade('a', 3), 'i0', DEPOIS), 'i1', DEPOIS)
    const outro = registrarItem(atividade('a', 3), 'i2', DEPOIS)

    const fundida = fundirAtividade(umAparelho, outro)
    expect(fundida.progress.completedItemIds.sort()).toEqual(['i0', 'i1', 'i2'])
    // Nenhum dos dois estava concluído; a UNIÃO está. Herdar só o status mais
    // avançado teria deixado a atividade em andamento com todos os itens feitos.
    expect(fundida.status).toBe('concluida')
    expect(fundida.completedAt).not.toBeNull()
  })

  it('a fusão de planos preserva a ordem local e traz o que só existe no remoto', () => {
    const local = plano(['a', 'b'])
    const remoto: PlanoDoDia = {
      ...plano(['b', 'a', 'c']),
      activities: [concluirTudo(atividade('b')), atividade('a'), concluirTudo(atividade('c'))],
    }

    const fundido = fundirPlanos(local, remoto)
    expect(fundido.activities.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(atividadeDoPlano(fundido, 'b')?.status).toBe('concluida')
    expect(atividadeDoPlano(fundido, 'c')?.status).toBe('concluida')
  })

  it('planos de dias diferentes não se fundem', () => {
    const local = plano(['a'])
    const outroDia: PlanoDoDia = { ...plano(['a']), dateKey: '2026-03-11' }
    expect(fundirPlanos(local, outroDia)).toEqual(local)
  })

  it('o instante de conclusão é o mais CEDO, e não anda a cada sync', () => {
    const cedo = concluirTudo(atividade('a'), new Date('2026-03-10T10:00:00.000Z'))
    const tarde = concluirTudo(atividade('a'), new Date('2026-03-10T20:00:00.000Z'))
    expect(fundirAtividade(tarde, cedo).completedAt).toBe(cedo.completedAt)
    expect(fundirAtividade(cedo, tarde).completedAt).toBe(cedo.completedAt)
  })
})

// ------------------------------------------------------------- progresso

describe('o progresso do dia é derivado', () => {
  it('conta as concluídas e soma os minutos do que falta', () => {
    let atual = plano(['a', 'b', 'c'])
    atual = substituirAtividade(atual, concluirTudo(atividadeDoPlano(atual, 'a') as DailyActivity))

    const progresso = progressoDoDia(atual)
    expect(progresso.concluidas).toBe(1)
    expect(progresso.total).toBe(3)
    expect(progresso.minutosRestantes).toBe(12)
    expect(progresso.tudoConcluido).toBe(false)
  })

  it('plano vazio NÃO é plano concluído', () => {
    // Regra 3 dos portões, aplicada ao produto: zero de zero não é 100%, e
    // parabenizar o aluno por um dia vazio é o desenho que este projeto recusa.
    const vazio: PlanoDoDia = { ...plano([]), activities: [] }
    expect(progressoDoDia(vazio).tudoConcluido).toBe(false)
  })
})

// ----------------------------------------------------------- chave do dia

describe('a chave do dia usa o fuso do aluno', () => {
  it('22h de um dia local continua sendo aquele dia', () => {
    // Um `toISOString().slice(0,10)` daria o dia seguinte para quem está a
    // oeste de Greenwich. O recorte por fuso já mordeu este projeto uma vez.
    const tarde = new Date(2026, 2, 10, 22, 30)
    expect(chaveDoDia(tarde)).toBe('2026-03-10')
  })

  it('formata com zero à esquerda', () => {
    expect(chaveDoDia(new Date(2026, 0, 5, 9, 0))).toBe('2026-01-05')
  })
})
