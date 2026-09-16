'use client'

/**
 * A jornada de estudo de UMA abertura.
 *
 * SUBSTITUI a navegação por abas do `OpeningCourse` ("Visão geral | Aprender |
 * Treinar | Variações | Planos | Erros comuns | Progresso"). O defeito daquela
 * tela não era estética: era pedir ao aluno que decidisse a ORDEM PEDAGÓGICA.
 * Para aprender a Italiana ele precisava primeiro entender a arquitetura da
 * interface, voltar ao menu entre cada assunto, e adivinhar quando já podia
 * treinar. Isso está invertido — o aluno escolhe o CONTEÚDO, o produto escolhe
 * a SEQUÊNCIA.
 *
 * O QUE CONTINUA SENDO DO ALUNO: voltar, reler, sair e retomar. "Automático"
 * aqui significa que o produto decide o que vem depois, e nunca que a navegação
 * foi tirada dele.
 *
 * O TREINO É O ÁPICE, não uma aba paralela. Ele é a última etapa, e só abre
 * depois do conteúdo — porque treinar recuperação de repertório sem ter recebido
 * o repertório é a mesma dívida que o resto do produto já pagou.
 *
 * A REGRA MAIS IMPORTANTE DESTE ARQUIVO: uma rodada que termina em erro NÃO
 * conclui a etapa nem a jornada. Quem garante é o domínio (`registrarRodada`
 * recusa rodada falha); aqui a garantia aparece como a ausência de qualquer
 * caminho que escreva conclusão a partir de um desfecho.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { StudyJourneyShell } from '@/components/jornada/StudyJourneyShell'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
import { RoundResultPanel } from '@/components/jornada/RoundResultPanel'
import { RepertoireDeviationFeedback } from '@/components/openings/RepertoireDeviationFeedback'
import { ModoReferencia } from '@/components/jornada/ModoReferencia'
import {
  concluirEtapa,
  criarJornada,
  registrarItem,
  registrarRodada,
  voltarParaEtapa,
  type StudyJourney,
  type StudyStage,
} from '@/domain/jornada'
import {
  ETAPA_DE_TREINO_DE_ABERTURA,
  alvosDeTreinoFinal,
  aplicarRespostaDoComputador,
  coberturaDaAbertura,
  construirJornadaDeAbertura,
  iniciarRodadaDeAbertura,
  jogarNaRodada,
  ladoDoAlvo,
  proximoAlvoDeCobertura,
  registrarAlvoRecente,
  respostaDoComputador,
  type OpeningTrainingRound,
} from '@/domain/openings/jornada'
import {
  activateOpeningRepertoire,
  emptyOpeningProgress,
  openingDiagnosticQuestions,
  type OpeningDefinition,
  type OpeningProgress,
} from '@/domain/openings'
import { ExplorerPanel } from '@/components/openings/ExplorerPanel'
import { applyMove, identidadeDePosicao, legalMoves, type SquareName } from '@/lib/chess'
import styles from './OpeningStudyJourney.module.css'

/** O id da jornada carrega o domínio: ver o contrato em `@/domain/types`. */
export function idDaJornadaDeAbertura(openingId: string): string {
  return `abertura:${openingId}`
}

/**
 * Abre a jornada na etapa pedida pela URL (plano §151).
 *
 * `?etapa=treino-final` faz o card "Treinar Abertura Italiana" do Hoje levar ao
 * treino em vez de recomeçar pela visão. `?mode=train` é o apelido antigo, que
 * as atividades já gravadas no plano do dia ainda usam — honrá-lo evita que um
 * card de ontem leve a lugar nenhum.
 *
 * NÃO É ATALHO. O salto passa por `voltarParaEtapa`, que só aceita etapa já
 * CONCLUÍDA ou a atual. Colar a URL do treino sem ter estudado não abre o
 * treino: abre onde o aluno de fato está. Sem essa passagem, o deep link seria
 * a porta dos fundos que desfaz a sequência inteira.
 */
