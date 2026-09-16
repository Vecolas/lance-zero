'use client'

/**
 * A jornada de estudo de UM final.
 *
 * MESMA CASCA da jornada de abertura, REGRAS COMPLETAMENTE DIFERENTES — e essa
 * frase é o desenho inteiro (plano §78 e §224).
 *
 * A diferença que mais importa, e que este arquivo existe para honrar: **não
 * existe "fora do repertório" em finais**. Numa abertura, sair da linha
 * estudada encerra a rodada mesmo quando o lance é bom, porque o que está sendo
 * medido é a recuperação de um repertório específico. Num final não há
 * repertório: há uma POSIÇÃO com um resultado objetivo. Se o aluno acha outro
 * lance que mantém a vitória, ele está certo — e reprová-lo por não ter jogado
 * o lance do exemplo seria ensinar que xadrez é adivinhar o que o app quer.
 *
 * Por isso a rodada só falha quando o objetivo é OBJETIVAMENTE perdido
 * (vitória vira empate, empate vira derrota) ou quando um alvo técnico
 * declarado pela lição se perde. Um lance subótimo que preserva o resultado é
 * aceito COM AVISO — "funciona, mas existe técnica mais simples" — porque isso
 * é ensinar, e reprovar não seria.
 *
 * O QUE ESTA TELA NÃO FAZ: julgar lance por conta própria. O veredito de
 * tablebase/engine chega pronto, por parâmetro, de `avaliarLanceDeFinal`. IO
 * mora fora do domínio, e o domínio continua testável sem rede.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { StudyJourneyShell } from '@/components/jornada/StudyJourneyShell'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
import { RoundResultPanel } from '@/components/jornada/RoundResultPanel'
import { ModoReferencia } from '@/components/jornada/ModoReferencia'
import {
  concluirEtapa,
  criarJornada,
  registrarItem,
  voltarParaEtapa,
  type StudyJourney,
  type StudyStage,
} from '@/domain/jornada'
import {
  alvoDeCobertura,
  alvosDoTreinoFinal,
  coberturaDoFinal,
  construirJornadaDeFinal,
  iniciarRodadaDeFinal,
  jogarNaRodadaDeFinal,
  papelDaPosicao,
  posicoesDeAtaque,
  posicoesDeDefesa,
  registrarRodadaDeFinal,
  type ConteudoDoFinal,
  type EndgameTrainingRound,
  type VereditoDeLanceDeFinal,
} from '@/domain/endgames/jornada'
import type { EndgameDefinition, EndgamePosition } from '@/domain/endgames'
import { applyMove, legalMoves, type SquareName } from '@/lib/chess'
import styles from './EndgameStudyJourney.module.css'

/** O id da jornada carrega o domínio. Ver o contrato em `@/domain/types`. */
export function idDaJornadaDeFinal(endgameId: string): string {
  return `final:${endgameId}`
}

export interface EndgameStudyJourneyProps {
  endgame: EndgameDefinition
  conteudo: ConteudoDoFinal
  /**
   * Quem julga o lance. Injetado porque tablebase e engine são IO.
   *
   * Ausente cai no modo sem juiz: a rodada aceita o lance e diz que não
   * conseguiu comparar, em vez de inventar um veredito. "Não sei" é melhor que
   * uma reprovação falsa — o aluno confia no app pela consistência, e uma
   * reprovação errada num final custa mais que dez avisos de incerteza.
   */
  julgar?: (fenAntes: string, uci: string) => Promise<VereditoDeLanceDeFinal>
}

