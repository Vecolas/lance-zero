'use client'

/**
 * Treinador de uma posição de final.
 *
 * O que esta tela decide, e que não estava decidido em lugar nenhum antes:
 *
 * 1. QUEM JULGA. A cada lance do aluno (e a cada resposta do adversário) a tela
 *    chama `avaliarObjetivo` e reage aos TRÊS estados. Nenhum julgamento é
 *    escrito aqui: um segundo juiz na interface divergiria do domínio, e o que
 *    o aluno veria seria o errado.
 *
 * 2. A ORIENTAÇÃO DESVANECE (PEDAGOGY.md). Dica só aparece quando o aluno pede,
 *    uma de cada vez, na ordem escrita no currículo. A LINHA MODELO só aparece
 *    depois de cumprir, falhar ou desistir — antes disso ela é a resposta, e
 *    mostrá-la destruiria a recuperação ativa que faz o exercício valer.
 *
 * 3. O ADVERSÁRIO TEM PROCEDÊNCIA VISÍVEL. Ver `resposta-do-adversario.ts`. A
 *    tela nunca chama de defesa perfeita o que não veio da tablebase.
 *
 * 4. ENTRADA POR TEXTO ALÉM DO ARRASTO. O campo de lance em UCI não é atalho de
 *    teste: é a alternativa acessível ao tabuleiro (teclado, leitor de tela),
 *    exigida pelo CLAUDE.md. Os dois caminhos entram pela MESMA função, para
 *    não existir um lance que só um deles aceita.
 *
 * 5. GRAVA UMA VEZ POR TENTATIVA, e o guarda disso é `gravada`, não o fluxo.
 *    A tentativa termina por três caminhos (lance do aluno, resposta do
 *    adversário, desistência) e a tela re-renderiza várias vezes depois; um
 *    `useEffect` sem trava gravaria de novo a cada render e o modelo de maestria
 *    inflaria em SILÊNCIO — nenhuma tela, log ou erro apontaria a causa. A trava
 *    é uma `ref` casada com a GERAÇÃO da tentativa: recomeçar a posição vira uma
 *    geração nova e pode gravar de novo, porque aí é outra tentativa de verdade.
 *
 * 6. GRAVAR PODE FALHAR, E ISSO SE DIZ. IndexedDB some em aba anônima e com
 *    permissão negada. Quando some, o aluno termina a posição do mesmo jeito e
 *    lê que nada foi gravado. Tela que engole a falha promete um histórico que
 *    não existe.
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import {
  avaliarObjetivo,
  type LicaoDeFinal,
  type PosicaoDeFinal,
  type ResultadoObjetivo,
} from '@/domain/endgames'
import { gravarTentativaDeFinal } from '@/domain/endgames/persistencia'
import { normalizeUci, parseUci } from '@/domain/puzzles/parser'
import { applyMove, positionStatus, type PromotionPiece, type SquareName } from '@/lib/chess'
import { LichessTablebaseProvider } from '@/lib/tablebase'
import { descreverLinhaModelo } from './linha-modelo-legivel'
import {
  escolherRespostaDoAdversario,
  type FonteDaResposta,
  type RespostaDoAdversario,
} from './resposta-do-adversario'
import {
  APRESENTACAO_DA_GRAVACAO,
  APRESENTACAO_POR_ESTADO,
  APRESENTACAO_POR_FONTE,
  descreverObjetivo,
  FRASE_POR_MOTIVO,
  ressalvaDaDefesa,
  type EstadoDaGravacao,
} from './textos'
import styles from './EndgameTrainer.module.css'

interface Tentativa {
  fen: string
  /** UCIs desde o FEN inicial, dos dois lados. É o que o roteiro compara. */
  lancesJogados: string[]
  lancesDoAluno: number
  /** Procedência de cada resposta do adversário, na ordem em que vieram. */
  fontes: FonteDaResposta[]
  resultado: ResultadoObjetivo
  ultimoLance: SquareName[]
  ultimaResposta: RespostaDoAdversario | null
  desistiu: boolean
}

type Fase = 'jogando' | 'adversario' | 'encerrada'

function tentativaInicial(posicao: PosicaoDeFinal): Tentativa {
  return {
    fen: posicao.fen,
    lancesJogados: [],
    lancesDoAluno: 0,
    fontes: [],
    resultado: avaliarObjetivo(posicao.fen, posicao.objetivo, {
      ladoDoAluno: posicao.ladoDoAluno,
      lancesDoAluno: 0,
    }),
    ultimoLance: [],
    ultimaResposta: null,
    desistiu: false,
  }
}