function aplicarEtapaDaUrl(jornada: StudyJourney, stages: readonly StudyStage[]): StudyJourney {
  if (typeof window === 'undefined') return jornada
  const params = new URLSearchParams(window.location.search)

  const pedida = params.get('etapa')
  if (pedida) return voltarParaEtapa(jornada, pedida)

  const modo = params.get('mode')
  if (modo === 'train') {
    const treino = stages.find((stage) => stage.ehTreinoFinal === true)
    if (treino) return voltarParaEtapa(jornada, treino.id)
  }
  return jornada
}

export function OpeningStudyJourney({ opening }: { opening: OpeningDefinition }) {
  const { repo } = useRepository()
  const stages = useMemo(() => construirJornadaDeAbertura(opening), [opening])

  const [jornada, setJornada] = useState<StudyJourney | null>(null)
  const [progress, setProgress] = useState<OpeningProgress>(() => emptyOpeningProgress(opening.id))
  const [referencia, setReferencia] = useState(false)

  // Carrega a jornada gravada, ou cria uma. `null` do repositório significa
  // "nunca começou", e é o único gatilho de criação.
  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      const id = idDaJornadaDeAbertura(opening.id)
      const [gravada, prog] = await Promise.all([
        repo.getStudyJourney(id),
        repo.getOpeningProgress(opening.id),
      ])
      if (cancelado) return
      const base = gravada ?? criarJornada(id, opening.id, 'abertura', stages)
      setJornada(aplicarEtapaDaUrl(base, stages))
      if (prog) setProgress({ ...emptyOpeningProgress(opening.id), ...prog })
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [opening.id, repo, stages])

  const gravar = useCallback(
    (proxima: StudyJourney) => {
      setJornada(proxima)
      if (repo) void repo.saveStudyJourney(proxima)
    },
    [repo],
  )

  if (!jornada) {
    return <p className={styles.estado}>Abrindo o seu estudo desta abertura…</p>
  }

  if (referencia) {
    return (
      <ModoReferencia
        titulo={opening.name}
        stages={stages}
        aoSair={() => setReferencia(false)}
        conteudoDaEtapa={(stage) => (
          // A MESMA função de conteúdo da jornada. Uma segunda renderização do
          // material para a consulta seria a segunda fonte da mesma verdade, e
          // divergiria na primeira correção de texto.
          <ConteudoDeEtapa
            opening={opening}
            stage={stage}
            jornada={jornada}
            aoResponder={() => undefined}
          />
        )}
      />
    )
  }

  const stage = stages.find((item) => item.id === jornada.currentStageId) ?? stages[0]
  const ehTreino = stage?.id === ETAPA_DE_TREINO_DE_ABERTURA

  return (
    <StudyJourneyShell
      titulo={opening.name}
      jornada={jornada}
      stages={stages}
      aoVoltarEtapa={(stageId) => gravar(voltarParaEtapa(jornada, stageId))}
      aoContinuar={ehTreino ? undefined : () => gravar(concluirEtapa(jornada, stages, new Date()))}
      rodapeOculto={ehTreino}
      aoRever={() => setReferencia(true)}
    >
      {ehTreino ? (
        <TreinoDaAbertura
          opening={opening}
          jornada={jornada}
          stage={stage}
          progress={progress}
          aoRegistrar={gravar}
        />
      ) : (
        <ConteudoDeEtapa opening={opening} stage={stage} jornada={jornada} aoResponder={gravar} />
      )}
    </StudyJourneyShell>
  )
}

/* ---------------------------------------------------------------- conteúdo */

/**
 * O conteúdo das etapas de leitura e da prática guiada.
 *
 * Cada etapa lê da MESMA `OpeningDefinition` que as abas antigas liam — nada de
 * conteúdo foi jogado fora na migração (plano §153). O que mudou é quem decide
 * a ordem em que ele aparece.
 */
