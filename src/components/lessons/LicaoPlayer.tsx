'use client'

/**
 * O leitor de lição: as nove etapas, na ordem, com a ajuda desvanecendo.
 *
 * ESTE COMPONENTE É ONDE A DÍVIDA PEDAGÓGICA FOI PAGA, na parte que o aluno vê.
 * A versão anterior tinha três etapas e terminava num exercício com um botão
 * **Tentar de novo** — o laço proibido pela §17 do plano, escrito à mão:
 *
 *     errou → tentar de novo → errou → tentar de novo → …
 *
 * O aluno que não sabia clicava nas opções até uma ser aceita. Isso não ensina;
 * treina força bruta, e ainda registra como acerto o que foi persistência.
 *
 * O QUE ESTÁ NO LUGAR:
 *
 * - a ORDEM vem de `ETAPAS_DA_LICAO`, no esquema, e não do JSX. Nenhuma tela
 *   pode pôr o exercício antes do conceito, nem terminar em texto;
 * - a ajuda DESVANECE ao longo das etapas: a guiada tem a escada de dicas, a
 *   recuperação não tem nenhuma;
 * - errar ESCALA a assistência em vez de repetir a pergunta
 *   (`responderAoErro`), e depois da solução o botão diz **Continuar**, não
 *   "tentar de novo";
 * - o feedback responde as quatro perguntas da §18, inclusive "por que o seu
 *   lance parecia razoável" — a que faz o aluno reconhecer o próprio
 *   raciocínio em vez de se achar distraído.
 *
 * O PROGRESSO SOBE POR ETAPA CONCLUÍDA, e concluir NÃO depende de acertar. É a
 * §19: o aluno que erra os três exercícios termina a lição com ✓ e com a
 * habilidade marcada como precisando de reforço. Prender a saída no acerto é o
 * que produz o chute.
 */

