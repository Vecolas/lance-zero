'use client'

/**
 * Painel interno de depuração da engine.
 *
 * Não faz parte do produto: é a bancada onde o contrato da engine é conferido
 * num navegador de verdade (mate em 1, MultiPV, cancelamento, restart). Por isso
 * a rota `/debug/engine` fica fora de `src/lib/navigation.ts`.
 *
 * Regra de produto que este arquivo precisa respeitar: o WDL do Stockfish é
 * calibrado por auto-jogo da engine e NUNCA pode ser apresentado como chance
 * humana de vitória. Sempre que o WDL aparece, o aviso aparece junto.
 */

import { useState } from 'react'
import { useEngine, type EngineStatus } from '@/lib/engine/use-engine'
import type { EngineAnalysis, EngineLine } from '@/lib/engine/types'
import styles from './EngineDebugPanel.module.css'

/** Posição inicial: ponto de partida seguro para um teste manual rápido. */
const FEN_PADRAO = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * Ajustes da bancada. HEURÍSTICA de ferramenta interna, não de produto: são só
 * valores que dão resposta rápida numa máquina mediana.
 */
export const DEBUG_PANEL_CONFIG = {
  nodesPadrao: 300_000,
  multiPvPadrao: 1,
  multiPvMax: 8,
} as const

const ROTULO_STATUS: Record<EngineStatus, string> = {
  ocioso: 'Ociosa — a engine ainda não foi carregada',
  carregando: 'Carregando a engine (cerca de 7 MB de WASM)',
  pronto: 'Pronta',
  erro: 'Erro',
}

/** Formata a avaliação de uma linha na perspectiva de quem joga a posição. */
export function rotuloAvaliacao(linha: EngineLine): string {
  if (linha.mateIn !== null) {
    return linha.mateIn >= 0
      ? `Mate em ${linha.mateIn}`
      : `Mate sofrido em ${Math.abs(linha.mateIn)}`
  }
  if (linha.scoreCp === null) return '—'
  const peoes = linha.scoreCp / 100
  return `${peoes > 0 ? '+' : ''}${peoes.toFixed(2)}`
}

function porMil(valor: number): string {
  return `${(valor / 10).toFixed(1)}%`
}

function numeroDoCampo(valor: string, minimo: number, padrao: number): number {
  const lido = Number.parseInt(valor, 10)
  if (Number.isNaN(lido) || lido < minimo) return padrao
  return lido
}

