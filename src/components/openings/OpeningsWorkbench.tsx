'use client'

/**
 * A tela de aberturas: os repertórios DO ALUNO, com as ideias, e o que as
 * partidas dele dizem sobre eles.
 *
 * DECISÃO 1 — OS DOIS REPERTÓRIOS APARECEM JUNTOS, sem aba e sem acordeão. São
 * dois: brancas e pretas, e cada um responde uma pergunta diferente ("o que eu
 * jogo" e "o que eu respondo"). Esconder um atrás de clique economizaria rolagem
 * e criaria o aluno que estudou só o de brancas por seis meses sem nunca ter
 * visto que o outro existe.
 *
 * DECISÃO 2 — A LISTA SAI DE `repertoriosDoAluno`, nunca de uma lista escrita
 * aqui e nunca mais do conteúdo de fábrica direto. Até esta rodada esta tela
 * montava as árvores a partir de `@/content/openings`, o que fazia dela uma tela
 * sobre o repertório de OUTRA pessoa: o aluno não tinha como mudar nada, e as
 * lacunas apontavam buracos de um conteúdo que não era dele.
 *
 * DECISÃO 3 — O REPERTÓRIO NÃO ESPERA O BANCO, e continua não esperando. A
 * primeira renderização usa a SEMENTE (`repertoriosDeFabrica`), que é conteúdo
 * local e síncrono; a leitura do repositório substitui a semente quando chega.
 * É o critério de aceite "explorer indisponível não quebra a tela" levado até o
 * fim: nem o explorer, nem o IndexedDB, nem a rede seguram o que é local. O que
 * a semente NÃO faz é se passar pelo repertório do aluno — cada cartão diz, com
 * texto, de quem são as ideias que estão ali.
 *
 * DECISÃO 4 — A FREQUÊNCIA É RECALCULADA DE `partidas`, e nunca guardada. É
 * função pura do domínio; congelar o resultado num estado criaria a cópia que
 * envelhece quando o aluno importa uma partida nova em outra aba.
 *
 * DECISÃO 5 — LEITURA QUE FALHA É DITA, e não vira lista vazia. Aba anônima e
 * permissão negada derrubam o IndexedDB. "Não consegui ler" e "você não tem
 * partidas" levam a conclusões opostas, e a segunda seria mentira. Vale também
 * para a leitura do repertório: se ela falhar, a tela diz que está mostrando a
 * semente, em vez de deixar o aluno achar que apagamos o que ele escreveu.
 *
 * DECISÃO 6 — DEPOIS DE GRAVAR, A TELA RELÊ DO REPOSITÓRIO. Não aplica a edição
 * na cópia que tem em mãos: o que vale é o que está gravado, e costurar o texto
 * novo no estado local criaria a segunda verdade — que sobreviveria intacta a
 * uma gravação que na verdade falhou pela metade.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { frequenciaDoRepertorio, type AlvoDaIdeia } from '@/domain/repertoire'
import {
  repertoriosDeFabrica,
  repertoriosDoAluno,
  salvarIdeiaDoRepertorio,
  type RepertoriosDoAluno,
} from '@/lib/training/repertorio-no-treino'
import type { Game } from '@/domain/types'
import type { ConsultaDoExplorer } from './ExplorerPanel'
import type { ResultadoDeSalvar, SalvarIdeia } from './EditorDeIdeia'
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
  /**
   * Relógio, injetado no teste. Só carimba `atualizadoEm` do repertório gravado.
   * A borda é aqui: quem faz conta com data recebe o instante por parâmetro.
   */
  agora?: () => Date
}

export function OpeningsWorkbench({ consultarExplorer, agora }: OpeningsWorkbenchProps = {}) {
  const { repo, status, erro, revision } = useRepository()
  const [partidas, setPartidas] = useState<Game[] | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [repertorios, setRepertorios] = useState<RepertoriosDoAluno>(repertoriosDeFabrica)
  const [falhaDoRepertorio, setFalhaDoRepertorio] = useState<string | null>(null)
  /** Sobe a cada gravação bem-sucedida e força a releitura — ver DECISÃO 6. */
  const [recarga, setRecarga] = useState(0)

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

  useEffect(() => {
    let cancelado = false
    if (!repo) {
      return
    }
    void (async () => {
      try {
        const lidos = await repertoriosDoAluno(repo)
        if (cancelado) return
        setRepertorios(lidos)
        setFalhaDoRepertorio(null)
      } catch (e) {
        if (cancelado) return
        // A semente continua na tela: ela é conteúdo local e não depende do
        // banco. O que muda é que a tela DIZ que é a semente que está ali.
        setFalhaDoRepertorio(
          e instanceof Error
            ? `Não consegui ler o seu repertório: ${e.message}`
            : 'Não consegui ler o seu repertório gravado.',
        )
      }
    })()
    return () => {
      cancelado = true
    }
  }, [repo, revision, recarga])

  /**
   * O gravador de UM repertório.
   *
   * A função é criada por repertório porque o id não vem do editor: o editor
   * conhece a posição e o lance, e nada mais. Fazer o id viajar pela árvore de
   * componentes até o campo de texto daria a cada `<textarea>` a chance de
   * gravar no repertório errado.
   */
  const criarSalvador = useCallback(
    (repertorioId: string): SalvarIdeia | undefined => {
      if (!repo) {
        return undefined
      }
      return async (alvo: AlvoDaIdeia, ideia: string): Promise<ResultadoDeSalvar> => {
        try {
          const resultado = await salvarIdeiaDoRepertorio(repo, repertorioId, alvo, ideia, {
            agora: agora ? agora() : new Date(),
          })
          if (!resultado.ok) {
            return { ok: false, mensagem: resultado.mensagem }
          }
          setRecarga((n) => n + 1)
          return { ok: true }
        } catch (e) {
          return {
            ok: false,
            mensagem:
              e instanceof Error
                ? `Não consegui gravar: ${e.message}`
                : 'Não consegui gravar a ideia no armazenamento local.',
          }
        }
      }
    },
    [repo, agora],
  )

  const arvores = repertorios.arvores

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

  const deFabrica = useMemo(() => new Set(repertorios.deFabrica), [repertorios.deFabrica])

  return (
    <div className={styles.repertorios}>
      {falhaDoRepertorio === null ? null : (
        <p className={styles.avisoDoRepertorio} role="status">
          <span aria-hidden="true">!</span> {falhaDoRepertorio} Você está vendo o repertório que
          veio com o app; nada do que você escreveu foi apagado.
        </p>
      )}
      {arvores.map((arvore, indice) => (
        <RepertorioCard
          key={arvore.id}
          arvore={arvore}
          deFabrica={deFabrica.has(arvore.id)}
          salvarIdeia={criarSalvador(arvore.id)}
          consultarExplorer={consultarExplorer}
          partidas={estados[indice]}
        />
      ))}
    </div>
  )
}
