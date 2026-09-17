'use client'

/**
 * O EXERCÍCIO, JOGADO NUM TABULEIRO DE VERDADE.
 *
 * O QUE ESTA TELA SUBSTITUI, e o defeito era o mesmo nos dois lugares: o
 * `Tabuleiro` da lição e o `ItemDePratica` da prática de habilidade eram cópias
 * quase literais uma da outra, e as duas mantinham a posição CONGELADA. O aluno
 * arrastava a peça, acertava, e a peça voltava — `fen={exercicio.fen}` do
 * começo ao fim. O lance certo nunca aparecia no tabuleiro e o adversário não
 * existia.
 *
 * AGORA A POSIÇÃO ANDA. `@/domain/exercicios/sequencia` caminha a linha, e a
 * resposta do computador entra na MESMA transição do lance do aluno — nunca num
 * efeito com relógio, nunca depois de um botão. Não existe instante em que é a
 * vez do computador e a tela está parada esperando um clique.
 *
 * E O ERRO NÃO ANDA A POSIÇÃO. Lance legal fora da linha faz snapback: a peça
 * volta, o texto ao lado explica, e o aluno continua NA posição até resolvê-la.
 * Levá-lo para a posição seguinte seria ensinar que errar é um jeito de avançar.
 *
 * LANCE ILEGAL NÃO É ERRO, e a ordem das duas perguntas é a do domínio:
 * primeiro "isto é um lance?", depois "é ESTE lance?". Um arraste torto não
 * mexe na contagem nem abre dica — o aluno não afirmou nada sobre a posição.
 *
 * O TEXTO FICA AO LADO, por `MesaDeEstudo` — a mesma mesa das jornadas de
 * Abertura e de Final. Antes, cada tela tinha a sua grade: a lição em 52 rem, a
 * prática de habilidade com a proporção INVERTIDA (o tabuleiro era a coluna
 * estreita de 20 rem). Uma regra, um componente.
 */

import { useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useLanceNoTabuleiro } from '@/components/chess/useLanceNoTabuleiro'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
import {
  feedbackGenerico,
  nivelDeApoio,
  responderAoErro,
  type NivelDeApoio,
} from '@/domain/aprendizado'
import {
  iniciarSequencia,
  jogarNaSequencia,
  linhaDoExercicio,
  type EstadoDaSequencia,
  type ExercicioPosicional,
} from '@/domain/exercicios'
import { parseUci } from '@/lib/chess'
import type { PromotionPiece, SquareName } from '@/lib/chess'
import styles from './ExercicioNoTabuleiro.module.css'

export interface DicaDoExercicio {
  degrau: string
  texto: string
}

export interface ExercicioNoTabuleiroProps {
  exercicio: ExercicioPosicional
  enunciado: string
  explicacao: string
  dicas?: readonly DicaDoExercicio[]
  /** Como cada degrau da escada é nomeado na tela. */
  rotuloDoDegrau?: (degrau: string) => string
  aoConcluir: (resultado: { acertou: boolean; apoio: NivelDeApoio }) => void
  /** Texto do botão que fecha o exercício. O único botão da tela. */
  rotuloDeSaida?: string
}

