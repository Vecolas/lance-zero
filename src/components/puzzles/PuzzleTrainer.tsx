'use client'

/**
 * Tela de treino de puzzles.
 *
 * DECISÃO QUE ESTE ARQUIVO CARREGA (issue #66): o nível de dica tem UM DONO SÓ,
 * e o dono é `AttemptState.hintsUsed`, no domínio. A tela não guarda contador
 * próprio de dica.
 *
 * O que existia antes: um `useState` chamado `nivelDeDica` desenhava o contador
 * na tela enquanto `useHint` nunca era chamado. As duas verdades divergiam em
 * silêncio — a tela dizia "3 dicas" e o registro gravado dizia `hintsUsed: 0`,
 * `firstTry: true`. Nada disso dava erro: o botão nunca desabilitava, o modelo
 * de maestria registrava acerto limpo onde houve apoio, e a regra "quem usou
 * dica gera card de revisão" nunca disparava por dica.
 *
 * Por isso, aqui: tudo que fala de dica — o texto exibido, o rótulo do botão,
 * o `disabled` e a mensagem de desfecho — é DERIVADO de `tentativa`, lido na
 * hora. Não há segundo registro do apoio para sair de sincronia.
 *
 * ---------------------------------------------------------------------------
 * SEGUNDA DECISÃO (issue #17): o lance fora da linha do dataset passa pelo
 * JUIZ antes de virar erro, e a tela FALA nos três vereditos.
 *
 * `equivalente` e `pior` são acerto, e o segundo desconta a maestria pela
 * família que já existe (`MasteryEvent.porCaminhoMaisLongo`). Desconto
 * silencioso seria punição sem causa aparente — por isso a frase nomeia o que
 * foi pior, com número. `indeterminado` não é erro nem acerto, e ele vai ser
 * COMUM: aqui só existe a engine, que dá ordenação e não verdade. Silêncio
 * depois de um lance lê como aprovação, então a tela diz que não deu para
 * confirmar.
 *
 * O veredito é do DOMÍNIO (`submitMoveComJuiz`) e é lido da tentativa. A tela
 * guarda só o que o domínio não guarda: qual lance está sendo conferido agora e
 * contra qual lance da linha ele foi comparado. Nenhum `if` de política vive
 * aqui — quem responde por isso é `EFEITO_DA_ALTERNATIVA`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { FeedbackBanner } from '@/components/ui/FeedbackBanner'
import { STARTER_PUZZLES_CSV } from '@/content/puzzles/starter'
import {
  createAttemptState,
  EFEITO_DA_ALTERNATIVA,
  giveUp,
  hintAt,
  houveDesconto,
  MAX_HINT_LEVEL,
  nextHintLevel,
  parsePuzzleCsv,
  revelarRotulos,
  selectPuzzles,
  submitMove,
  submitMoveComJuiz,
  toPuzzleAttempt,
  toSolvable,
  ultimaAlternativa,
  // Apelido de propósito: `useHint` é função pura de domínio, não hook de
  // React, mas o prefixo `use` faz a regra `react-hooks/rules-of-hooks`
  // reprovar a chamada dentro de um manipulador de evento.
  useHint as aplicarDica,
  type AttemptState,
  type AvaliarPosicao,
  type PuzzleCard,
} from '@/domain/puzzles'
import { createMastery, updateMastery } from '@/domain/skills/mastery'
import { getSkill } from '@/domain/skills/catalog'
import type { SkillMastery } from '@/domain/types'
import { useEngine } from '@/lib/engine/use-engine'
import { createReviewCard } from '@/lib/fsrs/cards'
import {
  applyMove,
  parseUci,
  positionStatus,
  type PromotionPiece,
  type SquareName,
} from '@/lib/chess'
import { APRESENTACAO_DA_ALTERNATIVA, descreverAlternativa } from './textos-alternativa'
import styles from './PuzzleTrainer.module.css'

/** O pool é constante: parseia uma vez por carga do módulo, não por render. */
const POOL = parsePuzzleCsv(STARTER_PUZZLES_CSV, { pularCabecalho: true }).puzzles

