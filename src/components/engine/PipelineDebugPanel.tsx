'use client'

/**
 * Bancada interna do pipeline de revisão de partida (`analyzeGame`).
 *
 * POR QUE ESTE ARQUIVO EXISTE. `analyzeGame` só era exercitado por testes
 * unitários com engine falsa. Um duble prova a orquestração e não prova NADA
 * sobre a integração: se o Stockfish real devolvesse score na perspectiva
 * errada, demorasse demais ou não respondesse ao `stop`, todos aqueles testes
 * continuariam verdes. Esta bancada é o lugar onde o pipeline encontra a engine
 * de verdade, num navegador de verdade — e é o alvo de `tests/e2e/pipeline.spec.ts`.
 *
 * A SEGUNDA DECISÃO que ele carrega: `PIPELINE_CONFIG.varreduraNodes` e
 * `aprofundamentoNodes` nasceram como chute lido do CLAUDE.md e nunca foram
 * medidos (issue #21). Por isso os dois orçamentos são CAMPOS editáveis e o
 * painel cronometra o que aconteceu: sem isso, calibrar exigiria recompilar a
 * cada tentativa, e ninguém calibra assim.
 *
 * O painel MEDE, não aprova. Ele não tem limiar, não pinta verde e não diz se o
 * número está bom: quem decide isso é gente olhando a tabela de orçamentos.
 *
 * Rota `/debug/pipeline`, fora de `src/lib/navigation.ts` de propósito — é
 * ferramenta, não produto.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { adaptarEngine } from '@/components/games/engine-adapter'
import {
  analyzeGame,
  AnalysisAbortedError,
  PIPELINE_CONFIG,
  SEVERITY_LABEL,
  type GameAnalysis,
} from '@/domain/games'
import type { Game } from '@/domain/types'
import type { AnalysisOptions, EngineAnalysis } from '@/lib/engine/types'
import { useEngine, type EngineStatus } from '@/lib/engine/use-engine'
import styles from './PipelineDebugPanel.module.css'

/** Posição inicial: serve só para o aquecimento, nunca entra no resultado. */
const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/**
 * Ajustes da própria bancada.
 *
 * HEURÍSTICA DE FERRAMENTA, não de produto: nenhum destes números chega ao
 * usuário final. `nodesDoAquecimento` é pequeno de propósito — a única função
 * daquela chamada é fazer o worker subir e o WASM ser baixado ANTES de o
 * cronômetro da análise começar, senão os 7 MB de download entrariam no tempo
 * medido e o número de calibração seria inútil.
 */
export const PIPELINE_DEBUG_CONFIG = {
  nodesDoAquecimento: 1_000,
  /** Piso dos campos de orçamento. Abaixo disso a engine não responde nada útil. */
  nodesMinimo: 1_000,
} as const

/** Partida montada em volta do PGN colado. */
export interface ExemploDePartida {
  id: string
  rotulo: string
  /**
   * O que este exemplo existe para provar.
   *
   * Fica exposto em `data-proposito` porque o e2e varre os exemplos
   * RENDERIZADOS: exemplo novo que ninguém decidiu o que prova precisa reprovar
   * o portão, e não sumir da conta.
   */
  proposito: string
  userColor: 'w' | 'b'
  pgn: string
}

export const EXEMPLOS: readonly ExemploDePartida[] = [
  {
    id: 'dama-de-graca',
    rotulo: 'Dama de graça',
    proposito:
      'As brancas dão a dama por um peão no 3º lance. É o erro mais grosseiro possível: se o pipeline não destacar este lance, ele não destaca nada.',
    userColor: 'w',
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Qxf7+ Kxf7 4. Nf3 Nf6 5. d3 d5',
  },
  {
    id: 'abertura-limpa',
    rotulo: 'Ruy López de livro',
    proposito:
      'Cinco lances de abertura principal, sem erro. Serve para o outro lado do portão: partida limpa não pode gerar momento crítico inventado.',
    userColor: 'w',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7',
  },
]

