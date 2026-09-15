'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChessBoardView } from '@/components/chess/ChessBoardView'
import { Tabs } from '@/components/ui/primitives'
import type { LicaoDeFinal, PosicaoDeFinal } from '@/domain/endgames'
import { getSkill } from '@/domain/skills/catalog'
import { EndgameTrainer } from './EndgameTrainer'
import { descreverObjetivo } from './textos'
import styles from './EndgameDetail.module.css'

type DetailTab = 'overview' | 'practice' | 'positions' | 'mistakes' | 'progress'

const TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'practice', label: 'Praticar' },
  { id: 'positions', label: 'Posições típicas' },
  { id: 'mistakes', label: 'Erros comuns' },
  { id: 'progress', label: 'Progresso' },
] as const

export function EndgameDetail({ licao }: { licao: LicaoDeFinal }) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const [position, setPosition] = useState<PosicaoDeFinal | null>(null)

  if (position) {
    return (
      <div className={styles.trainerPage}>
        <button type="button" className={styles.backButton} onClick={() => setPosition(null)}>
          ← Voltar para {licao.titulo}
        </button>
        <EndgameTrainer
          key={position.id}
          licao={licao}
          posicao={position}
          onVoltar={() => setPosition(null)}
        />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link href="/endgames" className={styles.back}>
        ← Todos os finais
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Final · {getSkill(licao.habilidade).label}</p>
          <h1>{licao.titulo}</h1>
          <p className={styles.lead}>{licao.conceito}</p>
        </div>
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            setTab('practice')
            setPosition(licao.posicoes[0] ?? null)
          }}
        >
          Praticar
        </button>
      </header>
      <Tabs
        tabs={TABS}
        selected={tab}
        onSelect={(id) => setTab(id as DetailTab)}
        label="Seções do final"
      />
      {tab === 'overview' ? <Overview licao={licao} onPractice={() => setTab('practice')} /> : null}
      {tab === 'practice' ? <PracticeList licao={licao} onSelect={setPosition} /> : null}
      {tab === 'positions' ? (
        <PracticeList
          licao={licao}
          onSelect={setPosition}
          heading="Reconheça estas posições antes de jogar."
        />
      ) : null}
      {tab === 'mistakes' ? <Mistakes licao={licao} /> : null}
      {tab === 'progress' ? <Progress licao={licao} /> : null}
    </div>
  )
}

function Overview({ licao, onPractice }: { licao: LicaoDeFinal; onPractice: () => void }) {
  return (
    <section className={styles.overview}>
      <div>
        <h2>O que você precisa reconhecer</h2>
        <p>{licao.conceito}</p>
        <p>
          O objetivo fica visível durante o treino. Acertar o primeiro lance não encerra uma
          conversão: a posição só termina quando o objetivo for cumprido.
        </p>
        <button type="button" className={styles.secondary} onClick={onPractice}>
          Escolher uma posição
        </button>
      </div>
      <div className={styles.infoCard}>
        <h2>Como estudar</h2>
        <ol>
          <li>Leia o objetivo e encontre a ideia.</li>
          <li>Faça a microdecisão no tabuleiro.</li>
          <li>Continue até mate, promoção, conversão ou empate.</li>
        </ol>
      </div>
    </section>
  )
}

function PracticeList({
  licao,
  onSelect,
  heading = 'Escolha uma posição e jogue até cumprir o objetivo.',
}: {
  licao: LicaoDeFinal
  onSelect: (position: PosicaoDeFinal) => void
  heading?: string
}) {
  return (
    <section className={styles.section}>
      <h2>Posições treináveis</h2>
      <p>{heading}</p>
      <div className={styles.positions}>
        {licao.posicoes.map((position) => (
          <button
            key={position.id}
            type="button"
            className={styles.position}
            onClick={() => onSelect(position)}
          >
            <span className={styles.miniBoard}>
              <ChessBoardView
                fen={position.fen}
                orientation={position.ladoDoAluno}
                interactive={false}
              />
            </span>
            <span className={styles.positionBody}>
              <strong>{position.enunciado}</strong>
              <span>{descreverObjetivo(position.objetivo)}</span>
              <span className={styles.linkText}>Começar posição →</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Mistakes({ licao }: { licao: LicaoDeFinal }) {
  return (
    <section className={styles.section}>
      <h2>Erros comuns</h2>
      <p>
        Não corra atrás do primeiro lance bonito. Em finais, o erro costuma ser abandonar o objetivo
        antes de verificar a resposta defensiva.
      </p>
      <ul className={styles.list}>
        <li>Confundir acertar o primeiro lance com concluir a técnica.</li>
        <li>Ignorar a defesa do adversário antes de avançar o peão.</li>
        <li>Parar quando a posição muda, em vez de reconhecer o novo objetivo.</li>
      </ul>
      <p className={styles.note}>
        As posições desta lição ({licao.posicoes.length}) voltam ao treino quando uma tentativa
        mostra que o padrão ainda precisa de reforço.
      </p>
    </section>
  )
}

function Progress({ licao }: { licao: LicaoDeFinal }) {
  return (
    <section className={styles.section}>
      <h2>Progresso</h2>
      <p>
        O LanceZero acompanha tentativas, dicas, objetivo cumprido e retenção. A atividade concluída
        não é apresentada como domínio do final.
      </p>
      <div className={styles.progressCard}>
        <strong>{licao.posicoes.length} posições críticas</strong>
        <span>O histórico aparece aqui depois da primeira tentativa.</span>
      </div>
    </section>
  )
}
