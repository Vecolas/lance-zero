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
import { ExercicioNoTabuleiro } from '@/components/exercicios/ExercicioNoTabuleiro'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
import {
  ETAPAS_DA_LICAO,
  TITULO_DA_ETAPA,
  type EtapaDaLicao,
  type ExercicioDeCompletion,
  type ExercicioDeRecuperacao,
  type ExercicioGuiado,
  type Licao,
} from '@/domain/lessons'
import { DEGRAUS_DE_DICA, foiIndependente, type NivelDeApoio } from '@/domain/aprendizado'
import { acertou } from '@/domain/diagnostic'
import { getSkill } from '@/domain/skills/catalog'
import { applyMove, normalizeUci, parseUci } from '@/lib/chess'
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
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView fen={fenAtual} orientation={exemplo.ladoDoAluno} interactive={false} />
      }
    >
      <>
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
      </>
    </MesaDeEstudo>
  )
}

function Contraste({ licao, aoSeguir }: { licao: Licao; aoSeguir: () => void }) {
  const { contraste } = licao
  const san = useMemo(() => sanDe(contraste.fen, contraste.lanceQueFalha), [contraste])

  return (
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={contraste.fen}
          orientation={contraste.ladoDoAluno}
          interactive={false}
        />
      }
    >
      <>
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
      </>
    </MesaDeEstudo>
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
      <ExercicioNoTabuleiro
        exercicio={exercicio}
        enunciado={exercicio.enunciado}
        explicacao={exercicio.explicacao}
        rotuloDoDegrau={rotuloDoDegrau}
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
      <ExercicioNoTabuleiro
        key={exercicio.id}
        exercicio={exercicio}
        enunciado={exercicio.enunciado}
        explicacao={exercicio.explicacao}
        dicas={exercicio.dicas}
        rotuloDoDegrau={rotuloDoDegrau}
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
      <ExercicioNoTabuleiro
        key={exercicio.id}
        exercicio={exercicio}
        enunciado={exercicio.enunciado}
        explicacao={exercicio.explicacao}
        rotuloDoDegrau={rotuloDoDegrau}
        aoConcluir={(resultado) => {
          aoConcluir(exercicio.id, resultado)
          if (indice < exercicios.length - 1) setIndice(indice + 1)
        }}
      />
    </>
  )
}

/*
  O `Tabuleiro` DESTE ARQUIVO VIROU `@/components/exercicios/ExercicioNoTabuleiro`.

  Ele mantinha a posição CONGELADA — `fen={exercicio.fen}` do começo ao fim —,
  então o lance certo nunca aparecia no tabuleiro e o adversário não existia. E
  ele tinha uma cópia quase literal em `PraticaDeHabilidade`, livre para
  divergir: lá a grade estava invertida, com o tabuleiro na coluna estreita.

  Não recriar aqui. Quem precisa de um exercício respondido no tabuleiro importa
  o componente compartilhado; quem precisa de outra regra muda o componente
  compartilhado, e as duas telas mudam juntas.
*/

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
