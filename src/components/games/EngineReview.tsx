'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { adaptarEngine } from '@/components/games/engine-adapter'
import { EvaluationBar } from '@/components/ui/EvaluationBar'
import { MoveQualityBadge } from '@/components/ui/MoveQualityBadge'
import { StatePanel } from '@/components/ui/primitives'
import { moveQualityFromSeverity } from '@/lib/design/move-quality'
import {
  analyzeGame,
  AnalysisAbortedError,
  compareHumanAndEngine,
  describeComparison,
  gravarErrosComoTreino,
  porGravidade,
  SEVERITY_LABEL,
  type GameAnalysis,
} from '@/domain/games'
import type { CriticalMoment, Game } from '@/domain/types'
import { useEngine } from '@/lib/engine/use-engine'
import styles from './EngineReview.module.css'

type Fase = 'ocioso' | 'analisando' | 'pronto' | 'erro'

/**
 * De quem é a vez no FEN guardado em `fenBefore`.
 *
 * `PositionAnalysis.scoreCp` vem na perspectiva de quem joga, como a engine
 * reporta. A barra exige que essa perspectiva seja declarada; ler o campo do
 * FEN é a única fonte confiável dela aqui.
 */
function ladoQueJoga(fen: string): 'brancas' | 'pretas' {
  return fen.split(' ')[1] === 'b' ? 'pretas' : 'brancas'
}

export interface EngineReviewProps {
  game: Game
  /** Plies que o usuário marcou no passe 1. */
  markedPlies: number[]
  /**
   * O que o usuário escreveu no passe 1.
   *
   * Aparece ao lado do veredito de propósito: comparar as duas leituras é o
   * ponto da revisão, e obrigar o usuário a rolar a tela para reler o que ele
   * mesmo pensou transforma a comparação em esforço de memória.
   */
  notas: string
  /** Leva o tabuleiro até o lance do momento clicado. */
  onIrParaPly: (ply: number) => void
  plyAtual: number
}

/**
 * Passe 2 da revisão: o que a engine achou.
 *
 * Só aparece depois que o passe humano foi salvo. Essa ordem é o produto, não
 * ergonomia: ver a avaliação antes de pensar transforma revisão em leitura
 * passiva, e é justamente isso que o LanceZero existe para evitar.
 *
 * O resultado não é apresentado como lista de erros, e sim como o cruzamento
 * entre a leitura do jogador e a da engine — o que ele viu, o que passou batido.
 */
