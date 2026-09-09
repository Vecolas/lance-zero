'use client'

import { useRef, useState } from 'react'
import { useRepository } from '@/components/providers/RepositoryProvider'
import { BUDGET_OPTIONS } from '@/domain/profile'
import { boardThemes, type BoardThemeName } from '@/lib/design/board'
import { exportBackup, importBackup, parseBackup, serializeBackup } from '@/lib/storage/backup'
import styles from './SettingsPanel.module.css'

type Feedback = { tipo: 'ok' | 'bad'; texto: string } | null

function baixarArquivo(nome: string, conteudo: string) {
  const blob = new Blob([conteudo], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function SettingsPanel() {
  const { status, repo, profile, erro, saveProfile, refresh } = useRepository()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [ocupado, setOcupado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (status === 'carregando') {
    return <p className={styles.state}>Abrindo seus dados locais…</p>
  }

  if (status === 'erro' || !repo || !profile) {
    return (
      <p className={styles.state} role="alert">
        {erro ?? 'Não consegui abrir o armazenamento local.'}
      </p>
    )
  }

  async function exportar() {
    if (!repo) return
    setOcupado(true)
    try {
      const arquivo = await exportBackup(repo, new Date())
      const data = arquivo.exportedAt.slice(0, 10)
      baixarArquivo(`lancezero-backup-${data}.json`, serializeBackup(arquivo))
      setFeedback({ tipo: 'ok', texto: 'Backup exportado.' })
    } catch (e) {
      setFeedback({
        tipo: 'bad',
        texto: e instanceof Error ? e.message : 'Não consegui exportar o backup.',
      })
    } finally {
      setOcupado(false)
    }
  }

  async function importar(arquivo: File) {
    if (!repo) return
    setOcupado(true)
    try {
      const resultado = await importBackup(repo, parseBackup(await arquivo.text()))
      const { games, puzzleAttempts, reviewCards } = resultado.imported
      setFeedback({
        tipo: 'ok',
        texto: `Backup importado: ${games} partidas, ${puzzleAttempts} tentativas e ${reviewCards} cards de revisão.`,
      })
      refresh()
    } catch (e) {
      setFeedback({
        tipo: 'bad',
        texto:
          e instanceof Error
            ? `Não consegui importar: ${e.message}`
            : 'Não consegui importar este arquivo.',
      })
    } finally {
      setOcupado(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <section className={styles.section} aria-labelledby="backup">
        <h2 id="backup" className={styles.sectionTitle}>
          Backup dos seus dados
        </h2>
        <p className={styles.sectionText}>
          Tudo fica no seu navegador, sem conta e sem servidor. A contrapartida é que perder o
          navegador é perder os dados — por isso exporte de vez em quando.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={exportar} disabled={ocupado}>
            Exportar backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className={styles.fileInput}
            aria-label="Escolher arquivo de backup para importar"
            disabled={ocupado}
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) void importar(arquivo)
            }}
          />
        </div>
        {feedback ? (
          <p
            className={`${styles.feedback} ${feedback.tipo === 'ok' ? styles.ok : styles.bad}`}
            role={feedback.tipo === 'bad' ? 'alert' : 'status'}
          >
            {feedback.texto}
          </p>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="treino">
        <h2 id="treino" className={styles.sectionTitle}>
          Tempo de treino por dia
        </h2>
        <p className={styles.sectionText}>
          O planner nunca monta um plano maior que este orçamento.
        </p>
        <div className={styles.options} role="group" aria-labelledby="treino">
          {BUDGET_OPTIONS.map((minutos) => (
            <button
              key={minutos}
              type="button"
              className={styles.option}
              aria-pressed={profile.dailyBudgetMinutes === minutos}
              onClick={() => void saveProfile({ ...profile, dailyBudgetMinutes: minutos })}
            >
              {minutos} min
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="tabuleiro">
        <h2 id="tabuleiro" className={styles.sectionTitle}>
          Tabuleiro
        </h2>
        <p className={styles.sectionText}>
          O tabuleiro não muda com o tema claro ou escuro da interface: a mesma posição deve ter
          sempre a mesma aparência.
        </p>
        <div className={styles.options} role="group" aria-labelledby="tabuleiro">
          {Object.values(boardThemes).map((tema) => (
            <button
              key={tema.name}
              type="button"
              className={styles.option}
              aria-pressed={profile.preferences.boardTheme === tema.name}
              onClick={() =>
                void saveProfile({
                  ...profile,
                  preferences: { ...profile.preferences, boardTheme: tema.name as BoardThemeName },
                })
              }
            >
              {tema.label}
            </button>
          ))}
        </div>
      </section>
    </>
  )
}
