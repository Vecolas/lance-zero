'use client'

/**
 * A fila de revisão espaçada.
 *
 * DECISÃO QUE ESTA TELA CARREGA (segunda metade da issue #62): CARD DE FINAL
 * NÃO EXIGE MAIS O LANCE EXATO. Num final vários lances ganham; comparar
 * `solutionUci` letra a letra marcava como errado o aluno que jogasse outro
 * deles, e isso baixava a maestria e reagendava o card — treinando a decorar um
 * lance em vez de entender a técnica.
 *
 * Quem julga é `julgarLanceDeFinal`, o mesmo juiz da tela de finais, e a
 * política de quatro vereditos mora em `vereditoDaRevisao`. Aqui não se decide
 * nada disso: a tela consulta a tablebase, pergunta e mostra.
 *
 * SÓ CARD DE FINAL MUDA. Para `posicao-exata`, `erro-de-partida`, `conceito` e
 * `repertorio` não existe juiz — a tablebase não julga uma posição de meio-jogo
 * — e o caminho continua sendo o de sempre. Inventar um julgamento para eles
 * seria afirmar sem juiz, que é o que esta issue existe para acabar.
 *
 * DEGRADAÇÃO, E ELA É VISÍVEL. Sem tablebase a fila volta à comparação exata: o
 * lance do card é aceito sem consultar ninguém. Qualquer outro lance vira
 * `nao-confirmado` — NÃO é erro — e a tela diz, com todas as letras, que está
 * em MODO ESTRITO e que não deu para conferir. Reprovar em silêncio um lance
 * que talvez estivesse certo é o defeito que a issue existe para acabar; o
 * conserto não pode ser trocá-lo por aprovar em silêncio.
 *
 * A SESSÃO SÓ ANDA PELO DOMÍNIO. `submitReviewMove` continua sendo o único
 * lugar que muda a posição, e ele só aceita o lance do card. Por isso um lance
 * alternativo aceito NÃO avança o tabuleiro: a tentativa se encerra na posição
 * em que o aluno jogou, que é exatamente o que a tela já fazia no erro. A
 * alternativa seria a tela aplicar o lance por fora — um segundo dono do estado
 * da sessão, livre para divergir do primeiro.
 *
 * A SONDA ENTRA POR PARÂMETRO, com o provider real como padrão. Mesmo desenho
 * de `EndgameTrainer`: o teste roda sem rede nenhuma e a produção não precisa
 * escolher nada.
 */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import type { Sonda } from '@/components/endgames/resposta-do-adversario'
import {
  APRESENTACAO_POR_GRAU,
  descreverJulgamento,
  type TomDoEstado,
} from '@/components/endgames/textos'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { FeedbackBanner } from '@/components/ui/FeedbackBanner'
import { julgarLanceDeFinal, type JulgamentoDoLance } from '@/domain/endgames'
import {
  EFEITO_DO_VEREDITO,
  vereditoDaRevisao,
  type VereditoDaRevisao,
} from '@/domain/endgames/persistencia'
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
import { applyMove, positionStatus, type PromotionPiece, type SquareName } from '@/lib/chess'
import { applyReview } from '@/lib/fsrs/cards'
import { LichessTablebaseProvider } from '@/lib/tablebase'
import styles from './ReviewSession.module.css'

type Fase = 'carregando' | 'revisando' | 'concluida' | 'erro'

/**
 * O que a tela sabe sobre o lance jogado agora.
 *
 * `sem-juiz` é o estado dos cards que não são de final, e também o de quem
 * ainda não jogou: nos dois casos não há veredito, e a tela não afirma nada.
 */
type EstadoDoJulgamento =
  | { situacao: 'sem-juiz' }
  | { situacao: 'consultando' }
  | {
      situacao: 'julgado'
      uci: string
      veredito: VereditoDaRevisao
      /** `null` quando a tablebase não foi consultada — ver a degradação. */
      julgamento: JulgamentoDoLance | null
    }

const SEM_JUIZ: EstadoDoJulgamento = { situacao: 'sem-juiz' }