/**
 * Campos da partida que o pipeline não usa para decidir nada.
 *
 * `playedAt` é constante de propósito: ele só viaja até o `ocorridoEm` dos
 * momentos, e um `new Date()` aqui faria duas execuções da MESMA partida
 * produzirem resultados diferentes — o oposto do que uma bancada de medição
 * precisa.
 */
const PARTIDA_BASE = {
  id: 'debug-pipeline',
  source: 'pgn',
  white: 'Brancas',
  black: 'Pretas',
  result: '*',
  playedAt: '2026-01-01T00:00:00.000Z',
  importedAt: '2026-01-01T00:00:00.000Z',
} as const satisfies Omit<Game, 'pgn' | 'userColor'>

type Fase = 'ocioso' | 'carregando' | 'analisando' | 'pronto' | 'cancelado' | 'erro'

const ROTULO_FASE: Record<Fase, string> = {
  ocioso: 'Nada rodou ainda',
  carregando: 'Subindo a engine (cerca de 7 MB de WASM)',
  analisando: 'Analisando a partida',
  pronto: 'Análise concluída',
  cancelado: 'Cancelada — nenhum resultado parcial foi mantido',
  erro: 'Erro',
}

const ROTULO_STATUS_ENGINE: Record<EngineStatus, string> = {
  ocioso: 'ociosa',
  carregando: 'carregando',
  pronto: 'pronta',
  erro: 'erro',
}

/** Uma linha da tabela de medição: quanto custou cada orçamento de nós. */
export interface OrcamentoMedido {
  /** Nós pedidos à engine nesta família de chamadas. */
  nodes: number
  chamadas: number
  msTotal: number
}

function numeroDoCampo(valor: string, minimo: number, padrao: number): number {
  const lido = Number.parseInt(valor, 10)
  if (Number.isNaN(lido) || lido < minimo) return padrao
  return lido
}

function arredondar(valor: number): number {
  return Math.round(valor)
}

/** `undefined` vira string vazia: atributo `data-*` não carrega `null`. */
function attr(valor: number | string | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor)
}

export interface PipelineDebugPanelProps {
  /**
   * Relógio, por parâmetro.
   *
   * O painel é um cronômetro — ele precisa de um relógio de verdade. Injetá-lo
   * é o que permite um teste medir sem depender do relógio da máquina, e é a
   * razão de `performance.now` não estar cravado no meio da função.
   */
  agora?: () => number
}