function ConteudoDeEtapa({
  opening,
  stage,
  jornada,
  aoResponder,
}: {
  opening: OpeningDefinition
  stage: StudyStage
  jornada: StudyJourney
  aoResponder: (proxima: StudyJourney) => void
}) {
  switch (stage.tipo) {
    case 'abertura:visao':
      return (
        <>
          <p className={styles.texto}>{opening.description}</p>
          <p className={styles.texto}>{opening.philosophy}</p>
          <p className={styles.nota}>
            A fase de abertura termina quando: {opening.transitionToMiddlegame}
          </p>
          {/*
            "JÁ CONHEÇO" (plano §15). Ele NÃO pula a jornada: ele abre uma
            verificação curta. Quem demonstra conhecimento avança; quem não
            demonstra recebe a lição. Um botão que simplesmente pulasse tudo
            seria a porta de fuga que esvazia a sequência — e o aluno que
            superestima o próprio nível cairia no treino sem o repertório.
          */}
          <JaConheco opening={opening} />
        </>
      )

    case 'abertura:ideias':
      return (
        <>
          <p className={styles.texto}>
            Antes de qualquer sequência de lances, estas são as ideias que se repetem nesta
            abertura. Reconhecê-las é o que permite jogar posições que você nunca viu.
          </p>
          <ul className={styles.lista}>
            {opening.structures.map((estrutura) => (
              <li key={estrutura.name}>
                <strong>{estrutura.name}.</strong> {estrutura.description}
                {estrutura.pawnBreaks.length > 0 ? (
                  <> Rupturas: {estrutura.pawnBreaks.join(', ')}.</>
                ) : null}
              </li>
            ))}
          </ul>
          {/*
            O GLOSSÁRIO VEIO DA ABA ANTIGA, e veio de propósito: o plano §153
            manda MIGRAR o conteúdo existente para as etapas, não apagá-lo.
            Ele mora aqui porque é aqui que as palavras aparecem pela primeira
            vez — "ruptura" e "tempo" são usadas na frase acima.
          */}
          <div className={styles.cards} aria-label="Glossário da abertura">
            {GLOSSARIO.map(([termo, significado]) => (
              <p key={termo} className={styles.nota}>
                <strong>{termo}.</strong> {significado}
              </p>
            ))}
          </div>
        </>
      )

    case 'abertura:linha-principal':
      return <LinhaComentada lances={opening.mainline} opening={opening} />

    case 'abertura:respostas':
      return (
        <>
          <p className={styles.texto}>
            Saber o que o adversário QUER é diferente de saber qual é o seu próximo lance. Estas são
            as respostas que aparecem de verdade.
          </p>
          <ul className={styles.lista}>
            {opening.variations.map((variacao) => (
              <li key={variacao.id}>
                <strong>{variacao.name}.</strong> {variacao.description}
              </li>
            ))}
          </ul>
          {/*
            O EXPLORER CONTINUA EXISTINDO, e continua sendo ENRIQUECIMENTO SOB
            DEMANDA: não consulta nada até o aluno pedir. Ele veio da aba antiga
            (plano §153: migrar, não apagar) e esta é a etapa certa — a pergunta
            "o que o mundo joga?" só faz sentido DEPOIS de o aluno saber o que a
            linha estudada prevê. Antes disso, a frequência vira a autoridade e
            o repertório dele vira sugestão.
          */}
          <ExplorerPanel posicoes={posicoesConsultaveis(opening)} />
        </>
      )

    case 'abertura:variacoes':
      return (
        <>
          <p className={styles.texto}>
            As variações entram no seu estudo automaticamente — você não precisa procurá-las numa
            aba separada.
          </p>
          {opening.variations.map((variacao) => (
            <div key={variacao.id} className={styles.bloco}>
              <h3 className={styles.blocoTitulo}>{variacao.name}</h3>
              <p className={styles.texto}>{variacao.description}</p>
              <p className={styles.linha}>{variacao.line.map((l) => l.san).join(' ')}</p>
            </div>
          ))}
        </>
      )

    case 'abertura:planos':
      return (
        <>
          {opening.plans.map((plano) => (
            <div key={plano.id} className={styles.bloco}>
              <h3 className={styles.blocoTitulo}>{plano.name}</h3>
              <p className={styles.texto}>{plano.objective}</p>
              <p className={styles.nota}>Quando: {plano.when}</p>
              <p className={styles.nota}>Risco: {plano.risk}</p>
              {/*
                A ROTA VISUAL veio da aba de Planos. Ela é TEXTO e não só setas
                no tabuleiro, de propósito: a regra de acessibilidade do projeto
                diz que toda informação importante também existe em texto, e uma
                rota que só existe como seta some para quem usa leitor de tela.
              */}
              {plano.arrows && plano.arrows.length > 0 ? (
                <p className={styles.nota}>
                  Rota visual: {plano.arrows.map((seta) => `${seta.from} → ${seta.to}`).join(' · ')}
                </p>
              ) : null}
            </div>
          ))}
          <div className={styles.bloco}>
            <h3 className={styles.blocoTitulo}>Erros comuns</h3>
            <ul className={styles.lista}>
              {opening.mistakes.map((erro) => (
                <li key={erro.id}>
                  <strong>{erro.moveSan}.</strong> {erro.explanation} {erro.principle}
                </li>
              ))}
            </ul>
          </div>
        </>
      )

    case 'abertura:dois-lados':
      return (
        <>
          <p className={styles.texto}>
            Esta abertura é do seu repertório de {opening.side === 'white' ? 'brancas' : 'pretas'}.
            Entender a posição pelo outro lado não é estudar outro curso: é saber o que o seu
            adversário está tentando fazer, e por que os lances dele fazem sentido.
          </p>
          <p className={styles.texto}>
            No treino final você vai jogar uma rodada pelo lado oposto. Ela existe para você
            reconhecer o plano do adversário no tabuleiro, não para memorizar a teoria dele.
          </p>
          {/*
            ATIVAR NO REPERTÓRIO veio da aba de Progresso. Fica nesta etapa, e
            não no fim: é aqui que o aluno já viu a linha inteira e os planos, e
            portanto tem base para decidir se esta abertura é dele. Oferecer isso
            na primeira tela seria pedir um compromisso antes do conhecimento.
          */}
          <AtivarRepertorio opening={opening} />
        </>
      )

    case 'abertura:pratica-guiada':
      return (
        <PraticaGuiada
          opening={opening}
          stage={stage}
          jornada={jornada}
          aoResponder={aoResponder}
        />
      )

    default:
      return <p className={styles.texto}>{stage.objetivo}</p>
  }
}

