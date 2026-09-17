'use client'

/**
 * Os exercícios de uma etapa de final — o LADO DA TELA do contrato regra↔tela.
 *
 * O OUTRO LADO é `itensDaEtapaDeFinal`, em `@/domain/endgames/itens-da-etapa`.
 * A regra da etapa nasce da contagem daquela lista; este componente renderiza
 * aquela mesma lista. Uma etapa não tem como cobrar o que este arquivo não sabe
 * desenhar, porque as duas metades leem a MESMA chamada.
 *
 * POR QUE ELE EXISTE COMO COMPONENTE ÚNICO, e esta é a decisão que o defeito de
 * origem cobra: antes, cada etapa decidia sozinha, dentro de um `switch`, se
 * desenhava exercício. Três das quatro etapas com regra de `itens` desenhavam só
 * prosa, `registrarItem` nunca era chamado, e o aluno ficava preso na etapa 2 de
 * 10 sem nada para clicar. Com um ponto de renderização só, "a regra diz itens"
 * IMPLICA "o exercício aparece" — por construção, e não por disciplina.
 *
 * O QUE ESTE COMPONENTE NÃO FAZ: julgar técnica. Aqui não há tablebase, e
 * inventar um veredito seria pior que admitir que não há um — o aluno confia no
 * app pela consistência, e uma reprovação errada num final custa mais que dez
 * avisos de incerteza. O que ele confere é o que se decide olhando só a posição:
 * legalidade, e se o lance levou a mate ou afogamento. O julgamento de técnica é
 * do treino final, que é a única etapa que reprova.
 *
 * REGRA DE `itens`: RESPONDER conclui. Errar a pergunta ou jogar um lance
 * subótimo não impede a etapa de fechar — reprovar aqui transformaria os degraus
 * com apoio num muro, que é o oposto do que eles existem para ser.
 */

import { useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { MesaDeEstudo } from '@/components/jornada/MesaDeEstudo'
import { registrarItem, type StudyJourney, type StudyStage } from '@/domain/jornada'
import type { ItemDeFinal } from '@/domain/endgames/jornada'
import type { EndgamePosition } from '@/domain/endgames'
import { applyMove, legalMoves, positionStatus, type SquareName } from '@/lib/chess'
import styles from './EndgameStudyJourney.module.css'

export interface ItensDaEtapaDeFinalProps {
  stage: StudyStage
  /** A lista que a regra da etapa contou. Nunca uma segunda derivação dela. */
  itens: readonly ItemDeFinal[]
  /** A posição que ilustra uma PERGUNTA, quando o item não traz uma própria. */
  posicaoDeApoio?: EndgamePosition
  jornada: StudyJourney
  aoResponder: (proxima: StudyJourney) => void
  /** A prosa da etapa. Fica ao lado do tabuleiro, acima do exercício. */
  children?: React.ReactNode
}

export function ItensDaEtapaDeFinal({
  stage,
  itens,
  posicaoDeApoio,
  jornada,
  aoResponder,
  children,
}: ItensDaEtapaDeFinalProps) {
  /*
    O PRÓXIMO ITEM É O PRIMEIRO AINDA NÃO RESPONDIDO, derivado dos ids gravados.

    Não é `itens[feitos]`. Um índice vindo de um CONTADOR é a segunda fonte da
    mesma verdade: basta o conteúdo mudar de ordem entre duas sessões para o
    contador apontar para um item já respondido, e a etapa nunca fecharia. Ler os
    ids na hora responde a pergunta certa — "qual ainda falta?" — e sobrevive a
    qualquer reordenação.
  */
  const respondidos = new Set(jornada.itensRespondidos[stage.id] ?? [])
  const item = itens.find((candidato) => !respondidos.has(candidato.id))

  if (!item) {
    return (
      <MesaDeEstudo tabuleiro={<Tabuleiro posicao={posicaoDeApoio} />}>
        {children}
        <p className={styles.texto} role="status">
          Etapa respondida. O &ldquo;Continuar&rdquo; já está liberado.
        </p>
      </MesaDeEstudo>
    )
  }

  const concluir = () => aoResponder(registrarItem(jornada, stage.id, item.id))

  if (item.tipo === 'pergunta') {
    return (
      <MesaDeEstudo tabuleiro={<Tabuleiro posicao={posicaoDeApoio} />}>
        {children}
        <Pergunta key={item.id} item={item} aoConcluir={concluir} />
      </MesaDeEstudo>
    )
  }

  /*
    QUANTOS FALTAM NÃO É DITO AQUI. A casca já escreve "Faltam N de M exercícios
    para seguir." embaixo do "Continuar", derivado da MESMA regra da etapa. Um
    segundo contador nesta coluna seria a segunda fonte do mesmo número — e o dia
    em que os dois discordassem, o aluno acreditaria no errado.
  */
  return (
    <Lance key={item.id} item={item} aoConcluir={concluir}>
      {children}
    </Lance>
  )
}

/* -------------------------------------------------------------- a pergunta */

function Pergunta({
  item,
  aoConcluir,
}: {
  item: Extract<ItemDeFinal, { tipo: 'pergunta' }>
  aoConcluir: () => void
}) {
  const [escolhida, setEscolhida] = useState<number | null>(null)

  return (
    <>
      <p className={styles.texto}>{item.pergunta}</p>
      <ul className={styles.opcoes} aria-label="Respostas possíveis">
        {item.opcoes.map((opcao, indice) => (
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
          {/* Status nunca só por cor: ícone + texto, como manda o guia. */}
          <p className={escolhida === item.correta ? styles.acertou : styles.errou}>
            {escolhida === item.correta ? '✓ É isso.' : '✕ Não é por aí.'}
          </p>
          <p className={styles.texto}>{item.explicacao}</p>
          <button type="button" className={styles.primario} onClick={aoConcluir}>
            Continuar
          </button>
        </div>
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------------ o lance */

/**
 * O que dá para dizer de um lance SEM tablebase.
 *
 * Três estados e nada além. A tentação é comentar a qualidade do lance, e ela
 * está errada: sem juiz, qualquer comentário sobre técnica seria inventado, e
 * `docs/CONVENCOES.md` é explícito — motivo inventado é pior que não dizer.
 */
function leituraLocalDoLance(fenDepois: string, papelEhAtacante: boolean): string | null {
  const status = positionStatus(fenDepois)
  if (status.isCheckmate) {
    return papelEhAtacante
      ? 'Mate. Nesta posição, isso encerra o assunto.'
      : 'Isso é mate contra você — o lance perdeu a partida.'
  }
  if (status.isStalemate) {
    return 'Afogamento: o adversário ficou sem lance legal e a partida é empate.'
  }
  return null
}

function Lance({
  item,
  aoConcluir,
  children,
}: {
  item: Extract<ItemDeFinal, { tipo: 'lance' }>
  aoConcluir: () => void
  children?: React.ReactNode
}) {
  const [selecionada, setSelecionada] = useState<SquareName | null>(null)
  const [jogado, setJogado] = useState<{ san: string; fenDepois: string } | null>(null)
  const [dicaAberta, setDicaAberta] = useState(false)

  const fen = jogado?.fenDepois ?? item.posicao.fen

  function jogar(from: SquareName, to: SquareName): void {
    if (jogado) return
    const aplicado = applyMove(item.posicao.fen, { from, to, promotion: 'q' })
    if (!aplicado) return
    setJogado({ san: aplicado.move.san, fenDepois: aplicado.fenAfter })
    setSelecionada(null)
  }

  const leitura = jogado ? leituraLocalDoLance(jogado.fenDepois, item.papel === 'atacante') : null

  return (
    <MesaDeEstudo
      tabuleiro={
        <div className={styles.tabuleiroEmbutido}>
          <ChessBoardView
            fen={fen}
            orientation={item.papel === 'atacante' ? 'w' : 'b'}
            selected={selecionada}
            onMove={(de, para) => {
              jogar(de, para)
              return true
            }}
            /* SEGUNDO CLIQUE JOGA — quem não arrasta precisa de um caminho até o
               lance, e o arraste não é acessível por teclado nem confiável em
               toque. A legalidade é conferida ANTES para que um clique numa casa
               inalcançável vire nova origem em vez de engolir a seleção. */
            onSquareClick={(casa) => {
              if (jogado) return
              const alcancavel =
                selecionada !== null &&
                legalMoves(item.posicao.fen, selecionada).some((lance) => lance.to === casa)
              if (selecionada && alcancavel) {
                jogar(selecionada, casa)
                return
              }
              setSelecionada(legalMoves(item.posicao.fen, casa).length > 0 ? casa : null)
            }}
            interactive={jogado === null}
          />
        </div>
      }
    >
      {children}
      <p className={styles.kicker}>{item.papel === 'atacante' ? 'LADO FORTE' : 'LADO FRACO'}</p>
      <p className={styles.texto}>{item.enunciado}</p>

      {item.dica && !jogado ? (
        dicaAberta ? (
          <p className={styles.aviso} role="status">
            {item.dica}
          </p>
        ) : (
          /* A DICA NÃO APARECE DE GRAÇA. Ela existe neste degrau e some no
             treino; entregá-la sozinha apagaria a diferença entre os dois. */
          <button type="button" className={styles.secundario} onClick={() => setDicaAberta(true)}>
            Dica
          </button>
        )
      ) : null}

      {jogado ? (
        <div className={styles.veredito} role="status">
          <p className={styles.acertou}>✓ Lance jogado: {jogado.san}</p>
          {leitura ? <p className={styles.texto}>{leitura}</p> : null}
          <p className={styles.nota}>
            {/* Dizer o que NÃO foi conferido é parte de não mentir: aqui não há
                tablebase, e a comparação de técnica é o treino final. */}
            Este degrau registra a sua escolha; quem compara a técnica com a tablebase é o treino
            final.
          </p>
          <button type="button" className={styles.primario} onClick={aoConcluir}>
            Continuar
          </button>
        </div>
      ) : null}
    </MesaDeEstudo>
  )
}

function Tabuleiro({ posicao }: { posicao?: EndgamePosition }) {
  if (!posicao) return null
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
