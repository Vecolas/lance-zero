'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { FeedbackBanner } from '@/components/ui/FeedbackBanner'
import { STARTER_PUZZLES_CSV } from '@/content/puzzles/starter'
import {
  createAttemptState,
  giveUp,
  hintAt,
  MAX_HINT_LEVEL,
  nextHintLevel,
  parsePuzzleCsv,
  revelarRotulos,
  selectPuzzles,
  submitMove,
  toPuzzleAttempt,
  toSolvable,
  type AttemptState,
  type PuzzleCard,
} from '@/domain/puzzles'
import { createMastery, updateMastery } from '@/domain/skills/mastery'
import { getSkill } from '@/domain/skills/catalog'
import type { SkillMastery } from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import { positionStatus, type PromotionPiece, type SquareName } from '@/lib/chess'
import styles from './PuzzleTrainer.module.css'

/** O pool é constante: parseia uma vez por carga do módulo, não por render. */
const POOL = parsePuzzleCsv(STARTER_PUZZLES_CSV, { pularCabecalho: true }).puzzles

const TAMANHO_DA_SESSAO = 5

/**
 * O que aconteceu NESTA posição, em uma frase.
 *
 * DECISÃO QUE ESTE BLOCO CARREGA: a PALAVRA do estado ("Correto" / "Achamos
 * algo para treinar") não mora aqui — ela vem do catálogo, dentro do
 * `FeedbackBanner`. Aqui fica só o que a tela sabe e o catálogo não. Foi
 * exatamente a mistura das duas coisas que produziu três desenhos para o mesmo
 * estado (issue #61).
 *
 * O texto do estado incorreto não diz "errou" nem "falhou": diz o que vai
 * acontecer com o padrão. Erro aqui é informação, não veredito.
 */
const MENSAGEM_DO_DESFECHO = {
  resolvidoSemApoio: 'Você encontrou a linha que ganha sem dica e sem tentativa perdida.',
  resolvidoComApoio:
    'Você chegou à linha que ganha. Como precisou de apoio, este padrão volta em revisão para você reencontrá-lo sozinho.',
  naoResolvido:
    'A linha que ganha está logo abaixo. Esta posição vira revisão e volta no seu treino para você reencontrá-la sozinho.',
} as const

type Fase = 'carregando' | 'treinando' | 'sem-puzzles' | 'concluida' | 'erro'

