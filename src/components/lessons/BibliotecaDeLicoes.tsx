'use client'

/**
 * Biblioteca de microlições.
 *
 * A ORDEM DAS ETAPAS NÃO É DECIDIDA AQUI. Ela vem de `ETAPAS_DA_LICAO`, no
 * esquema, e a última é sempre a recuperação. É por isso que "toda lição
 * termina em recuperação ativa" vale para esta tela sem que ninguém repita a
 * regra dentro do JSX — e é por isso que uma tela nova não consegue quebrá-la
 * por engano.
 *
 * RECUPERAÇÃO ANTES DA EXPLICAÇÃO: o exercício final não mostra o tema nem a
 * explicação antes da resposta. O aluno escolhe, e só então a tela diz o que
 * aconteceu — na ordem do PEDAGOGY: o que aconteceu, depois por quê.
 *
 * ESTADO VAZIO: quando não há lição do assunto procurado, a tela aponta para o
 * treino do dia, não para o catálogo. Catálogo vazio que oferece mais catálogo
 * é o desenho que o produto recusa.
 */

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import {
  CATALOGO_DE_LICOES,
  ETAPAS_DA_LICAO,
  estimarMinutos,
  type ExercicioDeRecuperacao,
  type Licao,
} from '@/content/lessons'
import { acertou, opcoesDe } from '@/domain/diagnostic'
import { getSkill } from '@/domain/skills/catalog'
import { applyMove, legalMoves, normalizeUci, parseUci } from '@/lib/chess'
import styles from './BibliotecaDeLicoes.module.css'

const ROTULO_DA_ETAPA: Record<(typeof ETAPAS_DA_LICAO)[number], string> = {
  conceito: 'Conceito',
  exemplo: 'Exemplo resolvido',
  recuperacao: 'Agora sem ajuda',
}

export function BibliotecaDeLicoes() {
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const aberta = CATALOGO_DE_LICOES.find((licao) => licao.id === abertaId) ?? null

  if (aberta) {
    return <LicaoAberta licao={aberta} aoFechar={() => setAbertaId(null)} />
  }

  if (CATALOGO_DE_LICOES.length === 0) {
    return (
      <p className={styles.vazio}>
        Ainda não há lição escrita. O treino de hoje continua funcionando sem ela.{' '}
        <Link href="/dashboard">Ir para o treino de hoje</Link>
      </p>
    )
  }

  return (
    <ul className={styles.lista}>
      {CATALOGO_DE_LICOES.map((licao) => (
        <li key={licao.id} className={styles.cartao}>
          <span className={styles.habilidade}>{getSkill(licao.habilidade).label}</span>
          <h2 className={styles.tituloCartao}>{licao.titulo}</h2>
          <p className={styles.conceito}>{licao.conceito}</p>
          <span className={styles.minutos}>{estimarMinutos(licao)} min · termina em exercício</span>
          <button type="button" className={styles.primario} onClick={() => setAbertaId(licao.id)}>
            Abrir lição
          </button>
        </li>
      ))}
    </ul>
  )
}

function LicaoAberta({ licao, aoFechar }: { licao: Licao; aoFechar: () => void }) {
  const exemplo = licao.exemploResolvido

  return (
    <article className={styles.licao} aria-labelledby="licao-titulo">
      <button type="button" className={styles.voltar} onClick={aoFechar}>
        ← Todas as lições
      </button>
      <span className={styles.habilidade}>{getSkill(licao.habilidade).label}</span>
      <h2 id="licao-titulo" className={styles.tituloCartao}>
        {licao.titulo}
      </h2>

      <section className={styles.etapa} aria-labelledby="etapa-conceito">
        <h3 id="etapa-conceito" className={styles.etapaTitulo}>
          {ROTULO_DA_ETAPA.conceito}
        </h3>
        <p className={styles.texto}>{licao.conceito}</p>
      </section>

      <section className={styles.etapa} aria-labelledby="etapa-exemplo">
        <h3 id="etapa-exemplo" className={styles.etapaTitulo}>
          {ROTULO_DA_ETAPA.exemplo}
        </h3>
        <div className={styles.comTabuleiro}>
          <div className={styles.tabuleiro}>
            <ChessBoardView
              fen={exemplo.fen}
              orientation={exemplo.ladoDoAluno}
              interactive={false}
            />
          </div>
          <div className={styles.aoLado}>
            <p className={styles.texto}>{exemplo.comentario}</p>
            <p className={styles.linha}>
              <span className={styles.linhaRotulo}>Linha</span>{' '}
              {notacaoDaLinha(exemplo.fen, exemplo.linhaModelo).join(' ')}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.etapa} aria-labelledby="etapa-recuperacao">
        <h3 id="etapa-recuperacao" className={styles.etapaTitulo}>
          {ROTULO_DA_ETAPA.recuperacao}
        </h3>
        {licao.recuperacao.map((exercicio) => (
          <Recuperacao key={exercicio.id} exercicio={exercicio} />
        ))}
      </section>
    </article>
  )
}

function Recuperacao({ exercicio }: { exercicio: ExercicioDeRecuperacao }) {
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const notacoes = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const lance of legalMoves(exercicio.fen)) mapa.set(lance.uci, lance.san)
    return mapa
  }, [exercicio.fen])

  const certo = escolhido !== null && acertou(exercicio, escolhido)

  return (
    <div className={styles.comTabuleiro}>
      <div className={styles.tabuleiro}>
        <ChessBoardView
          fen={exercicio.fen}
          orientation={exercicio.ladoDoAluno}
          interactive={false}
        />
      </div>
      <div className={styles.aoLado}>
        <p className={styles.texto}>{exercicio.enunciado}</p>
        <ul className={styles.opcoes} aria-label="Lances possíveis">
          {opcoesDe(exercicio).map((uci) => (
            <li key={uci}>
              <button
                type="button"
                className={styles.opcao}
                aria-pressed={escolhido === uci}
                onClick={() => setEscolhido(uci)}
              >
                {notacoes.get(uci) ?? uci}
              </button>
            </li>
          ))}
        </ul>
        {escolhido !== null && (
          <div className={styles.veredito} role="status">
            {/* Cor + ícone + texto: o estado nunca depende só da cor. */}
            <p className={certo ? styles.acertou : styles.errou}>
              {certo ? '✓ Cumpriu o objetivo.' : '✕ Não cumpre o objetivo.'}
            </p>
            <p className={styles.texto}>{exercicio.explicacao}</p>
            {!certo && (
              <button type="button" className={styles.ghost} onClick={() => setEscolhido(null)}>
                Tentar de novo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Linha modelo em notação curta.
 *
 * Derivada da posição a cada renderização, e não guardada junto do conteúdo:
 * SAN escrito à mão ao lado do UCI seria a segunda fonte da mesma verdade, e a
 * que diverge é sempre a que o aluno lê.
 */
function notacaoDaLinha(fen: string, linha: readonly string[]): string[] {
  const notacoes: string[] = []
  let atual = fen
  for (const uci of linha) {
    const entrada = parseUci(normalizeUci(uci))
    const aplicado = entrada === null ? null : applyMove(atual, entrada)
    // Linha ilegal é problema de conteúdo e o portão do catálogo já reprova por
    // isso. Aqui a tela só para de escrever, em vez de quebrar na cara do aluno.
    if (aplicado === null) break
    notacoes.push(aplicado.move.san)
    atual = aplicado.fenAfter
  }
  return notacoes
}