export function EngineDebugPanel() {
  const { status, analisando, erro, analyze, stop, restart } = useEngine()
  const [fen, setFen] = useState(FEN_PADRAO)
  const [multiPv, setMultiPv] = useState(String(DEBUG_PANEL_CONFIG.multiPvPadrao))
  const [nodes, setNodes] = useState(String(DEBUG_PANEL_CONFIG.nodesPadrao))
  const [analise, setAnalise] = useState<EngineAnalysis | null>(null)

  async function analisar() {
    const resultado = await analyze(fen, {
      multiPv: numeroDoCampo(multiPv, 1, DEBUG_PANEL_CONFIG.multiPvPadrao),
      nodes: numeroDoCampo(nodes, 1, DEBUG_PANEL_CONFIG.nodesPadrao),
      showWdl: true,
    })
    // `null` significa "resposta obsoleta ou falha": não pode sobrescrever o que
    // está na tela, senão o resultado de uma posição antiga vazaria para a nova.
    if (resultado) setAnalise(resultado)
  }

  async function parar() {
    await stop()
  }

  async function reiniciar() {
    setAnalise(null)
    await restart()
  }

  const linhas = analise?.lines ?? []
  const temWdl = linhas.some((linha) => linha.wdl !== undefined)

  return (
    <section className={styles.painel} aria-labelledby="engine-debug-titulo">
      <h2 id="engine-debug-titulo" className={styles.titulo}>
        Bancada da engine
      </h2>
      <p className={styles.texto}>
        Ferramenta interna. A engine é carregada só quando você pede a primeira análise.
      </p>

      <div className={styles.campos}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>FEN</span>
          <input
            className={styles.entrada}
            type="text"
            value={fen}
            spellCheck={false}
            onChange={(e) => setFen(e.target.value)}
          />
        </label>

        <label className={`${styles.campo} ${styles.campoCurto}`}>
          <span className={styles.rotulo}>Linhas (MultiPV)</span>
          <input
            className={styles.entrada}
            type="number"
            min={1}
            max={DEBUG_PANEL_CONFIG.multiPvMax}
            value={multiPv}
            onChange={(e) => setMultiPv(e.target.value)}
          />
        </label>

        <label className={`${styles.campo} ${styles.campoCurto}`}>
          <span className={styles.rotulo}>Orçamento de nós</span>
          <input
            className={styles.entrada}
            type="number"
            min={1}
            step={10_000}
            value={nodes}
            onChange={(e) => setNodes(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.acoes}>
        <button type="button" className={styles.primario} onClick={() => void analisar()}>
          Analisar
        </button>
        <button
          type="button"
          className={styles.secundario}
          onClick={() => void parar()}
          disabled={!analisando}
        >
          Parar
        </button>
        <button type="button" className={styles.secundario} onClick={() => void reiniciar()}>
          Reiniciar
        </button>
      </div>

      <p className={styles.status} data-testid="engine-status">
        <span className={styles.rotulo}>Status</span> {ROTULO_STATUS[status]}
        {analisando ? (
          <span className={styles.pulso} data-testid="engine-analisando">
            Analisando…
          </span>
        ) : null}
      </p>

      {erro ? (
        <p className={styles.erro} role="alert" data-testid="engine-erro">
          {erro}
        </p>
      ) : null}

      <div className={styles.resultado} aria-live="polite">
        {analise === null ? (
          <p className={styles.vazio} data-testid="engine-vazio">
            Nenhuma análise ainda. Preencha o FEN e clique em Analisar.
          </p>
        ) : (
          <>
            <dl className={styles.resumo}>
              <div className={styles.item}>
                <dt className={styles.rotulo}>Posição analisada</dt>
                <dd className={styles.valorMono} data-testid="engine-fen-analisada">
                  {analise.fen}
                </dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.rotulo}>Melhor lance</dt>
                <dd className={styles.valorMono} data-testid="engine-melhor-lance">
                  {analise.bestMoveUci ?? '—'}
                </dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.rotulo}>Profundidade</dt>
                <dd className={styles.valor} data-testid="engine-profundidade">
                  {analise.depth}
                </dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.rotulo}>Nós</dt>
                <dd className={styles.valor} data-testid="engine-nodes">
                  {analise.nodes}
                </dd>
              </div>
              <div className={styles.item}>
                <dt className={styles.rotulo}>Tempo</dt>
                <dd className={styles.valor} data-testid="engine-tempo">
                  {analise.elapsedMs} ms
                </dd>
              </div>
            </dl>

            <ol className={styles.linhas} data-testid="engine-linhas">
              {linhas.map((linha) => (
                <li
                  key={linha.multiPv}
                  className={styles.linha}
                  data-testid="engine-linha"
                  data-multipv={linha.multiPv}
                  data-score-cp={linha.scoreCp === null ? '' : String(linha.scoreCp)}
                  data-mate={linha.mateIn === null ? '' : String(linha.mateIn)}
                  data-melhor-lance={linha.pv[0] ?? ''}
                >
                  <span className={styles.indice}>#{linha.multiPv}</span>
                  <span className={styles.avaliacao} data-testid="engine-avaliacao">
                    {rotuloAvaliacao(linha)}
                  </span>
                  <span className={styles.pv} data-testid="engine-pv">
                    {linha.pv.join(' ')}
                  </span>
                  {linha.wdl ? (
                    <span className={styles.wdl} data-testid="engine-wdl">
                      V {porMil(linha.wdl.win)} · E {porMil(linha.wdl.draw)} · D{' '}
                      {porMil(linha.wdl.loss)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>

            {temWdl ? (
              <p className={styles.aviso} data-testid="engine-wdl-aviso">
                <strong>Sobre V/E/D:</strong> é o WDL do Stockfish, calibrado pelo auto-jogo da
                própria engine. Serve para comparar lances entre si e não é a sua chance humana de
                vitória.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
