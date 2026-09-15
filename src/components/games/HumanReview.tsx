'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { EngineReview } from '@/components/games/EngineReview'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { OPENING_COURSES } from '@/content/openings/course'
import {
  registerOpeningGameEvidence,
  reviewOpeningGame,
  type OpeningGameReview,
} from '@/domain/openings/game-review'
import type { Game } from '@/domain/types'
import {
  fenAtPly,
  highlightedSquares,
  navigate,
  parsePgn,
  toMovePairs,
  type ChessGame,
  type NavigationStep,
} from '@/lib/chess'
import styles from './HumanReview.module.css'

interface Props {
  gameId: string
}

export function HumanReview({ gameId }: Props) {
  const { status, repo, profile, erro } = useRepository()
  const [game, setGame] = useState<Game | null>(null)
  const [linha, setLinha] = useState<ChessGame | null>(null)
  const [ply, setPly] = useState(0)
  const [marcados, setMarcados] = useState<number[]>([])
  const [notas, setNotas] = useState('')
  const [salvo, setSalvo] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)
  const [aberturas, setAberturas] = useState<OpeningGameReview[]>([])

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const todas = await repo.listGames({ limit: 500 })
        const alvo = todas.find((g) => g.id === gameId) ?? null
        if (cancelado) return
        if (!alvo) {
          setFalha('Partida não encontrada. Ela pode ter sido apagada com os dados locais.')
          return
        }
        setGame(alvo)
        setLinha(parsePgn(alvo.pgn))
        setMarcados(alvo.humanReview?.markedPlies ?? [])
        setNotas(alvo.humanReview?.notes ?? '')
        const partida = parsePgn(alvo.pgn)
        const reviews = await Promise.all(
          OPENING_COURSES.map(async (opening) =>
            reviewOpeningGame(
              opening,
              partida,
              alvo.userColor,
              (await repo.getOpeningProgress(opening.id)) ?? undefined,
            ),
          ),
        )
        setAberturas(reviews)
      } catch (e) {
        if (!cancelado) {
          setFalha(e instanceof Error ? e.message : 'Não consegui abrir esta partida.')
        }
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [gameId, repo])

  const alternarMarca = useCallback((alvo: number) => {
    setSalvo(false)
    setMarcados((atual) =>
      atual.includes(alvo)
        ? atual.filter((p) => p !== alvo)
        : [...atual, alvo].sort((a, b) => a - b),
    )
  }, [])

  const salvar = useCallback(async () => {
    if (!repo || !game) return
    try {
      const atualizado: Game = {
        ...game,
        humanReview: {
          markedPlies: marcados,
          notes: notas,
          reviewedAt: new Date().toISOString(),
        },
      }
      await repo.saveGame(atualizado)
      const linhaDaPartida = linha
      const reviews = linhaDaPartida
        ? await Promise.all(
            OPENING_COURSES.map(async (opening) =>
              reviewOpeningGame(
                opening,
                linhaDaPartida,
                game.userColor,
                (await repo.getOpeningProgress(opening.id)) ?? undefined,
              ),
            ),
          )
        : []
      for (const review of reviews) {
        if (review.classification !== 'repertoire_mistake') continue
        const progress = await repo.getOpeningProgress(review.openingId)
        if (progress) {
          await repo.saveOpeningProgress(
            registerOpeningGameEvidence(progress, review, new Date().toISOString()),
          )
        }
      }
      setAberturas(reviews)
      setGame(atualizado)
      setSalvo(true)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não consegui salvar sua revisão.')
    }
  }, [game, linha, marcados, notas, repo])

  const pares = useMemo(() => (linha ? toMovePairs(linha) : []), [linha])

  if (status === 'carregando') return <p className={styles.state}>Abrindo seus dados locais…</p>

  if (falha || status === 'erro') {
    return (
      <p className={styles.state} role="alert">
        {falha ?? erro}
      </p>
    )
  }

  if (!game || !linha) return <p className={styles.state}>Carregando a partida…</p>

  const passo = (direcao: NavigationStep) => setPly((atual) => navigate(linha, atual, direcao))

  return (
    <>
      <div className={styles.layout}>
        <div>
          <ChessBoardView
            fen={fenAtPly(linha, ply)}
            orientation={game.userColor}
            theme={profile?.preferences.boardTheme ?? 'claro'}
            lastMove={highlightedSquares(linha, ply)}
            interactive={false}
          />
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.button}
              onClick={() => passo('primeiro')}
              disabled={ply === 0}
              aria-label="Primeiro lance"
            >
              &#8676;
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => passo('anterior')}
              disabled={ply === 0}
              aria-label="Lance anterior"
            >
              &#8592;
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => passo('proximo')}
              disabled={ply === linha.plies.length}
              aria-label="Próximo lance"
            >
              &#8594;
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => passo('ultimo')}
              disabled={ply === linha.plies.length}
              aria-label="Último lance"
            >
              &#8677;
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => alternarMarca(ply)}
              disabled={ply === 0}
            >
              {marcados.includes(ply) ? 'Desmarcar este lance' : 'Marcar este lance'}
            </button>
          </div>
        </div>

        <div className={styles.side}>
          <div className={styles.card}>
            <p className={styles.question}>Onde você acha que a partida mudou?</p>
            <p className={styles.explain}>
              Nenhuma avaliação aparece aqui. Marque os lances que você suspeita e escreva o porquê
              — depois a engine confirma ou corrige. Pensar antes é o que faz a revisão ensinar
              alguma coisa.
            </p>
          </div>

          <div className={styles.moves}>
            <table className={styles.table}>
              <caption className="sr-only">
                Lances da partida. Clique para ir até o lance; use o botão de marcar para sinalizar
                um momento suspeito.
              </caption>
              <tbody>
                {pares.map((par, i) => (
                  <tr key={`${par.moveNumber}-${i}`}>
                    <th scope="row" className={styles.number}>
                      {par.moveNumber}.
                    </th>
                    {[par.white, par.black].map((meio, coluna) => (
                      <td key={coluna} className={styles.cell}>
                        {meio ? (
                          <button
                            type="button"
                            className={
                              meio.index === ply ? `${styles.move} ${styles.current}` : styles.move
                            }
                            aria-current={meio.index === ply ? 'step' : undefined}
                            onClick={() => setPly(meio.index)}
                          >
                            {meio.san}
                            {marcados.includes(meio.index) ? (
                              <span className={styles.marca} aria-label="marcado por você">
                                ⚑
                              </span>
                            ) : null}
                          </button>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.card}>
            <label className={styles.label} htmlFor="notas">
              Suas anotações
            </label>
            <textarea
              id="notas"
              className={styles.textarea}
              value={notas}
              onChange={(e) => {
                setNotas(e.target.value)
                setSalvo(false)
              }}
              placeholder="O que você acha que deu errado?"
            />
            <div className={styles.controls}>
              <button type="button" className={styles.primary} onClick={() => void salvar()}>
                Salvar minha análise
              </button>
              <Link href="/games" className={styles.button}>
                Voltar
              </Link>
            </div>
            {salvo ? (
              <p className={styles.feedback} role="status">
                Salvo: {marcados.length}{' '}
                {marcados.length === 1 ? 'lance marcado' : 'lances marcados'}.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {aberturas.some((item) => item.classification !== 'normal_transition') ? (
        <div className={styles.card} role="status">
          <h2 className={styles.question}>Leitura da abertura</h2>
          {aberturas
            .filter((item) => item.classification !== 'normal_transition')
            .map((item) => (
              <p key={item.openingId}>{item.message}</p>
            ))}
        </div>
      ) : null}

      {game.humanReview ? (
        <EngineReview
          game={game}
          markedPlies={game.humanReview.markedPlies}
          notas={game.humanReview.notes}
          plyAtual={ply}
          onIrParaPly={setPly}
        />
      ) : (
        <p className={styles.pendente}>
          <strong>Passe 2 — engine.</strong> Salve a sua leitura primeiro. A engine só entra depois
          — ver a avaliação antes de pensar transforma revisão em leitura passiva, que é exatamente
          o que este app existe para evitar.
        </p>
      )}
    </>
  )
}
