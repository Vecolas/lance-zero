'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { STARTER_PUZZLES_CSV } from '@/content/puzzles/starter'
import {
  forcingMoves,
  scoreForcingSelection,
  type ForcingScore,
} from '@/domain/calculation/forcing'
import { parsePuzzleCsv, toSolvable } from '@/domain/puzzles'
import { createMastery, updateMastery } from '@/domain/skills/mastery'
import type { SkillMastery } from '@/domain/types'
import { legalMoves, type SquareName } from '@/lib/chess'
import styles from './ForcingDrill.module.css'

/** Posições vêm dos puzzles iniciais: já verificadas e cheias de lance forçante. */
const POSICOES = parsePuzzleCsv(STARTER_PUZZLES_CSV, { pularCabecalho: true }).puzzles.map(
  (p) => toSolvable(p).startFen,
)

const SKILL = 'calculation.checks-captures-threats' as const

export function ForcingDrill() {
  const { status, repo, profile, erro, refresh } = useRepository()
  const [indice, setIndice] = useState(0)
  const [origem, setOrigem] = useState<SquareName | null>(null)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [nota, setNota] = useState<ForcingScore | null>(null)

  const fen = POSICOES[indice] ?? POSICOES[0]
  const resumo = useMemo(() => forcingMoves(fen), [fen])
  const alvos = useMemo(
    () => (origem ? legalMoves(fen, origem).map((m) => m.to) : []),
    [fen, origem],
  )

  const clicar = useCallback(
    (casa: SquareName) => {
      if (nota) return
      if (origem) {
        const move = legalMoves(fen, origem).find((m) => m.to === casa)
        if (move) {
          setSelecionados((atual) =>
            atual.includes(move.uci) ? atual : [...atual, move.uci].sort(),
          )
          setOrigem(null)
          return
        }
      }
      setOrigem(legalMoves(fen, casa).length > 0 && casa !== origem ? casa : null)
    },
    [fen, nota, origem],
  )

  const conferir = useCallback(async () => {
    const resultado = scoreForcingSelection(resumo, selecionados)
    setNota(resultado)
    setOrigem(null)
    if (!repo) return
    try {
      const atual = await repo.getSkillMastery()
      const porId = new Map<string, SkillMastery>(atual.map((m) => [m.skillId, m]))
      const base = porId.get(SKILL) ?? createMastery(SKILL)
      porId.set(
        SKILL,
        updateMastery(base, {
          tipo: 'puzzle',
          acertou: resultado.completo,
          usouDica: false,
          primeiraTentativa: resultado.completo,
          thinkTimeMs: 0,
          ocorridoEm: new Date().toISOString(),
        }),
      )
      await repo.saveSkillMastery([...porId.values()])
      refresh()
    } catch {
      // A nota já está na tela; falhar ao gravar não pode apagar o exercício.
    }
  }, [refresh, repo, resumo, selecionados])

  const proxima = useCallback(() => {
    setIndice((i) => (i + 1) % POSICOES.length)
    setSelecionados([])
    setNota(null)
    setOrigem(null)
  }, [])

  if (status === 'carregando') return <p className={styles.state}>Abrindo seus dados locais…</p>
  if (status === 'erro') {
    return (
      <p className={styles.state} role="alert">
        {erro}
      </p>
    )
  }

  return (
    <div className={styles.layout}>
      <ChessBoardView
        fen={fen}
        orientation={resumo.side}
        theme={profile?.preferences.boardTheme ?? 'claro'}
        selected={origem}
        targets={alvos}
        interactive={false}
        onSquareClick={clicar}
      />

      <div className={styles.panel}>
        <p className={styles.counter}>
          Posição {indice + 1} de {POSICOES.length}
        </p>
        <p className={styles.prompt}>
          {resumo.side === 'w' ? 'Brancas jogam.' : 'Pretas jogam.'} Ache todos os xeques e todas as
          capturas.
        </p>
        <p className={styles.explain}>
          Antes de calcular qualquer coisa, olhe o que é forçante. Clique na peça e depois na casa
          de destino para marcar um lance — nada é jogado no tabuleiro.
        </p>

        <div className={styles.chips}>
          {selecionados.length === 0 ? (
            <p className={styles.vazio}>Nenhum lance marcado ainda.</p>
          ) : (
            selecionados.map((uci) => (
              <button
                key={uci}
                type="button"
                className={styles.chip}
                disabled={nota !== null}
                onClick={() => setSelecionados((atual) => atual.filter((u) => u !== uci))}
                aria-label={`Remover ${uci}`}
              >
                {uci} ✕
              </button>
            ))
          )}
        </div>

        {nota === null ? (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => void conferir()}>
              Conferir
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setSelecionados([])}
              disabled={selecionados.length === 0}
            >
              Limpar
            </button>
          </div>
        ) : (
          <div className={styles.resultado}>
            <span className={`${styles.nota} ${nota.completo ? styles.bom : styles.parcial}`}>
              {nota.completo
                ? '✓ Lista completa'
                : `· ${Math.round(nota.precisao * 100)}% da lista`}
            </span>
            <p className={styles.linha}>
              {resumo.forcantes.length}{' '}
              {resumo.forcantes.length === 1 ? 'lance forçante' : 'lances forçantes'} nesta posição:{' '}
              {resumo.xeques.length} de xeque, {resumo.capturas.length} de captura.
            </p>
            {nota.esquecidos.length > 0 ? (
              <>
                <p className={styles.linha}>Passaram batido:</p>
                <ul className={styles.lista}>
                  {nota.esquecidos.map((f) => (
                    <li key={f.move.uci}>
                      {f.move.san} ({f.kind})
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {nota.falsosPositivos.length > 0 ? (
              <>
                <p className={styles.linha}>Marcados sem ser forçantes:</p>
                <ul className={styles.lista}>
                  {nota.falsosPositivos.map((m) => (
                    <li key={m.uci}>{m.san}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={proxima}>
                Próxima posição
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