export function PipelineDebugPanel({ agora }: PipelineDebugPanelProps = {}) {
  const lerRelogio = useCallback(() => (agora ? agora() : performance.now()), [agora])
  const { analyze, stop, status: statusEngine, erro: erroEngine } = useEngine()

  const [pgn, setPgn] = useState(EXEMPLOS[0].pgn)
  const [userColor, setUserColor] = useState<'w' | 'b'>(EXEMPLOS[0].userColor)
  const [varreduraNodes, setVarreduraNodes] = useState(String(PIPELINE_CONFIG.varreduraNodes))
  const [aprofundamentoNodes, setAprofundamentoNodes] = useState(
    String(PIPELINE_CONFIG.aprofundamentoNodes),
  )

  const [fase, setFase] = useState<Fase>('ocioso')
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 })
  const [resultado, setResultado] = useState<GameAnalysis | null>(null)
  const [tempoCargaMs, setTempoCargaMs] = useState<number | null>(null)
  const [tempoMs, setTempoMs] = useState<number | null>(null)
  const [orcamentos, setOrcamentos] = useState<OrcamentoMedido[]>([])
  const [orcamentoUsado, setOrcamentoUsado] = useState<{
    varredura: number
    aprofundamento: number
  } | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  // Quem liga, desliga: uma análise em voo tem de morrer com o componente que a
  // iniciou, senão a engine continua queimando CPU depois de a tela sumir.
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const analisar = useCallback(async () => {
    const varredura = numeroDoCampo(
      varreduraNodes,
      PIPELINE_DEBUG_CONFIG.nodesMinimo,
      PIPELINE_CONFIG.varreduraNodes,
    )
    const aprofundamento = numeroDoCampo(
      aprofundamentoNodes,
      PIPELINE_DEBUG_CONFIG.nodesMinimo,
      PIPELINE_CONFIG.aprofundamentoNodes,
    )

    // Estado anterior sai da tela ANTES de a nova rodada começar: número velho
    // ao lado de uma barra de progresso nova é a receita para medir a coisa
    // errada e não perceber.
    setResultado(null)
    setOrcamentos([])
    setTempoMs(null)
    setTempoCargaMs(null)
    setErro(null)
    setProgresso({ feito: 0, total: 0 })
    setOrcamentoUsado({ varredura, aprofundamento })

    const controlador = new AbortController()
    abortRef.current = controlador

    // Aquecimento fora do cronômetro: ver PIPELINE_DEBUG_CONFIG.
    setFase('carregando')
    const inicioCarga = lerRelogio()
    const aquecimento = await analyze(FEN_INICIAL, {
      nodes: PIPELINE_DEBUG_CONFIG.nodesDoAquecimento,
    })
    setTempoCargaMs(arredondar(lerRelogio() - inicioCarga))
    if (!aquecimento) {
      // Sem engine não há o que medir. Reportar "0 momentos" aqui seria o pior
      // resultado possível: um verde que só significa que nada rodou.
      setFase('erro')
      setErro(erroEngine ?? 'A engine não subiu; nada foi analisado.')
      abortRef.current = null
      return
    }
    if (controlador.signal.aborted) {
      setFase('cancelado')
      abortRef.current = null
      return
    }

    const medicoes = new Map<number, { chamadas: number; msTotal: number }>()
    const analisarPosicao = async (
      fen: string,
      options: AnalysisOptions = {},
    ): Promise<EngineAnalysis | null> => {
      // O orçamento medido é o que o PIPELINE pediu, não o que o campo diz. É a
      // diferença entre provar que as duas passadas existem e apenas repetir na
      // tela o que foi digitado.
      const nodes = options.nodes ?? 0
      const inicio = lerRelogio()
      try {
        return await analyze(fen, options)
      } finally {
        const registro = medicoes.get(nodes) ?? { chamadas: 0, msTotal: 0 }
        registro.chamadas += 1
        registro.msTotal += lerRelogio() - inicio
        medicoes.set(nodes, registro)
      }
    }

    const partida: Game = { ...PARTIDA_BASE, pgn, userColor }

    setFase('analisando')
    const inicio = lerRelogio()
    try {
      const analise = await analyzeGame({
        game: partida,
        engine: adaptarEngine({ analyze: analisarPosicao, stop }),
        config: { varreduraNodes: varredura, aprofundamentoNodes: aprofundamento },
        onProgress: (feito, total) => setProgresso({ feito, total }),
        signal: controlador.signal,
      })
      setTempoMs(arredondar(lerRelogio() - inicio))
      setResultado(analise)
      setFase('pronto')
    } catch (e) {
      setTempoMs(arredondar(lerRelogio() - inicio))
      if (e instanceof AnalysisAbortedError) {
        // Cancelamento não deixa meia análise na tela: metade de uma revisão
        // parece uma revisão completa e mente sobre a partida.
        setResultado(null)
        setFase('cancelado')
        return
      }
      setErro(e instanceof Error ? e.message : 'Falha desconhecida ao analisar.')
      setFase('erro')
    } finally {
      setOrcamentos(
        [...medicoes.entries()]
          .map(([nodes, m]) => ({ nodes, chamadas: m.chamadas, msTotal: arredondar(m.msTotal) }))
          .sort((a, b) => a.nodes - b.nodes),
      )
      abortRef.current = null
    }
  }, [analyze, aprofundamentoNodes, erroEngine, lerRelogio, pgn, stop, userColor, varreduraNodes])

  const cancelar = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const resumo = resultado?.resumo ?? null
  const emCurso = fase === 'carregando' || fase === 'analisando'
  const pct = progresso.total > 0 ? Math.round((progresso.feito / progresso.total) * 100) : 0

  return (
    <section
      className={styles.painel}
      aria-labelledby="pipeline-debug-titulo"
      data-testid="pipeline-painel"
      data-fase={fase}
      data-engine-status={statusEngine}
      data-progresso-feito={attr(progresso.feito)}
      data-progresso-total={attr(progresso.total)}
      data-tempo-carga-ms={attr(tempoCargaMs)}
      data-tempo-ms={attr(tempoMs)}
      data-varredura-nodes={attr(orcamentoUsado?.varredura)}
      data-aprofundamento-nodes={attr(orcamentoUsado?.aprofundamento)}
      data-plies-usuario={attr(resumo?.pliesDoUsuario)}
      data-plies-analisados={attr(resumo?.pliesAnalisados)}
      data-plies-aprofundados={attr(resumo?.pliesAprofundados)}
      data-plies-falha={attr(resumo?.pliesComFalha)}
      data-aprofundamentos-falha={attr(resumo?.aprofundamentosComFalha)}
      data-unknown-rate={attr(resumo?.unknownRate)}
      data-momentos={attr(resultado?.momentos.length)}
      data-orcamentos={JSON.stringify(orcamentos)}
    >
      <h2 id="pipeline-debug-titulo" className={styles.titulo}>
        Bancada do pipeline
      </h2>
      <p className={styles.texto}>
        Roda <code>analyzeGame</code> contra o Stockfish real e cronometra as duas passadas. Os
        orçamentos de nós são editáveis porque eles ainda são um chute: esta tela existe para
        medi-los.
      </p>

      <fieldset className={styles.exemplos}>
        <legend className={styles.rotulo}>Exemplos</legend>
        {EXEMPLOS.map((exemplo) => (
          <button
            key={exemplo.id}
            type="button"
            className={styles.secundario}
            data-testid="pipeline-exemplo"
            data-exemplo-id={exemplo.id}
            data-proposito={exemplo.proposito}
            onClick={() => {
              setPgn(exemplo.pgn)
              setUserColor(exemplo.userColor)
            }}
          >
            {exemplo.rotulo}
          </button>
        ))}
      </fieldset>

      <div className={styles.campos}>
        <label className={styles.campo}>
          <span className={styles.rotulo}>PGN da partida</span>
          <textarea
            className={styles.area}
            rows={4}
            spellCheck={false}
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
          />
        </label>

        <label className={`${styles.campo} ${styles.campoCurto}`}>
          <span className={styles.rotulo}>Sua cor</span>
          <select
            className={styles.entrada}
            value={userColor}
            onChange={(e) => setUserColor(e.target.value === 'b' ? 'b' : 'w')}
          >
            <option value="w">Brancas</option>
            <option value="b">Pretas</option>
          </select>
        </label>

        <label className={`${styles.campo} ${styles.campoCurto}`}>
          <span className={styles.rotulo}>Nós da varredura</span>
          <input
            className={styles.entrada}
            type="number"
            min={PIPELINE_DEBUG_CONFIG.nodesMinimo}
            step={10_000}
            value={varreduraNodes}
            onChange={(e) => setVarreduraNodes(e.target.value)}
          />
        </label>

        <label className={`${styles.campo} ${styles.campoCurto}`}>
          <span className={styles.rotulo}>Nós do aprofundamento</span>
          <input
            className={styles.entrada}
            type="number"
            min={PIPELINE_DEBUG_CONFIG.nodesMinimo}
            step={100_000}
            value={aprofundamentoNodes}
            onChange={(e) => setAprofundamentoNodes(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.acoes}>
        <button
          type="button"
          className={styles.primario}
          onClick={() => void analisar()}
          disabled={emCurso}
        >
          Analisar partida
        </button>
        <button
          type="button"
          className={styles.secundario}
          onClick={cancelar}
          disabled={!emCurso}
          data-testid="pipeline-cancelar"
        >
          Cancelar
        </button>
      </div>

      <p className={styles.status} data-testid="pipeline-fase">
        <span className={styles.rotulo}>Estado</span> {ROTULO_FASE[fase]} · engine{' '}
        {ROTULO_STATUS_ENGINE[statusEngine]}
      </p>

      {emCurso ? (
        <div className={styles.progresso} data-testid="pipeline-progresso">
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
          <span className={styles.textoPequeno}>
            {progresso.feito} de {progresso.total} posições
          </span>
        </div>
      ) : null}

      {erro ? (
        <p className={styles.erro} role="alert" data-testid="pipeline-erro">
          {erro}
        </p>
      ) : null}

      <div className={styles.resultado} aria-live="polite">
        {resultado === null ? (
          <p className={styles.vazio} data-testid="pipeline-vazio">
            Nenhum resultado na tela.
          </p>
        ) : (
          <>
            <dl className={styles.resumo}>
              <Medida rotulo="Tempo da análise" testId="pipeline-tempo" valor={`${tempoMs} ms`} />
              <Medida
                rotulo="Tempo de carga da engine"
                testId="pipeline-tempo-carga"
                valor={`${tempoCargaMs} ms`}
              />
              <Medida
                rotulo="Lances do usuário"
                testId="pipeline-plies-usuario"
                valor={String(resumo?.pliesDoUsuario)}
              />
              <Medida
                rotulo="Posições analisadas"
                testId="pipeline-plies-analisados"
                valor={String(resumo?.pliesAnalisados)}
              />
              <Medida
                rotulo="Aprofundadas"
                testId="pipeline-plies-aprofundados"
                valor={String(resumo?.pliesAprofundados)}
              />
              <Medida
                rotulo="Falhas na varredura"
                testId="pipeline-plies-falha"
                valor={String(resumo?.pliesComFalha)}
              />
              <Medida
                rotulo="Falhas no aprofundamento"
                testId="pipeline-aprofundamentos-falha"
                valor={String(resumo?.aprofundamentosComFalha)}
              />
              <Medida
                rotulo="Momentos críticos"
                testId="pipeline-total-momentos"
                valor={String(resultado.momentos.length)}
              />
            </dl>

            <h3 className={styles.subtitulo}>Custo por orçamento</h3>
            <ul className={styles.linhas} data-testid="pipeline-orcamentos">
              {orcamentos.map((orcamento) => (
                <li
                  key={orcamento.nodes}
                  className={styles.linha}
                  data-testid="pipeline-orcamento"
                  data-nodes={orcamento.nodes}
                  data-chamadas={orcamento.chamadas}
                  data-ms={orcamento.msTotal}
                >
                  <span className={styles.mono}>{orcamento.nodes.toLocaleString('pt-BR')} nós</span>
                  <span className={styles.mono}>{orcamento.chamadas} chamadas</span>
                  <span className={styles.mono}>{orcamento.msTotal} ms</span>
                </li>
              ))}
            </ul>

            <h3 className={styles.subtitulo}>Momentos críticos</h3>
            {resultado.momentos.length === 0 ? (
              <p className={styles.vazio} data-testid="pipeline-sem-momentos">
                Nenhum momento crítico nesta partida. Partida limpa pode ter zero — completar cota
                seria inventar erro.
              </p>
            ) : (
              <ul className={styles.linhas}>
                {resultado.momentos.map((momento) => (
                  <li
                    key={momento.ply}
                    className={styles.linha}
                    data-testid="pipeline-momento"
                    data-ply={momento.ply}
                    data-severidade={momento.severity}
                    data-lance={momento.userMoveUci}
                    data-melhor={momento.bestMoveUci}
                    data-perda-pp={momento.expectedScoreLossPp}
                    data-explicacao={momento.explanation?.code ?? 'sem-explicacao'}
                  >
                    <span className={styles.mono}>#{momento.ply}</span>
                    <span className={styles.selo}>{SEVERITY_LABEL[momento.severity]}</span>
                    <span className={styles.mono}>
                      {momento.userMoveUci} → {momento.bestMoveUci}
                    </span>
                    <span className={styles.mono}>−{momento.expectedScoreLossPp} pp</span>
                    <span className={styles.textoPequeno}>
                      {momento.explanation?.oQueAconteceu ?? 'Sem explicação nomeada.'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function Medida({ rotulo, valor, testId }: { rotulo: string; valor: string; testId: string }) {
  return (
    <div className={styles.item}>
      <dt className={styles.rotulo}>{rotulo}</dt>
      <dd className={styles.valor} data-testid={testId}>
        {valor}
      </dd>
    </div>
  )
}
