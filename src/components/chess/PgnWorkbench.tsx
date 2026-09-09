'use client'

import { useState } from 'react'
import { GameViewer } from './GameViewer'
import {
  ChessParseError,
  gameFromFen,
  isValidFen,
  parsePgn,
  START_FEN,
  type ChessGame,
} from '@/lib/chess'
import styles from './PgnWorkbench.module.css'

const EXEMPLO_PGN = `[Event "Partida de exemplo"]
[White "Brancas"]
[Black "Pretas"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d3
8. Qb3 Qf6 9. e5 Qg6 10. Re1 Nge7 11. Ba3 b5 12. Qxb5 Rb8 13. Qa4 Bb6 1-0`

export function PgnWorkbench() {
  const [game, setGame] = useState<ChessGame>(() => gameFromFen(START_FEN))
  const [original, setOriginal] = useState<ChessGame | null>(null)
  const [pgnText, setPgnText] = useState('')
  const [fenText, setFenText] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function carregar(next: ChessGame) {
    setGame(next)
    setOriginal(next)
    setErro(null)
  }

  function carregarPgn(texto: string) {
    try {
      carregar(parsePgn(texto))
    } catch (e) {
      setErro(e instanceof ChessParseError ? e.message : 'Não consegui ler este PGN.')
    }
  }

  function carregarFen() {
    if (!isValidFen(fenText.trim())) {
      setErro('FEN inválido. Confira a posição, o lado que joga e os direitos de roque.')
      return
    }
    carregar(gameFromFen(fenText.trim()))
  }

  const modificada =
    original !== null &&
    (game.plies.length !== original.plies.length ||
      game.plies.some((p, i) => p.uci !== original.plies[i]?.uci))

  return (
    <>
      <details className={styles.panel} open>
        <summary className={styles.summary}>Carregar uma posição ou uma partida</summary>

        <label className={styles.field}>
          <span className={styles.label}>PGN para visualizar</span>
          <textarea
            className={styles.textarea}
            value={pgnText}
            onChange={(e) => setPgnText(e.target.value)}
            placeholder="Cole aqui o PGN de uma partida"
            spellCheck={false}
          />
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => carregarPgn(pgnText)}>
            Carregar PGN
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => {
              setPgnText(EXEMPLO_PGN)
              carregarPgn(EXEMPLO_PGN)
            }}
          >
            Usar partida de exemplo
          </button>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>FEN para visualizar</span>
          <input
            className={styles.input}
            value={fenText}
            onChange={(e) => setFenText(e.target.value)}
            placeholder={START_FEN}
            spellCheck={false}
          />
        </label>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={carregarFen}>
            Carregar FEN
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={() => carregar(gameFromFen(START_FEN))}
          >
            Recomeçar do início
          </button>
        </div>

        {erro ? (
          <p className={styles.error} role="alert">
            {erro}
          </p>
        ) : null}
      </details>

      {game.headers.White && game.headers.Black ? (
        <p className={styles.meta}>
          {game.headers.White} × {game.headers.Black}
          {game.headers.Result ? ` · ${game.headers.Result}` : ''}
        </p>
      ) : null}

      <GameViewer
        game={game}
        onGameChange={setGame}
        modified={modificada}
        onRestore={original ? () => setGame(original) : undefined}
      />
    </>
  )
}