const TAMANHO_DA_SESSAO = 5

/**
 * Orçamento de análise do julgamento de alternativa, em NÓS POR POSIÇÃO.
 *
 * LIMITE DE DESIGN, NUNCA CALIBRADO. O jogador está PARADO esperando, e cada
 * julgamento paga duas posições — o dobro deste número. Por isso ele fica bem
 * abaixo do aprofundamento da revisão de partidas (600 mil nós, que roda em
 * segundo plano) e acima da varredura rasa (60 mil), que existe para
 * distribuição de severidade e não para julgar um lance isolado. Subir o
 * número compra ordenação melhor e paga em espera; descer faz `indeterminado`
 * ficar mais comum. Medir antes de girar.
 */
export const NOS_DO_JULGAMENTO = 150_000

/**
 * O que a tela sabe sobre a conferência do lance atual.
 *
 * A tela NÃO guarda o veredito: ele mora na tentativa, no domínio, e é lido de
 * `ultimaAlternativa`. Aqui fica só o que o domínio não guarda — qual lance
 * está sendo conferido e contra qual lance da linha ele foi comparado, que é o
 * índice que a tentativa perde quando a alternativa é aceita.
 */
type Analise =
  | { situacao: 'ocioso' }
  | { situacao: 'conferindo'; uci: string }
  | { situacao: 'julgado'; uci: string; uciEsperado: string | null }

const ANALISE_OCIOSA: Analise = { situacao: 'ocioso' }

/**
 * O UCI CANÔNICO do lance arrastado.
 *
 * `ChessBoardView` manda `promotion: 'q'` mesmo em lance que não é promoção, e
 * esse `q` sobrando mudaria o lance julgado (`e1e8q` não é `e1e8`). O canônico
 * sai de `applyMove`, que é quem sabe a forma certa. `null` só para lance
 * ilegal, que nem chega ao juiz.
 */
function lanceCanonico(
  fen: string,
  from: SquareName,
  to: SquareName,
  promotion?: PromotionPiece,
): string | null {
  for (const bruto of [`${from}${to}${promotion ?? ''}`, `${from}${to}`]) {
    const entrada = parseUci(bruto)
    if (entrada === null) continue
    const aplicado = applyMove(fen, entrada)
    if (aplicado !== null) return aplicado.move.uci
  }
  return null
}

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
export const MENSAGEM_DO_DESFECHO = {
  resolvidoSemApoio: 'Você encontrou a linha que ganha sem dica e sem tentativa perdida.',
  resolvidoComApoio:
    'Você chegou à linha que ganha. Como precisou de apoio, este padrão volta em revisão para você reencontrá-lo sozinho.',
  naoResolvido:
    'A linha que ganha está logo abaixo. Esta posição vira revisão e volta no seu treino para você reencontrá-la sozinho.',
  /**
   * O desfecho de quem ganhou POR FORA da linha do dataset (issue #17). Existe
   * porque as duas frases acima dizem "a linha que ganha", no singular, e aqui
   * o jogador achou outra. O que a alternativa valeu — mesmo patamar ou acerto
   * com desconto — está no bloco do julgamento, logo abaixo do desfecho.
   */
  resolvidoPorAlternativa:
    'Você chegou a uma linha que ganha, diferente da linha guardada para este problema.',
} as const

type Fase = 'carregando' | 'treinando' | 'sem-puzzles' | 'concluida' | 'erro'

