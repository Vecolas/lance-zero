'use client'

/**
 * A jornada de LIÇÕES: várias lições em sequência, sem devolver o aluno à lista.
 *
 * A REGRA QUE ESTA TELA CUMPRE: um nó composto do Roadmap ("Geração de
 * candidatos") abre a primeira lição e o app conduz até o fim. Terminar a lição
 * 1 e cair de volta na biblioteca seria pedir ao aluno que descobrisse sozinho
 * qual é a lição 2 — que é a pergunta que o currículo existe para responder.
 *
 * O PROGRESSO É DERIVADO, nunca guardado aqui. A lição conta como vencida quando
 * a habilidade dela tem evidência de ensino, que é o mesmo dado que o resto do
 * app lê. Um "passo atual" próprio seria a segunda verdade sobre a mesma
 * pergunta, e no dia da divergência a jornada mandaria repetir uma lição que o
 * app já dá por ensinada.
 *
 * QUEM AVANÇA É `LicaoPlayer`, não esta tela: ela só troca a lição quando a
 * anterior chega ao resumo. O fluxo pedagógico de nove etapas continua morando
 * num lugar só.
 *
 * ENQUANTO O REPOSITÓRIO NÃO ABRIU, a tela não chuta a lição de entrada. Abrir a
 * primeira e trocar depois faria o aluno começar a ler algo que some — pior que
 * esperar, porque parece um defeito.
 */

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { LicaoPlayer } from '@/components/lessons/LicaoPlayer'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { StatePanel } from '@/components/ui/primitives'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { licaoDeEntrada, progressoDaJornadaDeLicoes } from '@/domain/roadmap/lesson-journey'
import type { LessonJourneyTarget, ModoDeAprendizado } from '@/domain/roadmap/learning-target'
import type { SkillId } from '@/domain/types'
import { registrarEnsino } from '@/lib/training/registrar-tentativa'
import styles from './JornadaDeLicoes.module.css'

export interface JornadaDeLicoesProps {
  target: LessonJourneyTarget
  /** Lição pedida pela URL, do deep link de "Continuar". */
  etapaPedida?: string
  modo?: ModoDeAprendizado
}

/** A frase de abertura de cada modo. O destino é o mesmo; o enquadramento não. */
const ABERTURA_POR_MODO: Record<ModoDeAprendizado, string> = {
  aprender: 'Três etapas, na ordem. Ao terminar uma, a próxima abre sozinha.',
  continuar: 'Você retoma de onde parou. As etapas já vencidas não voltam.',
  revisar: 'Revendo o que já foi estudado. Nada aqui muda o seu progresso para pior.',
  reaprender:
    'Este conteúdo voltou a falhar em partida, então ele é ensinado de novo — do começo da etapa que ficou devendo.',
}

function licaoPorId(lessonId: string) {
  return CATALOGO_DE_LICOES.find((licao) => licao.id === lessonId) ?? null
}

