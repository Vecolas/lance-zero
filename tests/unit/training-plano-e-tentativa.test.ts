/**
 * Portão da COSTURA entre o domínio de aprendizagem e o repositório.
 *
 * Os dois módulos testados aqui são os únicos que ESCREVEM estado de
 * aprendizagem, e é por isso que eles precisam de portão próprio: o domínio
 * pode estar inteiro correto e verde enquanto ninguém grava nada, ou enquanto
 * alguém grava uma coisa e esquece a outra. Nenhum teste de domínio acusaria.
 *
 * As duas afirmações que mais importam:
 *
 * 1. `carregarPlanoDeHoje` GERA UMA VEZ. Chamada de novo no mesmo dia, devolve
 *    o plano gravado com as conclusões intactas — nunca um plano novo. É a §9
 *    do plano, e sem ela concluir uma atividade reordenaria as outras.
 * 2. `registrarTentativa` move MAESTRIA e ESTÁGIO, e os move por regras
 *    diferentes. Errar derruba a maestria e NÃO derruba o estágio.
 */

import { describe, expect, it } from 'vitest'
import {
  chaveDoDia,
  concluiu,
  criarSkillState,
  marcarParaReensino,
  registrarItem,
  type PlanoDoDia,
} from '@/domain/aprendizado'
import { createMastery } from '@/domain/skills/mastery'
import {
  carregarPlanoDeHoje,
  carregarSkillStates,
  gravarAtividade,
  gravarSkillStates,
  migrarHabilidadesSemEnsino,
  regerarPlanoDeHoje,
} from '@/lib/training/plano-do-dia'
import { registrarEnsino, registrarTentativa } from '@/lib/training/registrar-tentativa'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import { SKILL_IDS, type ReviewCard, type UserProfile } from '@/domain/types'

const AGORA = new Date()
const SKILL = 'tactics.fork' as const

const PERFIL: UserProfile = {
  id: 'aluno',
  createdAt: AGORA.toISOString(),
  estimatedRating: 1100,
  dailyBudgetMinutes: 40,
  preferences: { boardTheme: 'claro', reducedMotion: false },
}

function contexto() {
  return {
    profile: PERFIL,
    dueCards: [] as ReviewCard[],
    recentGameErrors: [],
    now: AGORA,
  }
}

async function repoComPerfil(): Promise<MemoryTrainingRepository> {
  const repo = new MemoryTrainingRepository()
  await repo.saveProfile(PERFIL)
  return repo
}

function cardDe(skillId: (typeof SKILL_IDS)[number], kind: ReviewCard['kind']): ReviewCard {
  return {
    id: `card-${kind}-${skillId}`,
    kind,
    skillIds: [skillId],
    fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
    solutionUci: ['h1h8'],
    prompt: 'Ache o lance.',
    createdAt: AGORA.toISOString(),
    dueAt: AGORA.toISOString(),
    scheduler: {
      stability: 1,
      difficulty: 5,
      elapsedDays: 1,
      scheduledDays: 1,
      reps: 1,
      lapses: 0,
      state: 'review',
      lastReviewAt: null,
    },
  }
}

