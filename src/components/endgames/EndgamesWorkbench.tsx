'use client'

/**
 * A tela de finais: o currículo e, quando o aluno escolhe uma posição, o
 * treinador.
 *
 * DECISÃO 1 — a lista sai do CURRÍCULO, não de uma lista escrita aqui. Lição
 * nova em `@/content/endgames` aparece nesta tela sem ninguém lembrar de
 * cadastrá-la; uma lista paralela seria o desenho em que a lição existe, é
 * conferida pelo portão, e mesmo assim some da tela em silêncio.
 *
 * DECISÃO 2 — os minutos vêm de `estimarMinutos`, calculados na hora. Congelar
 * o número no conteúdo faria a tela divergir do planner no dia em que alguém
 * girasse `LICAO_CONFIG`.
 *
 * DECISÃO 3 — a seleção é por ID, e a posição é procurada no currículo a cada
 * render. Guardar o objeto no estado criaria uma cópia que envelhece.
 *
 * O `key` do treinador é o ID da posição: trocar de posição monta um treinador
 * novo, com estado limpo, em vez de deixar meia tentativa antiga viva.
 */

import { useState } from 'react'
import { estimarMinutos, type LicaoDeFinal, type PosicaoDeFinal } from '@/domain/endgames'
import { getSkill } from '@/domain/skills/catalog'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { EndgameTrainer } from './EndgameTrainer'
import { descreverObjetivo } from './textos'
import styles from './EndgamesWorkbench.module.css'

interface Escolha {
  licao: LicaoDeFinal
  posicao: PosicaoDeFinal
}

function acharPosicao(id: string | null): Escolha | null {
  if (id === null) {
    return null
  }
  for (const licao of CURRICULO_FINAIS) {
    for (const posicao of licao.posicoes) {
      if (posicao.id === id) {
        return { licao, posicao }
      }
    }
  }
  return null
}

export function EndgamesWorkbench() {
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null)
  const escolha = acharPosicao(escolhidaId)

  if (escolha !== null) {
    return (
      <EndgameTrainer
        key={escolha.posicao.id}
        licao={escolha.licao}
        posicao={escolha.posicao}
        onVoltar={() => setEscolhidaId(null)}
      />
    )
  }

  if (CURRICULO_FINAIS.length === 0) {
    // Estado vazio honesto: currículo vazio é bug de conteúdo, não tela em branco.
    return <p className={styles.vazio}>Nenhuma lição de final cadastrada ainda.</p>
  }

  return (
    <ol className={styles.licoes}>
      {CURRICULO_FINAIS.map((licao) => (
        <li key={licao.id} className={styles.licao}>
          <h2 className={styles.titulo}>{licao.titulo}</h2>
          <p className={styles.meta}>
            {licao.posicoes.length}{' '}
            {licao.posicoes.length === 1 ? 'posição treinável' : 'posições treináveis'} · cerca de{' '}
            {estimarMinutos(licao)} min · {getSkill(licao.habilidade).label}
          </p>
          <p className={styles.conceito}>{licao.conceito}</p>
          <ul className={styles.posicoes}>
            {licao.posicoes.map((posicao) => (
              <li key={posicao.id}>
                <button
                  type="button"
                  className={styles.posicao}
                  onClick={() => setEscolhidaId(posicao.id)}
                >
                  <span className={styles.enunciado}>{posicao.enunciado}</span>
                  <span className={styles.objetivo}>
                    Você joga de {posicao.ladoDoAluno === 'w' ? 'brancas' : 'pretas'}.{' '}
                    {descreverObjetivo(posicao.objetivo)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