/**
 * Glossário da abertura.
 *
 * Migrado da aba antiga. As quatro palavras são as que aparecem no texto das
 * etapas seguintes, e o aluno de ~1100 não necessariamente as conhece.
 */
const GLOSSARIO = [
  ['Ruptura', 'Avanço de peão que desafia a estrutura e abre linhas para as peças.'],
  ['Transposição', 'Ordens diferentes de lances que chegam à mesma posição relevante.'],
  [
    'Tempo',
    'Uma jogada útil de desenvolvimento ou ameaça; perder tempos permite que o adversário avance.',
  ],
  ['Iniciativa', 'A capacidade de criar ameaças que obrigam o adversário a responder.'],
] as const

/**
 * "Já conheço": a verificação curta do plano §15.
 *
 * O BOTÃO NÃO PULA NADA SOZINHO. Ele faz uma pergunta do próprio repertório; se
 * o aluno reconhece a decisão, o app diz isso e ele segue com a jornada
 * (podendo avançar rápido pelas etapas de leitura). Se não reconhece, a
 * recomendação é a lição.
 *
 * Por que não deixar pular direto: quem superestima o próprio nível cairia no
 * treino final sem o repertório na cabeça, sairia por "fora do repertório" a
 * cada rodada, e concluiria que o app está errado. A verificação existe para
 * proteger o aluno dessa conclusão.
 */
