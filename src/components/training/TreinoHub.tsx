'use client'

/**
 * O hub do "Treinar".
 *
 * O QUE MUDOU: abrir **Treinar** jogava o aluno direto numa posição. Não havia
 * escolha e não havia contexto — a tela abria perguntando "qual é o melhor
 * lance?" antes de o aluno ter decidido o que queria fazer, e antes de o app ter
 * verificado se ele já conhecia o tema.
 *
 * Agora é um HUB, e as seções têm nomes PEDAGÓGICOS (plano §23): Aprender,
 * Praticar, Revisar, Currículo, Minhas partidas. Nada aqui se chama "puzzle".
 * A distinção não é vocabulário: ela é a diferença entre o app te ensinar e o
 * app te medir, e apagá-la sob um nome só foi como a dívida nasceu.
 *
 * AS SEÇÕES SÃO DERIVADAS DO ESTADO, não fixas. "Continuar aprendendo" mostra o
 * que está em `introduced`; "Praticar" mostra o que já pode ser cobrado. Uma
 * lista fixa mostraria a mesma coisa para quem nunca treinou e para quem já
 * domina metade do catálogo.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import {
  ROTULO_DO_ESTAGIO,
  estagioAlcanca,
  ordemDoCurriculo,
  visaoDaHabilidade,
  type VisaoDaHabilidade,
} from '@/domain/aprendizado'
import { getSkill } from '@/domain/skills/catalog'
import { carregarSkillStates } from '@/lib/training/plano-do-dia'
import type { SkillArea } from '@/domain/types'
import styles from './TreinoHub.module.css'
import { StatePanel } from '@/components/ui/primitives'

const ROTULO_DA_AREA: Record<SkillArea, string> = {
  tactics: 'Tática',
  calculation: 'Cálculo',
  endgame: 'Finais',
  opening: 'Aberturas',
}

interface Carregado {
  visoes: VisaoDaHabilidade[]
  revisoesVencidas: number
  partidasPorRevisar: number
}

export function TreinoHub() {
  const { status, repo, erro, revision } = useRepository()
  const [dados, setDados] = useState<Carregado | null>(null)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const agora = new Date()
        const [estados, mastery, vencidos, partidas] = await Promise.all([
          carregarSkillStates(repo, agora),
          repo.getSkillMastery(),
          repo.getDueCards(agora),
          repo.listGames({ limit: 50 }),
        ])

        const porId = new Map(mastery.map((item) => [item.skillId, item]))
        if (!cancelado) {
          setDados({
            visoes: estados.map((estado) => visaoDaHabilidade(estado, porId.get(estado.skillId))),
            revisoesVencidas: vencidos.length,
            partidasPorRevisar: partidas.filter((p) => p.humanReview === undefined).length,
          })
        }
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
  }, [repo, revision])

  if (status === 'carregando')
    return <StatePanel kind="loading" title="Abrindo seus dados locais…" />

  if (status === 'erro' || falha) {
    return (
      <StatePanel
        kind="error"
        title="Não consegui abrir o hub de treino"
        description={falha ?? erro ?? undefined}
      />
    )
  }

  if (!dados) return <StatePanel kind="loading" title="Lendo seu progresso…" />

  const porId = new Map(dados.visoes.map((visao) => [visao.skillId, visao]))
  const ordenadas = ordemDoCurriculo()
    .map((id) => porId.get(id))
    .filter(Boolean) as VisaoDaHabilidade[]

  // Em andamento: já apresentado, ainda sem autonomia. É a fila de "continuar".
  const aprendendo = ordenadas.filter(
    (visao) => visao.stage === 'introduced' || visao.precisaDeReensino,
  )
  const praticavel = ordenadas.filter((visao) => visao.podeCobrarSemApoio)
  const areas = Object.keys(ROTULO_DA_AREA) as SkillArea[]

  return (
    <div className={styles.hub}>
      {aprendendo.length > 0 ? (
        <Secao
          titulo="Continuar aprendendo"
          descricao="Conceitos que o LanceZero já te apresentou e que ainda vêm com apoio."
        >
          {aprendendo.slice(0, 4).map((visao) => (
            <Cartao
              key={visao.skillId}
              href={`/lessons/${visao.skillId}`}
              titulo={getSkill(visao.skillId).label}
              nota={
                visao.precisaDeReensino
                  ? 'Você já vinha revisando isto sem nunca ter recebido o conceito.'
                  : ROTULO_DO_ESTAGIO[visao.stage]
              }
            />
          ))}
        </Secao>
      ) : null}

      <Secao
        titulo="Praticar"
        descricao={
          praticavel.length > 0
            ? 'Habilidades que você já pode treinar sem apoio na tela.'
            : 'Ainda não há nada aqui — o LanceZero só cobra sem apoio o que já te ensinou. ' +
              'Comece pelo currículo abaixo.'
        }
      >
        {praticavel.slice(0, 6).map((visao) => (
          <Cartao
            key={visao.skillId}
            href={`/train/pratica/${visao.skillId}`}
            titulo={getSkill(visao.skillId).label}
            nota={ROTULO_DO_ESTAGIO[visao.stage]}
          />
        ))}
      </Secao>

      <Secao
        titulo="Revisar"
        descricao="Recuperação espaçada do que você já aprendeu. Só entra aqui o que já foi ensinado."
      >
        <Cartao
          href="/train/revisao"
          titulo={
            dados.revisoesVencidas === 0
              ? 'Nenhuma revisão vencida'
              : `${dados.revisoesVencidas} ${dados.revisoesVencidas === 1 ? 'item vencido' : 'itens vencidos'}`
          }
          nota={
            dados.revisoesVencidas === 0
              ? 'Volte quando algum item vencer. Antecipar revisão não ajuda a fixar.'
              : 'Tentar antes de ver a resposta é o que faz a revisão funcionar.'
          }
        />
      </Secao>

      <Secao
        titulo="Currículo"
        descricao="O mapa inteiro. Nada aqui é bloqueado: o grafo de pré-requisitos serve ao plano do dia, não à sua navegação."
      >
        {areas.map((area) => (
          <Cartao
            key={area}
            href={`/lessons?area=${area}`}
            titulo={ROTULO_DA_AREA[area]}
            nota={`${ordenadas.filter((v) => getSkill(v.skillId).area === area && estagioAlcanca(v.stage, 'introduced')).length} de ${ordenadas.filter((v) => getSkill(v.skillId).area === area).length} iniciadas`}
          />
        ))}
      </Secao>

      <Secao
        titulo="Minhas partidas"
        descricao="Os seus erros reais, virando treino. A revisão começa por você, sem a engine à vista."
      >
        <Cartao
          href="/games"
          titulo={
            dados.partidasPorRevisar === 0
              ? 'Nenhuma partida esperando'
              : `${dados.partidasPorRevisar} ${dados.partidasPorRevisar === 1 ? 'partida' : 'partidas'} por revisar`
          }
          nota={
            dados.partidasPorRevisar === 0
              ? 'Importe uma partida para o LanceZero ter o que analisar.'
              : 'Você marca onde a partida mudou antes de ver qualquer avaliação.'
          }
        />
      </Secao>
    </div>
  )
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao: string
  children: React.ReactNode
}) {
  return (
    <section className={styles.secao}>
      <h2 className={styles.secaoTitulo}>{titulo}</h2>
      <p className={styles.secaoDescricao}>{descricao}</p>
      <ul className={styles.cartoes}>{children}</ul>
    </section>
  )
}

function Cartao({ href, titulo, nota }: { href: string; titulo: string; nota: string }) {
  return (
    <li className={styles.cartao}>
      <Link href={href} className={styles.cartaoLink}>
        <span className={styles.cartaoTitulo}>{titulo}</span>
        <span className={styles.cartaoNota}>{nota}</span>
      </Link>
    </li>
  )
}