export function JornadaDeLicoes({ target, etapaPedida, modo = 'aprender' }: JornadaDeLicoesProps) {
  const { status, repo, erro, refresh } = useRepository()
  const [ensinadas, setEnsinadas] = useState<ReadonlySet<SkillId> | null>(null)
  /**
   * A lição aberta. TRÊS estados, e os três são diferentes:
   *
   * - `undefined` — ainda não escolhida (o repositório não respondeu);
   * - `string`    — esta lição está aberta;
   * - `null`      — a jornada ACABOU.
   *
   * Sem separar `undefined` de `null` o defeito é concreto e foi observado: ao
   * terminar a última lição, o efeito que escolhe a entrada via `null`, achava
   * que ainda não tinha escolhido, e reabria a última — a jornada nunca
   * terminava.
   */
  const [abertaId, setAbertaId] = useState<string | null | undefined>(undefined)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!repo) return
    let cancelado = false
    void repo
      .getSkillStates()
      .then((estados) => {
        if (cancelado) return
        setEnsinadas(
          new Set(estados.filter((e) => e.exposureCount > 0).map((e) => e.skillId as SkillId)),
        )
      })
      .catch((causa: unknown) => {
        if (!cancelado) setFalha(causa instanceof Error ? causa.message : String(causa))
      })
    return () => {
      cancelado = true
    }
  }, [repo])

  /** Quais lições DESTA jornada já foram vencidas, pela habilidade de cada uma. */
  const concluidas = useMemo(() => {
    if (!ensinadas) return new Set<string>()
    return new Set(
      target.lessonIds.filter((lessonId) => {
        const licao = licaoPorId(lessonId)
        return licao ? ensinadas.has(licao.habilidade) : false
      }),
    )
  }, [ensinadas, target.lessonIds])

  /*
    A LIÇÃO ABERTA É DERIVADA ENQUANTO NINGUÉM ESCOLHEU.

    Ela não vira estado num efeito: a entrada é uma função do progresso, e
    calcular no render dispensa a rodada extra que um `setState` dentro de efeito
    provoca. O estado só passa a mandar quando o aluno TERMINA uma lição — que é
    o único momento em que a escolha deixa de ser derivável.

    Antes de o repositório responder, o resultado é `undefined`: a tela espera,
    em vez de abrir uma lição que pode não ser a certa e trocar meio segundo
    depois — o que se parece com defeito.
  */
  const licaoEmAberto =
    abertaId !== undefined
      ? abertaId
      : ensinadas !== null
        ? licaoDeEntrada(target, concluidas, etapaPedida)
        : undefined

  if (status === 'erro' || falha)
    return (
      <StatePanel
        kind="error"
        title="Não consegui abrir esta jornada"
        description={falha ?? erro ?? undefined}
      />
    )

  if (status === 'carregando' || ensinadas === null || licaoEmAberto === undefined)
    return <StatePanel kind="loading" title="Lendo o que você já estudou" />

  // `null` aqui é a jornada ENCERRADA: a última lição acabou de ser vencida.
  if (licaoEmAberto === null)
    return (
      <StatePanel
        kind="completed"
        title="Você já venceu todas as etapas deste conteúdo"
        description="Concluir não é dominar: o que fixa é a revisão espaçada, e ela já está agendada."
        action={<Link href="/roadmap">Voltar ao roadmap</Link>}
      />
    )

  const aberta = licaoPorId(licaoEmAberto)
  if (!aberta)
    return (
      <StatePanel
        kind="error"
        title="Esta jornada aponta para uma lição que não existe"
        description={`A lição "${licaoEmAberto}" não está no catálogo. Isso é erro de configuração do currículo, não do seu progresso.`}
      />
    )

  const posicao = target.lessonIds.indexOf(aberta.id) + 1

  return (
    <>
      <p className={styles.trilha} data-testid="trilha-da-jornada">
        <span className={styles.passo}>
          Etapa {posicao} de {target.lessonIds.length}
        </span>{' '}
        · {ABERTURA_POR_MODO[modo]}
      </p>
      <ol className={styles.etapas} aria-label="Etapas deste conteúdo">
        {target.lessonIds.map((lessonId, indice) => {
          const licao = licaoPorId(lessonId)
          const vencida = concluidas.has(lessonId)
          const atual = lessonId === aberta.id
          return (
            <li
              key={lessonId}
              className={atual ? styles.etapaAtual : styles.etapa}
              aria-current={atual ? 'step' : undefined}
            >
              {/* Estado nunca só por cor: símbolo e palavra andam juntos. */}
              <span aria-hidden="true">{vencida ? '✓' : atual ? '◔' : '○'}</span>{' '}
              <span className={styles.nomeDaEtapa}>{licao?.titulo ?? lessonId}</span>
              <span className={styles.estadoDaEtapa}>
                {vencida ? 'Concluída' : atual ? 'Agora' : `Etapa ${indice + 1}`}
              </span>
            </li>
          )
        })}
      </ol>

      <LicaoPlayer
        key={aberta.id}
        licao={aberta}
        aoAvancar={(evento) => {
          if (evento.etapa !== 'resumo') return
          const habilidade = aberta.habilidade
          const seguintes = new Set(concluidas)
          seguintes.add(aberta.id)
          const proxima = progressoDaJornadaDeLicoes(target, seguintes).licaoAtual

          if (repo) {
            void registrarEnsino(repo, habilidade, new Date()).then(() => {
              setEnsinadas((atual) => new Set([...(atual ?? []), habilidade]))
              refresh()
            })
          } else {
            setEnsinadas((atual) => new Set([...(atual ?? []), habilidade]))
          }

          // A PRÓXIMA ABRE SOZINHA. É a razão de esta tela existir.
          setAbertaId(proxima)
        }}
      />
    </>
  )
}