export function EndgameStudyJourney({ endgame, conteudo, julgar }: EndgameStudyJourneyProps) {
  const { repo } = useRepository()
  const stages = useMemo(() => construirJornadaDeFinal(endgame, conteudo), [endgame, conteudo])
  const [jornada, setJornada] = useState<StudyJourney | null>(null)
  const [referencia, setReferencia] = useState(false)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      const id = idDaJornadaDeFinal(endgame.id)
      const gravada = await repo.getStudyJourney(id)
      if (cancelado) return
      setJornada(gravada ?? criarJornada(id, endgame.id, 'final', stages))
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [endgame.id, repo, stages])

  const gravar = useCallback(
    (proxima: StudyJourney) => {
      setJornada(proxima)
      if (repo) void repo.saveStudyJourney(proxima)
    },
    [repo],
  )

  if (!jornada) return <p className={styles.estado}>Abrindo o seu estudo deste final…</p>

  if (referencia) {
    return (
      <ModoReferencia
        titulo={endgame.name}
        stages={stages}
        aoSair={() => setReferencia(false)}
        conteudoDaEtapa={(stage) => (
          // A MESMA função de conteúdo da jornada — ver a razão no componente
          // equivalente da abertura.
          <ConteudoDeEtapa
            endgame={endgame}
            conteudo={conteudo}
            stage={stage}
            jornada={jornada}
            aoResponder={() => undefined}
          />
        )}
      />
    )
  }

  const stage = stages.find((item) => item.id === jornada.currentStageId) ?? stages[0]
  const ehTreino = stage?.ehTreinoFinal === true

  return (
    <StudyJourneyShell
      titulo={endgame.name}
      jornada={jornada}
      stages={stages}
      aoVoltarEtapa={(stageId) => gravar(voltarParaEtapa(jornada, stageId))}
      aoContinuar={ehTreino ? undefined : () => gravar(concluirEtapa(jornada, stages, new Date()))}
      rodapeOculto={ehTreino}
      aoRever={() => setReferencia(true)}
    >
      {ehTreino ? (
        <TreinoDoFinal
          endgame={endgame}
          conteudo={conteudo}
          jornada={jornada}
          stage={stage}
          julgar={julgar}
          aoRegistrar={gravar}
        />
      ) : (
        <ConteudoDeEtapa
          endgame={endgame}
          conteudo={conteudo}
          stage={stage}
          jornada={jornada}
          aoResponder={gravar}
        />
      )}
    </StudyJourneyShell>
  )
}

/* ---------------------------------------------------------------- conteúdo */

