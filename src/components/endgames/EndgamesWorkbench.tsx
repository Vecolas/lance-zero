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
 *
 * DECISÃO 4 — o histórico de cada posição é DERIVADO das tentativas gravadas, a
 * cada leitura. É ele que faz recarregar a página não apagar o que o aluno fez.
 * Manter um contador à parte seria a segunda fonte da mesma verdade, livre para
 * divergir do que está no banco.
 *
 * DECISÃO 5 — armazenamento indisponível não esconde o currículo. Aba anônima e
 * permissão negada derrubam o IndexedDB; nesse caso a lista aparece igual, sem
 * histórico, e a tela DIZ que não conseguiu ler — em vez de mostrar toda posição
 * como nunca tentada, que seria uma afirmação falsa.
 */

import { useEffect, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { estimarMinutos, type LicaoDeFinal, type PosicaoDeFinal } from '@/domain/endgames'
import {
  historicoDasPosicoes,
  PERSISTENCIA_DE_FINAIS_CONFIG,
  type HistoricoDaPosicao,
} from '@/domain/endgames/persistencia'
import { getSkill } from '@/domain/skills/catalog'
import { CURRICULO_FINAIS } from '@/content/endgames'
import { EndgameTrainer } from './EndgameTrainer'
import Link from 'next/link'
import { descreverHistorico, descreverObjetivo } from './textos'
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
  const { repo, revision, status } = useRepository()
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null)
  const [historico, setHistorico] = useState<Map<string, HistoricoDaPosicao>>(new Map())
  const [semHistorico, setSemHistorico] = useState(false)
  const escolha = acharPosicao(escolhidaId)

  /**
   * Relê o histórico a cada `revision`: é o sinal que o treinador emite depois
   * de gravar. Sem essa dependência, voltar do treinador mostraria a lista de
   * antes da tentativa — e o aluno concluiria que nada foi gravado.
   */
  useEffect(() => {
    let cancelado = false
    if (!repo) {
      // Repositório ainda abrindo, ou indisponível. Não há o que ler e não há o
      // que zerar: o histórico começa vazio e só sai do vazio com uma leitura.
      return
    }
    void (async () => {
      try {
        const registros = await repo.listPuzzleAttempts(PERSISTENCIA_DE_FINAIS_CONFIG.historicoLido)
        if (cancelado) return
        setHistorico(historicoDasPosicoes(registros))
        setSemHistorico(false)
      } catch {
        if (cancelado) return
        setHistorico(new Map())
        setSemHistorico(true)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [repo, revision])

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

  const naoConsigoLerHistorico = semHistorico || status === 'erro'

  return (
    <>
      {naoConsigoLerHistorico ? (
        <p className={styles.avisoDeHistorico} role="status">
          <span aria-hidden="true">!</span> Não consegui ler seu histórico de finais: o
          armazenamento local deste navegador está indisponível. As lições continuam treináveis, mas
          as tentativas não serão gravadas.
        </p>
      ) : null}
      <ol className={styles.licoes}>
        {CURRICULO_FINAIS.map((licao) => (
          <li key={licao.id} className={styles.licao}>
            <h2 className={styles.titulo}>
              <Link href={`/endgames/${licao.id}`}>{licao.titulo}</Link>
            </h2>
            <p className={styles.meta}>
              {licao.posicoes.length}{' '}
              {licao.posicoes.length === 1 ? 'posição treinável' : 'posições treináveis'} · cerca de{' '}
              {estimarMinutos(licao)} min · {getSkill(licao.habilidade).label}
            </p>
            <p className={styles.conceito}>{licao.conceito}</p>
            <ul className={styles.posicoes}>
              {licao.posicoes.map((posicao) => {
                const feito = descreverHistorico(historico.get(posicao.id))
                return (
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
                      {feito === null ? null : (
                        <span className={`${styles.historico} ${styles[feito.tom]}`}>
                          <span aria-hidden="true">{feito.icone}</span> {feito.rotulo}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </>
  )
}
