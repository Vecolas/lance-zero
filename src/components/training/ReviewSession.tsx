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
 *
 * CLIQUE ALÉM DO ARRASTE (issue #67, e o que sobrou dela). A exigência do
 * CLAUDE.md é ter alternativa ao arraste, e a revisão espaçada é o NÚCLEO do
 * produto: sem alternativa, quem usa teclado, leitor de tela ou um toque
 * impreciso não responde card nenhum.
 *
 * A alternativa foi um CAMPO DE LANCE EM UCI. A migração para tabuleiro-só o
 * removeu e não pôs nada no lugar — por um tempo arrastar foi a única forma de
 * responder. Hoje a alternativa é o clique em duas casas (`clicarNaCasa`), e ela
 * vale para TODOS os tipos de card, não só para o de final: a razão dela é
 * acessibilidade, e acessibilidade não vale só para o tipo que algum teste
 * alcança.
 *
 * PORTA ÚNICA. Arraste e clique entram os dois por `jogarDoTabuleiro`, que chama
 * `jogar(uci)`. Dois caminhos separados criariam um lance que só um deles
 * aceita, e a divergência apareceria justamente para quem usa o caminho menos
 * testado.
 *
 * RECUSA COM FRASE. Lance ilegal não some em silêncio — a tela diz o que houve,
 * numa região viva, e a tentativa CONTINUA. Recusar calado é o pior desfecho
 * para quem não vê o tabuleiro: antes da issue #67 um arraste ilegal só revertia
 * a peça, sem uma palavra.
 *
 * DÍVIDA DECLARADA: A PROMOÇÃO MENOR FICOU INALCANÇÁVEL. `ChessBoardView`
 * promove SEMPRE para dama, e o campo de texto era a única forma de pedir torre,
 * bispo ou cavalo. Enquanto o tabuleiro não perguntar, subpromoção não tem
 * caminho nesta tela — está escrito aqui para não voltar a ser descoberto por
 * acaso.
 */

import Link from 'next/link'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { traduzirRota } from '@/lib/i18n/rotas'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
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
import { createReviewSessionV2, reviewItemLabel, type ReviewItem } from '@/domain/review/planner-v2'
import { getSkill } from '@/domain/skills/catalog'
import { createMastery, updateMastery } from '@/domain/skills/mastery'
import { isSkillStateReviewEligible } from '@/domain/roadmap'
import { cardPodeSerRevisado } from '@/domain/review/elegibilidade'
import type { RecallOutcome } from '@/domain/roadmap'
import type { ReviewCard, ReviewRating, SkillMastery } from '@/domain/types'
import {
  applyMove,
  legalMoves,
  normalizeUci,
  parseUci,
  positionStatus,
  type PromotionPiece,
  type SquareName,
  type UciMove,
} from '@/lib/chess'
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

/**
 * O que a porta única fez com a entrada.
 *
 * Três valores e não um booleano porque três coisas diferentes acontecem, e
 * cada caminho de entrada precisa de uma delas: o tabuleiro só pode manter a
 * peça no destino quando a POSIÇÃO andou (`aceita-e-avancou`), e o campo de
 * texto só pode se limpar quando o lance foi CONSUMIDO — inclusive no lance
 * legal que encerra a tentativa sem mexer o tabuleiro (`aceita`, o caso do
 * erro e o do julgamento na tablebase). Com um booleano os dois teriam de
 * adivinhar qual dos dois sentidos ele carregava.
 */
export type EntradaDoLance = 'recusada' | 'aceita' | 'aceita-e-avancou'

/**
 * Nome de cada peça de promoção, em PT-BR.
 *
 * LIMITE DE DESIGN, e ele é a razão de esta tela ter campo de texto:
 * `ChessBoardView` promove SEMPRE para dama, então o campo é hoje a ÚNICA forma
 * de promover para torre, bispo ou cavalo. Ajuda que não diga quais letras
 * existem deixa a promoção menor inalcançável na prática.
 *
 * `Record` sobre `PromotionPiece`: peça nova no domínio não compila até ganhar
 * nome aqui. E a FRASE de ajuda é derivada desta tabela — escrever as quatro
 * peças também na frase daria duas fontes para a mesma verdade, e a que ficasse
 * para trás seria justamente a que o aluno lê.
 */
export const PECAS_DE_PROMOCAO: Record<PromotionPiece, string> = {
  q: 'dama',
  r: 'torre',
  b: 'bispo',
  n: 'cavalo',
}

/** Casa de exemplo da ajuda. Só precisa ser uma promoção plausível. */
const EXEMPLO_DE_PROMOCAO = 'e7e8'

/**
 * A ajuda do campo. Ela vai em `aria-describedby`, NUNCA dentro do `<label>`.
 *
 * CUIDADO CONHECIDO DESTE PROJETO: texto de ajuda dentro do `<label>` entra no
 * NOME ACESSÍVEL e já produziu dois campos com o mesmo nome — quem navega por
 * lista de formulários ouve duas vezes a mesma coisa e não distingue um do
 * outro. Descrição é descrição; nome é nome.
 */
export const AJUDA_DO_LANCE = `Casa de origem e casa de destino, como e2e4. Para promover, acrescente a letra da peça: ${Object.entries(
  PECAS_DE_PROMOCAO,
)
  .map(([letra, nome]) => `${EXEMPLO_DE_PROMOCAO}${letra} (${nome})`)
  .join(', ')}.`

/** As letras de sufixo aceitas, derivadas da tabela de nomes. Nunca reescritas. */
const LETRAS_DE_PROMOCAO = Object.keys(PECAS_DE_PROMOCAO) as PromotionPiece[]

/**
 * A peça que um UCI SEM sufixo significa.
 *
 * É a mesma que `ChessBoardView` escolhe sozinho, e é por isso que ela é a
 * implícita: um card gravado a partir de um arraste guarda uma promoção de
 * dama, com ou sem letra. Mora numa constante só porque três lugares dependem
 * dela — a lista de formas aceitas, o exemplo da frase e esta explicação.
 */
const PROMOCAO_IMPLICITA: PromotionPiece = 'q'

/**
 * O que a tela diz quando o lance não entra.
 *
 * As três frases nomeiam AS CASAS que o aluno escreveu ou arrastou. "Lance
 * inválido" sozinho não diz se o problema é a forma, a posição ou a vez — e
 * quem não vê o tabuleiro não tem como descobrir sozinho.
 *
 * A frase nomeia as CASAS e não o texto cru de propósito: o tabuleiro manda `q`
 * em todo arraste, e "b1b2q não é um lance legal" faria a tela cobrar do aluno
 * um sufixo que ele nunca escreveu. Nomear as casas também nunca engana: um
 * lance de promoção é ilegal sem sufixo exatamente quando é ilegal com ele —
 * quem decide é a casa de destino, não a peça escolhida.
 *
 * `semPromocao` existe porque `e7e8` é precisamente o que alguém digita, e
 * "não é um lance legal" seria verdade e inútil. As letras vêm da tabela.
 */
const FRASE_DA_RECUSA = {
  semForma: 'Escreva o lance como casa de origem e casa de destino, por exemplo e2e4.',
  ilegal: (casas: string) => `${casas} não é um lance legal nesta posição.`,
  semPromocao: (casas: string) =>
    `${casas} é uma promoção: acrescente a letra da peça, como ${casas}${PROMOCAO_IMPLICITA}.`,
} as const

/**
 * As formas de UCI que podem SER o lance do card.
 *
 * `solutionUci` é comparado letra a letra por `submitReviewMove`, e o mesmo
 * lance chega aqui escrito de mais de um jeito: o tabuleiro manda `q` mesmo em
 * lance que não é promoção, e cards antigos gravam promoção sem sufixo. Por
 * isso a lista, e não uma string só.
 *
 * A DAMA É O SUFIXO IMPLÍCITO, e é ela que iguala os dois caminhos. Para o
 * MESMO lance de xadrez, o tabuleiro entrega `b1c3q` e o teclado entrega `b1c3`;
 * sem esta terceira forma, um card gravado com o sufixo sobrando seria aceito
 * pelo arraste e recusado pelo teclado — a divergência que a issue #67 existe
 * para não deixar nascer, visível só para quem usa o caminho menos testado.
 *
 * O QUE **NÃO** ENTRA na lista, e o motivo: a forma SEM sufixo de uma promoção
 * (`e7e8` para o card `e7e8q`). Aceitá-la não ajudaria ninguém — `submitReviewMove`
 * aplica a string do CARD, e `e7e8` é ilegal no tabuleiro —, e abriria a porta
 * para `e7e8n` passar por acerto de um card que ensina a dama. Ver o bloqueio
 * declarado em `tests/unit/review-entrada-por-teclado.test.tsx`.
 */
function formasDoLance(uci: string, entrada: UciMove, canonico: string): readonly string[] {
  const formas = [uci, canonico]
  if (entrada.promotion === undefined) {
    formas.push(`${entrada.from}${entrada.to}${PROMOCAO_IMPLICITA}`)
  }
  return formas
}

export interface ReviewSessionProps {
  /**
   * Consulta à tablebase. Sem ela, o padrão é o provider real — é a produção.
   * Existe para o teste fixar a resposta do serviço em vez de depender de rede.
   */
  probe?: Sonda
}

export function ReviewSession({ probe }: ReviewSessionProps = {}) {
  const { status, repo, profile, erro, refresh } = useRepository()
  const { locale, t } = useIdioma()
  const reviewStorageKey = profile?.id
    ? `lancezero-review-v2:${profile.id}`
    : 'lancezero-review-v2:local'
  const [fila, setFila] = useState<ReviewItem[]>([])
  const [indice, setIndice] = useState(0)
  const [passoInterno, setPassoInterno] = useState(0)
  const [sessao, setSessao] = useState<ReviewSessionState | null>(null)
  const [fase, setFase] = useState<Fase>('carregando')
  const [falha, setFalha] = useState<string | null>(null)
  const [feitas, setFeitas] = useState(0)
  const [julgamento, setJulgamento] = useState<EstadoDoJulgamento>(SEM_JUIZ)
  const [erroDeLance, setErroDeLance] = useState<string | null>(null)
  /** Casa de origem já escolhida no clique. Ver `clicarNaCasa`. */
  const [selecionada, setSelecionada] = useState<SquareName | null>(null)
  const [declarouEsquecimento, setDeclarouEsquecimento] = useState(false)
  const [resultados, setResultados] = useState<Partial<Record<RecallOutcome, number>>>({})

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
        const [cards, skillStates] = await Promise.all([
          repo.getDueCards(new Date()),
          repo.getSkillStates(),
        ])
        // V3: um card vencido sem evidência de ensino é legado, não revisão.
        // O filtro acontece antes de persistência, grouping e contador visual.
        const eligibleSkillIds = new Set(
          skillStates
            .filter((state) => isSkillStateReviewEligible(state))
            .map((state) => state.skillId),
        )
        // A regra mora em `@/domain/review/elegibilidade`, e mora num lugar só:
        // ela era escrita DUAS vezes aqui (este filtro e o `reviewEligible`
        // abaixo) e uma terceira no planner do dia. As cópias divergiram.
        const cardEhElegivel = (card: ReviewCard): boolean =>
          cardPodeSerRevisado(card, eligibleSkillIds)

        const eligibleCards = cards.filter(cardEhElegivel)
        if (cancelado) return
        // A fila recarregada é uma revisão NOVA: uma consulta em voo pertence à
        // anterior, e deixá-la pousar aqui mostraria o veredito de um lance
        // jogado em outra posição. Recarregar sem virar a geração é o mesmo
        // furo que avançar sem virá-la — só que mais difícil de ver.
        geracao.current += 1
        const salvo = (() => {
          try {
            const raw = globalThis.localStorage.getItem(reviewStorageKey)
            if (!raw) return null
            const parsed = JSON.parse(raw) as {
              items?: ReviewItem[]
              plannerVersion?: number
              indice?: number
              passoInterno?: number
              feitas?: number
              resultados?: Partial<Record<RecallOutcome, number>>
              sessao?: ReviewSessionState
            }
            return parsed.plannerVersion === 2 && Array.isArray(parsed.items) ? parsed : null
          } catch {
            return null
          }
        })()
        const idsDisponiveis = new Set(eligibleCards.map((card) => card.id))
        const salvoCompatível = salvo?.items?.every((item) =>
          item.steps.every((step) => idsDisponiveis.has(step.card.id)),
        )
        const plano =
          salvoCompatível && salvo?.items && salvo.items.length > 0
            ? salvo.items
            : createReviewSessionV2(eligibleCards, {
                // A MESMA função do filtro acima. Repetir a expressão aqui foi o
                // que fez a regra divergir de si mesma.
                now: new Date(),
                reviewEligible: cardEhElegivel,
              }).items
        const markerKey = `lancezero-relearning:${profile?.id ?? 'local'}`
        const relearning = (() => {
          try {
            const raw = globalThis.localStorage.getItem(markerKey)
            if (!raw) return null
            const parsed = JSON.parse(raw) as { itemId?: string; completed?: boolean }
            return parsed.completed === true && typeof parsed.itemId === 'string' ? parsed : null
          } catch {
            return null
          }
        })()
        const itemReaprendido = relearning
          ? plano.findIndex((item) => item.id === relearning.itemId)
          : -1
        const planoAposReaprendizado =
          itemReaprendido >= 0
            ? plano.map((item, itemIndex) =>
                itemIndex === itemReaprendido
                  ? { ...item, status: 'completed' as const, outcome: 'relearned' as const }
                  : item,
              )
            : plano
        const indiceSalvo = itemReaprendido >= 0 ? itemReaprendido + 1 : (salvo?.indice ?? 0)
        const indiceInicial = Math.min(Math.max(0, indiceSalvo), Math.max(0, plano.length - 1))
        const passoInicial = Math.min(
          Math.max(0, salvo?.passoInterno ?? 0),
          Math.max(0, (plano[indiceInicial]?.steps.length ?? 1) - 1),
        )
        setFila(planoAposReaprendizado)
        setIndice(indiceInicial)
        setPassoInterno(passoInicial)
        setFeitas((salvo?.feitas ?? 0) + (itemReaprendido >= 0 ? 1 : 0))
        setResultados({
          ...(salvo?.resultados ?? {}),
          ...(itemReaprendido >= 0 ? { relearned: (salvo?.resultados?.relearned ?? 0) + 1 } : {}),
        })
        setJulgamento(SEM_JUIZ)
        setDeclarouEsquecimento(false)
        if (itemReaprendido >= 0) globalThis.localStorage.removeItem(markerKey)
        // A recusa e o rascunho pertencem à revisão que estava na tela. Fila
        // nova com a frase antiga faria a tela recusar um lance que ninguém
        // jogou nesta posição.
        setErroDeLance(null)
        setSessao(
          salvo?.sessao?.card &&
            planoAposReaprendizado[indiceInicial]?.steps[passoInicial]?.card.id ===
              salvo.sessao.card.id
            ? salvo.sessao
            : planoAposReaprendizado[indiceInicial]?.steps[passoInicial]
              ? createReviewSession(planoAposReaprendizado[indiceInicial].steps[passoInicial].card)
              : null,
        )
        setFase(indiceInicial < planoAposReaprendizado.length ? 'revisando' : 'concluida')
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
  }, [repo, reviewStorageKey])

  const itemAtual = fila[indice] ?? null

  useEffect(() => {
    if (fase !== 'revisando' || fila.length === 0) return
    try {
      globalThis.localStorage.setItem(
        reviewStorageKey,
        JSON.stringify({
          plannerVersion: 2,
          items: fila,
          indice,
          passoInterno,
          feitas,
          resultados,
          sessao,
        }),
      )
    } catch {
      // A revisão continua local-first mesmo quando o navegador bloqueia storage.
    }
  }, [fase, fila, indice, passoInterno, feitas, resultados, sessao, reviewStorageKey])

  const avancar = useCallback(() => {
    geracao.current += 1
    setJulgamento(SEM_JUIZ)
    setDeclarouEsquecimento(false)
    // Mesma razão do recarregar: a recusa é da revisão anterior.
    setErroDeLance(null)
    const proximoPasso = passoInterno + 1
    if (itemAtual && proximoPasso < itemAtual.steps.length) {
      setPassoInterno(proximoPasso)
      setSessao(createReviewSession(itemAtual.steps[proximoPasso].card))
      return
    }

    const proximo = indice + 1
    setFeitas((f) => f + 1)
    if (proximo >= fila.length) {
      try {
        globalThis.localStorage.removeItem(reviewStorageKey)
      } catch {
        // Sem storage, o encerramento ainda vale nesta aba.
      }
      setSessao(null)
      setFase('concluida')
      refresh()
      return
    }
    setIndice(proximo)
    setPassoInterno(0)
    setSessao(createReviewSession(fila[proximo].steps[0].card))
  }, [fila, indice, itemAtual, passoInterno, refresh, reviewStorageKey])

  const registrar = useCallback(
    async (rating: ReviewRating, advance = true, outcomeOverride?: RecallOutcome) => {
      if (!repo || !sessao) return
      const agora = new Date()
      try {
        const atualizado = applyReview(sessao.card, rating, agora)
        const outcome: RecallOutcome =
          outcomeOverride ??
          (declarouEsquecimento
            ? 'declared-forgotten'
            : sessao.phase === 'errou'
              ? 'failed'
              : rating === 'again'
                ? 'recalled-with-hint'
                : 'recalled')
        await repo.saveReviewCard(atualizado)
        await repo.saveReviewLog({
          cardId: sessao.card.id,
          reviewedAt: agora.toISOString(),
          rating,
          elapsedMs: 0,
          outcome,
        })
        setResultados((current) => ({ ...current, [outcome]: (current[outcome] ?? 0) + 1 }))

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
        if (advance) avancar()
      } catch (e) {
        setFalha(e instanceof Error ? e.message : 'Não consegui salvar esta revisão.')
        setFase('erro')
      }
    },
    [avancar, declarouEsquecimento, julgamento, repo, sessao],
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

  /**
   * A PORTA ÚNICA do lance. Arraste e texto entram os dois aqui.
   *
   * A LEGALIDADE VEM ANTES DE TUDO, e vale para todo tipo de card. Antes da
   * issue #67 um lance impossível num card que não é de final ia direto para
   * `submitReviewMove` e virava ERRO — o aluno perdia a revisão por um arraste
   * torto, e quem digita perderia por um dedo trocado. Lance que não existe não
   * é resposta errada: é entrada recusada, e a tentativa continua.
   *
   * O UCI que segue adiante é o CANÔNICO, saído de `applyMove` — o mesmo
   * caminho da tela de finais. `ChessBoardView` manda `promotion: 'q'` SEMPRE,
   * inclusive em lance que não é promoção, e o `q` sobrando não existe na lista
   * da tablebase: `e1e8q` cairia em "lance fora da lista", ou seja, TODO lance
   * arrastado viraria "não consegui conferir".
   */
  const jogar = useCallback(
    (uciBruto: string): EntradaDoLance => {
      if (!sessao || sessao.phase !== 'resolvendo') return 'recusada'
      if (julgamento.situacao !== 'sem-juiz') return 'recusada'

      const uci = normalizeUci(uciBruto)
      const entrada = parseUci(uci)
      if (entrada === null) {
        setErroDeLance(FRASE_DA_RECUSA.semForma)
        return 'recusada'
      }
      const aplicado = applyMove(sessao.fen, entrada)
      if (aplicado === null) {
        const casas = `${entrada.from}${entrada.to}`
        // Só falta a letra da peça? É o erro que quem digita comete, e a frase
        // genérica seria verdadeira e inútil. O tabuleiro nunca cai aqui: ele
        // manda a peça sempre.
        const faltaAPeca =
          entrada.promotion === undefined &&
          LETRAS_DE_PROMOCAO.some(
            (peca) => applyMove(sessao.fen, { ...entrada, promotion: peca }) !== null,
          )
        setErroDeLance(
          faltaAPeca ? FRASE_DA_RECUSA.semPromocao(casas) : FRASE_DA_RECUSA.ilegal(casas),
        )
        return 'recusada'
      }
      setErroDeLance(null)

      const doCard = sessao.card.solutionUci[sessao.step]
      const exato = formasDoLance(uci, entrada, aplicado.move.uci).find((forma) => forma === doCard)
      if (exato !== undefined) {
        // O acerto do final continua avançando imediatamente, mas a tablebase
        // ainda pode explicar se a escolha foi a melhor. O feedback é auxiliar;
        // não deve transformar um card correto em uma segunda tentativa.
        if (sessao.card.kind === 'final') void julgarNaTablebase(sessao, exato)
        setSessao(submitReviewMove(sessao, exato))
        return 'aceita-e-avancou'
      }
      if (sessao.card.kind !== 'final') {
        // Sem juiz para este tipo de card: o lance legal e diferente é erro,
        // como sempre foi.
        setSessao(submitReviewMove(sessao, aplicado.move.uci))
        return 'aceita'
      }
      void julgarNaTablebase(sessao, aplicado.move.uci)
      return 'aceita'
    },
    [julgamento.situacao, julgarNaTablebase, sessao],
  )

  /**
   * O tabuleiro entrega casas; a porta única fala UCI. Este é o tradutor, e ele
   * NÃO decide nada — nem legalidade, nem promoção, nem acerto. Todo `if` que
   * aparecesse aqui seria a segunda regra de aceitação do mesmo lance.
   */
  const jogarDoTabuleiro = useCallback(
    (from: SquareName, to: SquareName, promotion?: PromotionPiece): boolean =>
      jogar(`${from}${to}${promotion ?? ''}`) !== 'recusada',
    [jogar],
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
        {feitas > 0 ? (
          <p className={styles.summary} data-testid="resumo-da-revisao">
            {resultados.recalled ?? 0} lembrados · {resultados['recalled-with-hint'] ?? 0} com dica
            · {resultados.failed ?? 0} com dificuldade · {resultados['declared-forgotten'] ?? 0}{' '}
            esquecidos · {resultados.relearned ?? 0} reaprendidos
          </p>
        ) : null}
        <p>
          As revisões nascem dos seus erros. Enquanto não houver puzzles resolvidos nem partidas
          importadas, esta fila fica vazia — e isso é o comportamento certo, não uma tela quebrada.
        </p>
        {/*
          VOLTA PARA A CASA DA REVISÃO, e não para o Hoje.

          A fila agora mora dentro de uma aba que responde o resto: o que vem, de
          onde veio, o que continua caindo, e esta sessão que acabou de terminar.
          Mandar o aluno para o plano do dia o tirava justamente da tela que dá
          sentido ao que ele acabou de fazer.
        */}
        <Link href={traduzirRota('/revisao', locale)}>{t('review.backToReview')}</Link>
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

  /**
   * O LANCE POR CLIQUE: casa de origem, casa de destino.
   *
   * A revisão espaçada é o NÚCLEO do produto, e por um tempo a única forma de
   * responder um card foi ARRASTAR uma peça. Quem usa teclado, leitor de tela ou
   * um toque impreciso não tinha caminho nenhum até a resposta.
   *
   * Vale para TODO tipo de card, pelo mesmo motivo que o antigo campo de texto
   * valia: a razão dele é acessibilidade, e acessibilidade não vale só para o
   * tipo que algum teste alcança.
   *
   * PORTA ÚNICA, como o arraste: os dois chamam `jogarDoTabuleiro`, que chama
   * `jogar`. Nenhum caminho aplica lance por fora da sessão.
   *
   * A PROMOÇÃO SAI DAMA, igual ao arraste — `ChessBoardView` não pergunta. É
   * limitação do tabuleiro, não deste caminho.
   *
   * FUNÇÃO SIMPLES, e não `useCallback`: `emAndamento` só existe aqui embaixo,
   * depois dos retornos antecipados, e um hook aqui quebraria a ordem dos hooks.
   */
  const clicarNaCasa = (casa: SquareName) => {
    if (!emAndamento) return
    if (selecionada && selecionada !== casa && jogarDoTabuleiro(selecionada, casa)) {
      setSelecionada(null)
      return
    }
    setSelecionada(legalMoves(sessao.fen, casa).length > 0 ? casa : null)
  }
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
    <MesaDeEstudo
      tabuleiro={
        <>
          <ChessBoardView
            fen={sessao.fen}
            orientation={posicao.turn}
            theme={profile?.preferences.boardTheme ?? 'claro'}
            interactive={emAndamento}
            selected={selecionada}
            onMove={jogarDoTabuleiro}
            onSquareClick={clicarNaCasa}
            onIllegalMove={(from, to) =>
              setErroDeLance(`${from}${to} não é um lance legal nesta posição.`)
            }
          />

          {/* A alternativa ao arraste. Ela some junto com a interatividade do
            tabuleiro: campo habilitado depois do veredito prometeria um segundo
            lance que a sessão não aceita. */}
          <div className={styles.entrada}>
            <p className={styles.hint}>Jogue o lance diretamente no tabuleiro.</p>
            <div className={styles.entradaLinha}>
              <span className={styles.hint}>
                Arraste a peça e solte na casa de destino, ou clique na casa de origem e depois na
                de destino.
              </span>
            </div>
            {/* `role="status"` e não `alert`: a recusa é informação, não
              interrupção — mesma decisão de tom da faixa de erro (#61). Sem
              região viva, quem não vê o tabuleiro não saberia que o lance não
              entrou. */}
            {erroDeLance !== null ? (
              <p className={styles.recusa} role="status" data-testid="recusa-do-lance">
                <span aria-hidden="true">✕</span> {erroDeLance}
              </p>
            ) : null}
          </div>
        </>
      }
    >
      <>
        {/* ONDE O ALUNO ESTÁ, e não quantas ele já fez.

            Esta linha mostrou `feitas` por um tempo, e o efeito era a fila de um
            card só anunciar "Revisão 0 de 1" do começo ao fim — nunca chegava a
            1, porque assim que a primeira era concluída a tela saía da fila. Ela
            fica logo acima do enunciado do card ATUAL e ao lado de "Parte X de
            Y", que é posicional: as duas precisam contar a mesma coisa.

            `feitas` continua certo na tela de encerramento, que é onde a
            pergunta é mesmo "quantas?". */}
        <p className={styles.counter}>
          Revisão {indice + 1} de {fila.length}
        </p>
        <p className={styles.eyebrow}>{itemAtual ? reviewItemLabel(itemAtual.kind) : 'Revisão'}</p>
        <p className={styles.prompt}>{sessao.card.prompt}</p>
        {itemAtual ? (
          <p className={styles.hint} data-testid="progresso-interno">
            {itemAtual.steps.length > 1
              ? `Parte ${passoInterno + 1} de ${itemAtual.steps.length} nesta unidade`
              : 'Uma unidade pedagógica'}
          </p>
        ) : null}

        {emAndamento ? (
          <>
            <p className={styles.hint}>
              Jogue o lance. Pense antes: a nota que você dá depois só vale se a resposta não veio
              por tentativa e erro.
            </p>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                setDeclarouEsquecimento(true)
                setSessao(giveUpReview(sessao))
              }}
            >
              Não lembro
            </button>
            {sessao.card.skillIds[0] ? (
              <button
                type="button"
                className={styles.ghost}
                onClick={() => {
                  const markerKey = `lancezero-relearning:${profile?.id ?? 'local'}`
                  try {
                    globalThis.localStorage.setItem(
                      markerKey,
                      JSON.stringify({ itemId: itemAtual?.id, completed: false }),
                    )
                  } catch {
                    /* a revisão continua disponível */
                  }
                  void registrar('again', false, 'voluntary-relearn').then(() => {
                    window.location.assign(`/lessons/${sessao.card.skillIds[0]}?relearn=1`)
                  })
                }}
              >
                Rever lição antes de tentar
              </button>
            ) : null}
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
            {sessao.card.skillIds[0] ? (
              <p className={styles.relearnActions}>
                <button
                  type="button"
                  className={styles.relearnLink}
                  onClick={() => {
                    const markerKey = `lancezero-relearning:${profile?.id ?? 'local'}`
                    try {
                      globalThis.localStorage.setItem(
                        markerKey,
                        JSON.stringify({ itemId: itemAtual?.id, completed: false }),
                      )
                    } catch {
                      /* a lição ainda pode ser aberta */
                    }
                    void registrar('again', false).then(() => {
                      window.location.assign(`/lessons/${sessao.card.skillIds[0]}?relearn=1`)
                    })
                  }}
                >
                  Reaprender agora
                </button>
                <span className={styles.hint}>ou escolha uma nota para continuar a revisão.</span>
              </p>
            ) : null}
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
      </>
    </MesaDeEstudo>
  )
}