describe('o plano do dia é gerado uma vez e depois só lido', () => {
  it('a segunda chamada devolve o MESMO plano, e não um novo', async () => {
    const repo = await repoComPerfil()

    const primeiro = await carregarPlanoDeHoje({ repo, contexto: contexto() })
    const segundo = await carregarPlanoDeHoje({ repo, contexto: contexto() })

    expect(segundo).toEqual(primeiro)
    expect(await repo.listPlanosDoDia()).toHaveLength(1)
  })

  it('concluir uma atividade NÃO regenera nem reordena o plano', async () => {
    const repo = await repoComPerfil()
    const plano = await carregarPlanoDeHoje({ repo, contexto: contexto() })
    expect(plano.activities.length).toBeGreaterThan(1)

    const ordemAntes = plano.activities.map((a) => a.id)

    // Conclui a ÚLTIMA primeiro: é o teste 3 do plano, e o caso em que uma
    // regeneração silenciosa apareceria como "os cards se mexeram sozinhos".
    const alvo = plano.activities[plano.activities.length - 1]
    let concluida = alvo
    for (let i = 0; i < alvo.definition.completionRule.total; i += 1) {
      concluida = registrarItem(concluida, `item-${i}`, AGORA)
    }
    expect(concluida.status).toBe('concluida')

    await gravarAtividade(repo, concluida)

    const depois = await carregarPlanoDeHoje({ repo, contexto: contexto() })
    expect(depois.activities.map((a) => a.id)).toEqual(ordemAntes)
    expect(depois.generatedAt).toBe(plano.generatedAt)
    expect(depois.activities[depois.activities.length - 1].status).toBe('concluida')
    // E as outras continuam exatamente como estavam.
    for (let i = 0; i < ordemAntes.length - 1; i += 1) {
      expect(depois.activities[i]).toEqual(plano.activities[i])
    }
  })

  it('o ✓ sobrevive a uma releitura do repositório', async () => {
    const repo = await repoComPerfil()
    const plano = await carregarPlanoDeHoje({ repo, contexto: contexto() })
    const alvo = plano.activities[0]

    let concluida = alvo
    for (let i = 0; i < alvo.definition.completionRule.total; i += 1) {
      concluida = registrarItem(concluida, `i-${i}`, AGORA)
    }
    await gravarAtividade(repo, concluida)

    const relido = await repo.getPlanoDoDia(chaveDoDia(AGORA))
    expect(relido?.activities[0].status).toBe('concluida')
    expect(concluiu(alvo.definition.completionRule, relido!.activities[0].progress)).toBe(true)
  })

  it('gravar atividade de um dia SEM plano não inventa um plano', async () => {
    const repo = await repoComPerfil()
    const plano = await carregarPlanoDeHoje({ repo, contexto: contexto() })
    const deOutroDia = { ...plano.activities[0], dateKey: '1999-01-01' }

    expect(await gravarAtividade(repo, deOutroDia)).toBeNull()
    expect(await repo.getPlanoDoDia('1999-01-01')).toBeNull()
  })

  it('regerar preserva o que já foi concluído', async () => {
    const repo = await repoComPerfil()
    const plano = await carregarPlanoDeHoje({ repo, contexto: contexto() })
    const alvo = plano.activities[0]

    let concluida = alvo
    for (let i = 0; i < alvo.definition.completionRule.total; i += 1) {
      concluida = registrarItem(concluida, `i-${i}`, AGORA)
    }
    await gravarAtividade(repo, concluida)

    // Orçamento menor: o planner escolheria outro conjunto.
    const menor = await regerarPlanoDeHoje({
      repo,
      contexto: { ...contexto(), profile: { ...PERFIL, dailyBudgetMinutes: 20 } },
    })

    // A atividade concluída CONTINUA lá, e continua concluída. É o caso em que
    // um `savePlanoDoDia` direto apagaria o trabalho do aluno em silêncio.
    const sobrevivente = menor.activities.find((a) => a.id === alvo.id)
    expect(sobrevivente).toBeDefined()
    expect(sobrevivente?.status).toBe('concluida')
  })
})

describe('os estados de habilidade', () => {
  it('a leitura devolve o catálogo inteiro sem gravar nada', async () => {
    const repo = await repoComPerfil()
    const estados = await carregarSkillStates(repo, AGORA)

    expect(estados).toHaveLength(SKILL_IDS.length)
    expect(estados.every((e) => e.stage === 'unseen')).toBe(true)
    // NADA foi gravado: 22 linhas vazias no primeiro acesso encheriam o banco
    // de fatos que não aconteceram, e um backup de aluno novo pareceria o de
    // quem treinou.
    expect(await repo.getSkillStates()).toEqual([])
  })

  it('a gravação toca só o que mudou', async () => {
    const repo = await repoComPerfil()
    const antes = await carregarSkillStates(repo, AGORA)
    const proximos = antes.map((estado) =>
      estado.skillId === SKILL ? { ...estado, exposureCount: 1 } : estado,
    )

    await gravarSkillStates(repo, antes, proximos)

    const gravados = await repo.getSkillStates()
    expect(gravados).toHaveLength(1)
    expect(gravados[0].skillId).toBe(SKILL)
  })
})

