'use client'

/**
 * RESPONDER COM DOIS CLIQUES, além do arraste.
 *
 * POR QUE OS DOIS CAMINHOS EXISTEM, e por que isto é um hook e não código
 * copiado em cada tela:
 *
 * 1. ACESSIBILIDADE. Arrastar exige coordenação fina e um apontador. Quem usa
 *    teclado, leitor de tela ou toque impreciso responde clicando na peça e
 *    depois na casa — e o plano pede isso explicitamente. Sem esta porta, "a
 *    resposta acontece no tabuleiro" significaria "quem não arrasta não
 *    responde".
 *
 * 2. O ARRASTE NÃO É TESTÁVEL onde o teste roda. A biblioteca de tabuleiro
 *    implementa o arraste por conta própria e ele não existe em jsdom. Sem o
 *    clique, as telas de resposta ficariam sem teste de unidade — e o que sobra
 *    é confiar em e2e para tudo, inclusive para regra pedagógica.
 *
 * O ESTADO É DE SELEÇÃO, e não de lance. O hook não sabe se o lance é legal nem
 * se responde à lição: ele junta duas casas e entrega o par a quem decide. Quem
 * decide é `julgarLanceDaLicao`, no domínio — e é lá que a separação entre
 * legalidade e pedagogia mora.
 */

import { useCallback, useState } from 'react'
import { legalMoves } from '@/lib/chess'
import type { SquareName } from '@/lib/chess'

export interface LanceNoTabuleiro {
  /** Casa escolhida agora, para o tabuleiro destacar. */
  selecionada: SquareName | null
  /** Destinos legais a partir dela. Guia sem entregar a resposta. */
  destinos: SquareName[]
  aoClicarNaCasa: (casa: SquareName) => void
  limpar: () => void
}

export interface OpcoesDoLance {
  fen: string
  /** A tela ainda aceita lance? Quando não, o clique não faz nada. */
  ativo: boolean
  /** Chamado quando duas casas formam um par. O retorno diz se foi aceito. */
  aoTentar: (origem: SquareName, destino: SquareName) => boolean
}

export function useLanceNoTabuleiro({ fen, ativo, aoTentar }: OpcoesDoLance): LanceNoTabuleiro {
  const [selecionada, setSelecionada] = useState<SquareName | null>(null)

  const limpar = useCallback(() => setSelecionada(null), [])

  const aoClicarNaCasa = useCallback(
    (casa: SquareName) => {
      if (!ativo) return

      if (selecionada === null) {
        /*
          SÓ SELECIONA CASA COM LANCE POSSÍVEL.

          Clicar numa casa vazia e ver a seleção acender ensinaria que o app
          aceitou algo — e o clique seguinte viraria um lance que nunca existiu.
          Sem lance saindo dali, o clique não faz nada.
        */
        const temSaida = legalMoves(fen).some((lance) => lance.from === casa)
        if (temSaida) setSelecionada(casa)
        return
      }

      // Clicar de novo na mesma casa DESSELECIONA: é como se desiste de um
      // lance no meio, e sem isso a única saída seria completar algo errado.
      if (casa === selecionada) {
        setSelecionada(null)
        return
      }

      const aceito = aoTentar(selecionada, casa)
      /*
        RECUSADO NÃO LIMPA A SELEÇÃO QUANDO A PEÇA PODE IR A OUTRO LUGAR.

        Se a segunda casa não serve, o mais provável é que o aluno errou o
        destino — não a peça. Limpar tudo o obrigaria a selecionar de novo a cada
        tentativa. Mas se a casa nova tem lance próprio, ela vira a seleção: é o
        comportamento que todo tabuleiro tem, e quebrá-lo seria surpresa.
      */
      if (aceito) {
        setSelecionada(null)
        return
      }
      const temSaida = legalMoves(fen).some((lance) => lance.from === casa)
      setSelecionada(temSaida ? casa : selecionada)
    },
    [ativo, aoTentar, fen, selecionada],
  )

  const destinos =
    selecionada === null
      ? []
      : legalMoves(fen)
          .filter((lance) => lance.from === selecionada)
          .map((lance) => lance.to)

  return { selecionada, destinos, aoClicarNaCasa, limpar }
}