export function PuzzleTrainer() {
  const { status, repo, profile, erro, refresh } = useRepository()
  const [cards, setCards] = useState<PuzzleCard[]>([])
  const [indice, setIndice] = useState(0)
  const [tentativa, setTentativa] = useState<AttemptState | null>(null)
  const [fase, setFase] = useState<Fase>('carregando')
  const [falha, setFalha] = useState<string | null>(null)
  const [inicio, setInicio] = useState(() => Date.now())
  const [resolvidos, setResolvidos] = useState(0)
  const [salvo, setSalvo] = useState(false)
  const [analise, setAnalise] = useState<Analise>(ANALISE_OCIOSA)
  const { analyze } = useEngine()
  /**
   * Número do puzzle em conferência. Uma análise que volta depois que a tela já
   * mudou de puzzle é LIXO: aplicá-la julgaria um lance contra uma posição que
   * o jogador nem vê mais, e o registro cairia na tentativa errada.
   */
  const geracao = useRef(0)

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
        geracao.current += 1
        setAnalise(ANALISE_OCIOSA)
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
              // O acerto com desconto (#17) usa o mecanismo que JÁ existe: o
              // evento carrega o fato e quem decide o quanto vale é
              // `MASTERY_CONFIG`. Um desconto próprio desta tela seria a
              // segunda cópia da mesma regra, livre para divergir.
              porCaminhoMaisLongo: houveDesconto(estado),
              thinkTimeMs: registro.thinkTimeMs,
              ocorridoEm: agora.toISOString(),
            }),
          )
        }
        await repo.saveSkillMastery([...porId.values()])

        // O princípio do produto: erro vira treino futuro. Só quem errou ou
        // precisou de dica gera card — acertar de primeira não vira dever de casa.
        //
        // Este `if` só passou a enxergar a dica quando o contador virou o do
        // domínio (issue #66). Antes dela, `hintsUsed` era 0 sempre e o ramo
        // da dica era código morto silencioso.
        if (!registro.solved || registro.hintsUsed > 0) {
          const ladoQueJoga =
            estado.solvable.playerColor === 'w' ? 'Brancas jogam.' : 'Pretas jogam.'
          // O card não pode acusar erro de quem resolveu com dica: o texto sai
          // do que o registro diz que aconteceu, não de um só caso presumido.
          const porQueVoltou = registro.solved
            ? 'Você resolveu este padrão com dica.'
            : 'Você errou este padrão antes.'
          await repo.saveReviewCard(
            createReviewCard(
              {
                id: `puzzle:${estado.solvable.puzzle.id}`,
                kind: 'posicao-exata',
                skillIds: estado.solvable.puzzle.skillIds,
                fen: estado.solvable.startFen,
                solutionUci: [...estado.solvable.solutionUci],
                prompt: `${ladoQueJoga} ${porQueVoltou}`,
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
    // A conferência em voo é do puzzle ANTERIOR. Sem isto ela voltaria e
    // aplicaria um veredito sobre a tentativa nova, em silêncio.
    geracao.current += 1
    setAnalise(ANALISE_OCIOSA)
    // Nada de zerar contador de dica aqui: a tentativa nova já nasce com
    // `hintsUsed: 0`. Um reset manual seria a segunda fonte voltando.
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

  /**
   * Adapta a engine da tela para a função de avaliação que o domínio pede.
   *
   * `analyze` NUNCA rejeita: resultado obsoleto e falha real chegam como
   * `null`, e `null` vira avaliação vazia — que o domínio lê como
   * `indeterminado`. É o caminho honesto: sem juiz não se reprova, e também
   * não se inventa número.
   *
   * DÍVIDA DECLARADA: a leitura da linha principal (`multiPv === 1`, senão a
   * primeira) é a mesma de `avaliacaoDaEngine`, em `@/domain/games/pipeline`,
   * que não é exportada. Duas cópias de três linhas, e a casa delas é a camada
   * de engine — mover exige mexer em arquivo de outra frente.
   */
  const avaliar = useCallback<AvaliarPosicao>(
    async (fen) => {
      const resposta = await analyze(fen, { nodes: NOS_DO_JULGAMENTO, multiPv: 1 })
      const principal = resposta?.lines.find((l) => l.multiPv === 1) ?? resposta?.lines[0]
      return { scoreCp: principal?.scoreCp ?? null, mateIn: principal?.mateIn ?? null }
    },
    [analyze],
  )

  /**
   * Manda o lance fora da linha ao JUIZ e aplica o que o domínio decidir.
   *
   * O lance esperado é lido ANTES da chamada: depois que a alternativa é aceita
   * a tentativa pula `solutionIndex` para o fim da linha, e o lance com o qual a
   * comparação foi feita não teria mais como ser recuperado para a frase.
   */
  const conferir = useCallback(
    async (estado: AttemptState, uci: string) => {
      const minhaGeracao = geracao.current
      const uciEsperado = estado.solvable.solutionUci[estado.solutionIndex] ?? null
      setAnalise({ situacao: 'conferindo', uci })
      const resultado = await submitMoveComJuiz(estado, uci, { avaliar })
      // A tela já mudou de puzzle: este veredito é de outra tentativa.
      if (minhaGeracao !== geracao.current) return
      // Sem julgamento: o filtro barato recusou o lance sem pagar análise, e ele
      // é erro comum, como sempre foi.
      setAnalise(
        resultado.alternativa === undefined
          ? ANALISE_OCIOSA
          : { situacao: 'julgado', uci, uciEsperado },
      )
      aplicar(resultado.state)
    },
    [aplicar, avaliar],
  )

  const jogar = useCallback(
    (from: SquareName, to: SquareName, promotion?: PromotionPiece) => {
      if (!tentativa || tentativa.status !== 'em-andamento') return false
      // Uma conferência por vez: o segundo lance seria julgado contra a posição
      // antiga, que ainda está na tela porque a primeira não voltou.
      if (analise.situacao === 'conferindo') return false
      const comSufixo = submitMove(tentativa, `${from}${to}${promotion ?? ''}`)
      // A solução do dataset pode não trazer sufixo de promoção.
      const resultado =
        !comSufixo.correto && promotion ? submitMove(tentativa, `${from}${to}`) : comSufixo

      const canonico = lanceCanonico(tentativa.currentFen, from, to, promotion)
      // Só o lance LEGAL e fora da linha passa pelo juiz. Acerto, lance ilegal e
      // formato podre continuam decididos de graça, sem engine.
      if (!resultado.correto && resultado.motivo === 'lance-errado' && canonico !== null) {
        void conferir(tentativa, canonico)
        return false
      }

      setAnalise(ANALISE_OCIOSA)
      aplicar(resultado.state)
      return resultado.correto
    },
    [analise.situacao, aplicar, conferir, tentativa],
  )

  /** Pede a próxima dica AO DOMÍNIO. A tela não conta dica por fora. */
  const pedirDica = useCallback(() => {
    setTentativa((atual) => (atual === null ? atual : aplicarDica(atual)))
  }, [])

  const dica = useMemo(() => {
    if (!tentativa || tentativa.hintsUsed === 0) return null
    const nivel = Math.min(tentativa.hintsUsed, MAX_HINT_LEVEL) as 1 | 2 | 3
    return hintAt(tentativa.solvable, nivel)
  }, [tentativa])

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
          O que você errou virou card de revisão e volta em <strong>Revisar</strong> na hora certa.
        </p>
      </div>
    )
  }

  const posicao = positionStatus(tentativa.currentFen)
  const revelado = encerrada ? revelarRotulos(card) : card
  const proximaDica = nextHintLevel(tentativa)
  /**
   * Rótulo do botão de dica, derivado do MESMO contador que será gravado.
   *
   * O último nível não deixa um "Mais uma dica" que não leva a lugar nenhum:
   * o botão desabilita e o texto diz por quê. `disabled` sozinho é estado só
   * por aparência — quem usa leitor de tela precisa da palavra.
   */
  const rotuloDaDica =
    proximaDica === null
      ? `Sem mais dicas (${MAX_HINT_LEVEL}/${MAX_HINT_LEVEL})`
      : tentativa.hintsUsed === 0
        ? 'Dica'
        : `Mais uma dica (${tentativa.hintsUsed}/${MAX_HINT_LEVEL})`
  /**
   * "Sem apoio" é o mesmo `firstTry` que o domínio mantém: nenhum lance errado
   * e nenhuma dica. Ler o campo em vez de recalcular a conta aqui é o que
   * impede a mensagem de acerto de divergir do registro gravado — foi
   * exatamente essa divergência que a issue #66 corrigiu.
   */
  const semApoio = tentativa.firstTry

  /**
   * O julgamento na tela.
   *
   * O VEREDITO vem da tentativa (`ultimaAlternativa`), não de um estado próprio
   * desta tela: um segundo registro do mesmo fato sairia de sincronia com o que
   * é gravado, e foi exatamente esse desenho que a issue #66 removeu daqui. O
   * estado local só diz SE há julgamento fresco para mostrar — depois de um
   * lance novo ele volta a `ocioso` e o bloco some.
   */
  const julgado = analise.situacao === 'julgado' ? analise : null
  const registroNaTela = julgado === null ? null : ultimaAlternativa(tentativa)
  const blocoDaAlternativa =
    julgado === null || registroNaTela === null ? null : (
      <div
        className={styles.alternativa}
        data-testid="julgamento-da-alternativa"
        data-veredito={registroNaTela.veredito}
      >
        {/* Ícone + rótulo + frase: status nunca depende só de cor, e este bloco
            é NEUTRO de propósito — a cor de acerto e de erro é do FeedbackBanner,
            e uma segunda tabela de cor aqui é o que a issue #61 removeu. */}
        <p className={styles.alternativaTitulo}>
          <span aria-hidden="true">
            {APRESENTACAO_DA_ALTERNATIVA[registroNaTela.veredito].icone}
          </span>{' '}
          {APRESENTACAO_DA_ALTERNATIVA[registroNaTela.veredito].rotulo}
        </p>
        <p className={styles.think}>{descreverAlternativa(registroNaTela, julgado.uciEsperado)}</p>
      </div>
    )

  /** O desfecho de acerto muda quando a linha vencedora foi outra. */
  const ultima = ultimaAlternativa(tentativa)
  const venceuPorAlternativa =
    ultima !== null && EFEITO_DA_ALTERNATIVA[ultima.veredito].aceitaOLance
  const mensagemDoAcerto = venceuPorAlternativa
    ? MENSAGEM_DO_DESFECHO.resolvidoPorAlternativa
    : semApoio
      ? MENSAGEM_DO_DESFECHO.resolvidoSemApoio
      : MENSAGEM_DO_DESFECHO.resolvidoComApoio

  /**
   * Lances que ficaram sem juiz nesta tentativa.
   *
   * Derivado de `EFEITO_DA_ALTERNATIVA`, não de uma lista de vereditos escrita
   * aqui. Fica visível DEPOIS do fim da tentativa porque a frase do momento já
   * saiu da tela: sem esta linha, o jogador que teve um lance não confirmado
   * terminaria sem nenhum vestígio de que aquilo aconteceu.
   */
  const naoConfirmados = tentativa.alternativas
    .filter((item) => !EFEITO_DA_ALTERNATIVA[item.veredito].temJuiz)
    .map((item) => item.uci)

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
            {analise.situacao === 'conferindo' ? (
              /* O jogador precisa saber POR QUE o tabuleiro não respondeu. Sem
                 esta linha, a espera da engine lê como travamento. */
              <p className={styles.think} role="status">
                Conferindo {analise.uci} na engine…
              </p>
            ) : null}
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
                onClick={pedirDica}
              >
                {rotuloDaDica}
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

        {blocoDaAlternativa}

        {tentativa.status === 'resolvido' ? (
          <FeedbackBanner tone="correto" mensagem={mensagemDoAcerto} />
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
            {naoConfirmados.length > 0 ? (
              <p className={styles.think} data-testid="nao-confirmados">
                Não deu para confirmar {naoConfirmados.join(', ')}. Não contaram como erro — e, por
                não terem sido conferidos, também não viraram treino.
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