describe('a migração dos alunos que já existem', () => {
  it('marca para reensino a habilidade com card e sem ensino nenhum', async () => {
    const repo = await repoComPerfil()
    await repo.saveReviewCard(cardDe(SKILL, 'erro-de-partida'))

    const estados = await migrarHabilidadesSemEnsino(repo, AGORA)
    const alvo = estados.find((e) => e.skillId === SKILL)

    expect(alvo?.precisaDeReensino).toBe(true)
    // Na dúvida, `introduced` — nunca presumir domínio (plano §42).
    expect(alvo?.stage).toBe('unseen')
  })

  it('NÃO marca quem já foi ensinado', async () => {
    const repo = await repoComPerfil()
    await repo.saveReviewCard(cardDe(SKILL, 'conceito'))
    await registrarEnsino(repo, SKILL, AGORA)

    const estados = await migrarHabilidadesSemEnsino(repo, AGORA)
    expect(estados.find((e) => e.skillId === SKILL)?.precisaDeReensino).toBe(false)
  })

  it('NÃO marca por causa de card de REPERTÓRIO', async () => {
    // O card de repertório pergunta o que o ALUNO escreveu na própria linha —
    // não cobra um conceito que o app devia ter ensinado. Sem esta exceção, a
    // primeira abertura de tela de quem tem repertório tirava os cards dele da
    // fila e oferecia uma aula de "desenvolvimento" no lugar.
    const repo = await repoComPerfil()
    await repo.saveReviewCard(cardDe('opening.development', 'repertorio'))

    const estados = await migrarHabilidadesSemEnsino(repo, AGORA)
    expect(estados.find((e) => e.skillId === 'opening.development')?.precisaDeReensino).toBe(false)
  })

  it('é idempotente: rodar duas vezes não muda nada', async () => {
    const repo = await repoComPerfil()
    await repo.saveReviewCard(cardDe(SKILL, 'erro-de-partida'))

    const primeira = await migrarHabilidadesSemEnsino(repo, AGORA)
    const segunda = await migrarHabilidadesSemEnsino(repo, AGORA)
    expect(segunda.find((e) => e.skillId === SKILL)?.precisaDeReensino).toBe(
      primeira.find((e) => e.skillId === SKILL)?.precisaDeReensino,
    )
  })
})