/**
 * O que aconteceu NESTA revisão, em uma frase.
 *
 * Mesma divisão de trabalho da tela de puzzles: a palavra do estado vem do
 * catálogo, dentro do `FeedbackBanner`; aqui fica só o fato da posição. Antes
 * da issue #61 esta tela tinha o seu próprio selo "✓ Correto" com as suas
 * próprias classes de cor — uma terceira verdade para o mesmo estado.
 *
 * O estado incorreto vale também para quem clicou "Não lembro": em revisão
 * espaçada não lembrar é o dado que interessa, não uma falta.
 *
 * `alternativa` é da issue #62: o lance NÃO é o do card e mesmo assim resolve.
 * Dizer "você lembrou o lance desta posição" aí seria falso — ele lembrou a
 * técnica, e é isso que a frase precisa reconhecer.
 */
const MENSAGEM_DA_REVISAO = {
  acertou: 'Você lembrou o lance desta posição.',
  errou: 'O lance desta posição ainda não está firme.',
  alternativa: 'O seu lance não é o do card, e a tablebase diz que ele também resolve a posição.',
} as const

/**
 * Cor de cada tom do julgamento.
 *
 * A cor é aplicada em ESTILO, como o `FeedbackBanner` já faz, e não por classe
 * do módulo: o portão da issue #61 proíbe esta folha de estilo de redeclarar as
 * classes de estado, e recriá-las com outro nome seria contornar o portão em
 * vez de respeitá-lo.
 *
 * `Record` sobre `TomDoEstado`: tom novo no catálogo de finais não compila até
 * ganhar cor aqui — um tom sem cor apareceria com o texto certo e sem nenhuma
 * distinção visual, em silêncio.
 *
 * SEGUNDA FONTE DECLARADA: `EndgameTrainer.module.css` pinta os mesmos tons nas
 * suas próprias classes. As duas telas têm de concordar, e quem cobra isso é o
 * portão em `tests/unit/review-final-julgamento.test.tsx` — não a boa vontade
 * de quem mexer numa delas.
 */
export const COR_DO_TOM: Record<TomDoEstado, string> = {
  ok: 'var(--positive)',
  atencao: 'var(--warning)',
  ruim: 'var(--danger)',
  neutro: 'var(--text-muted)',
}

/**
 * O que a tela diz quando NÃO houve juiz.
 *
 * Duas metades obrigatórias: que está em MODO ESTRITO (por que só o lance do
 * card seria aceito) e que isto NÃO conta como erro. Só a primeira soaria como
 * reprovação; só a segunda esconderia a causa.
 */
const MODO_ESTRITO = {
  titulo: 'Modo estrito: não consegui conferir o seu lance',
  naoEhErro:
    'Isto não conta como erro e não puxa a sua maestria para baixo — eu é que não tenho como confirmar.',
} as const

export interface ReviewSessionProps {
  /**
   * Consulta à tablebase. Sem ela, o padrão é o provider real — é a produção.
   * Existe para o teste fixar a resposta do serviço em vez de depender de rede.
   */
  probe?: Sonda
}