export function PuzzleTrainer() {
  const { status, repo, profile, erro, refresh } = useRepository()
  const [cards, setCards] = useState<PuzzleCard[]>([])
  const [indice, setIndice] = useState(0)
  const [tentativa, setTentativa] = useState<AttemptState | null>(null)
  const [nivelDeDica, setNivelDeDica] = useState(0)
  const [fase, setFase] = useState<Fase>('carregando')
  const [falha, setFalha] = useState<string | null>(null)
  const [inicio, setInicio] = useState(() => Date.now())
  const [resolvidos, setResolvidos] = useState(0)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (!repo || !profile) return
    let cancelado = false

    async function montar() {
      if (!repo || !profile) return
      try {
        const anteriores = await repo.listPuzzleAttempts(500)
        const vistos = anteriores.filter((a) => a.solved).map((a) => a.puzzleId)
        const escolhidos = selectPuzzles(
          POOL,
          {
            quantidade: TAMANHO_DA_SESSAO,
            ratingAlvo: profile.estimatedRating,
            excluirIds: vistos,
            modo: 'misto',
          },
          new Date().toISOString().slice(0, 10),
        )
        if (cancelado) return
        setCards(escolhidos)
        setIndice(0)
        setTentativa(
          escolhidos.length > 0 ? createAttemptState(toSolvable(escolhidos[0].puzzle)) : null,
        )
        setFase(escolhidos.length > 0 ? 'treinando' : 'sem-puzzles')
        setInicio(Date.now())
      } catch (e) {
        if (!cancelado) {
          setFalha(e instanceof Error ? e.message : 'Não consegui montar a sessão.')
          setFase('erro')
        }
      }
    }

    void montar()
    return () => {
      cancelado = true
    }
  }, [repo, profile])

  const card = cards[indice] ?? null
  const encerrada = tentativa !== null && tentativa.status !== 'em-andamento'

  const salvar = useCallback(
    async (estado: AttemptState) => {
      if (!repo || salvo) return
      setSalvo(true)
      const agora = new Date()
      try {
        const registro = toPuzzleAttempt(estado, { agora, thinkTimeMs: Date.now() - inicio })
        await repo.savePuzzleAttempt(registro)

        const atual = await repo.getSkillMastery()
        const porId = new Map<string, SkillMastery>(atual.map((m) => [m.skillId, m]))
        for (const skillId of registro.skillIds) {
          const base = porId.get(skillId) ?? createMastery(skillId)
          porId.set(
            skillId,
            updateMastery(base, {
              tipo: 'puzzle',
              acertou: registro.solved,
              usouDica: registro.hintsUsed > 0,
              primeiraTentativa: registro.firstTry,
              thinkTimeMs: registro.thinkTimeMs,
              ocorridoEm: agora.toISOString(),
            }),
          )
        }
        await repo.saveSkillMastery([...porId.values()])

        // O princípio do produto: erro vira treino futuro. Só quem errou ou
        // precisou de dica gera card — acertar de primeira não vira dever de casa.
        if (!registro.solved || registro.hintsUsed > 0) {
          await repo.saveReviewCard(
            createReviewCard(
              {
                id: `puzzle:${estado.solvable.puzzle.id}`,
                kind: 'posicao-exata',
                skillIds: estado.solvable.puzzle.skillIds,
                fen: estado.solvable.startFen,
                solutionUci: [...estado.solvable.solutionUci],
                prompt:
                  estado.solvable.playerColor === 'w'
                    ? 'Brancas jogam. Você errou este padrão antes.'
                    : 'Pretas jogam. Você errou este padrão antes.',
              },
              agora,
            ),
          )
        }
      } catch (e) {
        setFalha(e instanceof Error ? e.message : 'Não consegui salvar sua tentativa.')
      }
    },
    [inicio, repo, salvo],
  )

  /**
   * Aplica um novo estado da tentativa e, quando ela termina, grava.
   * Fica aqui e não em efeito: o fim da tentativa é um evento do usuário, não
   * uma sincronização com sistema externo.
   */
  const aplicar = useCallback(
    (novo: AttemptState) => {
      setTentativa(novo)
      if (novo.status !== 'em-andamento') {
        if (novo.status === 'resolvido') setResolvidos((r) => r + 1)
        void salvar(novo)
      }
    },
    [salvar],
  )

  const proximo = useCallback(() => {
    const alvo = indice + 1
    setSalvo(false)
    setNivelDeDica(0)
    setInicio(Date.now())
    if (alvo >= cards.length) {
      setTentativa(null)
      setFase('concluida')
      refresh()
      return
    }
    setIndice(alvo)
    setTentativa(createAttemptState(toSolvable(cards[alvo].puzzle)))
  }, [cards, indice, refresh])

  const jogar = useCallback(
    (from: SquareName, to: SquareName, promotion?: PromotionPiece) => {
      if (!tentativa || tentativa.status !== 'em-andamento') return false
      const comSufixo = submitMove(tentativa, `${from}${to}${promotion ?? ''}`)
      // A solução do dataset pode não trazer sufixo de promoção.
      const resultado =
        !comSufixo.correto && promotion ? submitMove(tentativa, `${from}${to}`) : comSufixo
      aplicar(resultado.state)
      return resultado.correto
    },
    [aplicar, tentativa],
  )

  const dica = useMemo(() => {
    if (!tentativa || nivelDeDica === 0) return null
    const nivel = Math.min(nivelDeDica, MAX_HINT_LEVEL) as 1 | 2 | 3
    return hintAt(tentativa.solvable, nivel)
  }, [nivelDeDica, tentativa])

  if (status === 'carregando' || fase === 'carregando') {
    return <p className={styles.state}>Montando a sessão…</p>
  }

  if (status === 'erro' || fase === 'erro') {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {falha ?? erro}
      </p>
    )
  }

  if (fase === 'sem-puzzles') {
    return (
      <p className={styles.state}>
        Você já resolveu todos os puzzles do conjunto inicial. O banco completo do Lichess entra
        pelo pipeline de ingestão — até lá, este conjunto é pequeno de propósito.
      </p>
    )
  }

  if (fase === 'concluida' || !tentativa || !card) {
    return (
      <div className={styles.state}>
        <p>
          Sessão encerrada: {resolvidos} de {cards.length} resolvidos.
        </p>
        <p>
          O que você errou virou card de revisão e volta em <strong>/train</strong> na hora certa.
        </p>
      </div>
    )
  }

  const posicao = positionStatus(tentativa.currentFen)
  const revelado = encerrada ? revelarRotulos(card) : card
  const proximaDica = nextHintLevel(tentativa)
  // Derivado do que o aluno de fato fez nesta tela, lido na hora. Não é um
  // segundo registro do apoio: é a leitura do estado que já existe.
  const semApoio = tentativa.wrongMoves.length === 0 && nivelDeDica === 0

  return (
    <div className={styles.layout}>
      <ChessBoardView
        fen={tentativa.currentFen}
        orientation={tentativa.solvable.playerColor}
        theme={profile?.preferences.boardTheme ?? 'claro'}
        interactive={tentativa.status === 'em-andamento'}
        onMove={jogar}
      />

      <div className={styles.panel}>
        <p className={styles.counter}>
          Puzzle {indice + 1} de {cards.length}
        </p>
        <p className={styles.prompt}>
          {tentativa.solvable.playerColor === 'w' ? 'Brancas jogam.' : 'Pretas jogam.'}{' '}
          {posicao.turn === tentativa.solvable.playerColor ? 'Encontre o melhor lance.' : ''}
        </p>

        {tentativa.status === 'em-andamento' ? (
          <>
            <p className={styles.think}>
              Pense primeiro. Nenhuma avaliação de engine e nenhum tema aparecem antes da sua
              resposta — é isso que faz o exercício valer.
            </p>
            {dica ? <p className={styles.hint}>{dica.text}</p> : null}
            {tentativa.wrongMoves.length > 0 ? (
              /* Contagem durante a tentativa, não veredito: por isso texto
                 corrido e sem cor própria. Dar a ela um selo colorido foi o que
                 fez a segunda tabela de status parecer legítima. */
              <p className={styles.tentativas}>
                {tentativa.wrongMoves.length} tentativa
                {tentativa.wrongMoves.length > 1 ? 's' : ''} errada
                {tentativa.wrongMoves.length > 1 ? 's' : ''} até agora.
              </p>
            ) : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.ghost}
                disabled={proximaDica === null}
                onClick={() => setNivelDeDica((n) => Math.min(n + 1, MAX_HINT_LEVEL))}
              >
                {nivelDeDica === 0 ? 'Dica' : `Mais uma dica (${nivelDeDica}/${MAX_HINT_LEVEL})`}
              </button>
              <button
                type="button"
                className={styles.ghost}
                onClick={() => aplicar(giveUp(tentativa))}
              >
                Desistir
              </button>
            </div>
          </>
        ) : null}

        {tentativa.status === 'resolvido' ? (
          <FeedbackBanner
            tone="correto"
            mensagem={
              semApoio
                ? MENSAGEM_DO_DESFECHO.resolvidoSemApoio
                : MENSAGEM_DO_DESFECHO.resolvidoComApoio
            }
          />
        ) : null}

        {tentativa.status === 'falhou' ? (
          <FeedbackBanner tone="incorreto" mensagem={MENSAGEM_DO_DESFECHO.naoResolvido} />
        ) : null}

        {encerrada ? (
          <div className={styles.explain}>
            <p className={styles.explainTitle}>O que era</p>
            <div className={styles.motif}>
              {(revelado.rotulos ?? []).map((rotulo) => (
                <span key={rotulo} className={styles.tag}>
                  {rotulo}
                </span>
              ))}
              {tentativa.solvable.puzzle.skillIds.map((id) => (
                <span key={id} className={styles.tag}>
                  {getSkill(id).label}
                </span>
              ))}
            </div>
            <p className={styles.line}>Solução: {tentativa.solvable.solutionUci.join(' ')}</p>
            {tentativa.wrongMoves.length > 0 ? (
              <p className={styles.think}>
                Você tentou {tentativa.wrongMoves.join(', ')}. Esse lance não faz parte da linha que
                ganha — e o padrão volta como revisão para você reencontrá-lo sozinho.
              </p>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={proximo}>
                {indice + 1 >= cards.length ? 'Encerrar sessão' : 'Próximo puzzle'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
