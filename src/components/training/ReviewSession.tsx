'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import {
  availableRatings,
  createReviewSession,
  expectedMove,
  giveUpReview,
  RATING_LABEL,
  submitReviewMove,
  type ReviewSessionState,
} from '@/domain/review/session'
import { getSkill } from '@/domain/skills/catalog'
import { createMastery, updateMastery } from '@/domain/skills/mastery'
import type { ReviewCard, ReviewRating, SkillMastery } from '@/domain/types'
import { positionStatus, type PromotionPiece, type SquareName } from '@/lib/chess'
import { applyReview } from '@/lib/fsrs/cards'
import styles from './ReviewSession.module.css'

type Fase = 'carregando' | 'revisando' | 'concluida' | 'erro'

export function ReviewSession() {
  const { status, repo, profile, erro, refresh } = useRepository()
  const [fila, setFila] = useState<ReviewCard[]>([])
  const [indice, setIndice] = useState(0)
  const [sessao, setSessao] = useState<ReviewSessionState | null>(null)
  const [fase, setFase] = useState<Fase>('carregando')
  const [falha, setFalha] = useState<string | null>(null)
  const [feitas, setFeitas] = useState(0)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const cards = await repo.getDueCards(new Date())
        if (cancelado) return
        setFila(cards)
        setIndice(0)
        setSessao(cards.length > 0 ? createReviewSession(cards[0]) : null)
        setFase(cards.length > 0 ? 'revisando' : 'concluida')
      } catch (e) {
        if (!cancelado) {
          setFalha(e instanceof Error ? e.message : 'Não consegui ler suas revisões.')
          setFase('erro')
        }
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [repo])

  const avancar = useCallback(() => {
    const proximo = indice + 1
    setFeitas((f) => f + 1)
    if (proximo >= fila.length) {
      setSessao(null)
      setFase('concluida')
      refresh()
      return
    }
    setIndice(proximo)
    setSessao(createReviewSession(fila[proximo]))
  }, [fila, indice, refresh])

  const registrar = useCallback(
    async (rating: ReviewRating) => {
      if (!repo || !sessao) return
      const agora = new Date()
      try {
        const atualizado = applyReview(sessao.card, rating, agora)
        await repo.saveReviewCard(atualizado)
        await repo.saveReviewLog({
          cardId: sessao.card.id,
          reviewedAt: agora.toISOString(),
          rating,
          elapsedMs: 0,
        })

        // A revisão também move o modelo de habilidades: é o mesmo aprendizado.
        const atual = await repo.getSkillMastery()
        const porId = new Map<string, SkillMastery>(atual.map((m) => [m.skillId, m]))
        for (const skillId of sessao.card.skillIds) {
          const base = porId.get(skillId) ?? createMastery(skillId)
          porId.set(
            skillId,
            updateMastery(base, {
              tipo: 'revisao',
              acertou: rating !== 'again',
              usouDica: false,
              primeiraTentativa: sessao.semErro,
              thinkTimeMs: 0,
              ocorridoEm: agora.toISOString(),
            }),
          )
        }
        await repo.saveSkillMastery([...porId.values()])
        avancar()
      } catch (e) {
        setFalha(e instanceof Error ? e.message : 'Não consegui salvar esta revisão.')
        setFase('erro')
      }
    },
    [avancar, repo, sessao],
  )

  const jogar = useCallback(
    (from: SquareName, to: SquareName, promotion?: PromotionPiece) => {
      if (!sessao || sessao.phase !== 'resolvendo') return false
      const comPromocao = submitReviewMove(sessao, `${from}${to}${promotion ?? ''}`)
      // A solução pode não trazer sufixo de promoção; tenta sem antes de reprovar.
      const proximo =
        comPromocao.phase === 'errou' && promotion
          ? submitReviewMove(sessao, `${from}${to}`)
          : comPromocao
      setSessao(proximo)
      return proximo.phase !== 'errou'
    },
    [sessao],
  )

  if (status === 'carregando' || fase === 'carregando') {
    return <p className={styles.state}>Procurando o que está vencido…</p>
  }

  if (status === 'erro' || fase === 'erro') {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {falha ?? erro}
      </p>
    )
  }

  if (fase === 'concluida' || !sessao) {
    return (
      <div className={styles.state}>
        <p>
          {feitas === 0
            ? 'Nada vencido agora. Revisão espaçada só funciona se ela não aparecer todo dia.'
            : `${feitas} ${feitas === 1 ? 'revisão concluída' : 'revisões concluídas'}. O próximo intervalo já está agendado.`}
        </p>
        <p>
          As revisões nascem dos seus erros. Enquanto não houver puzzles resolvidos nem partidas
          importadas, esta fila fica vazia — e isso é o comportamento certo, não uma tela quebrada.
        </p>
        <Link href="/dashboard">Voltar ao treino de hoje</Link>
      </div>
    )
  }

  const posicao = positionStatus(sessao.fen)
  const esperado = expectedMove(sessao) ?? sessao.card.solutionUci[sessao.step]

  return (
    <div className={styles.layout}>
      <ChessBoardView
        fen={sessao.fen}
        orientation={posicao.turn}
        theme={profile?.preferences.boardTheme ?? 'claro'}
        interactive={sessao.phase === 'resolvendo'}
        onMove={jogar}
      />

      <div className={styles.panel}>
        <p className={styles.counter}>
          Revisão {indice + 1} de {fila.length}
        </p>
        <p className={styles.prompt}>{sessao.card.prompt}</p>

        {sessao.phase === 'resolvendo' ? (
          <>
            <p className={styles.hint}>
              Jogue o lance. Pense antes: a nota que você dá depois só vale se a resposta não veio
              por tentativa e erro.
            </p>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setSessao(giveUpReview(sessao))}
            >
              Não lembro
            </button>
          </>
        ) : null}

        {sessao.phase === 'acertou' ? (
          <span className={`${styles.status} ${styles.ok}`}>✓ Correto</span>
        ) : null}

        {sessao.phase === 'errou' ? (
          <>
            <span className={`${styles.status} ${styles.bad}`}>✕ Não era esse</span>
            <p className={styles.hint}>
              O lance certo era <strong>{esperado}</strong>. Ele volta em breve.
            </p>
          </>
        ) : null}

        {sessao.phase !== 'resolvendo' ? (
          <div className={styles.ratings} role="group" aria-label="Como foi lembrar disso?">
            {availableRatings(sessao).map((rating) => (
              <button
                key={rating}
                type="button"
                className={
                  rating === 'good' ? `${styles.rating} ${styles.ratingGood}` : styles.rating
                }
                onClick={() => void registrar(rating)}
              >
                {RATING_LABEL[rating]}
              </button>
            ))}
          </div>
        ) : null}

        {sessao.card.skillIds.length > 0 ? (
          <p className={styles.skills}>
            {sessao.card.skillIds.map((id) => getSkill(id).label).join(' · ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
