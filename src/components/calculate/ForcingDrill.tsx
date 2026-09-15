'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { ChessWorkspace } from '@/components/chess/ChessWorkspace'
import { ErrorState, LoadingState } from '@/components/ui/primitives'
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
import { applyMove, legalMoves, type SquareName } from '@/lib/chess'
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
  const [respostaUci, setRespostaUci] = useState<string | null>(null)
  const [linhaUci, setLinhaUci] = useState<string | null>(null)

  const fen = POSICOES[indice] ?? POSICOES[0]
  const resumo = useMemo(() => forcingMoves(fen), [fen])
  const candidatoPrincipal = selecionados[0] ?? null
  const depoisDoCandidato = useMemo(
    () => (candidatoPrincipal ? aplicarUci(fen, candidatoPrincipal) : null),
    [candidatoPrincipal, fen],
  )
  const respostas = useMemo(
    () => (depoisDoCandidato ? legalMoves(depoisDoCandidato.fenAfter).slice(0, 4) : []),
    [depoisDoCandidato],
  )
  const depoisDaResposta = useMemo(
    () =>
      respostaUci && depoisDoCandidato ? aplicarUci(depoisDoCandidato.fenAfter, respostaUci) : null,
    [depoisDoCandidato, respostaUci],
  )
  const continuacoes = useMemo(
    () => (depoisDaResposta ? legalMoves(depoisDaResposta.fenAfter).slice(0, 4) : []),
    [depoisDaResposta],
  )
  const fenDaEtapa =
    linhaUci && depoisDaResposta
      ? (aplicarUci(depoisDaResposta.fenAfter, linhaUci)?.fenAfter ?? fen)
      : (depoisDaResposta?.fenAfter ?? depoisDoCandidato?.fenAfter ?? fen)
  const etapa =
    nota === null
      ? 'candidatos'
      : respostaUci === null
        ? 'resposta'
        : linhaUci === null
          ? 'linha'
          : 'avaliacao'
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
    setRespostaUci(null)
    setLinhaUci(null)
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
    setRespostaUci(null)
    setLinhaUci(null)
    setOrigem(null)
  }, [])

  if (status === 'carregando') {
    return (
      <LoadingState title="Abrindo o treino de cálculo" description="Lendo seus dados locais." />
    )
  }
  if (status === 'erro') {
    return (
      <ErrorState title="Não consegui abrir o treino de cálculo" description={erro ?? undefined} />
    )
  }

  return (
    <ChessWorkspace
      board={
        <ChessBoardView
          fen={fenDaEtapa}
          orientation={resumo.side}
          theme={profile?.preferences.boardTheme ?? 'claro'}
          selected={origem}
          targets={alvos}
          interactive={false}
          onSquareClick={clicar}
        />
      }
      panel={
        <div className={styles.panel}>
          <p className={styles.counter}>
            Posição {indice + 1} de {POSICOES.length}
          </p>
          <p className={styles.prompt}>
            {resumo.side === 'w' ? 'Brancas jogam.' : 'Pretas jogam.'} Ache todos os xeques e todas
            as capturas.
          </p>
          <ol className={styles.workflow} aria-label="Etapas do cálculo">
            <li className={etapa === 'candidatos' ? styles.workflowActive : styles.workflowDone}>
              1. Candidatos
            </li>
            <li
              className={
                etapa === 'resposta'
                  ? styles.workflowActive
                  : etapa === 'candidatos'
                    ? styles.workflowPending
                    : styles.workflowDone
              }
            >
              2. Resposta
            </li>
            <li
              className={
                etapa === 'linha'
                  ? styles.workflowActive
                  : etapa === 'candidatos' || etapa === 'resposta'
                    ? styles.workflowPending
                    : styles.workflowDone
              }
            >
              3. Linha
            </li>
            <li className={etapa === 'avaliacao' ? styles.workflowActive : styles.workflowPending}>
              4. Avaliação
            </li>
          </ol>
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
              <p className={styles.stageTitle}>Avaliação pedagógica</p>
              <span className={`${styles.nota} ${nota.completo ? styles.bom : styles.parcial}`}>
                {nota.completo
                  ? '✓ Lista completa'
                  : `· ${Math.round(nota.precisao * 100)}% da lista`}
              </span>
              <p className={styles.linha}>
                {resumo.forcantes.length}{' '}
                {resumo.forcantes.length === 1 ? 'lance forçante' : 'lances forçantes'} nesta
                posição: {resumo.xeques.length} de xeque, {resumo.capturas.length} de captura.
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
              {candidatoPrincipal && respostaUci === null ? (
                <section className={styles.workflowStep} aria-labelledby="resposta-titulo">
                  <h3 id="resposta-titulo" className={styles.stageTitle}>
                    Resposta do adversário
                  </h3>
                  <p className={styles.linha}>
                    Escolha uma resposta legal para continuar calculando. Ela só aparece depois que
                    você selecionou seus candidatos.
                  </p>
                  <div className={styles.choiceGrid}>
                    {respostas.map((move) => (
                      <button
                        key={move.uci}
                        type="button"
                        className={styles.ghost}
                        onClick={() => {
                          setRespostaUci(move.uci)
                          setLinhaUci(null)
                        }}
                      >
                        {move.san}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {respostaUci && linhaUci === null ? (
                <section className={styles.workflowStep} aria-labelledby="linha-titulo">
                  <h3 id="linha-titulo" className={styles.stageTitle}>
                    Sua linha
                  </h3>
                  <p className={styles.linha}>
                    Encontre uma continuação antes de olhar qualquer avaliação.
                  </p>
                  <div className={styles.choiceGrid}>
                    {continuacoes.map((move) => (
                      <button
                        key={move.uci}
                        type="button"
                        className={styles.ghost}
                        onClick={() => setLinhaUci(move.uci)}
                      >
                        {move.san}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {linhaUci ? (
                <p className={styles.workflowStep} role="status">
                  <strong>Avaliação após o cálculo:</strong> você encontrou{' '}
                  {nota.completo
                    ? 'todos os candidatos forçantes.'
                    : 'parte dos candidatos forçantes.'}{' '}
                  A precisão é feedback do processo, não um rating.
                </p>
              ) : null}
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={proxima}>
                  Próxima posição
                </button>
              </div>
            </div>
          )}
        </div>
      }
    />
  )
}

function aplicarUci(fen: string, uci: string) {
  if (uci.length < 4) return null
  return applyMove(fen, {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci.slice(4, 5) || 'q') as 'q' | 'r' | 'b' | 'n',
  })
}