export function ExercicioNoTabuleiro({
  exercicio,
  enunciado,
  explicacao,
  dicas = [],
  rotuloDoDegrau = (degrau) => degrau,
  aoConcluir,
  rotuloDeSaida = 'Continuar',
}: ExercicioNoTabuleiroProps) {
  const linha = useMemo(() => linhaDoExercicio(exercicio), [exercicio])
  const [estado, setEstado] = useState<EstadoDaSequencia>(() => iniciarSequencia(linha))
  const [erros, setErros] = useState(0)
  const [dicasAbertas, setDicasAbertas] = useState(0)
  const [revelou, setRevelou] = useState(false)
  /** O último arraste que não virou lance. Discreto, e some no lance seguinte. */
  const [recusa, setRecusa] = useState(false)
  /** O que o computador acabou de responder, para a tela poder dizer. */
  const [respondeu, setRespondeu] = useState<string | null>(null)

  const resolvido = estado.status === 'concluida'
  const apoio = nivelDeApoio(dicasAbertas, revelou)
  const reacao = erros > 0 && !resolvido ? responderAoErro(erros, dicasAbertas) : null
  const mostrarSolucao =
    revelou || reacao?.acao === 'mostrar-solucao' || reacao?.acao === 'trocar-posicao'
  const podeJogar = !resolvido && !mostrarSolucao

  /*
    A SOLUÇÃO DESENHADA NO TABULEIRO, e não escrita como "Rxc6".

    Quando a escada de assistência termina e a resposta precisa aparecer, ela
    aparece ONDE acontece. Um aluno que lê a notação aprende a notação; um que vê
    as duas casas acesas aprende o lance. As casas saem do lance que a LINHA
    espera agora — não do primeiro da lista —, senão a dica apontaria o começo do
    exercício depois de o aluno já ter andado nele.
  */
  const casasDaSolucao = useMemo(() => {
    const esperado = linha.lances[estado.indice]
    const lance = esperado ? parseUci(esperado) : null
    return lance ? [lance.from, lance.to] : []
  }, [linha, estado.indice])

  /**
   * O aluno soltou uma peça.
   *
   * Devolve `false` quando o lance não entra: é isso que faz o tabuleiro
   * devolver a peça à casa de origem. O snapback não é um enfeite — é a
   * afirmação de que a posição não mudou.
   */
  function soltar(origem: SquareName, destino: SquareName, promocao?: PromotionPiece): boolean {
    if (!podeJogar) return false

    const resultado = jogarNaSequencia(linha, estado, `${origem}${destino}${promocao ?? ''}`)

    if (resultado.tipo === 'ilegal') {
      /*
        NÃO MEXE EM NADA PEDAGÓGICO: sem contar erro, sem abrir dica, sem
        registrar tentativa. O aluno arrastou para um lugar onde a peça não vai.
      */
      setRecusa(true)
      return false
    }

    setRecusa(false)

    if (resultado.tipo === 'fora-da-linha') {
      const proximo = erros + 1
      setErros(proximo)
      const proximaReacao = responderAoErro(proximo, dicasAbertas)
      // A dica ABRE SOZINHA no erro: obrigar o aluno a pedir ajuda depois de
      // errar é o convite para ele chutar de novo em vez de pedir.
      if (proximaReacao.acao === 'dica' && dicas.length > 0) {
        setDicasAbertas((n) => Math.min(n + 1, dicas.length))
      }
      if (proximaReacao.acao === 'mostrar-solucao' || proximaReacao.acao === 'trocar-posicao') {
        setRevelou(true)
      }
      return false
    }

    setEstado(resultado.estado)
    setRespondeu(resultado.respostaDoAdversario)
    return true
  }

  /*
    O CLIQUE EM DUAS CASAS é a outra porta da mesma resposta. Arrastar exige
    apontador e coordenação fina; sem o clique, "a resposta acontece no
    tabuleiro" viraria "quem não arrasta não responde".
  */
  const lance = useLanceNoTabuleiro({
    fen: estado.fen,
    ativo: podeJogar,
    aoTentar: (origem, destino) => soltar(origem, destino),
  })

  const feedback = feedbackGenerico()

  return (
    <MesaDeEstudo
      tabuleiro={
        <ChessBoardView
          fen={estado.fen}
          orientation={exercicio.ladoDoAluno}
          interactive={podeJogar}
          selected={lance.selecionada}
          targets={lance.destinos}
          onMove={soltar}
          onSquareClick={lance.aoClicarNaCasa}
          onIllegalMove={() => setRecusa(true)}
          lastMove={mostrarSolucao ? casasDaSolucao : undefined}
        />
      }
    >
      <p className={styles.texto}>{enunciado}</p>

      {/*
        UM `role="status"` QUE TROCA DE TEXTO, e não um bloco que aparece e some.

        É o que faz a tela não pular a cada lance e o leitor de tela anunciar a
        mudança sem reler a página inteira. Também é o que substituiu o botão
        `Continuar` que existia entre um lance e o próximo: a tela responde, e
        quem avança é o tabuleiro.
      */}
      <p className={styles.estado} role="status" data-testid="estado-do-exercicio">
        {textoDoEstado({ resolvido, mostrarSolucao, recusa, erros, respondeu })}
      </p>

      {dicasAbertas > 0 && dicas.length > 0 ? (
        <ol className={styles.dicas} aria-label="Dicas abertas">
          {dicas.slice(0, dicasAbertas).map((dica) => (
            <li key={dica.degrau}>
              <span className={styles.dicaDegrau}>{rotuloDoDegrau(dica.degrau)}</span> {dica.texto}
            </li>
          ))}
        </ol>
      ) : null}

      {dicas.length > dicasAbertas && podeJogar ? (
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setDicasAbertas((n) => n + 1)}
        >
          Abrir uma dica
        </button>
      ) : null}

      {erros > 0 && !resolvido && !mostrarSolucao ? (
        <div className={styles.veredito}>
          {/* Cor + símbolo + TEXTO: o estado nunca depende só da cor. */}
          <p className={styles.errou}>✕ Esse lance não resolve a posição.</p>
          <p className={styles.texto}>{feedback.oQueAconteceu}</p>
          <p className={styles.nota}>{feedback.porQueParecia}</p>
          {reacao?.acao === 'decompor' ? (
            <p className={styles.texto}>
              Vamos por partes: antes de escolher o lance, responda para você mesmo o que o
              adversário está ameaçando agora.
            </p>
          ) : null}
          <p className={styles.pergunta}>{feedback.perguntaQueEvitaria}</p>
        </div>
      ) : null}

      {resolvido || mostrarSolucao ? (
        <div className={styles.veredito}>
          <p className={resolvido && erros === 0 ? styles.acertou : styles.nota}>
            {resolvido ? '✓ Cumpriu o objetivo.' : '○ A solução está no tabuleiro.'}
          </p>
          <p className={styles.texto}>{explicacao}</p>
          <button
            type="button"
            className={styles.primario}
            onClick={() => aoConcluir({ acertou: resolvido && erros === 0, apoio })}
          >
            {rotuloDeSaida}
          </button>
        </div>
      ) : (
        /*
          Sair sem responder é PERMITIDO: concluir não depende de acertar, e
          prender o aluno aqui só produziria o chute que este trabalho removeu.
        */
        <button
          type="button"
          className={styles.ghost}
          onClick={() => aoConcluir({ acertou: false, apoio: 'solucao-revelada' })}
        >
          Pular este exercício
        </button>
      )}
    </MesaDeEstudo>
  )
}

/**
 * A frase única que diz em que pé está o exercício.
 *
 * UMA FRASE, E NÃO QUATRO BLOCOS QUE APARECEM E SOMEM: cada bloco que entra e
 * sai reflui a coluna e faz a tela pular a cada lance — que é metade do que
 * "sem atualizar a página" quer dizer.
 */
function textoDoEstado({
  resolvido,
  mostrarSolucao,
  recusa,
  erros,
  respondeu,
}: {
  resolvido: boolean
  mostrarSolucao: boolean
  recusa: boolean
  erros: number
  respondeu: string | null
}): string {
  if (resolvido) return 'Exercício concluído.'
  if (mostrarSolucao) return 'As casas acesas mostram o lance. Siga quando quiser.'
  if (recusa) return 'Esse lance não é legal nesta posição.'
  if (respondeu !== null) return 'O computador respondeu. Sua vez.'
  if (erros > 0) return `Tentativa ${erros + 1} — jogue o lance no tabuleiro.`
  return 'Jogue o lance no tabuleiro.'
}
