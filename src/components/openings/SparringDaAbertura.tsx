'use client'

/**
 * PRATICAR A ABERTURA CONTRA O BOT.
 *
 * O QUE ELA OFERECE que a jornada não oferecia: repetição livre. A jornada
 * ensina uma vez, em sequência, e termina. Quem quer jogar a Italiana dez vezes
 * seguidas — que é como um repertório entra na cabeça — não tinha onde.
 *
 * O ALUNO ESCOLHE O LADO, e os dois ensinam coisas diferentes: pelo lado do
 * repertório ele executa o que estudou; pelo outro ele descobre por que o
 * adversário joga o que joga. É a etapa "dois lados" da jornada virando prática.
 *
 * O BOT NÃO É UMA ENGINE, e isso é decisão de produto — ver
 * `@/domain/openings/sparring`. Ele joga a teoria desta abertura; quando ela
 * acaba, ele diz que acabou em vez de improvisar.
 *
 * FORA DO REPERTÓRIO NÃO É "ERRADO". O app não conferiu se o lance é bom: ele
 * sabe que a abertura estudada não o cobre, e é só isso que ele afirma.
 */

import { useCallback, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { useLanceNoTabuleiro } from '@/components/chess/useLanceNoTabuleiro'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
import {
  deixarBotJogar,
  ehVezDoBot,
  iniciarSparring,
  jogarNoSparring,
  type EstadoDoSparring,
  type LadoDoAluno,
} from '@/domain/openings/sparring'
import type { OpeningDefinition } from '@/domain/openings'
import type { SquareName } from '@/lib/chess'
import styles from './SparringDaAbertura.module.css'

/** O que o aluno acabou de fazer, em uma frase. */
type Aviso =
  { tipo: 'nada' } | { tipo: 'teoria'; texto: string } | { tipo: 'fora' } | { tipo: 'fim' }

export function SparringDaAbertura({ opening }: { opening: OpeningDefinition }) {
  const ladoDoRepertorio: LadoDoAluno = opening.side === 'white' ? 'w' : 'b'
  const [lado, setLado] = useState<LadoDoAluno>(ladoDoRepertorio)
  /*
    O BOT PODE ABRIR A PARTIDA. Num repertório de pretas, a raiz é a posição
    antes do lance branco — e sem isto o tabuleiro nasceria esperando um lance
    do aluno que não é dele.
  */
  const [estado, setEstado] = useState<EstadoDoSparring>(
    () =>
      deixarBotJogar(opening, iniciarSparring(opening), opening.side === 'white' ? 'w' : 'b', 0)
        .estado,
  )
  const [aviso, setAviso] = useState<Aviso>({ tipo: 'nada' })
  const [rodada, setRodada] = useState(0)

  /*
    O BOT RESPONDE COMO CONSEQUÊNCIA DO LANCE, e não num efeito.

    A primeira versão deixava o bot jogar dentro de um `useEffect` que escrevia
    estado — o lint do projeto reprovou, com razão. `deixarBotJogar` é domínio
    puro: a sequência "aluno joga → bot responde" vira uma transição só, e o
    início da partida usa exatamente a mesma função quando o bot abre.
  */
  const recomecar = useCallback(
    (novoLado: LadoDoAluno) => {
      // A rodada entra no `seed`: recomeçar pode trazer OUTRA variação teórica,
      // que é o ponto de praticar de novo em vez de repetir a mesma partida.
      const proximaRodada = rodada + 1
      const avanco = deixarBotJogar(opening, iniciarSparring(opening), novoLado, proximaRodada)

      setLado(novoLado)
      setRodada(proximaRodada)
      setEstado(avanco.estado)
      setAviso(avanco.comentario ? { tipo: 'teoria', texto: avanco.comentario } : { tipo: 'nada' })
    },
    [opening, rodada],
  )

  const minhaVez = !ehVezDoBot(estado, lado)

  const tentar = useCallback(
    (origem: SquareName, destino: SquareName) => {
      if (!minhaVez) return false
      const resultado = jogarNoSparring(opening, estado, `${origem}${destino}`)
      if (resultado.tipo === 'ilegal') return false

      if (resultado.tipo === 'fora-do-repertorio') {
        setEstado(resultado.estado)
        setAviso({ tipo: 'fora' })
        return true
      }

      // Na teoria: o bot responde na mesma transição.
      const avanco = deixarBotJogar(opening, resultado.estado, lado, rodada)
      setEstado(avanco.estado)
      setAviso(
        avanco.fimDaTeoria
          ? { tipo: 'fim' }
          : { tipo: 'teoria', texto: avanco.comentario ?? resultado.continuacao.comment },
      )
      return true
    },
    [estado, lado, minhaVez, opening, rodada],
  )

  const lance = useLanceNoTabuleiro({
    fen: estado.fen,
    ativo: minhaVez,
    aoTentar: tentar,
  })

  return (
    <section className={styles.sparring} aria-labelledby="sparring-titulo">
      <h3 id="sparring-titulo" className={styles.titulo}>
        Praticar contra o computador
      </h3>

      {/*
        A ESCOLHA DO LADO fica ANTES do tabuleiro e troca a sessão inteira.

        Ela não é um detalhe de exibição: jogar pelo outro lado é outro exercício
        — o aluno deixa de executar o repertório e passa a enfrentá-lo.
      */}
      <div className={styles.lados} role="group" aria-label="Escolher o lado">
        {(['w', 'b'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            className={lado === opcao ? styles.ladoAtivo : styles.lado}
            aria-pressed={lado === opcao}
            onClick={() => recomecar(opcao)}
          >
            {opcao === 'w' ? 'Brancas' : 'Pretas'}
            {opcao === ladoDoRepertorio ? ' · seu repertório' : ''}
          </button>
        ))}
      </div>

      <MesaDeEstudo
        tabuleiro={
          <ChessBoardView
            fen={estado.fen}
            orientation={lado}
            interactive={minhaVez && estado.naArvore}
            selected={lance.selecionada}
            targets={lance.destinos}
            onMove={tentar}
            onSquareClick={lance.aoClicarNaCasa}
          />
        }
      >
        <p className={styles.vez} role="status">
          {!estado.naArvore
            ? 'Fora do repertório estudado.'
            : minhaVez
              ? 'Sua vez — jogue o lance no tabuleiro.'
              : 'O computador está respondendo…'}
        </p>

        {aviso.tipo === 'teoria' ? <p className={styles.comentario}>{aviso.texto}</p> : null}

        {aviso.tipo === 'fora' ? (
          <p className={styles.fora}>
            {/*
              A FRASE NÃO DIZ "ERRADO". O app não conferiu se o lance é bom —
              ele sabe que esta abertura não o cobre, e afirmar mais que isso
              seria a explicação inventada que o projeto proíbe.
            */}
            <span aria-hidden="true">△</span> Esse lance sai do que esta abertura ensina. Pode ser
            bom — o computador é que não sabe respondê-lo por aqui.
          </p>
        ) : null}

        {aviso.tipo === 'fim' ? (
          <p className={styles.comentario}>
            A teoria desta abertura terminou aqui. Daqui em diante é meio-jogo, e é onde os planos
            que você estudou entram.
          </p>
        ) : null}

        <button type="button" className={styles.recomecar} onClick={() => recomecar(lado)}>
          Recomeçar a partida
        </button>
      </MesaDeEstudo>
    </section>
  )
}
