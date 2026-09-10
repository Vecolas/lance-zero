'use client'

/**
 * A tela de aberturas: os dois repertórios, com as ideias, e o que as partidas
 * do aluno dizem sobre eles.
 *
 * DECISÃO 1 — OS DOIS REPERTÓRIOS APARECEM JUNTOS, sem aba e sem acordeão. São
 * dois: brancas e pretas, e cada um responde uma pergunta diferente ("o que eu
 * jogo" e "o que eu respondo"). Esconder um atrás de clique economizaria rolagem
 * e criaria o aluno que estudou só o de brancas por seis meses sem nunca ter
 * visto que o outro existe.
 *
 * DECISÃO 2 — A LISTA SAI DO CONTEÚDO, nunca de uma lista escrita aqui.
 * Repertório novo em `@/content/openings` aparece nesta tela sem ninguém lembrar
 * de cadastrá-lo. Uma lista paralela seria o desenho em que o conteúdo existe,
 * passa no portão, e mesmo assim some da tela em silêncio.
 *
 * DECISÃO 3 — O REPERTÓRIO NÃO ESPERA O BANCO. As árvores são construídas do
 * conteúdo local, de forma síncrona, e desenham na primeira renderização. A
 * leitura das partidas é assíncrona e alimenta APENAS o bloco de frequência. É
 * o critério de aceite "explorer indisponível não quebra a tela" levado até o
 * fim: nem o explorer, nem o IndexedDB, nem a rede seguram o que é local.
 *
 * DECISÃO 4 — A FREQUÊNCIA É RECALCULADA DE `partidas`, e nunca guardada. É
 * função pura do domínio; congelar o resultado num estado criaria a cópia que
 * envelhece quando o aluno importa uma partida nova em outra aba.
 *
 * DECISÃO 5 — LEITURA QUE FALHA É DITA, e não vira lista vazia. Aba anônima e
 * permissão negada derrubam o IndexedDB. "Não consegui ler" e "você não tem
 * partidas" levam a conclusões opostas, e a segunda seria mentira.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { construirRepertorio, frequenciaDoRepertorio } from '@/domain/repertoire'
import { INDICE_ECO, REPERTORIOS_INICIAIS } from '@/content/openings'
import type { Game } from '@/domain/types'
import type { ConsultaDoExplorer } from './ExplorerPanel'
import { RepertorioCard, type EstadoDasPartidas } from './RepertorioCard'
import styles from './OpeningsWorkbench.module.css'

/**
 * Quantas partidas entram na conta da frequência.
 *
 * LIMITE DE DESIGN, não regra de produto: `frequenciaDoRepertorio` percorre cada
 * PGN uma vez, e isso roda na thread principal. O teto existe para a tela não
 * travar no celular de quem importou o histórico inteiro. Subi-lo é uma decisão
 * de performance, e o dia em que ele apertar de verdade o cálculo muda de lugar,
 * não de número.
 */
export const ABERTURAS_CONFIG = {
  maxPartidasLidas: 500,
} as const

export interface OpeningsWorkbenchProps {
  /** Injetada no teste. Ausente em produção: o painel cria o adapter real. */
  consultarExplorer?: ConsultaDoExplorer
}

export function OpeningsWorkbench({ consultarExplorer }: OpeningsWorkbenchProps = {}) {
  const { repo, status, erro, revision } = useRepository()
  const [partidas, setPartidas] = useState<Game[] | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  const arvores = useMemo(
    () =>
      REPERTORIOS_INICIAIS.map((definicao) =>
        construirRepertorio(definicao, { indiceEco: INDICE_ECO }),
      ),
    [],
  )

  useEffect(() => {
    let cancelado = false
    if (!repo) {
      // Repositório ainda abrindo, ou indisponível. Não há o que ler; o estado
      // de erro do provider é quem conta essa história.
      return
    }
    void (async () => {
      try {
        const lista = await repo.listGames({ limit: ABERTURAS_CONFIG.maxPartidasLidas })
        if (cancelado) return
        setPartidas(lista)
        setFalha(null)
      } catch (e) {
        if (cancelado) return
        setPartidas(null)
        setFalha(
          e instanceof Error
            ? `Não consegui ler suas partidas: ${e.message}`
            : 'Não consegui ler suas partidas importadas.',
        )
      }
    })()
    return () => {
      cancelado = true
    }
  }, [repo, revision])

  /**
   * Um estado por árvore, recalculado quando a entrada muda — ver DECISÃO 4.
   *
   * O `useMemo` está aqui por causa do custo: `frequenciaDoRepertorio` lê o PGN
   * de cada partida. Não é cache de resultado: as dependências são a entrada
   * inteira, então nenhum valor sobrevive à mudança de quem o gerou.
   */
  const estados = useMemo<EstadoDasPartidas[]>(() => {
    if (falha !== null) {
      return arvores.map(() => ({ tipo: 'erro', mensagem: falha }))
    }
    if (status === 'erro') {
      const mensagem = erro ?? 'O armazenamento local deste navegador está indisponível.'
      return arvores.map(() => ({ tipo: 'erro', mensagem }))
    }
    if (partidas === null) {
      return arvores.map(() => ({ tipo: 'carregando' }))
    }
    return arvores.map((arvore) => ({
      tipo: 'pronto',
      frequencia: frequenciaDoRepertorio(arvore, partidas),
    }))
  }, [arvores, falha, status, erro, partidas])

  return (
    <div className={styles.repertorios}>
      {arvores.map((arvore, indice) => (
        <RepertorioCard
          key={arvore.id}
          arvore={arvore}
          consultarExplorer={consultarExplorer}
          partidas={estados[indice]}
        />
      ))}
    </div>
  )
}
