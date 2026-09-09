'use client'

import { useEffect, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { getSkill } from '@/domain/skills/catalog'
import type { PuzzleAttempt, SkillMastery } from '@/domain/types'
import styles from './ProgressView.module.css'

function percentual(valor: number): string {
  return `${Math.round(valor * 100)}%`
}

/** Ordena por domínio, com desempate estável pelo id da habilidade. */
function porMastery(a: SkillMastery, b: SkillMastery): number {
  return b.mastery - a.mastery || a.skillId.localeCompare(b.skillId)
}

export function ProgressView() {
  const { status, repo, erro, revision } = useRepository()
  const [mastery, setMastery] = useState<SkillMastery[] | null>(null)
  const [attempts, setAttempts] = useState<PuzzleAttempt[]>([])
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const [m, a] = await Promise.all([repo.getSkillMastery(), repo.listPuzzleAttempts(200)])
        if (!cancelado) {
          setMastery(m)
          setAttempts(a)
        }
      } catch (e) {
        if (!cancelado) setFalha(e instanceof Error ? e.message : 'Não consegui ler seus dados.')
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [repo, revision])

  if (status === 'carregando') return <p className={styles.state}>Abrindo seus dados locais…</p>

  if (status === 'erro' || falha) {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {falha ?? erro}
      </p>
    )
  }

  if (!mastery) return <p className={styles.state}>Lendo seu progresso…</p>

  const comDados = mastery.filter((m) => m.attempts > 0)

  if (comDados.length === 0) {
    return (
      <p className={styles.state}>
        Ainda não há o que medir. Faça o treino de hoje ou importe uma partida — o progresso aqui
        nasce das suas tentativas, não de um número inventado no começo.
      </p>
    )
  }

  const ordenadas = [...comDados].sort(porMastery)
  const fortes = ordenadas.slice(0, 3)
  const prioridades = [...ordenadas].reverse().slice(0, 3)
  const acertosDePrimeira = attempts.filter((a) => a.firstTry).length

  return (
    <>
      <div className={styles.columns}>
        <section className={styles.card} aria-labelledby="fortes">
          <h2 id="fortes" className={styles.cardTitle}>
            Onde você está firme
          </h2>
          <ul className={styles.list}>
            {fortes.map((m) => (
              <li key={m.skillId} className={styles.item}>
                <span className={styles.itemLabel}>{getSkill(m.skillId).label}</span>
                <span className={styles.itemValue}>{percentual(m.mastery)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.card} aria-labelledby="prioridades">
          <h2 id="prioridades" className={styles.cardTitle}>
            Prioridades agora
          </h2>
          <ul className={styles.list}>
            {prioridades.map((m) => (
              <li key={m.skillId} className={styles.item}>
                <span className={styles.itemLabel}>{getSkill(m.skillId).label}</span>
                <span className={styles.itemValue}>{percentual(m.mastery)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="tabela">
        <h2 id="tabela">Por habilidade</h2>
        <p>
          {attempts.length}{' '}
          {attempts.length === 1 ? 'tentativa registrada' : 'tentativas registradas'},{' '}
          {acertosDePrimeira} de primeira.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Habilidade</th>
                <th scope="col">Domínio</th>
                <th scope="col">Tentativas</th>
                <th scope="col">Acerto recente</th>
                <th scope="col">Retenção</th>
                <th scope="col">Confiança</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((m) => (
                <tr key={m.skillId}>
                  <th scope="row">{getSkill(m.skillId).label}</th>
                  <td className={styles.num}>
                    {percentual(m.mastery)}
                    <span
                      className={styles.bar}
                      style={{ width: `${Math.max(2, Math.round(m.mastery * 100))}%` }}
                      aria-hidden="true"
                    />
                  </td>
                  <td className={styles.num}>{m.attempts}</td>
                  <td className={styles.num}>{percentual(m.recentAccuracy)}</td>
                  <td className={styles.num}>{percentual(m.retentionAccuracy)}</td>
                  <td className={styles.num}>{percentual(m.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