export interface EndgameTrainerProps {
  licao: LicaoDeFinal
  posicao: PosicaoDeFinal
  onVoltar: () => void
}

export function EndgameTrainer({ licao, posicao, onVoltar }: EndgameTrainerProps) {
  const { profile, repo, refresh, status: statusDoArmazenamento } = useRepository()
  const [tentativa, setTentativa] = useState<Tentativa>(() => tentativaInicial(posicao))
  const [fase, setFase] = useState<Fase>('jogando')
  const [dicasReveladas, setDicasReveladas] = useState(0)
  const [erroDeLance, setErroDeLance] = useState<string | null>(null)
  const [falhaDoSistema, setFalhaDoSistema] = useState<string | null>(null)
  const [lanceDigitado, setLanceDigitado] = useState('')
  const [recomecos, setRecomecos] = useState(0)
  const [inicio, setInicio] = useState(() => Date.now())
  const [gravacao, setGravacao] = useState<EstadoDaGravacao | null>(null)
  const [detalheDaFalha, setDetalheDaFalha] = useState<string | null>(null)

  /**
   * Marca a geração da tentativa. Resposta do adversário que chega depois de um
   * recomeço (ou da saída da tela) é descartada: sem isso, uma consulta lenta
   * aplicaria um lance numa posição que não existe mais.
   *
   * A geração é também a IDENTIDADE da tentativa para a gravação: é ela que
   * separa "a tela renderizou de novo" de "o aluno tentou de novo".
   */
  const geracao = useRef(0)
  useEffect(() => {
    return () => {
      geracao.current += 1
    }
  }, [])

  /** Geração já gravada. Ver decisão 5 do cabeçalho. */
  const gravada = useRef<number | null>(null)

  // Um provider por instância da tela: cache de tablebase por sessão de estudo,
  // e nenhum estado global disfarçado de constante de módulo.
  const provider = useMemo(
    () => new LichessTablebaseProvider({ fetchFn: fetch.bind(globalThis) }),
    [],
  )

  const recomecar = useCallback(() => {
    geracao.current += 1
    setTentativa(tentativaInicial(posicao))
    setFase('jogando')
    setDicasReveladas(0)
    setErroDeLance(null)
    setFalhaDoSistema(null)
    setLanceDigitado('')
    setRecomecos((n) => n + 1)
    setInicio(Date.now())
    setGravacao(null)
    setDetalheDaFalha(null)
  }, [posicao])

  const responder = useCallback(
    async (estado: Tentativa) => {
      const minhaGeracao = geracao.current
      const resposta = await escolherRespostaDoAdversario({
        fen: estado.fen,
        linhaModelo: posicao.linhaModelo,
        lancesJogados: estado.lancesJogados,
        probe: (fen) => provider.probe(fen),
      })
      if (minhaGeracao !== geracao.current) {
        return
      }
      const entrada = resposta === null ? null : parseUci(resposta.uci)
      const aplicado = entrada === null ? null : applyMove(estado.fen, entrada)
      if (resposta === null || aplicado === null) {
        // Só chega aqui se a posição não tem lance legal — e nesse caso
        // `avaliarObjetivo` já teria encerrado. Dizer em voz alta é melhor que
        // deixar o tabuleiro parado sem explicação.
        setFalhaDoSistema('O adversário não tem resposta legal nesta posição. Recomece a posição.')
        setFase('encerrada')
        return
      }
      const resultado = avaliarObjetivo(aplicado.fenAfter, posicao.objetivo, {
        ladoDoAluno: posicao.ladoDoAluno,
        lancesDoAluno: estado.lancesDoAluno,
      })
      setTentativa({
        ...estado,
        fen: aplicado.fenAfter,
        lancesJogados: [...estado.lancesJogados, aplicado.move.uci],
        fontes: [...estado.fontes, resposta.fonte],
        resultado,
        ultimoLance: [aplicado.move.from, aplicado.move.to],
        ultimaResposta: resposta,
      })
      setFase(resultado.estado === 'em-andamento' ? 'jogando' : 'encerrada')
    },
    [posicao, provider],
  )

  const jogar = useCallback(
    (uciBruto: string): boolean => {
      if (fase !== 'jogando') {
        return false
      }
      const uci = normalizeUci(uciBruto)
      const entrada = parseUci(uci)
      if (entrada === null) {
        setErroDeLance('Escreva o lance como casa de origem e casa de destino, por exemplo b1b8.')
        return false
      }
      const aplicado = applyMove(tentativa.fen, entrada)
      if (aplicado === null) {
        setErroDeLance(`${uci} não é um lance legal nesta posição.`)
        return false
      }
      setErroDeLance(null)
      const lancesDoAluno = tentativa.lancesDoAluno + 1
      const resultado = avaliarObjetivo(aplicado.fenAfter, posicao.objetivo, {
        ladoDoAluno: posicao.ladoDoAluno,
        lancesDoAluno,
      })
      const proxima: Tentativa = {
        ...tentativa,
        fen: aplicado.fenAfter,
        lancesJogados: [...tentativa.lancesJogados, aplicado.move.uci],
        lancesDoAluno,
        resultado,
        ultimoLance: [aplicado.move.from, aplicado.move.to],
        ultimaResposta: null,
      }
      setTentativa(proxima)
      if (resultado.estado !== 'em-andamento') {
        setFase('encerrada')
        return true
      }
      setFase('adversario')
      void responder(proxima)
      return true
    },
    [fase, posicao, responder, tentativa],
  )

  /**
   * O tabuleiro sempre manda `q` como promoção. Testar a legalidade com o
   * sufixo antes de repassar evita que um lance comum de rei chegue ao adapter
   * como promoção e seja recusado por um motivo que não é o do aluno.
   */
  const jogarDoTabuleiro = useCallback(
    (from: SquareName, to: SquareName, promotion?: PromotionPiece): boolean => {
      const aceitaSufixo = applyMove(tentativa.fen, { from, to, promotion }) !== null
      return jogar(aceitaSufixo ? `${from}${to}${promotion ?? ''}` : `${from}${to}`)
    },
    [jogar, tentativa.fen],
  )

  const desistir = useCallback(() => {
    setTentativa((atual) => ({ ...atual, desistiu: true }))
    setFase('encerrada')
  }, [])

  const linha = useMemo(() => descreverLinhaModelo(posicao), [posicao])
  const encerrada = fase === 'encerrada'
  const estadoVisivel = tentativa.desistiu ? 'falhou' : tentativa.resultado.estado
  const apresentacao = APRESENTACAO_POR_ESTADO[estadoVisivel]
  const ressalva = encerrada ? ressalvaDaDefesa(tentativa.fontes) : null
  const status = positionStatus(tentativa.fen)
  const fonteAtual = tentativa.ultimaResposta?.fonte ?? null
  const totalDeDicas = posicao.dicas.length
  const lancesDoAluno = tentativa.lancesDoAluno

  /**
   * Grava a tentativa encerrada — uma vez por geração.
   *
   * Está num efeito, e não nos três lugares que encerram a tentativa, porque
   * senão existiriam três gravações para manter em sincronia e a quarta forma de
   * encerrar (a que alguém escrever amanhã) nasceria sem gravação nenhuma.
   *
   * `falhaDoSistema` NÃO grava: quando o adversário fica sem resposta legal, a
   * tentativa acabou por defeito nosso. Registrá-la como não cumprida baixaria a
   * maestria do aluno por um bug do app.
   *
   * O veredito gravado é `estadoVisivel`, o MESMO que a tela mostra. Recalcular
   * "cumpriu" aqui abriria a porta para a tela dizer uma coisa e o histórico
   * guardar outra.
   */
  useEffect(() => {
    if (!encerrada || falhaDoSistema !== null) {
      return
    }
    /**
     * Sem repositório ainda NÃO é falha: o provider pode estar abrindo o banco.
     * A geração não é consumida aqui de propósito — assim a gravação acontece
     * quando o repositório chegar. Quando ele não chega, quem avisa o aluno é
     * `gravacaoVisivel`, derivado do estado do provider e não de um estado
     * paralelo que alguém teria de lembrar de atualizar.
     */
    if (!repo) {
      return
    }
    if (gravada.current === geracao.current) {
      return
    }
    gravada.current = geracao.current

    const concluida = {
      cumpriu: estadoVisivel === 'cumprido',
      dicasUsadas: dicasReveladas,
      recomecos,
      lancesDoAluno,
      thinkTimeMs: Date.now() - inicio,
    }

    void (async () => {
      // O "gravando" pertence à escrita, não ao render: por isso ele entra aqui
      // dentro, junto do que ele descreve.
      setGravacao('gravando')
      try {
        const feito = await gravarTentativaDeFinal(
          repo,
          { licao, posicao, tentativa: concluida },
          { agora: new Date() },
        )
        setGravacao(feito.cardCriado || feito.cardAtualizado ? 'na-revisao' : 'gravada')
        // A lista de lições relê o histórico; sem isto ela ficaria no estado anterior.
        refresh()
      } catch (e) {
        setGravacao('falhou')
        setDetalheDaFalha(e instanceof Error ? e.message : null)
      }
    })()
  }, [
    dicasReveladas,
    encerrada,
    estadoVisivel,
    falhaDoSistema,
    inicio,
    lancesDoAluno,
    licao,
    posicao,
    recomecos,
    refresh,
    repo,
  ])

  /**
   * O que a tela diz sobre a gravação.
   *
   * "Nada foi gravado" é DERIVADO do provider ter desistido de abrir o banco —
   * não é um estado guardado aqui. Guardá-lo criaria a segunda fonte da mesma
   * verdade, e a cópia ficaria dizendo "gravado" no dia em que o armazenamento
   * caísse depois.
   */
  const gravacaoVisivel = (() => {
    if (!encerrada || falhaDoSistema !== null) {
      return null
    }
    if (repo === null) {
      // Enquanto o provider ainda tenta abrir o banco não há o que afirmar.
      return statusDoArmazenamento === 'erro' ? APRESENTACAO_DA_GRAVACAO['sem-armazenamento'] : null
    }
    return gravacao === null ? null : APRESENTACAO_DA_GRAVACAO[gravacao]
  })()

  return (
    <div className={styles.layout}>
      <div className={styles.boardSide}>
        <ChessBoardView
          fen={tentativa.fen}
          orientation={posicao.ladoDoAluno}
          theme={profile?.preferences.boardTheme ?? 'claro'}
          lastMove={tentativa.ultimoLance}
          interactive={fase === 'jogando'}
          onMove={jogarDoTabuleiro}
        />

        <form
          className={styles.entrada}
          onSubmit={(evento) => {
            evento.preventDefault()
            if (jogar(lanceDigitado)) {
              setLanceDigitado('')
            }
          }}
        >
          <label className={styles.label} htmlFor="lance-uci">
            Lance em UCI, alternativa ao arraste (ex.: b1b8)
          </label>
          <div className={styles.entradaLinha}>
            <input
              id="lance-uci"
              className={styles.input}
              value={lanceDigitado}
              onChange={(evento) => setLanceDigitado(evento.target.value)}
              disabled={fase !== 'jogando'}
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
            />
            <button type="submit" className={styles.ghost} disabled={fase !== 'jogando'}>
              Jogar lance
            </button>
          </div>
          {erroDeLance ? (
            <p className={`${styles.aviso} ${styles.ruim}`} role="status">
              <span aria-hidden="true">✕</span> {erroDeLance}
            </p>
          ) : null}
        </form>
      </div>

      <div className={styles.panel}>
        <button type="button" className={styles.voltar} onClick={onVoltar}>
          ← Voltar às lições
        </button>

        <p className={styles.eyebrow}>{licao.titulo}</p>
        <h2 className={styles.titulo}>{posicao.enunciado}</h2>
        <p className={styles.meta}>
          Você joga de {posicao.ladoDoAluno === 'w' ? 'brancas' : 'pretas'}.{' '}
          {descreverObjetivo(posicao.objetivo)}
        </p>
        <p className={styles.meta}>
          Lances seus até aqui: {tentativa.lancesDoAluno}.{' '}
          {fase === 'adversario'
            ? 'O adversário está escolhendo a resposta…'
            : status.turn === posicao.ladoDoAluno && !encerrada
              ? 'É a sua vez.'
              : ''}
        </p>

        <p className={`${styles.chip} ${styles[apresentacao.tom]}`} role="status">
          <span aria-hidden="true">{apresentacao.icone}</span> {apresentacao.rotulo} —{' '}
          {tentativa.desistiu
            ? 'Você desistiu desta posição.'
            : FRASE_POR_MOTIVO[tentativa.resultado.motivo]}
        </p>

        {fonteAtual !== null ? (
          <div className={`${styles.fonte} ${styles[APRESENTACAO_POR_FONTE[fonteAtual].tom]}`}>
            <p className={styles.fonteTitulo}>
              <span aria-hidden="true">{APRESENTACAO_POR_FONTE[fonteAtual].icone}</span>{' '}
              {APRESENTACAO_POR_FONTE[fonteAtual].rotulo}
            </p>
            <p className={styles.fonteTexto}>{APRESENTACAO_POR_FONTE[fonteAtual].explicacao}</p>
          </div>
        ) : null}

        {falhaDoSistema ? (
          <p className={`${styles.aviso} ${styles.ruim}`} role="status">
            <span aria-hidden="true">✕</span> {falhaDoSistema}
          </p>
        ) : null}

        {!encerrada ? (
          <section className={styles.bloco} aria-labelledby="dicas-titulo">
            <h3 id="dicas-titulo" className={styles.blocoTitulo}>
              Dicas
            </h3>
            {totalDeDicas === 0 ? (
              <p className={styles.meta}>Esta posição não tem dica escrita.</p>
            ) : (
              <>
                {dicasReveladas === 0 ? (
                  <p className={styles.meta}>
                    Tente primeiro. A dica fica disponível, mas ela não aparece sozinha.
                  </p>
                ) : (
                  <ol className={styles.dicas}>
                    {posicao.dicas.slice(0, dicasReveladas).map((dica) => (
                      <li key={dica}>{dica}</li>
                    ))}
                  </ol>
                )}
                <button
                  type="button"
                  className={styles.ghost}
                  disabled={dicasReveladas >= totalDeDicas}
                  onClick={() => setDicasReveladas((n) => Math.min(n + 1, totalDeDicas))}
                >
                  {dicasReveladas === 0
                    ? 'Dica'
                    : `Mais uma dica (${dicasReveladas}/${totalDeDicas})`}
                </button>
              </>
            )}
          </section>
        ) : null}

        <div className={styles.acoes}>
          {!encerrada ? (
            <button type="button" className={styles.ghost} onClick={desistir}>
              Desistir e ver a linha modelo
            </button>
          ) : null}
          <button type="button" className={styles.primary} onClick={recomecar}>
            Recomeçar a posição
          </button>
        </div>

        {/* `role="status"` porque o resultado da gravação chega DEPOIS da ação:
            sem região viva, quem usa leitor de tela nunca saberia se gravou. */}
        {encerrada && gravacaoVisivel !== null ? (
          <div className={`${styles.fonte} ${styles[gravacaoVisivel.tom]}`} role="status">
            <p className={styles.fonteTitulo}>
              <span aria-hidden="true">{gravacaoVisivel.icone}</span> {gravacaoVisivel.rotulo}
            </p>
            <p className={styles.fonteTexto}>
              {gravacaoVisivel.explicacao}
              {detalheDaFalha === null ? null : ` (${detalheDaFalha})`}
            </p>
            {gravacao === 'na-revisao' ? (
              <p className={styles.fonteTexto}>
                <Link href="/train">Ver no treino de hoje</Link>
              </p>
            ) : null}
          </div>
        ) : null}

        {encerrada ? (
          <section className={styles.bloco} aria-labelledby="linha-titulo">
            <h3 id="linha-titulo" className={styles.blocoTitulo}>
              Linha modelo
            </h3>
            {ressalva ? (
              <p className={`${styles.aviso} ${styles.neutro}`}>
                <span aria-hidden="true">!</span> {ressalva}
              </p>
            ) : null}
            {linha.erro ? (
              <p className={`${styles.aviso} ${styles.ruim}`} role="status">
                <span aria-hidden="true">✕</span> Esta linha modelo está quebrada: {linha.erro}
              </p>
            ) : null}
            <ol className={styles.linha}>
              {linha.lances.map((lance) => (
                <li key={lance.ordem}>
                  <span className={styles.quem}>{lance.doAluno ? 'Você' : 'Adversário'}</span>
                  <span className={styles.san}>{lance.san}</span>
                  <span className={styles.uci}>{lance.uci}</span>
                </li>
              ))}
            </ol>
            <p className={styles.meta}>
              A linha modelo é um exemplo resolvido, não a única forma de cumprir o objetivo.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  )
}
