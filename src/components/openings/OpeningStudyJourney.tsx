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
import { useLanceNoTabuleiro } from '@/components/chess/useLanceNoTabuleiro'
import { StudyJourneyShell } from '@/components/jornada/StudyJourneyShell'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
import { SparringDaAbertura } from '@/components/openings/SparringDaAbertura'
import { RoundResultPanel } from '@/components/jornada/RoundResultPanel'
import { RepertoireDeviationFeedback } from '@/components/openings/RepertoireDeviationFeedback'
import {
  concluirEtapa,
  jornadaConcluida,
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
import { itensDaPraticaGuiadaDeAbertura } from '@/domain/openings/itens-da-etapa'
import {
  activateOpeningRepertoire,
  emptyOpeningProgress,
  openingDiagnosticQuestions,
  type OpeningDefinition,
  type OpeningProgress,
} from '@/domain/openings'
import { percursoDaLinhaPrincipal, percursoDoRamo } from '@/domain/openings/linha-principal'
import { migrarJornadaDeAbertura } from '@/domain/openings/migracao'
import {
  estadoDoRamo,
  idDeRamoPraticado,
  idDeRamoVisto,
  ramoRecomendado,
  ramosDaAbertura,
  type EstadoDoRamo,
  type RamoDeAbertura,
} from '@/domain/openings/ramos'
import { posicoesDaLinha } from '@/domain/openings/variacoes'
import {
  iniciarSequencia,
  jogarNaSequencia,
  // Este arquivo já tem um `lanceEsperado` — o do GRAFO, que responde "qual é a
  // continuação principal a partir deste nó". O da linha responde outra coisa:
  // "qual é o próximo lance DESTA sequência". Dois nomes, duas perguntas.
  lanceEsperado as lanceEsperadoNaLinha,
  type LinhaTreinavel,
} from '@/domain/exercicios'
import { applyMove, legalMoves, type PromotionPiece, type SquareName } from '@/lib/chess'
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
      /*
        A JORNADA GRAVADA PASSA PELA MIGRAÇÃO ANTES DE CHEGAR À TELA.

        Quem estudou antes do VNext tem nove etapas no armazenamento, e um
        cursor que pode apontar para `respostas` — id que não existe mais. Sem
        traduzir, `stages.find` devolveria `undefined`, a tela cairia no
        `?? stages[0]` e o aluno voltaria para a Visão sem nenhuma mensagem.

        A migração é IDEMPOTENTE e só grava quando de fato mudou algo: chamar no
        caminho de leitura não reescreve o registro de quem já migrou.
      */
      const base = gravada ?? criarJornada(id, opening.id, 'abertura', stages)
      const { jornada: migrada, migrou } = migrarJornadaDeAbertura(base, stages)
      if (migrou && repo) void repo.saveStudyJourney(migrada)
      setJornada(aplicarEtapaDaUrl(migrada, stages))
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

  /*
    O MODO REFERÊNCIA SAIU, e a razão é dupla.

    ELE ERA REDUNDANTE: o conteúdo da jornada É o que está sendo ensinado, e o
    Mapa do estudo já abre qualquer etapa desde o primeiro acesso. "Rever
    conteúdo" prometia uma segunda forma de ver a mesma coisa.

    E ELE ERA QUEBRADO: empilhava TODAS as etapas numa página só, com
    `aoResponder` vazio — os tabuleiros interativos apareciam e não respondiam a
    nada. O aluno clicava numa peça de uma etapa de treino e o app ignorava, sem
    dizer por quê.
  */

  const stage = stages.find((item) => item.id === jornada.currentStageId) ?? stages[0]
  const ehTreino = stage?.id === ETAPA_DE_TREINO_DE_ABERTURA

  /*
    PRATICAR CONTRA O COMPUTADOR, oferecido a quem já concluiu.

    QUANDO: ao terminar a jornada e a cada vez que o aluno reabre a abertura.
    Repetição livre é como um repertório entra na cabeça, e a sequência — que
    ensina uma vez e termina — não tinha onde oferecer isso.

    NÃO APARECE ANTES: praticar contra o bot sem ter visto a linha vira tentativa
    e erro contra um adversário que sabe a resposta, que é a forma mais rápida de
    o aluno concluir que não entende a abertura.
  */
  const concluiu = jornadaConcluida(jornada, stages)

  return (
    <StudyJourneyShell
      titulo={opening.name}
      jornada={jornada}
      stages={stages}
      aoVoltarEtapa={(stageId) => gravar(voltarParaEtapa(jornada, stageId))}
      aoContinuar={ehTreino ? undefined : () => gravar(concluirEtapa(jornada, stages, new Date()))}
      rodapeOculto={ehTreino}
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
      {concluiu ? <SparringDaAbertura opening={opening} /> : null}
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
/**
 * A POSIÇÃO QUE IDENTIFICA A ABERTURA.
 *
 * É a que se alcança ao fim da linha principal — a posição que o repertório
 * está TENTANDO alcançar. Ela existe por razão pedagógica e não para preencher
 * espaço: o plano é explícito em não usar tabuleiro decorativo nem a posição
 * inicial genérica, que não diz nada sobre a abertura estudada.
 *
 * As etapas de leitura falam sobre esta posição — estruturas, planos, o que o
 * adversário quer. Lê-las sem ela na tela é o que o contrato visual proíbe.
 */
function fenCaracteristica(opening: OpeningDefinition): string {
  const posicoes = posicoesDaLinha(opening.rootFen, opening.mainline)
  return posicoes[posicoes.length - 1] ?? opening.rootFen
}

/** Envolve uma etapa de leitura com o tabuleiro à esquerda. */
function ComTabuleiro({
  opening,
  children,
}: {
  opening: OpeningDefinition
  children: React.ReactNode
}) {
  return (
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={fenCaracteristica(opening)}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive={false}
        />
      }
    >
      {children}
    </MesaDeEstudo>
  )
}

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
        <ComTabuleiro opening={opening}>
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
        </ComTabuleiro>
      )

    case 'abertura:ideias':
      return (
        <ComTabuleiro opening={opening}>
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
        </ComTabuleiro>
      )

    case 'abertura:linha-principal':
      return <LinhaPrincipalEmDoisTempos opening={opening} />

    case 'abertura:variacoes':
      return (
        <BibliotecaDeRamos
          opening={opening}
          stage={stage}
          jornada={jornada}
          aoResponder={aoResponder}
        />
      )

    case 'abertura:planos':
      return (
        <ComTabuleiro opening={opening}>
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
        </ComTabuleiro>
      )

    case 'abertura:dois-lados':
      return (
        <ComTabuleiro opening={opening}>
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
        </ComTabuleiro>
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

  /*
    SÓ LANCE QUE EXISTE NO REPERTÓRIO conta como decisão. Qualquer outro é
    devolvido: aqui a pergunta é entre as decisões que ESTA abertura toma, e
    aceitar um lance qualquer transformaria a verificação em outra coisa.

    O clique em duas casas entra pela mesma porta do arraste — ver
    `useLanceNoTabuleiro`.
  */
  const tentar = useCallback(
    (origem: SquareName, destino: SquareName, promocao?: PromotionPiece) => {
      const uci = `${origem}${destino}${promocao ?? ''}`
      const conhecido = questao?.moves.find((opcao) => opcao.uci === uci)
      if (!conhecido) return false
      setEscolhido(conhecido.uci)
      return true
    },
    [questao],
  )

  /*
    O HOOK VEM ANTES DOS RETORNOS CONDICIONAIS. Chamá-lo depois mudaria a ordem
    dos hooks entre renderizações, e o React proíbe — a `fen` vazia é inofensiva
    porque o hook só age quando `ativo`.
  */
  const lance = useLanceNoTabuleiro({
    fen: questao?.fen ?? '',
    ativo: aberto && escolhido === null,
    aoTentar: (origem, destino) => tentar(origem, destino),
  })

  if (!questao) return null

  if (!aberto) {
    return (
      <button type="button" className={styles.secundario} onClick={() => setAberto(true)}>
        Já conheço
      </button>
    )
  }

  const correto = questao.moves.find((opcao) => opcao.role === 'main')?.uci

  return (
    <div className={styles.bloco}>
      <p className={styles.kicker}>DIAGNÓSTICO</p>
      <p className={styles.texto}>Qual decisão você tomaria aqui?</p>
      {/*
        A DECISÃO É TOMADA NO TABULEIRO, e não escolhida numa lista.

        Aqui havia `[Nf3] [Bc4] [d3]`. Ler três lances e apontar um é
        reconhecimento de string: o aluno confirma que já viu aquela notação, não
        que reconhece a posição. A pergunta é "qual decisão VOCÊ tomaria" — e
        tomar uma decisão de abertura é jogar o lance.
      */}
      <div className={styles.tabuleiroEmbutido}>
        <ChessBoardView
          fen={questao.fen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive={escolhido === null}
          selected={lance.selecionada}
          targets={lance.destinos}
          onMove={tentar}
          onSquareClick={lance.aoClicarNaCasa}
        />
      </div>
      {escolhido === null ? <p className={styles.nota}>Jogue o lance no tabuleiro.</p> : null}
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

/**
 * Uma linha, lance a lance, com a razão de cada um.
 *
 * `inicio` existe para a etapa de variações: uma variação só começa a ensinar
 * no lance em que ela recusa a linha principal, e abrir a navegação no lance 1
 * faria o aluno reler cinco lances que ele acabou de estudar para chegar ao
 * único que é novo. Quem troca de variação REMONTA o componente (`key`), que é
 * o que mantém o índice válido sem efeito que escreve estado.
 */
function LinhaComentada({
  lances,
  opening,
  inicio = 0,
  antes,
  aoTerminar,
  rotuloDoFim,
}: {
  lances: readonly OpeningDefinition['mainline'][number][]
  opening: OpeningDefinition
  inicio?: number
  antes?: React.ReactNode
  /**
   * O que fazer quando o aluno chega ao último lance.
   *
   * Ausente, o "Próximo lance" simplesmente desabilita — é o comportamento de
   * referência, que a biblioteca de ramos usa. Presente, o fim da linha VIRA
   * uma porta: é assim que a linha principal passa de entender para completar
   * sem trocar de etapa nem de tela.
   */
  aoTerminar?: () => void
  rotuloDoFim?: string
}) {
  const primeiro = Math.min(Math.max(inicio, 0), Math.max(lances.length - 1, 0))
  const [indice, setIndice] = useState(primeiro)
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
      {antes}
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
          onClick={() => setIndice((n) => Math.max(primeiro, n - 1))}
          disabled={indice <= primeiro}
        >
          ← Lance anterior
        </button>
        {indice >= lances.length - 1 && aoTerminar ? (
          <button type="button" className={styles.primario} onClick={aoTerminar}>
            {rotuloDoFim ?? 'Continuar →'}
          </button>
        ) : (
          <button
            type="button"
            className={styles.secundario}
            onClick={() => setIndice((n) => Math.min(lances.length - 1, n + 1))}
            disabled={indice >= lances.length - 1}
          >
            Próximo lance →
          </button>
        )}
      </div>
    </MesaDeEstudo>
  )
}

/**
 * A LINHA PRINCIPAL EM DOIS TEMPOS: entender, e então completar.
 *
 * O QUE ELA ERA: `LinhaComentada` sobre a principal inteira — tabuleiro fixo,
 * ← / →, comentário. Referência boa, aquisição fraca. O aluno atravessava nove
 * lances sem produzir nenhum, e saía com a sensação de ter aprendido, que é o
 * desfecho mais provável e o menos verdadeiro.
 *
 * O QUE ELA É AGORA, dentro da MESMA etapa e sem nenhuma aba nova:
 *
 *   ENTENDER   o computador demonstra os primeiros lances, comentados;
 *   COMPLETAR  a partir dali o lance passa a ser do aluno, no tabuleiro, com o
 *              computador respondendo pelo outro lado na mesma transição.
 *
 * A AJUDA DECRESCE. A primeira decisão cobrada vem com objetivo e uma casa para
 * olhar; a segunda, só com o objetivo; da terceira em diante, só a posição.
 * Quem decide isso é `percursoDaLinhaPrincipal`, no domínio — a tela lê a
 * política e não a inventa, senão haveria duas respostas para a mesma pergunta.
 *
 * A ETAPA CONTINUA SENDO DE LEITURA, de propósito. Completar é o que ensina,
 * mas transformar isso em tranca contradiz o ADR-0016: orientar não é
 * aprisionar, e quem cobra de verdade é o treino final, que exige cobertura.
 */
function LinhaPrincipalEmDoisTempos({ opening }: { opening: OpeningDefinition }) {
  const percurso = useMemo(() => percursoDaLinhaPrincipal(opening), [opening])
  const [completando, setCompletando] = useState(false)

  if (!completando) {
    return (
      <LinhaComentada
        lances={percurso.exemplo}
        opening={opening}
        aoTerminar={() => setCompletando(true)}
        rotuloDoFim="Agora é a sua vez →"
      />
    )
  }

  return (
    <CompletarALinha
      opening={opening}
      percurso={percurso}
      tituloDoFim="Linha principal completa"
      notaDoFim="A etapa seguinte mostra o que fazer quando a partida sai desta linha."
    />
  )
}

/**
 * O segundo tempo: o aluno joga o resto da linha.
 *
 * NÃO HÁ BOTÃO ENTRE LANCES. Quem avança é o tabuleiro, e a resposta do
 * adversário entra na mesma transição do lance do aluno — o desenho que
 * `sequencia.ts` já garante e que a prática guiada já usa.
 *
 * ERRAR NÃO PUNE: a peça volta, a posição não anda, e o texto ao lado diz o que
 * aconteceu. O aluno fica NA decisão até resolvê-la, em vez de ser arrastado
 * para a seguinte sem ter entendido esta.
 */
function CompletarALinha({
  opening,
  percurso,
  antes,
  tituloDoFim,
  notaDoFim,
  aoConcluir,
}: {
  opening: OpeningDefinition
  percurso: ReturnType<typeof percursoDaLinhaPrincipal>
  /** O contexto que fica acima da instrução. O ramo usa; a principal, não. */
  antes?: React.ReactNode
  /** O que a tela declara concluído. Ver o comentário no painel de fim. */
  tituloDoFim?: string
  /** O que vem a seguir, quando há algo a dizer. */
  notaDoFim?: string
  /**
   * Chamado UMA vez, quando a linha termina.
   *
   * Existe para o ramo gravar "praticado". A linha principal não passa nada, e
   * é deliberado: §15.4 proíbe dupla contagem, e a etapa dela é de leitura.
   */
  aoConcluir?: () => void
}) {
  const [estado, setEstado] = useState(() => iniciarSequencia(percurso.linha))
  const [errou, setErrou] = useState(false)
  /** Já revelou a resposta desta decisão? Some quando a linha anda. */
  const [revelado, setRevelado] = useState(false)

  const esperado = lanceEsperadoNaLinha(percurso.linha, estado)
  /*
    O ÍNDICE NA PRINCIPAL é o da demonstração mais o da sequência — a linha
    treinável começa depois do exemplo, então os dois índices não coincidem.
    Foi exatamente esse deslocamento que, na prática guiada, fez a tela pedir os
    lances do adversário.
  */
  const indiceNaPrincipal = percurso.demonstrados + estado.indice
  const ordem = percurso.decisoes.findIndex((item) => item.indice === indiceNaPrincipal)
  const decisao = percurso.decisoes[ordem]
  const licaoAtual = opening.mainline[indiceNaPrincipal]

  /*
    OS DOIS ÚLTIMOS LANCES, e a distância entre eles não é detalhe.

    O motor joga a resposta do adversário na MESMA transição, então quando a tela
    volta a pedir algo o índice já andou DOIS: o lance do aluno ficou em
    `indiceNaPrincipal - 2` e a resposta do computador em `- 1`.

    A primeira versão desta tela usava `- 1` para as duas coisas — e confirmava o
    acerto do aluno exibindo o comentário do lance do ADVERSÁRIO. Nada errava,
    nada avisava: só o texto explicava a jogada errada, toda vez.
  */
  const jogadoPeloAluno =
    indiceNaPrincipal >= 2 ? opening.mainline[indiceNaPrincipal - 2] : undefined
  const respostaDoAdversario =
    indiceNaPrincipal >= 1 ? opening.mainline[indiceNaPrincipal - 1] : undefined
  const jaJogou = estado.jogados.length > 0

  const tentar = useCallback(
    (origem: SquareName, destino: SquareName, promocao?: PromotionPiece) => {
      const resultado = jogarNaSequencia(
        percurso.linha,
        estado,
        `${origem}${destino}${promocao ?? ''}`,
      )

      // Nem chegou a ser lance: o tabuleiro devolve a peça e nada muda.
      if (resultado.tipo === 'ilegal') return false

      if (resultado.tipo === 'fora-da-linha') {
        setErrou(true)
        return false
      }

      setErrou(false)
      setRevelado(false)
      setEstado(resultado.estado)
      /*
        A CONCLUSÃO ACONTECE NO ATO DO LANCE, e não num `useEffect` que observa
        o estado. Um efeito aqui renderizaria a tela uma vez antes de gravar, e
        é o padrão que o lint do projeto proíbe com razão — além de, num
        desmonte rápido, gravar depois de a tela ter sumido.
      */
      if (resultado.estado.status === 'concluida') aoConcluir?.()
      return true
    },
    [estado, percurso.linha, aoConcluir],
  )

  const lance = useLanceNoTabuleiro({
    fen: estado.fen,
    ativo: esperado !== null,
    aoTentar: (origem, destino) => tentar(origem, destino),
  })

  if (esperado === null) {
    /*
      O TEXTO DE FIM É DO CHAMADOR, e a razão é um defeito real: este componente
      serve a linha principal E ao estudo de um ramo, e a primeira versão dizia
      "Linha principal completa" nos dois. Dentro da Defesa dos Dois Cavalos,
      isso é o app afirmando que o aluno acabou outra coisa.

      Uma decisão só não é "decisões": um ramo curto cobra UMA, e o plural fixo
      contaria errado em voz alta.
    */
    const quantas =
      percurso.decisoes.length === 1 ? 'a decisão' : `as ${percurso.decisoes.length} decisões`
    return (
      <ComTabuleiro opening={opening}>
        {antes}
        <p className={styles.texto} role="status">
          ✓ {tituloDoFim ?? 'Linha principal completa'}. Você jogou {quantas} sem consultar a
          notação.
        </p>
        {notaDoFim ? <p className={styles.nota}>{notaDoFim}</p> : null}
      </ComTabuleiro>
    )
  }

  return (
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={estado.fen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive
          selected={lance.selecionada}
          targets={lance.destinos}
          onMove={tentar}
          onSquareClick={lance.aoClicarNaCasa}
        />
      }
    >
      {antes}

      {/*
        A POSIÇÃO NA SEQUÊNCIA. Só aparece quando de fato existe: um "Decisão 0
        de 3" seria a tela contando errado em voz alta, e um `|| 1` esconderia o
        mesmo problema fingindo que é o primeiro.
      */}
      {ordem >= 0 ? (
        <p className={styles.kicker}>
          Decisão {ordem + 1} de {percurso.decisoes.length}
        </p>
      ) : null}

      {/*
        O ENUNCIADO É O QUE A POLÍTICA MANDA MOSTRAR, e nada além.

        Mostrar sempre o objetivo seria confortável e erraria o alvo: ajuda
        constante vira muleta, e a etapa passaria a medir leitura em vez de
        recuperação.
      */}
      <p className={styles.texto}>
        {decisao?.nivel !== 'posicao' && decisao?.objetivo
          ? decisao.objetivo
          : 'Sua vez. Qual lance continua a linha?'}
      </p>

      {decisao?.nivel === 'objetivo-e-dica' && decisao.dica ? (
        <p className={styles.nota}>
          {decisao.dica.tipo === 'casa-alvo'
            ? `A casa que decide é ${decisao.dica.casa}.`
            : `A peça que joga está em ${decisao.dica.casa}.`}
        </p>
      ) : null}

      {/*
        O FEEDBACK É UM `role="status"` QUE TROCA DE TEXTO, e não um bloco que
        aparece e some: assim o leitor de tela anuncia sem a página saltar.
      */}
      <p className={styles.nota} role="status">
        {errou
          ? 'Esse não é o lance desta linha. A posição não mudou — tente de novo.'
          : jaJogou && respostaDoAdversario
            ? `O computador respondeu ${respostaDoAdversario.san}.`
            : 'Jogue no tabuleiro.'}
      </p>

      {/*
        A CONFIRMAÇÃO EXPLICA O LANCE DO ALUNO, e não o do adversário. É o lance
        dele que ele acabou de escolher, e é a razão dele que precisa ficar.
      */}
      {jaJogou && !errou && jogadoPeloAluno ? (
        <div className={styles.veredito}>
          <p className={styles.acertou}>✓ {jogadoPeloAluno.san} é o lance da linha.</p>
          <p className={styles.texto}>{jogadoPeloAluno.comment}</p>
        </div>
      ) : null}

      {/*
        A SAÍDA DE QUEM TRAVOU. Sem ela, um aluno que não lembra o lance fica
        preso na decisão — e a etapa que deveria ensinar vira um portão.
        Revelar não é falhar: é o degrau final da escada de dicas.
      */}
      {revelado && licaoAtual ? (
        <div className={styles.veredito}>
          <p className={styles.texto}>
            O lance é <strong>{licaoAtual.san}</strong>. {licaoAtual.comment}
          </p>
        </div>
      ) : (
        <button type="button" className={styles.secundario} onClick={() => setRevelado(true)}>
          Não lembro — mostrar o lance
        </button>
      )}
    </MesaDeEstudo>
  )
}

/**
 * A BIBLIOTECA DE RAMOS — uma lista só, ensinada no tabuleiro.
 *
 * O QUE ELA SUBSTITUI: duas etapas, "Melhores respostas do adversário" e
 * "Variações importantes", que liam listas separadas por QUEM TOMAVA A DECISÃO.
 * A separação é limpa no domínio e artificial na cabeça de quem estuda — o
 * jogador pensa "estou na Defesa dos Dois Cavalos", não "estou na lista de ramos
 * cujo autor da decisão foi o oponente". Ver o ADR desta entrega.
 *
 * `autor` não sumiu: ele decide se a frase diz "o adversário joga" ou "você
 * joga". Deixou de decidir em QUE ETAPA o aluno encontra o ramo.
 *
 * A IMPORTÂNCIA ORDENA E ROTULA. `core` é o que o curso exige para concluir;
 * `secondary` e `optional` continuam visíveis e estudáveis — esconder conteúdo
 * é o defeito que o ADR-0016 desfez. O que muda é o que bloqueia a conclusão.
 *
 * CADA RAMO RESPONDE TRÊS PERGUNTAS antes de pedir um lance: o que mudou, o que
 * o adversário quer, e qual é o seu objetivo. Sem elas o ramo volta a ser uma
 * sequência de lances — e a pergunta que sobrevive à mudança de ordem dos
 * lances é justamente "o que ele está tentando fazer?".
 */
function BibliotecaDeRamos({
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
  const ramos = useMemo(() => ramosDaAbertura(opening), [opening])
  const respondidos = jornada.itensRespondidos[stage.id] ?? []
  /** `null` é a lista; um id é o estudo daquele ramo. Estado de tela, só. */
  const [aberto, setAberto] = useState<string | null>(null)
  const ramo = aberto === null ? undefined : ramos.find((item) => item.id === aberto)

  if (ramos.length === 0) {
    return (
      <ComTabuleiro opening={opening}>
        <p className={styles.texto}>
          Esta abertura ainda não tem variações autoradas. No treino, o computador joga a linha
          principal.
        </p>
      </ComTabuleiro>
    )
  }

  if (ramo) {
    return (
      <EstudoDoRamo
        opening={opening}
        ramo={ramo}
        stage={stage}
        jornada={jornada}
        aoResponder={aoResponder}
        aoVoltar={() => setAberto(null)}
      />
    )
  }

  const recomendado = ramoRecomendado(ramos, respondidos)

  return (
    <div className={styles.bloco}>
      <p className={styles.texto}>
        Cada card é uma decisão que a partida pode tomar a partir daqui. O tabuleiro mostra a
        posição em que ela acontece — é ela que você vai reconhecer no jogo, não o nome.
      </p>

      <ul className={styles.ramos}>
        {ramos.map((item) => {
          const estado = estadoDoRamo(respondidos, item.id)
          const ehRecomendado = item.id === recomendado?.id
          return (
            <li key={item.id}>
              <button
                type="button"
                className={styles.ramoCard}
                data-recomendado={ehRecomendado ? 'true' : undefined}
                onClick={() => {
                  /*
                    ABRIR JÁ GRAVA "visto". É a evidência mais fraca que existe e
                    é honesta: o rótulo que ela produz diz "visto", não
                    "estudada". Ver `estadoDoRamo`.
                  */
                  aoResponder(registrarItem(jornada, stage.id, idDeRamoVisto(item.id)))
                  setAberto(item.id)
                }}
              >
                {/*
                  O MINI-TABULEIRO MOSTRA O PONTO DE BIFURCAÇÃO, e não a posição
                  inicial: é a posição em que a decisão acontece que o aluno
                  precisa reconhecer numa partida.

                  `aria-hidden` porque ele é PRÉVIA — anunciar casa por casa daria
                  a quem usa leitor de tela um despejo de coordenadas em vez de
                  uma escolha. O que identifica o ramo, para essa pessoa, é o
                  texto logo abaixo.
                */}
                <span className={styles.ramoTabuleiro} aria-hidden="true">
                  <ChessBoardView
                    fen={fenDaBifurcacao(opening, item)}
                    orientation={opening.side === 'white' ? 'w' : 'b'}
                    interactive={false}
                  />
                </span>

                <span className={styles.ramoNome}>{item.nome}</span>
                {item.lanceQueRamifica ? (
                  <span className={styles.ramoLance}>{item.lanceQueRamifica}</span>
                ) : null}
                <span className={styles.ramoMeta}>
                  {ROTULO_DA_IMPORTANCIA[item.importancia] ?? 'essencial'}
                  {' · '}
                  {/*
                    ESTADO NUNCA DEPENDE SÓ DE COR: símbolo e palavra, sempre —
                    é regra do projeto e é o que faz o card funcionar impresso,
                    em alto contraste e para quem não distingue as cores.
                  */}
                  {SIMBOLO_DO_RAMO[estado]} {ROTULO_DO_ESTADO_DO_RAMO[estado]}
                </span>
                {ehRecomendado ? (
                  <span className={styles.ramoRecomendado}>Recomendado agora</span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {/*
        NENHUMA FREQUÊNCIA APARECE AQUI, e a ausência é decisão (plano §17.2). O
        campo `frequency` do grafo conta LINHAS AUTORADAS, não partidas do
        mundo. Renderizá-lo como "72% das partidas" seria inventar estatística a
        partir de um número que mede outra coisa.
      */}
      <p className={styles.nota}>
        Você vai encontrar estas linhas no treino: o computador joga a principal na primeira partida
        e os desvios quando você recomeça.
      </p>
    </div>
  )
}

/** O símbolo de cada estado. Par obrigatório da palavra, nunca substituto dela. */
const SIMBOLO_DO_RAMO: Record<EstadoDoRamo, string> = {
  praticado: '✓',
  visto: '◉',
  'nao-visto': '○',
}

const ROTULO_DO_ESTADO_DO_RAMO: Record<EstadoDoRamo, string> = {
  praticado: 'praticado',
  visto: 'visto',
  'nao-visto': 'não visto',
}

/**
 * A posição em que o ramo bifurca.
 *
 * NÃO É A POSIÇÃO INICIAL nem a final: é onde a decisão acontece. O plano §57 é
 * explícito — mini-board tem de ser posição identificável, e o tabuleiro da
 * posição inicial não diz nada sobre variação nenhuma.
 *
 * O ramo que não bifurca (o Giuoco Piano) mostra o fim da própria linha, que é
 * a posição que ele nomeia.
 */
function fenDaBifurcacao(opening: OpeningDefinition, ramo: RamoDeAbertura): string {
  const linha = ramo.ramificacao.variacao.line
  const posicoes = posicoesDaLinha(opening.rootFen, linha)
  const divergencia = ramo.ramificacao.indiceDaDivergencia
  const indice = divergencia === null ? posicoes.length - 1 : divergencia + 1
  return posicoes[Math.min(Math.max(indice, 0), posicoes.length - 1)] ?? opening.rootFen
}

/**
 * O ESTUDO DE UM RAMO: as três perguntas, o exemplo, e então a decisão.
 *
 * A SEQUÊNCIA É A DO PLANO §18.1 — o que mudou, o que ele quer, qual é o seu
 * objetivo, exemplo curto, você joga, o computador responde. As três primeiras
 * já vinham do conteúdo desde que o ramo virou a unidade; o que entra agora é o
 * fim: **o aluno produz a decisão que o ramo existe para ensinar**.
 *
 * SEM ISSO O RAMO ERA UMA FICHA DE LEITURA. Ele explicava o desvio, dizia o que
 * fazer, e nunca pedia que a pessoa o fizesse — o mesmo defeito que a linha
 * principal tinha e que o ADR-0023 corrigiu lá.
 */
function EstudoDoRamo({
  opening,
  ramo,
  stage,
  jornada,
  aoResponder,
  aoVoltar,
}: {
  opening: OpeningDefinition
  ramo: RamoDeAbertura
  stage: StudyStage
  jornada: StudyJourney
  aoResponder: (proxima: StudyJourney) => void
  aoVoltar: () => void
}) {
  const percurso = useMemo(() => percursoDoRamo(opening, ramo), [opening, ramo])
  const [praticando, setPraticando] = useState(false)

  const emComum = ramo.ramificacao.lancesEmComum.map((lance) => lance.san).join(' ')

  const contexto = (
    <>
      <button type="button" className={styles.secundario} onClick={aoVoltar}>
        ← Todas as variações
      </button>
      <h3 className={styles.blocoTitulo}>{ramo.nome}</h3>
      <p className={styles.texto}>{ramo.descricao}</p>

      {/* O QUE MUDOU — a decisão, dita com o lance que ela recusa. */}
      {ramo.lanceQueRamifica === null ? (
        <p className={styles.nota}>
          Este é o nome da linha principal até aqui — não é um desvio. Você já a percorreu na etapa
          anterior.
        </p>
      ) : (
        <p className={styles.nota}>
          {emComum ? <>Até {emComum}, tudo igual à linha principal. </> : null}
          {ramo.autor === 'adversario' ? 'O adversário joga' : 'Você joga'}{' '}
          <strong>{ramo.lanceQueRamifica}</strong>
          {/*
            A LINHA PRINCIPAL PODE SIMPLESMENTE TER ACABADO — é o caso da
            Escocesa, cuja principal termina em Cxd4 e cujos ramos vêm logo
            depois. Não há lance recusado, e escrever "no lugar de" ali
            inventaria uma alternativa que o conteúdo não tem.
          */}
          {ramo.lanceRecusado ? (
            <> no lugar de {ramo.lanceRecusado}, e é daí em diante que a partida muda.</>
          ) : (
            <>: a linha principal termina aqui, e daqui em diante quem escolhe é ele.</>
          )}
        </p>
      )}

      {/*
        AS DUAS PERGUNTAS QUE O ALUNO LEVA PARA A PARTIDA. Elas vêm do conteúdo,
        e um portão exige as duas em todo ramo `core`.
      */}
      {ramo.intencaoDoAdversario ? (
        <p className={styles.nota}>
          <strong>O que ele quer.</strong> {ramo.intencaoDoAdversario}
        </p>
      ) : null}
      {ramo.objetivoDoAluno ? (
        <p className={styles.nota}>
          <strong>Seu objetivo.</strong> {ramo.objetivoDoAluno}
        </p>
      ) : null}
    </>
  )

  if (!praticando) {
    return (
      <LinhaComentada
        key={ramo.id}
        opening={opening}
        lances={ramo.ramificacao.variacao.line}
        inicio={ramo.ramificacao.indiceDaDivergencia ?? 0}
        antes={contexto}
        aoTerminar={() => setPraticando(true)}
        rotuloDoFim="Jogue a continuação →"
      />
    )
  }

  return (
    <CompletarALinha
      opening={opening}
      percurso={percurso}
      antes={contexto}
      tituloDoFim={`${ramo.nome} — praticada`}
      notaDoFim="Volte à lista para escolher a próxima, ou siga para os planos."
      aoConcluir={() => aoResponder(registrarItem(jornada, stage.id, idDeRamoPraticado(ramo.id)))}
    />
  )
}

/** Como cada importância aparece na tela. Só as que não são o padrão. */
const ROTULO_DA_IMPORTANCIA: Record<string, string> = {
  secondary: 'complementar',
  optional: 'opcional',
}

/**
 * Prática guiada: jogar a linha principal com o computador do outro lado.
 *
 * COMO ELA ERA, e os dois defeitos andavam juntos: a etapa pedia UM ply por vez
 * e cobrava um clique em `Continuar` entre cada um. Como o índice do item era o
 * índice do lance, ela pedia também os lances do ADVERSÁRIO — o aluno jogava os
 * dois lados, um lance por tela, contra ninguém.
 *
 * AGORA É UMA PARTIDA. O aluno joga só os lances dele; o computador responde os
 * dele na mesma transição, pelo mesmo motor que as lições usam. Não há botão
 * entre lances: o que avança a etapa é o tabuleiro.
 *
 * ERRAR NÃO ENCERRA NADA, e é isso que faz o degrau ser "com apoio": a peça
 * volta, a explicação do lance do repertório aparece, e a posição continua a
 * mesma até o aluno acertar. A etapa conclui por RESPONDER, não por acertar de
 * primeira — prender a saída no desempenho é o que produz o chute.
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
  /*
    OS ITENS VÊM DO DOMÍNIO, e são a MESMA lista que contou o total desta etapa
    (`regraDeItens(itensDaPraticaGuiadaDeAbertura(opening))`). A tela não pode ter
    a sua própria contagem: duas contagens da mesma coisa divergem no dia em que
    só uma for corrigida, e o que aparece é uma etapa que nunca fecha.

    É daqui que sai o ID do item gravado. Um contador paralelo à lista — que era
    o que esta tela tinha — aponta para o item errado assim que o conteúdo muda
    de tamanho entre duas sessões.
  */
  const itens = useMemo(() => itensDaPraticaGuiadaDeAbertura(opening), [opening])
  const total = itens.length
  const respondidos = jornada.itensRespondidos[stage.id] ?? []
  const feitos = respondidos.length

  /*
    A LINHA É A PRINCIPAL INTEIRA, e o lado do aluno é o da abertura. Quem
    decide de quem é cada lance é o motor, lendo o FEN — então um repertório de
    pretas abre com o computador jogando de brancas, sem nenhum caso especial
    aqui.
  */
  const linha = useMemo<LinhaTreinavel>(
    () => ({
      fenInicial: opening.rootFen,
      ladoDoAluno: opening.side === 'white' ? 'w' : 'b',
      lances: opening.mainline.map((lance) => lance.uci),
    }),
    [opening],
  )

  const [estado, setEstado] = useState(() => iniciarSequencia(linha))
  /** O lance errado mais recente. Some no acerto seguinte. */
  const [errou, setErrou] = useState<string | null>(null)

  const esperado = lanceEsperadoNaLinha(linha, estado)
  const licaoEsperada = opening.mainline[estado.indice]
  const licaoAnterior = estado.indice > 0 ? opening.mainline[estado.indice - 1] : undefined

  const tentar = useCallback(
    (origem: SquareName, destino: SquareName, promocao?: PromotionPiece) => {
      const resultado = jogarNaSequencia(linha, estado, `${origem}${destino}${promocao ?? ''}`)

      // Não virou lance: o tabuleiro devolve a peça e nada é registrado.
      if (resultado.tipo === 'ilegal') return false

      if (resultado.tipo === 'fora-da-linha') {
        setErrou(resultado.uci)
        return false
      }

      setErrou(null)
      setEstado(resultado.estado)
      /*
        UM ITEM POR DECISÃO, com id derivado do índice do lance. `registrarItem`
        deduplica, então repetir a linha depois de sair e voltar não infla a
        contagem — e o total da etapa é exatamente o número de decisões do aluno
        na principal.
      */
      /*
        O ID É O DO ITEM, e não um índice cru: `itensDaPraticaGuiadaDeAbertura`
        carrega o índice na linha dentro do próprio id, então acrescentar um
        lance antes não remexe o que já está gravado em `itensRespondidos`.
      */
      const doItem = itens.find((candidato) => candidato.indiceNaLinha === estado.indice)
      if (doItem) aoResponder(registrarItem(jornada, stage.id, doItem.id))
      return true
    },
    [estado, itens, jornada, linha, stage.id, aoResponder],
  )

  /*
    O HOOK VEM ANTES DO EARLY RETURN, e a ordem não é estilo: chamar um hook
    depois de um `return` condicional muda a ordem entre renderizações e o React
    proíbe. A primeira versão desta tela pôs o `useLanceNoTabuleiro` abaixo da
    saída de "prática concluída" — e o lint pegou.
  */
  const lance = useLanceNoTabuleiro({
    fen: estado.fen,
    ativo: esperado !== null,
    aoTentar: (origem, destino) => tentar(origem, destino),
  })

  if (feitos >= total || esperado === null) {
    return (
      <ComTabuleiro opening={opening}>
        <p className={styles.texto} role="status">
          Prática guiada concluída. O treino final vem a seguir, e lá o apoio some.
        </p>
      </ComTabuleiro>
    )
  }

  return (
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={estado.fen}
          orientation={opening.side === 'white' ? 'w' : 'b'}
          interactive
          selected={lance.selecionada}
          targets={lance.destinos}
          onMove={tentar}
          onSquareClick={lance.aoClicarNaCasa}
        />
      }
    >
      <p className={styles.texto}>
        Jogue a linha principal no tabuleiro. O computador responde pelo outro lado, e este é o
        degrau com apoio: errar abre a explicação em vez de encerrar a etapa.
      </p>

      <p className={styles.nota} role="status">
        {errou !== null
          ? 'Esse não é o lance do repertório. A posição não mudou — tente de novo.'
          : licaoAnterior
            ? `Decisão ${feitos} de ${total} — sua vez.`
            : 'Jogue o lance no tabuleiro.'}
      </p>

      {/*
        O APOIO DESTE DEGRAU: errar mostra a razão do lance ESTUDADO, e não o
        lance em si. A explicação é o que sobra quando a notação sai da tela.
      */}
      {errou !== null && licaoEsperada ? (
        <div className={styles.veredito}>
          <p className={styles.errou}>✕ Não é o lance estudado.</p>
          <p className={styles.texto}>{licaoEsperada.comment}</p>
        </div>
      ) : null}

      {errou === null && licaoAnterior ? (
        <div className={styles.veredito}>
          <p className={styles.acertou}>✓ É o lance do repertório.</p>
          <p className={styles.texto}>{licaoAnterior.comment}</p>
        </div>
      ) : null}
    </MesaDeEstudo>
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

/*
  O EXPLORADOR SAIU DAQUI, e `posicoesConsultaveis` saiu com ele. Ver ADR-0018.

  A etapa "Melhores respostas do adversário" era uma lista de nomes mais um menu
  de posições para consultar a Lichess. O §60 do plano de aberturas é explícito
  — "não usar como UI principal" — e o §61 também: "frequência é insumo, não
  aula". O painel continua existindo em `/openings`, que é onde ele é
  enriquecimento e não currículo.
*/

/*
  `posicoesDaLinha` MUDOU-SE PARA `@/domain/openings/variacoes`.

  A cópia daqui era a terceira do mesmo laço, e agora a etapa de variações
  precisa exatamente dela para achar a posição em que cada desvio acontece.
  Percorrer uma linha é fato de xadrez, não de tela.
*/

/*
  `opcoesDoLance` SAIU com a lista de múltipla escolha.

  Ela montava o lance certo mais três distratores legais, e era uma boa função
  para um desenho que acabou: a resposta da prática guiada passou a ser jogada no
  tabuleiro. Manter o gerador convidaria alguém a reintroduzir a lista.
*/
