'use client'

/**
 * A BIBLIOTECA: uma página de ESCOLHA, não uma lista de títulos.
 *
 * O QUE ELA ERA. Uma lista de cartões com título, conceito e um botão "Abrir
 * lição" — e o botão não navegava: ele trocava o conteúdo da própria tela pelo
 * player. Numa biblioteca de XADREZ, onde cada lição é uma posição e a posição
 * existe no conteúdo desde sempre, o aluno lia "A peça que ninguém está
 * defendendo" e só descobria do que se tratava depois de abrir.
 *
 * O QUE MUDOU, e são duas coisas:
 *
 * 1. CADA CARD MOSTRA A POSIÇÃO. Garfo se vê, cravada se vê, oposição se vê —
 *    nenhuma frase identifica um padrão de xadrez tão rápido quanto o desenho
 *    dele. Ver `LessonCard`.
 *
 * 2. A LIÇÃO TEM ENDEREÇO. O card é um LINK para `/lessons/{id}`, e não um botão
 *    que troca o miolo da página. Abrir uma lição passa a ser navegação de
 *    verdade: o link se compartilha, o voltar do navegador volta, e recarregar
 *    não devolve o aluno para a lista.
 *
 * O FILTRO POR ÁREA fica na mesma fileira, com o mesmo desenho de Aberturas e
 * Finais. Doze lições ainda cabem na tela sem filtro nenhum; ele existe porque a
 * issue #11 pede trinta, e a biblioteca que funciona com doze e não com trinta é
 * uma biblioteca que vai precisar ser refeita.
 */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LessonCard } from '@/components/lessons/LessonCard'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { StatePanel, FilterBar } from '@/components/ui/primitives'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { cardDeLicao, type ProgressoDaLicao } from '@/domain/lessons'
import { getSkill } from '@/domain/skills/catalog'
import type { SkillArea, SkillId } from '@/domain/types'
import type { ChaveDeMensagem } from '@/lib/i18n/mensagens'
import { traduzirRota } from '@/lib/i18n/rotas'
import styles from './BibliotecaDeLicoes.module.css'

export interface BibliotecaDeLicoesProps {
  /** Recorte por área, vindo da URL. Ausente mostra tudo. */
  area?: SkillArea
}

/** As áreas que o catálogo de fato tem hoje. Área vazia não vira filtro. */
function areasDoCatalogo(): SkillArea[] {
  const vistas = new Set<SkillArea>()
  for (const licao of CATALOGO_DE_LICOES) vistas.add(getSkill(licao.habilidade).area)
  return [...vistas]
}

/**
 * O que a biblioteca leu do repositório, nas duas chaves em que a resposta vive.
 */
interface LeituraDaBiblioteca {
  porHabilidade: ReadonlyMap<SkillId, ProgressoDaLicao>
  porLicao: ReadonlyMap<string, number>
}

const SEM_LEITURA: LeituraDaBiblioteca = { porHabilidade: new Map(), porLicao: new Map() }

/** Quem nunca treinou a habilidade. Não é erro nem ausência de dado. */
const SEM_PROGRESSO_DA_HABILIDADE: ProgressoDaLicao = {
  ensinada: false,
  precisaDeReensino: false,
  revisaoVencida: false,
}

export function BibliotecaDeLicoes({ area }: BibliotecaDeLicoesProps = {}) {
  const { locale, t } = useIdioma()
  const { repo, revision } = useRepository()
  const [filtro, setFiltro] = useState<SkillArea | 'todas'>(area ?? 'todas')
  const [progresso, setProgresso] = useState<LeituraDaBiblioteca>(SEM_LEITURA)

  /*
    UMA leitura para a biblioteca inteira, e não uma por card.

    Doze cards consultando o repositório por conta própria seriam doze aberturas
    de IndexedDB para montar uma lista — e trinta, quando o catálogo crescer.

    SÃO DUAS PERGUNTAS DIFERENTES, e por isso duas chaves diferentes. "Esta
    habilidade foi ensinada?" é por HABILIDADE e vale para o app inteiro. "Onde
    ele parou nesta lição?" é por LIÇÃO — duas lições da mesma habilidade têm
    checkpoints independentes, e juntar as duas numa chave só faria abrir uma
    delas mover o marcador da outra.
  */
  useEffect(() => {
    if (!repo) return
    let cancelado = false
    void Promise.all([
      repo.getSkillStates(),
      repo.getDueCards(new Date()),
      repo.listLessonProgress(),
    ])
      .then(([estados, vencidos, checkpoints]) => {
        if (cancelado) return
        const vencidasPorHabilidade = new Set(vencidos.flatMap((card) => card.skillIds))
        setProgresso({
          porHabilidade: new Map(
            estados.map((estado) => [
              estado.skillId as SkillId,
              {
                ensinada: estado.exposureCount > 0,
                precisaDeReensino: estado.precisaDeReensino,
                revisaoVencida: vencidasPorHabilidade.has(estado.skillId),
              },
            ]),
          ),
          porLicao: new Map(checkpoints.map((item) => [item.lessonId, item.stepIndex])),
        })
      })
      .catch(() => {
        // Sem progresso a biblioteca continua útil: todo card aparece como
        // disponível, que é o estado verdadeiro de quem nunca estudou.
      })
    return () => {
      cancelado = true
    }
  }, [repo, revision])

  const cards = useMemo(
    () =>
      CATALOGO_DE_LICOES.filter(
        (licao) => filtro === 'todas' || getSkill(licao.habilidade).area === filtro,
      ).map((licao) => {
        const daHabilidade = progresso.porHabilidade.get(licao.habilidade)
        const etapasVencidas = progresso.porLicao.get(licao.id)
        /*
          O CHECKPOINT SÓ ENTRA QUANDO EXISTE. `undefined` e `0` são respostas
          diferentes: quem nunca abriu não tem checkpoint nenhum e o card diz
          "Aprender"; quem abriu e fechou na primeira tela tem checkpoint zero e
          o card diz "Continuar". Passar `?? 0` apagaria a diferença e faria a
          biblioteca oferecer estreia a quem já tinha começado.
        */
        return cardDeLicao(licao, {
          ...(daHabilidade ?? SEM_PROGRESSO_DA_HABILIDADE),
          ...(etapasVencidas === undefined ? {} : { etapasVencidas }),
        })
      }),
    [filtro, progresso],
  )

  const areas = areasDoCatalogo()

  return (
    <>
      {/* Um filtro só, e na mesma fileira — o mesmo desenho de Aberturas e
          Finais, para o aluno não reaprender o controle em cada aba. */}
      <FilterBar label={t('lessons.filterLabel')}>
        {(['todas', ...areas] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            className={filtro === valor ? styles.filtroAtivo : styles.filtro}
            aria-pressed={filtro === valor}
            onClick={() => setFiltro(valor)}
          >
            {valor === 'todas' ? t('lessons.all') : t(`lessons.areas.${valor}` as ChaveDeMensagem)}
          </button>
        ))}
      </FilterBar>

      {cards.length === 0 ? (
        <StatePanel
          kind="empty"
          title={t('lessons.emptyTitle')}
          description={t('lessons.emptyDescription')}
          action={<Link href={traduzirRota('/dashboard', locale)}>{t('lessons.goToToday')}</Link>}
        />
      ) : (
        <ul className={styles.grade} aria-label={t('lessons.gridLabel')}>
          {cards.map((card) => (
            <li key={card.lessonId}>
              <LessonCard card={card} href={traduzirRota(`/lessons/${card.lessonId}`, locale)} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
