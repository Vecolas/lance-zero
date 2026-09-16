'use client'

/**
 * Biblioteca de microlições: a LISTA. Quem conduz a lição aberta é
 * `LicaoPlayer`.
 *
 * A SEPARAÇÃO É NOVA E É O PONTO. A versão anterior era um arquivo só, e a
 * lição aberta vivia dentro dele — o que significava que a lição só existia
 * dentro da biblioteca. Quando o plano do dia passou a mandar o aluno para uma
 * lição específica, e quando o Treino Hub passou a oferecer "continuar
 * aprendendo", as duas precisavam da MESMA lição, com o mesmo fluxo de nove
 * etapas. Reimplementar o fluxo em cada tela seria três cópias da regra
 * pedagógica, divergindo na primeira correção.
 *
 * Aqui mora só a escolha; lá mora o ensino.
 *
 * ESTADO VAZIO: quando não há lição do assunto procurado, a tela aponta para o
 * treino do dia, não para o catálogo. Catálogo vazio que oferece mais catálogo
 * é o desenho que o produto recusa.
 */

import Link from 'next/link'
import { useState } from 'react'
import { LicaoPlayer } from '@/components/lessons/LicaoPlayer'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { CATALOGO_DE_LICOES } from '@/content/lessons'
import { estimarMinutos } from '@/domain/lessons'
import { ROTULO_DO_ESTAGIO, type LearningStage } from '@/domain/aprendizado'
import { getSkill } from '@/domain/skills/catalog'
import type { SkillArea, SkillId } from '@/domain/types'
import { registrarEnsino } from '@/lib/training/registrar-tentativa'
import styles from './BibliotecaDeLicoes.module.css'

export interface BibliotecaDeLicoesProps {
  /** Recorte por área, vindo da URL. Ausente mostra tudo. */
  area?: SkillArea
  /** Abre direto nesta lição. Usado pelo plano do dia e pelo hub. */
  licaoInicialId?: string
  /** Estágio por habilidade, para a lista dizer onde o aluno está. */
  estagios?: ReadonlyMap<string, LearningStage>
}

export function BibliotecaDeLicoes({
  area,
  licaoInicialId,
  estagios,
}: BibliotecaDeLicoesProps = {}) {
  const { repo, profile, refresh } = useRepository()
  const [abertaId, setAbertaId] = useState<string | null>(licaoInicialId ?? null)

  const visiveis = area
    ? CATALOGO_DE_LICOES.filter((licao) => getSkill(licao.habilidade).area === area)
    : CATALOGO_DE_LICOES

  const aberta = CATALOGO_DE_LICOES.find((licao) => licao.id === abertaId) ?? null

  if (aberta) {
    return (
      <LicaoPlayer
        licao={aberta}
        aoAvancar={(evento) => {
          if (evento.etapa !== 'resumo') return
          if (typeof window !== 'undefined') {
            const markerKey = `lancezero-relearning:${profile?.id ?? 'local'}`
            try {
              const raw = window.localStorage.getItem(markerKey)
              if (raw)
                window.localStorage.setItem(
                  markerKey,
                  JSON.stringify({ ...JSON.parse(raw), completed: true }),
                )
            } catch {
              /* a lição continua concluída mesmo sem storage */
            }
          }
          if (repo)
            void registrarEnsino(repo, aberta.habilidade as SkillId, new Date()).then(() =>
              refresh(),
            )
        }}
        aoFechar={() => {
          setAbertaId(null)
          if (typeof window !== 'undefined') {
            const markerKey = `lancezero-relearning:${profile?.id ?? 'local'}`
            try {
              const raw = window.localStorage.getItem(markerKey)
              if (raw && JSON.parse(raw).completed === true)
                window.location.assign('/train/revisao')
            } catch {
              /* navegação normal da biblioteca */
            }
          }
        }}
      />
    )
  }

  if (visiveis.length === 0) {
    return (
      <p className={styles.vazio}>
        Ainda não há lição escrita para este assunto. O treino de hoje continua funcionando sem ela.{' '}
        <Link href="/dashboard">Ir para o treino de hoje</Link>
      </p>
    )
  }

  return (
    <ul className={styles.lista}>
      {visiveis.map((licao) => {
        const estagio = estagios?.get(licao.habilidade)
        return (
          <li key={licao.id} className={styles.cartao}>
            <span className={styles.habilidade}>
              {getSkill(licao.habilidade).label}
              {estagio ? <> · {ROTULO_DO_ESTAGIO[estagio]}</> : null}
            </span>
            <h2 className={styles.tituloCartao}>{licao.titulo}</h2>
            <p className={styles.conceito}>{licao.objetivo}</p>
            <span className={styles.minutos}>
              {estimarMinutos(licao)} min · termina em exercício sem ajuda
            </span>
            <button type="button" className={styles.primario} onClick={() => setAbertaId(licao.id)}>
              Abrir lição
            </button>
          </li>
        )
      })}
    </ul>
  )
}