function JaConheco({ opening }: { opening: OpeningDefinition }) {
  const [aberto, setAberto] = useState(false)
  const [escolhido, setEscolhido] = useState<string | null>(null)

  const questoes = useMemo(() => openingDiagnosticQuestions(opening), [opening])
  const questao = questoes[0]

  if (!questao) return null

  if (!aberto) {
    return (
      <button type="button" className={styles.secundario} onClick={() => setAberto(true)}>
        Já conheço
      </button>
    )
  }

  const correto = questao.moves.find((lance) => lance.role === 'main')?.san

  return (
    <div className={styles.bloco}>
      <p className={styles.kicker}>DIAGNÓSTICO</p>
      <p className={styles.texto}>Qual decisão você tomaria aqui?</p>
      <ul className={styles.opcoes} aria-label="Lances possíveis">
        {questao.moves.map((lance) => (
          <li key={lance.uci}>
            <button
              type="button"
              className={styles.opcao}
              aria-pressed={escolhido === lance.san}
              disabled={escolhido !== null}
              onClick={() => setEscolhido(lance.san)}
            >
              {lance.san}
            </button>
          </li>
        ))}
      </ul>
      {escolhido !== null ? (
        <p className={escolhido === correto ? styles.acertou : styles.errou} role="status">
          {escolhido === correto
            ? 'Você reconheceu a decisão do repertório. Pode avançar rápido pelas etapas de leitura — o treino final continua exigindo a demonstração.'
            : 'Essa não é a decisão que este repertório toma. Vale percorrer a lição antes do treino.'}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Ativar a abertura no repertório do aluno.
 *
 * Grava direto no `OpeningProgress`, que é onde o repertório ativo já morava —
 * não em `StudyJourney`. São duas verdades diferentes: a jornada diz o que foi
 * ESTUDADO; o repertório ativo diz o que o aluno ESCOLHEU jogar. Fundi-las faria
 * concluir o estudo de uma abertura significar adotá-la, e o aluno estuda
 * aberturas que decide não jogar.
 */
function AtivarRepertorio({ opening }: { opening: OpeningDefinition }) {
  const { repo } = useRepository()
  const [ativo, setAtivo] = useState<boolean | null>(null)

  useEffect(() => {
    if (!repo) return
    let cancelado = false
    void repo.getOpeningProgress(opening.id).then((prog) => {
      if (!cancelado) setAtivo(prog?.status === 'active_repertoire')
    })
    return () => {
      cancelado = true
    }
  }, [opening.id, repo])

  async function ativar() {
    if (!repo) return
    const atual = (await repo.getOpeningProgress(opening.id)) ?? emptyOpeningProgress(opening.id)
    await repo.saveOpeningProgress(activateOpeningRepertoire(atual, new Date().toISOString()))
    setAtivo(true)
  }

  return (
    <button
      type="button"
      className={styles.primario}
      onClick={() => void ativar()}
      disabled={ativo === true}
    >
      {ativo === true ? 'Repertório ativo' : 'Adicionar ao meu repertório'}
    </button>
  )
}

/** A linha principal, lance a lance, com a razão de cada um. */
function LinhaComentada({
  lances,
  opening,
}: {
  lances: OpeningDefinition['mainline']
  opening: OpeningDefinition
}) {
  const [indice, setIndice] = useState(0)
  const fens = useMemo(() => posicoesDaLinha(opening.rootFen, lances), [opening.rootFen, lances])
  const lance = lances[Math.min(indice, lances.length - 1)]

  return (
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={fens[Math.min(indice + 1, fens.length - 1)] ?? opening.rootFen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive={false}
        />
      }
    >
      <p className={styles.lanceAtual}>
        {indice + 1}. {lance?.san}
      </p>
      <p className={styles.texto}>{lance?.comment}</p>
      {lance?.strategicIdea ? <p className={styles.nota}>{lance.strategicIdea}</p> : null}
      {lance?.resultingPlan ? (
        <p className={styles.nota}>O que muda: {lance.resultingPlan}</p>
      ) : null}
      <div className={styles.navegacaoDaLinha}>
        <button
          type="button"
          className={styles.secundario}
          onClick={() => setIndice((n) => Math.max(0, n - 1))}
          disabled={indice === 0}
        >
          ← Lance anterior
        </button>
        <button
          type="button"
          className={styles.secundario}
          onClick={() => setIndice((n) => Math.min(lances.length - 1, n + 1))}
          disabled={indice >= lances.length - 1}
        >
          Próximo lance →
        </button>
      </div>
    </MesaDeEstudo>
  )
}

/**
 * Prática guiada: responder com apoio, antes do treino sem rede.
 *
 * A etapa conclui por RESPONDER, não por acertar — a regra `itens` do domínio
 * não tem como ler acerto. Prender a saída no desempenho é o que produz o chute.
 */
function PraticaGuiada({
  opening,
  stage,
  jornada,
  aoResponder,
}: {
  opening: OpeningDefinition
  stage: StudyStage
  jornada: StudyJourney
  aoResponder: (proxima: StudyJourney) => void
}) {
  const total = stage.regra.tipo === 'itens' ? stage.regra.total : 0
  const feitos = jornada.itensRespondidos[stage.id]?.length ?? 0
  const indice = Math.min(feitos, Math.max(0, total - 1))
  const lance = opening.mainline[indice]

  const fens = useMemo(
    () => posicoesDaLinha(opening.rootFen, opening.mainline),
    [opening.rootFen, opening.mainline],
  )
  const [escolhido, setEscolhido] = useState<string | null>(null)

  if (!lance || feitos >= total) {
    return (
      <p className={styles.texto} role="status">
        Prática guiada concluída. O treino final vem a seguir, e lá o apoio some.
      </p>
    )
  }

  const fen = fens[indice] ?? opening.rootFen
  const opcoes = opcoesDoLance(fen, lance.san)

  return (
    <>
      <div className={styles.tabuleiroEmbutido}>
        <ChessBoardView
          fen={fen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive={false}
        />
      </div>
      <p className={styles.texto}>
        Lance {indice + 1}: qual é o lance do repertório aqui? As opções estão à mostra — este é o
        degrau com apoio.
      </p>
      <ul className={styles.opcoes} aria-label="Lances possíveis">
        {opcoes.map((san) => (
          <li key={san}>
            <button
              type="button"
              className={styles.opcao}
              aria-pressed={escolhido === san}
              disabled={escolhido !== null}
              onClick={() => setEscolhido(san)}
            >
              {san}
            </button>
          </li>
        ))}
      </ul>
      {escolhido !== null ? (
        <div className={styles.veredito} role="status">
          <p className={escolhido === lance.san ? styles.acertou : styles.errou}>
            {escolhido === lance.san ? '✓ É o lance do repertório.' : '✕ Não é o lance estudado.'}
          </p>
          <p className={styles.texto}>{lance.comment}</p>
          <button
            type="button"
            className={styles.primario}
            onClick={() => {
              setEscolhido(null)
              aoResponder(registrarItem(jornada, stage.id, `guiada-${indice}`))
            }}
          >
            Continuar
          </button>
        </div>
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------------ treino */

/**
 * O treino final, em rodadas.
 *
 * O CICLO: o aluno joga, o computador responde, e isso segue até o limite da
 * abertura ou até o aluno sair do repertório. Ao terminar — de qualquer jeito —
 * o tabuleiro volta ao início e a rodada seguinte tenta cobrir OUTRO alvo.
 *
 * O computador responde com um atraso curto e visível. Instantâneo faria o
 * tabuleiro saltar dois lances de uma vez, e o aluno perderia de vista o que o
 * adversário respondeu — que é metade do que esta etapa quer ensinar.
 */
const ATRASO_DO_COMPUTADOR_MS = 450

function TreinoDaAbertura({
  opening,
  jornada,
  stage,
  progress,
  aoRegistrar,
}: {
  opening: OpeningDefinition
  jornada: StudyJourney
  stage: StudyStage
  progress: OpeningProgress
  aoRegistrar: (proxima: StudyJourney) => void
}) {
  const alvos = useMemo(() => alvosDeTreinoFinal(opening), [opening])
  const cobertura = coberturaDaAbertura(jornada, stage.id, alvos)

  /**
   * A PRIMEIRA RODADA NASCE NO ESTADO INICIAL, e não num efeito.
   *
   * Abrir a rodada dentro de `useEffect` funcionava e era errado: a tela
   * renderizava uma vez sem rodada, o efeito chamava `setRound`, e ela
   * renderizava de novo. Além do quadro perdido, é um `setState` em efeito —
   * o padrão que o React 19 passou a acusar porque ele esconde justamente este
   * tipo de estado derivado que podia ter sido calculado de saída.
   *
   * O aluno já escolheu treinar ao chegar nesta etapa, então não há decisão a
   * esperar: a rodada pode existir desde o primeiro quadro.
   */
  const [recentes, setRecentes] = useState<string[]>([])
  const [round, setRound] = useState<OpeningTrainingRound | null>(() =>
    cobertura.completa ? null : abrirRodada(opening, alvos, cobertura.cobertos, []),
  )
  const [desvio, setDesvio] = useState<{ jogado: string; esperado?: string } | null>(null)
  const [selecionada, setSelecionada] = useState<SquareName | null>(null)

  const novaRodada = useCallback(() => {
    const alvo = proximoAlvoDeCobertura(alvos, cobertura.cobertos, recentes, Math.random)
    setDesvio(null)
    setSelecionada(null)
    setRound(iniciarRodadaDeAbertura(opening, alvo, ladoDoAlvo(opening, alvo)))
    setRecentes((atuais) => registrarAlvoRecente(atuais, alvo))
  }, [alvos, cobertura.cobertos, opening, recentes])

  // A resposta do computador, depois que o aluno joga.
  useEffect(() => {
    if (!round || round.desfecho !== 'ativa') return
    if (vezDoAluno(round)) return

    const timer = window.setTimeout(() => {
      const resposta = respostaDoComputador(opening, round, progress, Math.random)
      if (!resposta) return
      setRound((atual) => (atual ? aplicarRespostaDoComputador(opening, atual, resposta) : atual))
    }, ATRASO_DO_COMPUTADOR_MS)

    return () => window.clearTimeout(timer)
  }, [opening, progress, round])

  if (cobertura.completa) {
    return (
      <div className={styles.veredito} role="status">
        <p className={styles.acertou}>✓ Treino concluído.</p>
        <p className={styles.texto}>
          Você demonstrou a linha principal, cada variação estudada e o lado oposto. Concluir o
          treino não significa que a abertura está dominada para sempre — ela volta em revisão.
        </p>
      </div>
    )
  }

  if (!round) return <p className={styles.estado}>Montando a rodada…</p>

  function tentar(from: SquareName, to: SquareName): boolean {
    if (!round || round.desfecho !== 'ativa' || !vezDoAluno(round)) return false
    const aplicado = applyMove(round.currentFen, { from, to, promotion: 'q' })
    if (!aplicado) return false

    const { round: proximo, resultado } = jogarNaRodada(opening, round, aplicado.move.uci)
    setRound(proximo)
    setSelecionada(null)

    if (proximo.desfecho === 'falhou' && proximo.failureReason === 'out_of_repertoire') {
      setDesvio({ jogado: aplicado.move.san, esperado: lanceEsperado(opening, round) })
    }

    // A ÚNICA escrita de progresso do treino. `registrarRodada` recusa rodada
    // falha, então não existe caminho daqui até "etapa concluída" com erro.
    if (proximo.desfecho !== 'ativa') {
      aoRegistrar(registrarRodada(jornada, stage.id, proximo.branchScopeId, proximo.desfecho))
    }

    void resultado
    return true
  }

  const terminou = round.desfecho !== 'ativa'

  return (
    /*
      A MESA DE ESTUDO: tabuleiro grande, instrução ao lado.

      É a etapa em que o aluno JOGA. Antes disso o tabuleiro ficava preso em
      28 rem, com o texto empilhado embaixo — num treino de repertório, onde a
      única coisa que importa é enxergar a posição e escolher o lance, isso punha
      o conteúdo em segundo plano.
    */
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={round.currentFen}
          orientation={round.userSide === 'white' ? 'w' : 'b'}
          selected={selecionada}
          onMove={tentar}
          /* SEGUNDO CLIQUE JOGA. Sem a primeira linha o clique só selecionava:
             clicar na casa de destino — vazia, logo sem lance legal saindo dela
             — apenas apagava a seleção, e quem não arrasta não conseguia jogar.
             A ordem é a de `OpeningCourse`: tenta o lance, e só se ele não sair
             é que a casa vira a nova origem. */
          onSquareClick={(casa) => {
            if (selecionada && selecionada !== casa && tentar(selecionada, casa)) {
              setSelecionada(null)
              return
            }
            setSelecionada(legalMoves(round.currentFen, casa).length > 0 ? casa : null)
          }}
          interactive={!terminou && vezDoAluno(round)}
        />
      }
    >
      {terminou ? (
        <RoundResultPanel
          desfecho={round.desfecho as 'sucesso' | 'falhou'}
          resumo={
            round.desfecho === 'sucesso'
              ? 'Você recuperou a linha inteira até o fim da abertura.'
              : 'A rodada terminou aqui. O tabuleiro volta ao início na próxima.'
          }
          cobertura={{ cobertos: cobertura.cobertos.length, exigidos: alvos.length }}
          aoProximaRodada={novaRodada}
        >
          {desvio ? (
            <RepertoireDeviationFeedback
              sanJogado={desvio.jogado}
              sanEsperado={desvio.esperado}
              linha={opening.name}
            />
          ) : null}
        </RoundResultPanel>
      ) : (
        <>
          <p className={styles.kicker}>TREINO · sem dicas</p>
          <p className={styles.texto}>
            {vezDoAluno(round)
              ? 'Jogue o lance do repertório. O adversário responde em seguida.'
              : 'O adversário está respondendo…'}
          </p>
          <p className={styles.nota}>
            Rodada {cobertura.cobertos.length + 1} de {alvos.length} — treinando{' '}
            {nomeDoAlvo(opening, round.branchScopeId)}.
          </p>
        </>
      )}
    </MesaDeEstudo>
  )
}

/* ---------------------------------------------------------------- auxílios */

/**
 * Abre a rodada do próximo alvo pendente.
 *
 * Fora do componente porque o estado inicial a chama antes de qualquer hook
 * existir — e porque assim ela é uma função pura de verdade, testável sem
 * montar React.
 */
function abrirRodada(
  opening: OpeningDefinition,
  alvos: readonly string[],
  cobertos: readonly string[],
  recentes: readonly string[],
): OpeningTrainingRound | null {
  const alvo = proximoAlvoDeCobertura(alvos, cobertos, recentes, Math.random)
  if (!alvo) return null
  return iniciarRodadaDeAbertura(opening, alvo, ladoDoAlvo(opening, alvo))
}

function vezDoAluno(round: OpeningTrainingRound): boolean {
  const vez = round.currentFen.split(' ')[1] === 'b' ? 'black' : 'white'
  return vez === round.userSide
}

function nomeDoAlvo(opening: OpeningDefinition, alvo: string): string {
  if (alvo === 'mainline') return 'a linha principal'
  if (alvo === 'perspectiva-reversa') return 'o lado do adversário'
  return opening.variations.find((v) => v.id === alvo)?.name ?? 'uma variação'
}

/** O lance que o repertório prevê no nó atual, para o painel de desvio. */
function lanceEsperado(
  opening: OpeningDefinition,
  round: OpeningTrainingRound,
): string | undefined {
  const node = opening.graph.get(round.currentNodeId)
  return node?.outgoingMoves.find((edge) => edge.role === 'main')?.san
}

/**
 * As posições que o explorador pode consultar.
 *
 * Derivadas da linha principal, deduplicadas por identidade — transposições
 * chegam à mesma posição, e oferecê-la duas vezes no seletor confundiria sem
 * acrescentar nada. Migrado da aba antiga sem mudança de regra.
 */
function posicoesConsultaveis(opening: OpeningDefinition) {
  const fens = posicoesDaLinha(opening.rootFen, opening.mainline)
  return [
    {
      identidade: identidadeDePosicao(opening.rootFen),
      fen: opening.rootFen,
      rotulo: 'Posição inicial',
    },
    ...opening.mainline.slice(0, 8).map((lance, indice) => {
      const fen = fens[indice + 1] ?? opening.rootFen
      return { identidade: identidadeDePosicao(fen), fen, rotulo: `${indice + 1}. ${lance.san}` }
    }),
  ].filter(
    (posicao, indice, todas) =>
      todas.findIndex((item) => item.identidade === posicao.identidade) === indice,
  )
}

/** As posições ao longo de uma linha. Índice 0 é a inicial. */
function posicoesDaLinha(raiz: string, lances: OpeningDefinition['mainline']): string[] {
  const fens = [raiz]
  let atual = raiz
  for (const lance of lances) {
    const aplicado = applyMove(atual, lance.san)
    if (!aplicado) break
    atual = aplicado.fenAfter
    fens.push(atual)
  }
  return fens
}

/**
 * As opções da prática guiada: o lance certo mais distratores LEGAIS.
 *
 * Derivadas da posição, e não escritas no conteúdo: uma lista autorada seria a
 * segunda fonte da mesma verdade, e envelheceria no dia em que a linha mudasse.
 */
function opcoesDoLance(fen: string, correto: string): string[] {
  const legais = legalMoves(fen).map((lance) => lance.san)
  const distratores = legais.filter((san) => san !== correto).slice(0, 3)
  return [correto, ...distratores].sort((a, b) => a.localeCompare(b))
}