import { useCallback, useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import {
  ETAPAS_DA_LICAO,
  TITULO_DA_ETAPA,
  type EtapaDaLicao,
  type ExercicioDeCompletion,
  type ExercicioDeRecuperacao,
  type ExercicioGuiado,
  type Licao,
} from '@/domain/lessons'
import {
  DEGRAUS_DE_DICA,
  feedbackGenerico,
  foiIndependente,
  nivelDeApoio,
  responderAoErro,
  type NivelDeApoio,
} from '@/domain/aprendizado'
import { acertou, opcoesDe } from '@/domain/diagnostic'
import type { ExercicioPosicional } from '@/domain/exercicios'
import { getSkill } from '@/domain/skills/catalog'
import { applyMove, legalMoves, normalizeUci, parseUci } from '@/lib/chess'
import styles from './LicaoPlayer.module.css'

/** O que o leitor devolve a quem o hospeda, a cada etapa vencida. */
export interface EventoDaLicao {
  etapa: EtapaDaLicao
  /** Id estável do item, para o checkpoint da atividade. */
  itemId: string
  /** Presente só nas etapas que cobram resposta. */
  resultado?: { acertou: boolean; apoio: NivelDeApoio }
}

export interface LicaoPlayerProps {
  licao: Licao
  /**
   * Chamado a cada etapa vencida. É por aqui que a atividade grava o
   * checkpoint e que a evidência chega ao `SkillState` — o leitor não escreve
   * em lugar nenhum por conta própria.
   */
  aoAvancar?: (evento: EventoDaLicao) => void
  aoFechar?: () => void
  /**
   * Onde retomar. Vem do checkpoint gravado; ausente é começar do início.
   *
   * O LEITOR NÃO LÊ O CHECKPOINT SOZINHO. Ele recebe o índice pronto, pelo mesmo
   * motivo de não gravar nada: quem o hospeda é que conhece o repositório. Um
   * leitor que lesse o banco por conta própria não daria para montar em teste
   * nem para reaproveitar no plano do dia.
   */
  etapaInicial?: number
}

export function LicaoPlayer({ licao, aoAvancar, aoFechar, etapaInicial }: LicaoPlayerProps) {
  /*
    O ÍNDICE INICIAL É SANEADO AQUI, e não em quem grava.

    Um checkpoint pode apontar para fora: conteúdo reescrito, banco editado à
    mão, versão antiga. `Math.min` com o fim da lista é o que impede a lição de
    abrir numa etapa inexistente e renderizar vazio — que seria um falso verde
    perfeito, porque nada erra e a tela fica em branco.
  */
  const [indice, setIndice] = useState(() =>
    Math.min(Math.max(etapaInicial ?? 0, 0), ETAPAS_DA_LICAO.length - 1),
  )
  const etapa = ETAPAS_DA_LICAO[indice]
  const ultima = indice === ETAPAS_DA_LICAO.length - 1

  const avancar = useCallback(
    (evento: Omit<EventoDaLicao, 'etapa'>) => {
      aoAvancar?.({ ...evento, etapa: ETAPAS_DA_LICAO[indice] })
      setIndice((atual) => Math.min(atual + 1, ETAPAS_DA_LICAO.length - 1))
    },
    [aoAvancar, indice],
  )

  return (
    <article className={styles.licao} aria-labelledby="licao-titulo">
      <header className={styles.cabecalho}>
        {aoFechar ? (
          <button type="button" className={styles.voltar} onClick={aoFechar}>
            ← Todas as lições
          </button>
        ) : null}
        <span className={styles.habilidade}>{getSkill(licao.habilidade).label}</span>
        <h2 id="licao-titulo" className={styles.titulo}>
          {licao.titulo}
        </h2>

        {/*
          O sumário das etapas é TEXTO, não só pontinhos: "Etapa 4 de 9 —
          Resolvido passo a passo" diz onde o aluno está sem depender de
          enxergar qual bolinha está acesa.
        */}
        <p className={styles.sumario} role="status">
          Etapa {indice + 1} de {ETAPAS_DA_LICAO.length} — {TITULO_DA_ETAPA[etapa]}
        </p>
        <ol className={styles.trilha} aria-hidden="true">
          {ETAPAS_DA_LICAO.map((nome, i) => (
            <li
              key={nome}
              className={styles.passo}
              data-estado={i < indice ? 'feito' : i === indice ? 'atual' : 'futuro'}
            />
          ))}
        </ol>
      </header>

      <section className={styles.etapa} aria-labelledby="etapa-titulo">
        <h3 id="etapa-titulo" className={styles.etapaTitulo}>
          {TITULO_DA_ETAPA[etapa]}
        </h3>

        {etapa === 'objetivo' ? (
          <Leitura
            textos={[licao.objetivo]}
            aoSeguir={() => avancar({ itemId: `${licao.id}/objetivo` })}
          />
        ) : null}

        {etapa === 'conceito' ? (
          <Leitura
            textos={[licao.conceito]}
            aoSeguir={() => avancar({ itemId: `${licao.id}/conceito` })}
          />
        ) : null}

        {etapa === 'processo' ? (
          <Processo
            passos={licao.processoMental}
            aoSeguir={() => avancar({ itemId: `${licao.id}/processo` })}
          />
        ) : null}

        {etapa === 'exemplo' ? (
          <Exemplo licao={licao} aoSeguir={() => avancar({ itemId: `${licao.id}/exemplo` })} />
        ) : null}

        {etapa === 'contraste' ? (
          <Contraste licao={licao} aoSeguir={() => avancar({ itemId: `${licao.id}/contraste` })} />
        ) : null}

        {etapa === 'completion' ? (
          <Completion
            exercicio={licao.completion}
            aoConcluir={(resultado) => avancar({ itemId: licao.completion.id, resultado })}
          />
        ) : null}

        {etapa === 'guiada' ? (
          <Guiada
            exercicios={licao.guiada}
            aoConcluir={(itemId, resultado) => avancar({ itemId, resultado })}
          />
        ) : null}

        {etapa === 'recuperacao' ? (
          <Recuperacao
            exercicios={licao.recuperacao}
            aoConcluir={(itemId, resultado) => avancar({ itemId, resultado })}
          />
        ) : null}

        {etapa === 'resumo' ? (
          <Resumo
            itens={licao.resumo}
            ultima={ultima}
            aoSeguir={() => aoAvancar?.({ etapa: 'resumo', itemId: `${licao.id}/resumo` })}
            aoFechar={aoFechar}
          />
        ) : null}
      </section>
    </article>
  )
}

// ------------------------------------------------------------------ leitura

function Leitura({ textos, aoSeguir }: { textos: readonly string[]; aoSeguir: () => void }) {
  return (
    <>
      {textos.map((texto, i) => (
        <p key={i} className={styles.texto}>
          {texto}
        </p>
      ))}
      <button type="button" className={styles.primario} onClick={aoSeguir}>
        Continuar
      </button>
    </>
  )
}

function Processo({ passos, aoSeguir }: { passos: readonly string[]; aoSeguir: () => void }) {
  return (
    <>
      <p className={styles.texto}>
        Esta é a pergunta que você leva para a partida. Ela vale para qualquer posição desta classe,
        e não só para as desta lição.
      </p>
      {/* `ol`: aqui a ordem É o conteúdo, ao contrário da lista do Hoje. */}
      <ol className={styles.processo}>
        {passos.map((passo, i) => (
          <li key={i}>{passo}</li>
        ))}
      </ol>
      <button type="button" className={styles.primario} onClick={aoSeguir}>
        Continuar
      </button>
    </>
  )
}

// ------------------------------------------------------- exemplo e contraste

function Exemplo({ licao, aoSeguir }: { licao: Licao; aoSeguir: () => void }) {
  const exemplo = licao.exemploResolvido
  const [passo, setPasso] = useState(0)

  // O tabuleiro acompanha o raciocínio: cada avanço aplica um lance da linha,
  // quando há lance para aquele passo. Mostrar a posição final desde o começo
  // entregaria a resposta antes da explicação de como chegar nela.
  const fens = useMemo(() => posicoesDaLinha(exemplo.fen, exemplo.linhaModelo), [exemplo])
  const fenAtual = fens[Math.min(passo, fens.length - 1)]
  const acabou = passo >= exemplo.raciocinio.length

  return (
    <div className={styles.comTabuleiro}>
      <div className={styles.tabuleiro}>
        <ChessBoardView fen={fenAtual} orientation={exemplo.ladoDoAluno} interactive={false} />
      </div>
      <div className={styles.aoLado}>
        <ol className={styles.raciocinio}>
          {exemplo.raciocinio.slice(0, passo + 1).map((linha, i) => (
            <li key={i} className={i === passo ? styles.raciocinioAtual : undefined}>
              {linha}
            </li>
          ))}
        </ol>

        {acabou ? (
          <>
            <p className={styles.texto}>{exemplo.comentario}</p>
            <p className={styles.linha}>
              <span className={styles.linhaRotulo}>Linha</span>{' '}
              {notacaoDaLinha(exemplo.fen, exemplo.linhaModelo).join(' ')}
            </p>
            <button type="button" className={styles.primario} onClick={aoSeguir}>
              Continuar
            </button>
          </>
        ) : (
          <button type="button" className={styles.primario} onClick={() => setPasso((p) => p + 1)}>
            Próximo passo
          </button>
        )}
      </div>
    </div>
  )
}

function Contraste({ licao, aoSeguir }: { licao: Licao; aoSeguir: () => void }) {
  const { contraste } = licao
  const san = useMemo(() => sanDe(contraste.fen, contraste.lanceQueFalha), [contraste])

  return (
    <div className={styles.comTabuleiro}>
      <div className={styles.tabuleiro}>
        <ChessBoardView
          fen={contraste.fen}
          orientation={contraste.ladoDoAluno}
          interactive={false}
        />
      </div>
      <div className={styles.aoLado}>
        <p className={styles.texto}>
          Parece a mesma posição do exemplo, e o mesmo lance ({san}) não funciona aqui.
        </p>
        <p className={styles.texto}>{contraste.oQueMudou}</p>
        <p className={styles.nota}>
          É por isso que a lição ensina uma pergunta e não um lance: o padrão visual se repete, a
          conclusão não.
        </p>
        <button type="button" className={styles.primario} onClick={aoSeguir}>
          Continuar
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------- os exercícios

function Completion({
  exercicio,
  aoConcluir,
}: {
  exercicio: ExercicioDeCompletion
  aoConcluir: (resultado: { acertou: boolean; apoio: NivelDeApoio }) => void
}) {
  return (
    <>
      <p className={styles.texto}>Parte do raciocínio já está feita. Falta a última pergunta.</p>
      <ol className={styles.raciocinio}>
        {exercicio.raciocinioJaFeito.map((passo, i) => (
          <li key={i}>{passo}</li>
        ))}
      </ol>
      <Tabuleiro
        exercicio={exercicio}
        enunciado={exercicio.enunciado}
        explicacao={exercicio.explicacao}
        dicas={[]}
        aoConcluir={aoConcluir}
      />
    </>
  )
}

function Guiada({
  exercicios,
  aoConcluir,
}: {
  exercicios: readonly ExercicioGuiado[]
  aoConcluir: (itemId: string, resultado: { acertou: boolean; apoio: NivelDeApoio }) => void
}) {
  const [indice, setIndice] = useState(0)
  const exercicio = exercicios[Math.min(indice, exercicios.length - 1)]

  return (
    <>
      <p className={styles.texto}>
        Agora é com você, e as dicas estão disponíveis. Abrir uma dica não é falhar — é o que esta
        etapa existe para oferecer.
      </p>
      <Tabuleiro
        key={exercicio.id}
        exercicio={exercicio}
        enunciado={exercicio.enunciado}
        explicacao={exercicio.explicacao}
        dicas={exercicio.dicas}
        aoConcluir={(resultado) => {
          aoConcluir(exercicio.id, resultado)
          if (indice < exercicios.length - 1) setIndice(indice + 1)
        }}
      />
    </>
  )
}

function Recuperacao({
  exercicios,
  aoConcluir,
}: {
  exercicios: readonly ExercicioDeRecuperacao[]
  aoConcluir: (itemId: string, resultado: { acertou: boolean; apoio: NivelDeApoio }) => void
}) {
  const [indice, setIndice] = useState(0)
  const exercicio = exercicios[Math.min(indice, exercicios.length - 1)]

  return (
    <>
      <p className={styles.texto}>
        Sem dica e sem o tema na tela. É a tentativa de recuperar sozinho que fixa o que você
        aprendeu — e errar aqui também é informação útil.
      </p>
      <Tabuleiro
        key={exercicio.id}
        exercicio={exercicio}
        enunciado={exercicio.enunciado}
        explicacao={exercicio.explicacao}
        dicas={[]}
        aoConcluir={(resultado) => {
          aoConcluir(exercicio.id, resultado)
          if (indice < exercicios.length - 1) setIndice(indice + 1)
        }}
      />
    </>
  )
}

/**
 * O tabuleiro com opções, a escada de dicas e o feedback.
 *
 * AQUI NÃO EXISTE "TENTAR DE NOVO". Ao errar, `responderAoErro` decide o
 * próximo degrau de assistência; quando a escada acaba, a tela mostra a solução
 * e o botão passa a ser **Continuar**. A função é pura e mora no domínio, então
 * "nunca há tentativa cega infinita" é provado por teste unitário e não por
 * inspeção deste JSX.
 */
function Tabuleiro({
  exercicio,
  enunciado,
  explicacao,
  dicas,
  aoConcluir,
}: {
  exercicio: ExercicioPosicional
  enunciado: string
  explicacao: string
  dicas: readonly { degrau: string; texto: string }[]
  aoConcluir: (resultado: { acertou: boolean; apoio: NivelDeApoio }) => void
}) {
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [erros, setErros] = useState(0)
  const [dicasAbertas, setDicasAbertas] = useState(0)
  const [revelou, setRevelou] = useState(false)

  const notacoes = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const lance of legalMoves(exercicio.fen)) mapa.set(lance.uci, lance.san)
    return mapa
  }, [exercicio.fen])

  const certo = escolhido !== null && acertou(exercicio, escolhido)
  const apoio = nivelDeApoio(dicasAbertas, revelou)
  const resposta = erros > 0 && !certo ? responderAoErro(erros, dicasAbertas) : null
  const mostrarSolucao =
    revelou || resposta?.acao === 'mostrar-solucao' || resposta?.acao === 'trocar-posicao'

  function escolher(uci: string) {
    setEscolhido(uci)
    if (!acertou(exercicio, uci)) {
      const proximo = erros + 1
      setErros(proximo)
      const reacao = responderAoErro(proximo, dicasAbertas)
      // A dica ABRE SOZINHA no erro: obrigar o aluno a pedir ajuda depois de
      // errar é o convite para ele chutar de novo em vez de pedir.
      if (reacao.acao === 'dica' && dicas.length > 0) {
        setDicasAbertas((n) => Math.min(n + 1, dicas.length))
      }
      if (reacao.acao === 'mostrar-solucao' || reacao.acao === 'trocar-posicao') setRevelou(true)
    }
  }

  const feedback = feedbackGenerico()

  return (
    <div className={styles.comTabuleiro}>
      <div className={styles.tabuleiro}>
        <ChessBoardView
          fen={exercicio.fen}
          orientation={exercicio.ladoDoAluno}
          interactive={false}
        />
      </div>
      <div className={styles.aoLado}>
        <p className={styles.texto}>{enunciado}</p>

        <ul className={styles.opcoes} aria-label="Lances possíveis">
          {opcoesDe(exercicio).map((uci) => (
            <li key={uci}>
              <button
                type="button"
                className={styles.opcao}
                aria-pressed={escolhido === uci}
                // Depois da solução as opções param de aceitar clique: não há
                // mais o que descobrir, e clicar viraria o laço de novo.
                disabled={certo || mostrarSolucao}
                onClick={() => escolher(uci)}
              >
                {notacoes.get(uci) ?? uci}
              </button>
            </li>
          ))}
        </ul>

        {dicasAbertas > 0 && dicas.length > 0 ? (
          <ol className={styles.dicas} aria-label="Dicas abertas">
            {dicas.slice(0, dicasAbertas).map((dica) => (
              <li key={dica.degrau}>
                <span className={styles.dicaDegrau}>{rotuloDoDegrau(dica.degrau)}</span>{' '}
                {dica.texto}
              </li>
            ))}
          </ol>
        ) : null}

        {dicas.length > dicasAbertas && !certo && !mostrarSolucao ? (
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setDicasAbertas((n) => n + 1)}
          >
            Abrir uma dica
          </button>
        ) : null}

        {escolhido !== null ? (
          <div className={styles.veredito} role="status">
            {/* Cor + símbolo + TEXTO: o estado nunca depende só da cor. */}
            <p className={certo ? styles.acertou : styles.errou}>
              {certo ? '✓ Cumpriu o objetivo.' : '✕ Não cumpre o objetivo.'}
            </p>

            {certo || mostrarSolucao ? (
              <p className={styles.texto}>{explicacao}</p>
            ) : (
              <>
                {/*
                  As quatro perguntas da §18. Genéricas quando o conteúdo não
                  escreveu um feedback específico — e genéricas de propósito:
                  afirmar qual peça ficou pendurada sem ter conferido seria o
                  motivo inventado que o CLAUDE.md proíbe.
                */}
                <p className={styles.texto}>{feedback.oQueAconteceu}</p>
                <p className={styles.nota}>{feedback.porQueParecia}</p>
                {resposta?.acao === 'decompor' ? (
                  <p className={styles.texto}>
                    Vamos por partes: antes de escolher o lance, responda para você mesmo o que o
                    adversário está ameaçando agora.
                  </p>
                ) : null}
                <p className={styles.pergunta}>{feedback.perguntaQueEvitaria}</p>
              </>
            )}

            {certo || mostrarSolucao ? (
              <button
                type="button"
                className={styles.primario}
                onClick={() => aoConcluir({ acertou: certo, apoio })}
              >
                Continuar
              </button>
            ) : null}
          </div>
        ) : null}

        {/*
          Sair sem responder é PERMITIDO, e é a §19 em forma de botão: concluir
          não depende de acertar, então prender o aluno aqui só produziria o
          chute que este trabalho veio remover.
        */}
        {escolhido === null ? (
          <button
            type="button"
            className={styles.ghost}
            onClick={() => aoConcluir({ acertou: false, apoio: 'solucao-revelada' })}
          >
            Pular este exercício
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Resumo({
  itens,
  ultima,
  aoSeguir,
  aoFechar,
}: {
  itens: readonly string[]
  ultima: boolean
  aoSeguir: () => void
  aoFechar?: () => void
}) {
  const [fechou, setFechou] = useState(false)

  return (
    <>
      <p className={styles.texto}>Antes de jogar, na sua próxima partida:</p>
      <ul className={styles.resumo}>
        {itens.map((item, i) => (
          <li key={i}>
            <span aria-hidden="true">□</span> {item}
          </li>
        ))}
      </ul>
      {!fechou ? (
        <button
          type="button"
          className={styles.primario}
          onClick={() => {
            aoSeguir()
            setFechou(true)
            // NÃO abre a próxima atividade sozinho (plano §38): terminar
            // devolve o aluno ao Hoje, e o que vem depois é escolha dele.
            if (ultima) aoFechar?.()
          }}
        >
          Concluir lição
        </button>
      ) : (
        <p className={styles.texto} role="status">
          Lição concluída. Ela continua na biblioteca se você quiser reler.
        </p>
      )}
    </>
  )
}

// ------------------------------------------------------------------ auxílios

function rotuloDoDegrau(degrau: string): string {
  const rotulos: Record<string, string> = {
    direcao: 'Por onde começar',
    area: 'Onde olhar',
    ideia: 'A ideia',
    candidato: 'Um candidato',
  }
  return rotulos[degrau] ?? DEGRAUS_DE_DICA[0]
}

/** As posições ao longo da linha. Índice 0 é a inicial. */
function posicoesDaLinha(fen: string, linha: readonly string[]): string[] {
  const fens = [fen]
  let atual = fen
  for (const uci of linha) {
    const entrada = parseUci(normalizeUci(uci))
    const aplicado = entrada === null ? null : applyMove(atual, entrada)
    if (aplicado === null) break
    atual = aplicado.fenAfter
    fens.push(atual)
  }
  return fens
}

function sanDe(fen: string, uci: string): string {
  const entrada = parseUci(normalizeUci(uci))
  const aplicado = entrada === null ? null : applyMove(fen, entrada)
  return aplicado?.move.san ?? uci
}

/**
 * Linha modelo em notação curta.
 *
 * Derivada da posição a cada renderização, e não guardada junto do conteúdo:
 * SAN escrito à mão ao lado do UCI seria a segunda fonte da mesma verdade, e a
 * que diverge é sempre a que o aluno lê.
 */
function notacaoDaLinha(fen: string, linha: readonly string[]): string[] {
  const notacoes: string[] = []
  let atual = fen
  for (const uci of linha) {
    const entrada = parseUci(normalizeUci(uci))
    const aplicado = entrada === null ? null : applyMove(atual, entrada)
    // Linha ilegal é problema de conteúdo e o portão do catálogo já reprova por
    // isso. Aqui a tela só para de escrever, em vez de quebrar na cara do aluno.
    if (aplicado === null) break
    notacoes.push(aplicado.move.san)
    atual = aplicado.fenAfter
  }
  return notacoes
}

export { foiIndependente }