function ConteudoDeEtapa({
  endgame,
  conteudo,
  stage,
  jornada,
  aoResponder,
}: {
  endgame: EndgameDefinition
  conteudo: ConteudoDoFinal
  stage: StudyStage
  jornada: StudyJourney
  aoResponder: (proxima: StudyJourney) => void
}) {
  const ataque = posicoesDeAtaque(conteudo)
  const defesa = posicoesDeDefesa(conteudo)
  const primeira = conteudo.posicoes[0]

  switch (stage.tipo) {
    case 'visao':
      return (
        <>
          {primeira ? <Tabuleiro posicao={primeira} /> : null}
          <p className={styles.texto}>{endgame.description}</p>
        </>
      )

    /*
      TABULEIRO À ESQUERDA, INSTRUÇÃO À DIREITA — em toda etapa que tem posição.

      Estas etapas empilhavam `<Tabuleiro>` e `<p>` dentro da coluna única da
      casca. Em desktop isso produzia exatamente o layout que o contrato V5.1
      declara incorreto: tabuleiro à esquerda, texto embaixo dele, e metade da
      tela vazia à direita. A `MesaDeEstudo` é a mesma usada pela lição e pela
      jornada de abertura — uma regra, um componente.
    */
    case 'reconhecer':
      return primeira ? (
        <MesaDeEstudo tabuleiro={<Tabuleiro posicao={primeira} />}>
          <p className={styles.texto}>
            Antes de procurar um lance, a pergunta é outra:{' '}
            <strong>o que importa nesta posição?</strong> Quem está melhor, o que decide o
            resultado, e qual é o plano de cada lado.
          </p>
          <p className={styles.nota}>
            Reconhecer o tipo de posição é o que permite jogar finais que você nunca viu — decorar
            uma sequência só serve para a posição exata em que ela foi decorada.
          </p>
        </MesaDeEstudo>
      ) : (
        <p className={styles.texto}>
          Antes de procurar um lance, a pergunta é outra:{' '}
          <strong>o que importa nesta posição?</strong> Quem está melhor, o que decide o resultado,
          e qual é o plano de cada lado.
        </p>
      )

    case 'principio':
      return (
        <>
          <p className={styles.texto}>
            O princípio deste final é o que você leva para qualquer posição da mesma família.
          </p>
          <PassosDaLicao conteudo={conteudo} tipos={['principle', 'summary']} />
        </>
      )

    case 'demonstracao':
      return primeira ? (
        <MesaDeEstudo tabuleiro={<Tabuleiro posicao={primeira} />}>
          <PassosDaLicao conteudo={conteudo} tipos={['demonstration']} />
        </MesaDeEstudo>
      ) : (
        <PassosDaLicao conteudo={conteudo} tipos={['demonstration']} />
      )

    case 'progredir': {
      const doAtaque = ataque[0] ?? primeira
      return doAtaque ? (
        <MesaDeEstudo tabuleiro={<Tabuleiro posicao={doAtaque} />}>
          <p className={styles.texto}>
            Como CONVERTER: com o lado forte, o objetivo não é dar mate agora — é progredir sem
            devolver o que já está ganho.
          </p>
          <ul className={styles.lista}>
            {ataque.map((posicao) => (
              <li key={posicao.id}>
                {rotuloDoObjetivo(posicao)} — {posicao.conceptIds.join(', ') || 'técnica principal'}
              </li>
            ))}
          </ul>
        </MesaDeEstudo>
      ) : (
        <p className={styles.texto}>
          Como CONVERTER: com o lado forte, o objetivo não é dar mate agora — é progredir sem
          devolver o que já está ganho.
        </p>
      )
    }

    case 'defender':
      return defesa.length > 0 ? (
        <MesaDeEstudo tabuleiro={<Tabuleiro posicao={defesa[0]} />}>
          <p className={styles.texto}>
            Como SEGURAR: com o lado fraco, empatar é vitória. O que muda é o critério de sucesso.
          </p>
          <ul className={styles.lista}>
            {defesa.map((posicao) => (
              <li key={posicao.id}>
                {rotuloDoObjetivo(posicao)} — {posicao.conceptIds.join(', ') || 'defesa principal'}
              </li>
            ))}
          </ul>
        </MesaDeEstudo>
      ) : (
        <p className={styles.texto}>
          {/*
            Nem todo final tem dois lados. Em rei e torre contra rei sozinho não
            existe defesa: o lado fraco não tem o que segurar. Dizer isso é
            honesto; inventar uma etapa defensiva impossível de completar seria
            prender o aluno num treino que não pode terminar.
          */}
          Este final não tem lado defensivo: o resultado é forçado, e o lado fraco não tem como
          segurar. O que existe para estudar aqui é entender por que a defesa não funciona — e é
          exatamente isso que torna a técnica do lado forte obrigatória.
        </p>
      )

    case 'variacoes':
      return (
        <>
          <p className={styles.texto}>
            A mesma ideia, em posições diferentes. É assim que se prova que você aprendeu o
            princípio e não decorou um FEN.
          </p>
          <div className={styles.posicoes}>
            {conteudo.posicoes.map((posicao) => (
              <div key={posicao.id} className={styles.posicao}>
                <Tabuleiro posicao={posicao} />
                <p className={styles.nota}>{rotuloDoObjetivo(posicao)}</p>
              </div>
            ))}
          </div>
        </>
      )

    case 'dois-lados':
      return (
        <p className={styles.texto}>
          {defesa.length > 0
            ? 'No treino final você vai jogar dos DOIS lados: converter com o lado forte e segurar com o lado fraco. Saber defender ensina a atacar — você passa a reconhecer o que o adversário está tentando.'
            : 'Neste final você treina só o lado forte, porque só ele tem escolhas a fazer. A cobertura do treino reflete isso, em vez de exigir uma defesa que não existe.'}
        </p>
      )

    case 'pratica-guiada':
      return (
        <PraticaGuiada
          conteudo={conteudo}
          stage={stage}
          jornada={jornada}
          aoResponder={aoResponder}
        />
      )

    default:
      return <p className={styles.texto}>{stage.objetivo}</p>
  }
}

