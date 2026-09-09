'use client'

import { useEffect, useState } from 'react'
import { SkillCard } from '@/components/progress/SkillCard'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { getSkill } from '@/domain/skills/catalog'
import type {
  PuzzleAttempt,
  RetencaoDeHabilidade,
  SkillId,
  SkillMastery,
  VereditoDeRetencao,
} from '@/domain/types'
import { catalogoDeRetencao, fraseDeRetencao } from '@/lib/design/retencao'
import { readSkill } from '@/lib/design/skill-card'
import { carregarSinaisDePartida } from '@/lib/training/sinais-de-partida'
import styles from './ProgressView.module.css'

function percentual(valor: number): string {
  return `${Math.round(valor * 100)}%`
}

/**
 * Domínio como texto, pela MESMA regra do card: abaixo do mínimo de tentativas
 * não há número, e sim um traço.
 */
function textoDeDominio(m: SkillMastery): string {
  const leitura = readSkill({ mastery: m.mastery, attempts: m.attempts })
  return leitura.percentual === null ? '—' : `${leitura.percentual}%`
}

/**
 * O que precisa de ação primeiro vem primeiro: reincidência, depois o que ainda
 * não dá para afirmar, e por último o que não voltou a falhar. Ordenar pelo
 * nome da habilidade poria a boa notícia no topo.
 */
const ORDEM_DO_VEREDITO: Record<VereditoDeRetencao, number> = {
  'voltou-a-falhar': 0,
  'evidencia-insuficiente': 1,
  'sem-evidencia': 2,
  'nao-reincidiu': 3,
}

function porVeredito(a: RetencaoDeHabilidade, b: RetencaoDeHabilidade): number {
  return (
    ORDEM_DO_VEREDITO[a.veredito] - ORDEM_DO_VEREDITO[b.veredito] ||
    a.skillId.localeCompare(b.skillId)
  )
}

/** Ordena por domínio, com desempate estável pelo id da habilidade. */
function porMastery(a: SkillMastery, b: SkillMastery): number {
  return b.mastery - a.mastery || a.skillId.localeCompare(b.skillId)
}

export function ProgressView() {
  const { status, repo, erro, revision } = useRepository()
  const [mastery, setMastery] = useState<SkillMastery[] | null>(null)
  const [attempts, setAttempts] = useState<PuzzleAttempt[]>([])
  const [retencoes, setRetencoes] = useState<Map<SkillId, RetencaoDeHabilidade>>(new Map())
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        // Os sinais de partida vêm da MESMA função que o "Treino de hoje" usa.
        // Reescrever a sequência de leituras aqui criaria uma segunda janela de
        // recência, e as duas telas mostrariam números diferentes sobre o mesmo
        // aluno sem nada acusar.
        const [m, a, sinais] = await Promise.all([
          repo.getSkillMastery(),
          repo.listPuzzleAttempts(200),
          carregarSinaisDePartida(repo, { agora: new Date() }),
        ])
        if (!cancelado) {
          setMastery(m)
          setAttempts(a)
          setRetencoes(sinais.retencoes)
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
              <li key={m.skillId}>
                <SkillCard
                  id={`forte-${m.skillId}`}
                  nome={getSkill(m.skillId).label}
                  mastery={m.mastery}
                  attempts={m.attempts}
                />
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
              <li key={m.skillId}>
                <SkillCard
                  id={`prioridade-${m.skillId}`}
                  nome={getSkill(m.skillId).label}
                  mastery={m.mastery}
                  attempts={m.attempts}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {retencoes.size > 0 ? (
        <section className={styles.card} aria-labelledby="retencao">
          <h2 id="retencao" className={styles.cardTitle}>
            Depois do treino
          </h2>
          <p className={styles.retencaoIntro}>
            O que você treinou voltou a acontecer nas suas partidas? Só entram aqui as habilidades
            que já viraram treino.
          </p>
          <ul className={styles.retencaoLista}>
            {[...retencoes.values()].sort(porVeredito).map((r) => {
              const d = catalogoDeRetencao[r.veredito]
              return (
                <li key={r.skillId} className={styles.retencaoItem}>
                  <span className={styles.retencaoTitulo}>{getSkill(r.skillId).label}</span>
                  {/*
                      Cor, ícone e texto saem juntos do catálogo. Não há caminho
                      para pintar o chip e omitir o rótulo.
                    */}
                  <span className={styles.retencaoChip} style={{ color: d.colorVar }}>
                    <svg
                      className={styles.retencaoIcone}
                      viewBox={d.icon.viewBox}
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d={d.icon.path} fill="currentColor" />
                    </svg>
                    {d.label}
                  </span>
                  <p className={styles.retencaoFrase}>{fraseDeRetencao(r)}</p>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

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
                  {/*
                    A barra saiu daqui: o card de habilidade já a desenha, e
                    duas barras para o mesmo número são duas tabelas de cor para
                    a mesma coisa. O NÚMERO passa por `readSkill` para que a
                    regra de "amostra pequena não vira percentual" tenha um dono
                    só — antes a tabela mostrava um número onde o card mostra um
                    traço, e as duas afirmações conviviam na mesma tela.
                  */}
                  <td className={styles.num}>{textoDeDominio(m)}</td>
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
