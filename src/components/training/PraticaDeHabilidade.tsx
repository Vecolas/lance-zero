'use client'

/**
 * Prática de uma habilidade.
 *
 * A REGRA QUE ESTA TELA CUMPRE, e que o produto inteiro violava: ela pergunta
 * o ESTÁGIO antes de decidir o que mostrar.
 *
 * - habilidade que ainda não pode ser cobrada sem apoio → a tela NÃO mostra
 *   exercício. Ela manda para a lição, e diz por quê;
 * - habilidade em `guided` → exercícios COM a escada de dicas;
 * - habilidade em `independent` ou acima → exercícios sem dica.
 *
 * Antes não havia essa bifurcação porque não havia estágio: a rota abria uma
 * posição e perguntava o melhor lance, para qualquer um, em qualquer ponto.
 *
 * DE ONDE VÊM OS EXERCÍCIOS: do catálogo de lições, que é conteúdo VERIFICADO —
 * cada posição passou pelo portão que confere legalidade, objetivo cumprido e
 * alternativa que de fato falha. Puxar de um banco não verificado aqui traria
 * de volta, por outra porta, o problema de cobrar o que não se conferiu.
 *
 * PONTO CEGO DECLARADO: por isso mesmo, só há prática para as habilidades que
 * já têm lição escrita. As outras caem no estado vazio honesto, que diz que a
 * lição ainda não existe — em vez de oferecer um exercício qualquer para não
 * deixar a tela em branco.
 */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { ExercicioNoTabuleiro } from '@/components/exercicios/ExercicioNoTabuleiro'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { foiIndependente, visaoDaHabilidade, type VisaoDaHabilidade } from '@/domain/aprendizado'
import type { ExercicioPosicional } from '@/domain/exercicios'
import { getSkill } from '@/domain/skills/catalog'
import { registrarTentativa } from '@/lib/training/registrar-tentativa'
import type { SkillId } from '@/domain/types'
import styles from './PraticaDeHabilidade.module.css'

interface Item {
  exercicio: ExercicioPosicional
  enunciado: string
  explicacao: string
  dicas: readonly { degrau: string; texto: string }[]
}

export function PraticaDeHabilidade({ skillId }: { skillId: SkillId }) {
  const { status, repo, erro, revision } = useRepository()
  const [visao, setVisao] = useState<VisaoDaHabilidade | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const agora = new Date()
        const { carregarSkillStates } = await import('@/lib/training/plano-do-dia')
        const [estados, mastery] = await Promise.all([
          carregarSkillStates(repo, agora),
          repo.getSkillMastery(),
        ])
        const estado = estados.find((item) => item.skillId === skillId)
        if (!estado) return
        const porId = new Map(mastery.map((item) => [item.skillId, item]))
        if (!cancelado) setVisao(visaoDaHabilidade(estado, porId.get(skillId)))
      } catch (e) {
        if (!cancelado) {
          setFalha(e instanceof Error ? e.message : 'Não consegui ler seus dados locais.')
        }
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [repo, skillId, revision])

  const licao = CATALOGO_DE_LICOES.find((item) => item.habilidade === skillId) ?? null

  // Com apoio ou sem apoio, conforme o degrau. A escolha é do estágio, não da
  // tela: é exatamente isso que `podeCobrarSemApoio` decide.
  const itens = useMemo<Item[]>(() => {
    if (!licao || !visao) return []
    return visao.podeCobrarSemApoio
      ? licao.recuperacao.map((e) => ({
          exercicio: e,
          enunciado: e.enunciado,
          explicacao: e.explicacao,
          dicas: [],
        }))
      : licao.guiada.map((e) => ({
          exercicio: e,
          enunciado: e.enunciado,
          explicacao: e.explicacao,
          dicas: e.dicas,
        }))
  }, [licao, visao])

  if (status === 'carregando') return <p className={styles.state}>Abrindo seus dados locais…</p>

  if (status === 'erro' || falha) {
    return (
      <p className={`${styles.state} ${styles.error}`} role="alert">
        {falha ?? erro}
      </p>
    )
  }

  if (!visao) return <p className={styles.state}>Lendo seu progresso…</p>

  const rotulo = getSkill(skillId).label

  if (!licao) {
    return (
      <p className={styles.state}>
        Ainda não há lição escrita para {rotulo.toLocaleLowerCase('pt-BR')}, e o LanceZero não cobra
        o que não ensinou. <Link href="/roadmap">Voltar ao roadmap</Link>
      </p>
    )
  }

  // A PORTA QUE FECHA A DÍVIDA: sem estágio suficiente, não há exercício.
  if (visao.stage === 'unseen' || visao.precisaDeReensino) {
    return (
      <div className={styles.state}>
        <p>
          {visao.precisaDeReensino
            ? `Você já vinha revisando ${rotulo.toLocaleLowerCase('pt-BR')}, mas o LanceZero nunca chegou a te explicar o conceito.`
            : `O LanceZero ainda não te mostrou ${rotulo.toLocaleLowerCase('pt-BR')}.`}{' '}
          Cobrar agora seria te pedir para adivinhar, e adivinhar não ensina.
        </p>
        <Link className={styles.primario} href={`/lessons/${skillId}`}>
          Aprender {rotulo.toLocaleLowerCase('pt-BR')}
        </Link>
      </div>
    )
  }

  if (indice >= itens.length) {
    return (
      <div className={styles.state} role="status">
        <p>
          Prática concluída. Como você foi aqui muda a prioridade do seu plano, mas não decide
          sozinho se a habilidade está firme — isso o LanceZero mede ao longo do tempo e nas suas
          partidas.
        </p>
        <Link className={styles.primario} href="/dashboard">
          Voltar para o Hoje
        </Link>
      </div>
    )
  }

  const item = itens[indice]

  return (
    <>
      <p className={styles.contexto}>
        {visao.podeCobrarSemApoio
          ? 'Sem dicas: você já resolveu isto com apoio antes.'
          : 'Com dicas disponíveis: você viu este conceito há pouco, e retirar o apoio agora seria cedo.'}{' '}
        Item {indice + 1} de {itens.length}.
      </p>
      <ExercicioNoTabuleiro
        key={item.exercicio.id}
        exercicio={item.exercicio}
        enunciado={item.enunciado}
        explicacao={item.explicacao}
        dicas={item.dicas}
        rotuloDeSaida="Próximo"
        aoConcluir={(resultado) => {
          void (async () => {
            if (repo) {
              await registrarTentativa(repo, {
                skillId,
                acertou: resultado.acertou,
                apoio: resultado.apoio,
                guiada: !visao.podeCobrarSemApoio,
                agora: new Date(),
              })
            }
            setIndice((n) => n + 1)
          })()
        }}
      />
    </>
  )
}

/*
  O `ItemDePratica` VIROU `@/components/exercicios/ExercicioNoTabuleiro`.

  Ele era uma cópia quase literal do `Tabuleiro` da lição — as duas telas
  julgavam um lance solto e mantinham a posição congelada —, e as duas cópias já
  tinham divergido: aqui a grade punha o TABULEIRO na coluna estreita de 20 rem
  e o texto na larga, que é o contrário do que a regra do projeto manda.

  Não recriar aqui.
*/

export { foiIndependente }