export function EngineReview({
  game,
  markedPlies,
  notas,
  onIrParaPly,
  plyAtual,
}: EngineReviewProps) {
  const { repo } = useRepository()
  const { analyze, stop, status: statusEngine } = useEngine()
  const [fase, setFase] = useState<Fase>('ocioso')
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 })
  const [resultado, setResultado] = useState<GameAnalysis | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [cardsCriados, setCardsCriados] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const analisar = useCallback(async () => {
    setFase('analisando')
    setErro(null)
    setProgresso({ feito: 0, total: 0 })
    const controlador = new AbortController()
    abortRef.current = controlador

    try {
      const analise = await analyzeGame({
        game,
        engine: adaptarEngine({ analyze, stop }),
        signal: controlador.signal,
        onProgress: (feito, total) => setProgresso({ feito, total }),
      })
      setResultado(analise)
      setFase('pronto')
      // Guardar aqui e não durante: análise interrompida não deve deixar
      // meia partida gravada no banco local.
      if (repo && analise.analises.length > 0) {
        await repo.savePositionAnalyses(analise.analises)
        const gravacao = await gravarErrosComoTreino(repo, analise.momentos, {
          agora: new Date(),
        })
        setCardsCriados(gravacao.criados + gravacao.atualizados)
      }
    } catch (e) {
      if (e instanceof AnalysisAbortedError) {
        setFase('ocioso')
        return
      }
      setErro(e instanceof Error ? e.message : 'Não consegui analisar esta partida.')
      setFase('erro')
    } finally {
      abortRef.current = null
    }
  }, [analyze, game, repo, stop])

  const cancelar = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const comparacao = useMemo(
    () => (resultado ? compareHumanAndEngine(markedPlies, resultado.momentos) : null),
    [markedPlies, resultado],
  )

  const momentosOrdenados = useMemo(
    () => (resultado ? [...resultado.momentos].sort(porGravidade) : []),
    [resultado],
  )

  const percebidos = useMemo(
    () => new Set((comparacao?.confirmados ?? []).map((m: CriticalMoment) => m.ply)),
    [comparacao],
  )

  const pct = progresso.total > 0 ? Math.round((progresso.feito / progresso.total) * 100) : 0

  return (
    <section className={styles.bloco} aria-labelledby="passe-2">
      <h2 id="passe-2" className={styles.titulo}>
        Passe 2 — o que a engine achou
      </h2>
      <p className={styles.aviso}>
        A engine roda no seu computador. Ela confirma ou corrige a sua leitura — não substitui. O
        valor está em comparar as duas.
      </p>

      {fase === 'ocioso' ? (
        <div className={styles.acoes}>
          <button type="button" className={styles.primary} onClick={() => void analisar()}>
            Analisar com a engine
          </button>
          {statusEngine === 'ocioso' ? (
            <span className={styles.rodape}>
              A engine tem cerca de 7 MB e só é baixada agora, no primeiro uso.
            </span>
          ) : null}
        </div>
      ) : null}

      {fase === 'analisando' ? (
        <>
          <div className={styles.acoes}>
            <button type="button" className={styles.ghost} onClick={cancelar}>
              Cancelar
            </button>
          </div>
          <div className={styles.progresso}>
            <div
              className={styles.barra}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label="Progresso da análise"
            >
              <div className={styles.barraPreenchida} style={{ width: `${pct}%` }} />
            </div>
            <p className={styles.progressoTexto}>
              {progresso.feito} de {progresso.total} posições
            </p>
          </div>
        </>
      ) : null}

      {fase === 'erro' ? (
        <p className={styles.erroBox} role="alert">
          {erro}
        </p>
      ) : null}

      {fase === 'pronto' && resultado && comparacao ? (
        <>
          <p className={styles.veredito} role="status">
            {describeComparison(comparacao)}
          </p>

          {notas.trim() ? (
            <div className={styles.suaLeitura}>
              <p className={styles.suaLeituraTitulo}>O que você escreveu antes de ver a engine</p>
              <p className={styles.suaLeituraTexto}>{notas}</p>
            </div>
          ) : null}

          {momentosOrdenados.length > 0 ? (
            <p className={styles.rodape}>
              A barra mostra a avaliação da posição pela engine, em peões. Não é a sua chance de
              vencer a partida.
            </p>
          ) : null}

          {momentosOrdenados.length > 0 ? (
            <ul className={styles.lista}>
              {momentosOrdenados.map((momento) => {
                const viu = percebidos.has(momento.ply)
                const analise = resultado.analises.find((a) => a.ply === momento.ply)
                return (
                  <li key={momento.ply}>
                    <button
                      type="button"
                      className={
                        momento.ply === plyAtual
                          ? `${styles.momento} ${styles.momentoAtual}`
                          : styles.momento
                      }
                      onClick={() => onIrParaPly(momento.ply)}
                    >
                      <span className={styles.lance}>#{momento.ply}</span>
                      <span>
                        {/* O texto do selo continua vindo de SEVERITY_LABEL, do
                            domínio: a cor e o símbolo são visuais, o nome do
                            estado é vocabulário do produto e mora num lugar só. */}
                        <MoveQualityBadge
                          quality={moveQualityFromSeverity(momento.severity)}
                          label={SEVERITY_LABEL[momento.severity]}
                        />{' '}
                        <span className={`${styles.selo} ${viu ? styles.viu : styles.passou}`}>
                          {viu ? '✓ você marcou' : '· passou batido'}
                        </span>
                      </span>
                      <span className={styles.lance}>
                        {momento.userMoveUci} → {momento.bestMoveUci}
                      </span>
                      {momento.explanation ? (
                        <p className={styles.explicacao}>
                          {momento.explanation.oQueAconteceu} {momento.explanation.sinalVisivel}
                        </p>
                      ) : null}
                      {analise?.precisao === 'rasa' ? (
                        <p className={styles.rasa}>
                          Número de varredura rápida: serve para ordenar, não para julgar este lance
                          isoladamente.
                        </p>
                      ) : null}
                    </button>
                    {/* Fora do botão de propósito: a barra tem estrutura
                        própria e não é conteúdo clicável do momento. */}
                    {analise ? (
                      <EvaluationBar
                        titulo="Avaliação da posição antes do seu lance"
                        scoreCp={analise.scoreCp}
                        mateIn={analise.mateIn}
                        perspectiva={ladoQueJoga(analise.fenBefore)}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : null}

          {momentosOrdenados.length === 0 ? (
            <StatePanel
              kind="completed"
              /* O veredito logo acima já é `role="status"` e já anuncia o fim da
                 análise. Com os dois vivos, o leitor de tela cortava um para
                 começar o outro — e o modo estrito do Playwright via duas
                 regiões onde o Passe 2 deveria ter uma. */
              announce={false}
              title="Nenhum momento crítico encontrado"
              description="A análise não encontrou uma mudança que mereça virar exercício. Isso não é uma nota: é um convite para seguir jogando e revisar com suas próprias perguntas."
            />
          ) : null}

          {comparacao.semConfirmacao.length > 0 ? (
            <p className={styles.rodape}>
              Você marcou os lances {comparacao.semConfirmacao.join(', ')} e a engine não viu
              problema neles. Isso não é erro seu: pode ser um momento de tensão que a engine
              resolve e um humano não.
            </p>
          ) : null}

          {cardsCriados > 0 ? (
            <p className={styles.veredito}>
              {cardsCriados === 1
                ? 'Um destes erros virou treino e volta em Treinar, na hora certa.'
                : `${cardsCriados} destes erros viraram treino e voltam em Treinar, na hora certa.`}
            </p>
          ) : null}

          <p className={styles.rodape}>
            {resultado.resumo.pliesAprofundados} de {resultado.resumo.pliesAnalisados} lances
            receberam análise profunda.
            {resultado.resumo.pliesComFalha > 0
              ? ` ${resultado.resumo.pliesComFalha} não puderam ser analisados.`
              : ''}
            {resultado.resumo.unknownRate > 0
              ? ` Em ${Math.round(resultado.resumo.unknownRate * 100)}% dos casos não foi possível nomear o padrão com segurança — e preferimos não inventar.`
              : ''}
          </p>
        </>
      ) : null}
    </section>
  )
}