describe('registrar tentativa move maestria E estágio, por regras diferentes', () => {
  it('acerto sem apoio conta como INDEPENDENTE nas duas tabelas', async () => {
    const repo = await repoComPerfil()

    const { mastery, estado } = await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      agora: AGORA,
    })

    expect(estado.independentAttempts).toBe(1)
    expect(estado.independentSuccesses).toBe(1)
    expect(estado.guidedAttempts).toBe(0)
    expect(mastery.attempts).toBe(1)
    expect(mastery.hintedAttempts).toBe(0)
    expect(mastery.mastery).toBeGreaterThan(0)

    // E ficou GRAVADO nas duas: o defeito silencioso é gravar só uma.
    expect((await repo.getSkillStates())[0].independentSuccesses).toBe(1)
    expect((await repo.getSkillMastery())[0].attempts).toBe(1)
  })

  it('acerto com dica NÃO conta como independente, e desconta na maestria', async () => {
    const repo = await repoComPerfil()

    const comDica = await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'dica-2',
      guiada: true,
      agora: AGORA,
    })

    expect(comDica.estado.guidedAttempts).toBe(1)
    expect(comDica.estado.independentAttempts).toBe(0)
    expect(comDica.mastery.hintedAttempts).toBe(1)

    const outro = await repoComPerfil()
    const semDica = await registrarTentativa(outro, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      agora: AGORA,
    })
    expect(comDica.mastery.mastery).toBeLessThan(semDica.mastery.mastery)
  })

  it('resolver sozinho num exercício QUE OFERECIA apoio não conta como independente', async () => {
    // A distinção que o campo `guiada` carrega: a ajuda estar ao alcance muda
    // como se tenta, mesmo quando não se usa.
    const repo = await repoComPerfil()
    const { estado } = await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: true,
      agora: AGORA,
    })

    expect(estado.guidedAttempts).toBe(1)
    expect(estado.independentAttempts).toBe(0)
  })

  it('ERRAR derruba a maestria e NÃO derruba o estágio', async () => {
    const repo = await repoComPerfil()

    // Sobe até `independent` com dois acertos sem apoio.
    await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      agora: AGORA,
    })
    const subiu = await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      agora: AGORA,
    })
    expect(subiu.estado.stage).toBe('independent')
    const masteryNoTopo = subiu.mastery.mastery

    let ultimo = subiu
    for (let i = 0; i < 5; i += 1) {
      ultimo = await registrarTentativa(repo, {
        skillId: SKILL,
        acertou: false,
        apoio: 'sem-dica',
        guiada: false,
        agora: AGORA,
      })
    }

    // As DUAS regras, lado a lado. É a separação inteira do ADR-0011 num teste.
    expect(ultimo.mastery.mastery).toBeLessThan(masteryNoTopo)
    expect(ultimo.estado.stage).toBe('independent')
  })

  it('ensinar move o estágio e NÃO move a maestria', async () => {
    const repo = await repoComPerfil()
    const estado = await registrarEnsino(repo, SKILL, AGORA)

    expect(estado.stage).toBe('introduced')
    expect(estado.exposureCount).toBe(1)
    // Ler um texto não é acertar nada. Uma função só para as duas coisas
    // exigiria um `acertou` sem significado, e alguém acabaria passando `true`.
    expect(await repo.getSkillMastery()).toEqual([])
  })

  it('ensinar apaga a marca de reensino; acertar não apaga', async () => {
    const repo = await repoComPerfil()
    await repo.saveSkillStates([marcarParaReensino(criarSkillState(SKILL, AGORA), AGORA)])

    const acertando = await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      agora: AGORA,
    })
    expect(acertando.estado.precisaDeReensino).toBe(true)

    const ensinado = await registrarEnsino(repo, SKILL, AGORA)
    expect(ensinado.precisaDeReensino).toBe(false)
  })

  it('a tentativa de REVISÃO alimenta a retenção, e não o acerto recente só', async () => {
    const repo = await repoComPerfil()
    await repo.saveSkillMastery([createMastery(SKILL)])

    const { mastery } = await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      revisao: true,
      agora: AGORA,
    })

    expect(mastery.retentionAccuracy).toBeGreaterThan(0)
  })

  it('lê o estado do disco antes de escrever, e não sobrescreve o que outra aba gravou', async () => {
    const repo = await repoComPerfil()
    await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      agora: AGORA,
    })

    // Uma "outra aba" grava mais evidência por baixo.
    const doDisco = (await repo.getSkillStates())[0]
    await repo.saveSkillStates([{ ...doDisco, exposureCount: 7 }])

    const depois = await registrarTentativa(repo, {
      skillId: SKILL,
      acertou: true,
      apoio: 'sem-dica',
      guiada: false,
      agora: AGORA,
    })

    // O 7 sobreviveu: se a função escrevesse a partir de um estado em memória,
    // ele teria voltado para o valor antigo sem nenhum erro aparecer.
    expect(depois.estado.exposureCount).toBe(7)
  })
})

describe('o plano gravado sobrevive ao formato', () => {
  it('o que volta do repositório tem a forma que o domínio espera', async () => {
    const repo = await repoComPerfil()
    const gravado = await carregarPlanoDeHoje({ repo, contexto: contexto() })
    const lido = (await repo.getPlanoDoDia(gravado.dateKey)) as PlanoDoDia

    expect(lido.dateKey).toBe(chaveDoDia(AGORA))
    expect(lido.plannerVersion).toBeGreaterThan(0)
    expect(lido.seed).toBe(gravado.seed)
    for (const atividade of lido.activities) {
      expect(atividade.dateKey).toBe(lido.dateKey)
      expect(atividade.generatedReason.length).toBeGreaterThan(0)
      expect(atividade.definition.href.startsWith('/')).toBe(true)
    }
  })
})