function PassosDaLicao({
  conteudo,
  tipos,
}: {
  conteudo: ConteudoDoFinal
  tipos: readonly string[]
}) {
  const passos = (conteudo.passosDaLicao ?? []).filter((passo) => tipos.includes(passo.type))
  if (passos.length === 0) {
    return (
      <p className={styles.nota}>
        Este final ainda não tem texto escrito para esta etapa. O treino continua funcionando sem
        ele.
      </p>
    )
  }
  return (
    <>
      {passos.map((passo, indice) => (
        <div key={indice} className={styles.bloco}>
          {'title' in passo && passo.title ? (
            <h3 className={styles.blocoTitulo}>{passo.title}</h3>
          ) : null}
          {'text' in passo && passo.text ? <p className={styles.texto}>{passo.text}</p> : null}
          {'rules' in passo && Array.isArray(passo.rules) ? (
            <ul className={styles.lista}>
              {passo.rules.map((regra) => (
                <li key={regra}>{regra}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </>
  )
}

/** Reconhecimento: perguntas da lição, respondidas com apoio. */
function PraticaGuiada({
  conteudo,
  stage,
  jornada,
  aoResponder,
}: {
  conteudo: ConteudoDoFinal
  stage: StudyStage
  jornada: StudyJourney
  aoResponder: (proxima: StudyJourney) => void
}) {
  const perguntas = (conteudo.passosDaLicao ?? []).filter(
    (passo) => passo.type === 'recognition' || passo.type === 'decision',
  )
  const total = stage.regra.tipo === 'itens' ? stage.regra.total : perguntas.length
  const feitos = jornada.itensRespondidos[stage.id]?.length ?? 0
  const pergunta = perguntas[Math.min(feitos, perguntas.length - 1)]
  const [escolhida, setEscolhida] = useState<number | null>(null)

  if (!pergunta || feitos >= total) {
    return (
      <p className={styles.texto} role="status">
        Prática guiada concluída. O treino final vem a seguir, e lá você joga a posição até o fim.
      </p>
    )
  }

  const opcoes = 'options' in pergunta ? pergunta.options : []
  const correta = 'answer' in pergunta ? pergunta.answer : -1

  return (
    <>
      <p className={styles.texto}>{'question' in pergunta ? pergunta.question : stage.objetivo}</p>
      <ul className={styles.opcoes} aria-label="Respostas possíveis">
        {opcoes.map((opcao, indice) => (
          <li key={opcao}>
            <button
              type="button"
              className={styles.opcao}
              aria-pressed={escolhida === indice}
              disabled={escolhida !== null}
              onClick={() => setEscolhida(indice)}
            >
              {opcao}
            </button>
          </li>
        ))}
      </ul>
      {escolhida !== null ? (
        <div className={styles.veredito} role="status">
          <p className={escolhida === correta ? styles.acertou : styles.errou}>
            {escolhida === correta ? '✓ É isso.' : '✕ Não é por aí.'}
          </p>
          {'explanation' in pergunta ? (
            <p className={styles.texto}>{pergunta.explanation}</p>
          ) : null}
          <button
            type="button"
            className={styles.primario}
            onClick={() => {
              setEscolhida(null)
              aoResponder(registrarItem(jornada, stage.id, `guiada-${feitos}`))
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
 * O treino final do final: jogar a posição ATÉ O FIM.
 *
 * "Não finalizar no primeiro bom lance" (plano §95) é a regra que separa isto
 * de um puzzle. Um final não se ganha achando o lance certo uma vez: ganha-se
 * conduzindo. Por isso a rodada segue até o objetivo ser cumprido ou perdido.
 */
function TreinoDoFinal({
  endgame,
  conteudo,
  jornada,
  stage,
  julgar,
  aoRegistrar,
}: {
  endgame: EndgameDefinition
  conteudo: ConteudoDoFinal
  jornada: StudyJourney
  stage: StudyStage
  julgar?: EndgameStudyJourneyProps['julgar']
  aoRegistrar: (proxima: StudyJourney) => void
}) {
  const alvos = useMemo(() => alvosDoTreinoFinal(conteudo), [conteudo])
  const cobertura = coberturaDoFinal(jornada, stage.id, alvos)

  /*
    A PRIMEIRA RODADA NASCE NO ESTADO INICIAL, e não num efeito — mesma razão da
    jornada de abertura: o aluno já escolheu treinar ao chegar aqui, então não
    há decisão a esperar, e um `setState` dentro de efeito esconderia estado
    derivado que podia ter sido calculado de saída.
  */
  const [round, setRound] = useState<EndgameTrainingRound | null>(() =>
    cobertura.completa ? null : abrirRodada(endgame, conteudo, cobertura.cobertos),
  )
  const [aviso, setAviso] = useState<string | null>(null)
  const [selecionada, setSelecionada] = useState<SquareName | null>(null)

  const novaRodada = useCallback(() => {
    setAviso(null)
    setSelecionada(null)
    setRound(abrirRodada(endgame, conteudo, cobertura.cobertos))
  }, [conteudo, cobertura.cobertos, endgame])

  if (cobertura.completa) {
    return (
      <div className={styles.veredito} role="status">
        <p className={styles.acertou}>✓ Treino concluído.</p>
        <p className={styles.texto}>
          Você converteu, defendeu quando havia o que defender, e resolveu mais de uma posição da
          mesma família — que é a prova de que aprendeu o princípio, e não um FEN.
        </p>
      </div>
    )
  }

  if (!round) return <p className={styles.estado}>Montando a rodada…</p>

  async function tentar(from: SquareName, to: SquareName): Promise<boolean> {
    if (!round || round.desfecho !== 'ativa') return false
    const aplicado = applyMove(round.currentFen, { from, to, promotion: 'q' })
    if (!aplicado) return false

    const veredito: VereditoDeLanceDeFinal = julgar
      ? await julgar(round.currentFen, aplicado.move.uci)
      : {
          // SEM JUIZ: aceita e diz que não comparou. Inventar veredito num final
          // é pior que admitir incerteza — uma reprovação falsa aqui ensina ao
          // aluno que o app não entende finais.
          legal: true,
          fenDepois: aplicado.fenAfter,
          julgamento: null,
          objetivo: null,
          alvoTecnico: null,
        }

    const { round: proximo, resultado } = jogarNaRodadaDeFinal(round, aplicado.move.uci, veredito)
    setRound(proximo)
    setSelecionada(null)
    setAviso(resultado.aviso)

    if (proximo.desfecho !== 'ativa') {
      // `registrarRodadaDeFinal` recusa rodada falha, como no domínio de
      // abertura. Não existe caminho daqui até "etapa concluída" com erro.
      aoRegistrar(registrarRodadaDeFinal(jornada, stage.id, proximo))
    }
    return true
  }

  const terminou = round.desfecho !== 'ativa'

  return (
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={round.currentFen}
          orientation={round.userRole === 'atacante' ? 'w' : 'b'}
          selected={selecionada}
          onMove={(from, to) => {
            void tentar(from, to)
            return true
          }}
          /* SEGUNDO CLIQUE JOGA — mesma correção de `OpeningStudyJourney`.
             Selecionar sem nunca concluir deixava quem não arrasta sem caminho
             nenhum até o lance. */
          onSquareClick={(casa) => {
            /* `tentar` é assíncrono aqui, então a decisão não pode esperar a
               resposta dele: a legalidade é conferida ANTES, contra a mesma
               posição. Sem isso, um segundo clique numa casa inalcançável
               engoliria a seleção em vez de virar a nova origem. */
            const alcancavel =
              selecionada !== null &&
              legalMoves(round.currentFen, selecionada).some((lance) => lance.to === casa)
            if (selecionada && alcancavel) {
              void tentar(selecionada, casa)
              setSelecionada(null)
              return
            }
            setSelecionada(legalMoves(round.currentFen, casa).length > 0 ? casa : null)
          }}
          interactive={!terminou}
        />
      }
    >
      {terminou ? (
        <RoundResultPanel
          desfecho={round.desfecho as 'sucesso' | 'falhou'}
          resumo={resumoDoDesfecho(round)}
          cobertura={{ cobertos: cobertura.cobertos.length, exigidos: alvos.length }}
          aoProximaRodada={novaRodada}
        />
      ) : (
        <>
          <p className={styles.kicker}>
            TREINO · {round.userRole === 'atacante' ? 'converter' : 'segurar'}
          </p>
          <p className={styles.texto}>
            {round.userRole === 'atacante'
              ? 'Conduza a posição até o fim. Um lance bom não encerra o final: a conversão precisa ser jogada.'
              : 'Segure o empate. Aqui empatar é vitória, e o critério de sucesso é outro.'}
          </p>
          {aviso ? (
            <p className={styles.aviso} role="status">
              {/*
                O aviso INFORMA sem reprovar. O lance preservou o resultado — ele
                só não é o caminho mais curto, e dizer isso é ensinar técnica.
              */}
              {aviso}
            </p>
          ) : null}
          <p className={styles.nota}>
            Rodada {cobertura.cobertos.length + 1} de {alvos.length}.
          </p>
        </>
      )}
    </MesaDeEstudo>
  )
}

/* ---------------------------------------------------------------- auxílios */

/**
 * Abre a rodada da próxima posição pendente.
 *
 * A POSIÇÃO É A PRIMEIRA CUJO ALVO AINDA FALTA — a cobertura é que decide, e
 * não uma lista fixa. Assim a rodada seguinte sempre ataca o buraco em vez de
 * repetir o que já foi demonstrado, que é como um treino de final vira decoreba
 * de uma FEN só.
 *
 * Fora do componente porque o estado inicial a chama antes de qualquer hook, e
 * porque assim ela é pura e testável sem montar React.
 */
function abrirRodada(
  endgame: EndgameDefinition,
  conteudo: ConteudoDoFinal,
  cobertos: readonly string[],
): EndgameTrainingRound | null {
  const posicao =
    conteudo.posicoes.find(
      (candidata) => !cobertos.includes(alvoDeCobertura(candidata.id, papelDaPosicao(candidata))),
    ) ?? conteudo.posicoes[0]
  if (!posicao) return null

  return iniciarRodadaDeFinal({
    // O id nomeia O QUE a rodada treina, e não quando ela começou: um carimbo
    // de tempo aqui tornaria o estado irreproduzível num teste.
    id: `${endgame.id}:${posicao.id}`,
    endgameId: endgame.id,
    positionFamilyId: endgame.drillIds[0] ?? endgame.id,
    posicao,
  })
}

function Tabuleiro({ posicao }: { posicao: EndgamePosition }) {
  return (
    <div className={styles.tabuleiroEmbutido}>
      <ChessBoardView
        fen={posicao.fen}
        orientation={posicao.sideToTrain === 'white' ? 'w' : 'b'}
        interactive={false}
      />
    </div>
  )
}

function rotuloDoObjetivo(posicao: EndgamePosition): string {
  const rotulos: Record<EndgamePosition['objective'], string> = {
    win: 'Ganhar',
    draw: 'Empatar',
    promote: 'Promover',
    mate: 'Dar mate',
    'reach-target': 'Alcançar a posição-alvo',
    defend: 'Defender',
  }
  return rotulos[posicao.objective]
}

function resumoDoDesfecho(round: EndgameTrainingRound): string {
  if (round.desfecho === 'sucesso') return 'Objetivo cumprido. A posição foi conduzida até o fim.'
  if (round.failureReason === 'objetivo-perdido') {
    return round.objetivo === 'draw' || round.objetivo === 'hold'
      ? 'A posição era de empate, e esse lance deixou o adversário ganhar.'
      : 'A posição estava ganha, e esse lance deixou escapar para empate.'
  }
  if (round.failureReason === 'alvo-tecnico-perdido') {
    return 'O resultado continua de pé, mas o alvo técnico desta lição se perdeu.'
  }
  return 'A rodada terminou aqui.'
}