export function ReviewSession({ probe }: ReviewSessionProps = {}) {
  const { status, repo, profile, erro, refresh } = useRepository()
  const [fila, setFila] = useState<ReviewCard[]>([])
  const [indice, setIndice] = useState(0)
  const [sessao, setSessao] = useState<ReviewSessionState | null>(null)
  const [fase, setFase] = useState<Fase>('carregando')
  const [falha, setFalha] = useState<string | null>(null)
  const [feitas, setFeitas] = useState(0)
  const [julgamento, setJulgamento] = useState<EstadoDoJulgamento>(SEM_JUIZ)

  /**
   * Marca a revisão em curso. Resposta da tablebase que chega depois de avançar
   * (ou de sair da tela) descreve um card que não está mais na frente do aluno,
   * e aplicá-la mostraria o veredito do lance anterior sobre a posição nova.
   */
  const geracao = useRef(0)
  useEffect(() => {
    return () => {
      geracao.current += 1
    }
  }, [])

  // Um provider por instância da tela: cache de tablebase por sessão de estudo,
  // e nenhum estado global disfarçado de constante de módulo.
  const sondaPadrao = useMemo<Sonda>(() => {
    const provider = new LichessTablebaseProvider({
      fetchFn: (...args) => globalThis.fetch(...args),
    })
    return (fen) => provider.probe(fen)
  }, [])
  const sonda = probe ?? sondaPadrao

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const cards = await repo.getDueCards(new Date())
        if (cancelado) return
        // A fila recarregada é uma revisão NOVA: uma consulta em voo pertence à
        // anterior, e deixá-la pousar aqui mostraria o veredito de um lance
        // jogado em outra posição. Recarregar sem virar a geração é o mesmo
        // furo que avançar sem virá-la — só que mais difícil de ver.
        geracao.current += 1
        setFila(cards)
        setIndice(0)
        setJulgamento(SEM_JUIZ)
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
    geracao.current += 1
    setJulgamento(SEM_JUIZ)
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

        // O acerto com desconto (#62) usa o mecanismo que JÁ existe: o evento
        // de maestria carrega `porCaminhoMaisLongo` e quem decide o quanto vale
        // é `MASTERY_CONFIG`. Um desconto próprio desta tela seria a segunda
        // cópia da mesma regra.
        const comDesconto =
          julgamento.situacao === 'julgado' && EFEITO_DO_VEREDITO[julgamento.veredito].comDesconto

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
              porCaminhoMaisLongo: comDesconto,
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
    [avancar, julgamento, repo, sessao],
  )

  /**
   * Julga um lance de card de final contra a tablebase.
   *
   * A consulta é do FEN de ANTES — é a posição em que o lance foi jogado. Falha
   * de rede não interrompe a revisão: vira `null`, o juiz devolve
   * `indeterminado` e a política transforma isso em `nao-confirmado`.
   */
  const julgarNaTablebase = useCallback(
    async (estado: ReviewSessionState, uci: string) => {
      const minhaGeracao = geracao.current
      setJulgamento({ situacao: 'consultando' })
      let daTablebase = null
      try {
        daTablebase = await sonda(estado.fen)
      } catch {
        daTablebase = null
      }
      if (minhaGeracao !== geracao.current) {
        return
      }
      const lanceDoCard = estado.card.solutionUci[estado.step] ?? ''
      const julgado = julgarLanceDeFinal({
        fenAntes: estado.fen,
        uciDoAluno: uci,
        antes: daTablebase,
        // O lance do card É o lance da lição (ver a decisão 4 de
        // `persistencia.ts`), e a decisão E do juiz manda contá-lo como melhor
        // mesmo quando a tablebase põe outro na frente.
        uciDaLicao: lanceDoCard,
      })
      const veredito = vereditoDaRevisao({ uciDoAluno: uci, lanceDoCard, julgamento: julgado })
      setJulgamento({ situacao: 'julgado', uci, veredito, julgamento: julgado })
      if (EFEITO_DO_VEREDITO[veredito].ehErro) {
        // Erro passa pelo domínio, como qualquer erro: é ele que guarda
        // `semErro` e limita as notas disponíveis.
        setSessao(submitReviewMove(estado, uci))
      }
    },
    [sonda],
  )

  const jogar = useCallback(
    (from: SquareName, to: SquareName, promotion?: PromotionPiece) => {
      if (!sessao || sessao.phase !== 'resolvendo') return false
      if (julgamento.situacao !== 'sem-juiz') return false

      const esperado = sessao.card.solutionUci[sessao.step]
      const comPromocao = `${from}${to}${promotion ?? ''}`
      // A solução pode não trazer sufixo de promoção; tenta sem antes de seguir.
      const exato = [comPromocao, `${from}${to}`].find((uci) => uci === esperado)

      if (exato !== undefined) {
        setSessao(submitReviewMove(sessao, exato))
        return true
      }
      if (sessao.card.kind !== 'final') {
        // Sem juiz para este tipo de card: comportamento inalterado.
        setSessao(submitReviewMove(sessao, comPromocao))
        return false
      }
      // O UCI que vai ao juiz é o CANÔNICO, e sai de `applyMove` — o mesmo
      // caminho da tela de finais. `ChessBoardView` manda `promotion: 'q'`
      // SEMPRE, inclusive em lance que não é promoção, e o `q` sobrando não
      // existe na lista da tablebase: `e1e8q` cairia em "lance fora da lista",
      // ou seja, TODO lance arrastado viraria "não consegui conferir".
      //
      // Lance ilegal nem chega ao juiz: o tabuleiro recusa e a revisão continua.
      // Julgá-lo diria "não consegui conferir" sobre um lance que não existe.
      const aplicado = applyMove(sessao.fen, { from, to, promotion })
      if (aplicado === null) {
        return false
      }
      void julgarNaTablebase(sessao, aplicado.move.uci)
      return false
    },
    [julgamento.situacao, julgarNaTablebase, sessao],
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

  // Derivados na hora do estado do julgamento: nenhum sinalizador paralelo.
  const veredito = julgamento.situacao === 'julgado' ? julgamento.veredito : null
  const doJuiz = julgamento.situacao === 'julgado' ? julgamento.julgamento : null
  // O lance julgado é NOMEADO. Sem isso o aluno lê um veredito sem saber sobre
  // qual dos seus lances ele fala — e a frase deixa de ser conferível.
  const uciJulgado = julgamento.situacao === 'julgado' ? julgamento.uci : null
  const consultando = julgamento.situacao === 'consultando'
  const emAndamento = sessao.phase === 'resolvendo' && veredito === null && !consultando
  // O lance alternativo não avança a sessão, então é o veredito que encerra a
  // revisão. `ehErro` já levou a sessão para `errou`, e ela responde por ele.
  const encerrada = sessao.phase !== 'resolvendo' || veredito !== null

  /** Ícone + rótulo + texto do degrau. Status nunca depende só de cor. */
  const blocoDoGrau =
    doJuiz === null ? null : (
      <div className={styles.grau} data-testid="grau-do-lance" data-grau={doJuiz.grau}>
        <p
          className={styles.grauTitulo}
          style={{ color: COR_DO_TOM[APRESENTACAO_POR_GRAU[doJuiz.grau].tom] }}
        >
          <span aria-hidden="true">{APRESENTACAO_POR_GRAU[doJuiz.grau].icone}</span>{' '}
          {uciJulgado === null ? null : `Seu lance ${uciJulgado}: `}
          {APRESENTACAO_POR_GRAU[doJuiz.grau].rotulo}
        </p>
        <p className={styles.hint}>{descreverJulgamento(doJuiz)}</p>
      </div>
    )

  return (
    <div className={styles.layout}>
      <ChessBoardView
        fen={sessao.fen}
        orientation={posicao.turn}
        theme={profile?.preferences.boardTheme ?? 'claro'}
        interactive={emAndamento}
        onMove={jogar}
      />

      <div className={styles.panel}>
        <p className={styles.counter}>
          Revisão {indice + 1} de {fila.length}
        </p>
        <p className={styles.prompt}>{sessao.card.prompt}</p>

        {emAndamento ? (
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

        {consultando ? (
          <p className={styles.hint} role="status">
            Conferindo o seu lance na tablebase…
          </p>
        ) : null}

        {sessao.phase === 'acertou' ? (
          <FeedbackBanner tone="correto" mensagem={MENSAGEM_DA_REVISAO.acertou} />
        ) : null}

        {/* Alternativa aceita (#62). O estado é acerto — e o degrau vem JUNTO,
            dentro da faixa, para o aluno não ler "correto" sem ver que existe um
            caminho mais curto. */}
        {veredito !== null && !EFEITO_DO_VEREDITO[veredito].ehErro && doJuiz !== null ? (
          <FeedbackBanner tone="correto" mensagem={MENSAGEM_DA_REVISAO.alternativa}>
            {blocoDoGrau}
          </FeedbackBanner>
        ) : null}

        {/* Sem juiz. Não é faixa de acerto nem de erro, porque não é nem um nem
            outro: é a tela dizendo que não conseguiu conferir. */}
        {veredito !== null && !EFEITO_DO_VEREDITO[veredito].temJuiz ? (
          <div
            className={styles.semJuiz}
            role="status"
            data-testid="modo-estrito"
            data-veredito={veredito}
          >
            <p className={styles.grauTitulo} style={{ color: COR_DO_TOM.neutro }}>
              <span aria-hidden="true">?</span> {MODO_ESTRITO.titulo}
            </p>
            {blocoDoGrau}
            <p className={styles.hint}>
              Sem a tablebase eu só consigo aceitar o lance exato desta lição, que era{' '}
              <strong>{esperado}</strong>. {MODO_ESTRITO.naoEhErro}
            </p>
          </div>
        ) : null}

        {sessao.phase === 'errou' ? (
          /* A resposta certa entra COMO conteúdo da faixa, e não como parágrafo
             solto ao lado: assim ela é anunciada junto com o estado, em vez de
             o leitor de tela ouvir "algo para treinar" e nada mais. */
          <FeedbackBanner tone="incorreto" mensagem={MENSAGEM_DA_REVISAO.errou}>
            <p className={styles.hint}>
              O lance certo era <strong>{esperado}</strong>. Ele volta em breve.
            </p>
            {blocoDoGrau}
          </FeedbackBanner>
        ) : null}

        {encerrada ? (
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
