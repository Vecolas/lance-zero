/**
 * A gravação de uma tentativa: onde MAESTRIA e ESTÁGIO são atualizados juntos,
 * e continuam separados.
 *
 * ESTA FUNÇÃO EXISTE PARA SER O ÚNICO LUGAR. Toda tela que cobra um lance —
 * lição, prática, revisão — passa por aqui. Se cada uma escrevesse por conta
 * própria, duas coisas aconteceriam, e as duas em silêncio:
 *
 * 1. uma tela atualizaria a maestria e esqueceria o estágio, e o aluno ficaria
 *    para sempre em `introduced` com 90% de acerto — nunca mais recebendo
 *    prática independente, sem nada acusando;
 * 2. outra chamaria as duas com noções diferentes de "usou dica", e os dois
 *    números passariam a discordar sobre a mesma tentativa.
 *
 * O QUE CONTINUA SEPARADO, e por quê: `SkillMastery` responde "quanto ele
 * acerta"; `SkillState` responde "em que degrau ele está". Uma tentativa move
 * as duas, com regras diferentes — a maestria CAI quando se erra, o estágio
 * nunca desce. Fundi-las num número só apagaria a distinção que o produto
 * inteiro passou a depender.
 *
 * O TRADUTOR MORA AQUI: `NivelDeApoio` (a escada de dicas) vira `usouDica` para
 * a maestria e vira tentativa `guiada`/`independente` para o estágio. As duas
 * leituras saem do MESMO nível, então não há como uma tela achar que houve dica
 * e a outra achar que não.
 */

import {
  aplicarEvidencia,
  criarSkillState,
  foiIndependente,
  type EvidenciaDeAprendizado,
  type NivelDeApoio,
  type SkillState,
} from '@/domain/aprendizado'
import { createMastery, updateMastery } from '@/domain/skills/mastery'
import type { SkillId, SkillMastery, TrainingRepository } from '@/domain/types'

export interface TentativaRegistrada {
  skillId: SkillId
  acertou: boolean
  apoio: NivelDeApoio
  /**
   * A tela oferecia apoio? É diferente de ter USADO apoio.
   *
   * A distinção importa: quem resolve sozinho num exercício que TINHA dicas
   * disponíveis demonstrou menos autonomia que quem resolveu num exercício que
   * não tinha nenhuma — a ajuda estava ao alcance, e saber que ela está ao
   * alcance muda como se tenta. Por isso uma tentativa só conta como
   * independente quando as duas coisas valem: a etapa não oferecia apoio E o
   * aluno não abriu dica.
   */
  guiada: boolean
  /** Tentativa de REVISÃO espaçada, e não de prática. */
  revisao?: boolean
  thinkTimeMs?: number
  agora: Date
}

/**
 * Grava a tentativa nas duas tabelas.
 *
 * Lê o estado atual antes de escrever em vez de receber por parâmetro: a tela
 * pode estar com um estado antigo na memória, e sobrescrever a partir dele
 * apagaria o que outra aba gravou no meio.
 */
export async function registrarTentativa(
  repo: TrainingRepository,
  tentativa: TentativaRegistrada,
): Promise<{ mastery: SkillMastery; estado: SkillState }> {
  const { skillId, acertou, apoio, guiada, agora } = tentativa

  const [masteryGravada, estadosGravados] = await Promise.all([
    repo.getSkillMastery(),
    repo.getSkillStates(),
  ])

  const masteryAtual =
    masteryGravada.find((item) => item.skillId === skillId) ?? createMastery(skillId)
  const estadoAtual =
    estadosGravados.find((item) => item.skillId === skillId) ?? criarSkillState(skillId, agora)

  const usouDica = !foiIndependente(apoio)

  const mastery = updateMastery(masteryAtual, {
    tipo: tentativa.revisao === true ? 'revisao' : 'puzzle',
    acertou,
    usouDica,
    // Sem laço de repetição nesta arquitetura, toda resposta É a primeira: a
    // escada de ajuda substituiu o "tente de novo", e o aluno responde uma vez
    // por posição. Passar `false` aqui descontaria o crédito de todo mundo.
    primeiraTentativa: true,
    thinkTimeMs: tentativa.thinkTimeMs ?? 0,
    ocorridoEm: agora.toISOString(),
  })

  const independente = !guiada && foiIndependente(apoio)
  const evidencia: EvidenciaDeAprendizado =
    tentativa.revisao === true
      ? { tipo: 'revisao', acertou }
      : independente
        ? { tipo: 'independente', acertou }
        : { tipo: 'guiada', acertou }

  const estado = aplicarEvidencia(estadoAtual, evidencia, {
    agora,
    mastery,
    emRevisao: tentativa.revisao === true,
  })

  await Promise.all([repo.saveSkillMastery([mastery]), repo.saveSkillStates([estado])])
  return { mastery, estado }
}

/**
 * Grava que um conceito foi APRESENTADO.
 *
 * Separada de `registrarTentativa` porque não é tentativa: não há acerto, e
 * nada na maestria muda. Enfiar "ensino" na mesma função exigiria um `acertou`
 * que não significa nada, e alguém acabaria passando `true` — inflando a
 * maestria de quem só leu um texto.
 */
export async function registrarEnsino(
  repo: TrainingRepository,
  skillId: SkillId,
  agora: Date,
): Promise<SkillState> {
  const gravados = await repo.getSkillStates()
  const atual = gravados.find((item) => item.skillId === skillId) ?? criarSkillState(skillId, agora)
  const estado = aplicarEvidencia(atual, { tipo: 'ensino' }, { agora })
  await repo.saveSkillStates([estado])
  return estado
}
