'use client'

/**
 * A tela de Conta.
 *
 * TODO O TEXTO VEM DO DICIONÁRIO, e este arquivo era a maior exceção do app: ele
 * estava inteiro em português fixo, inclusive para quem tinha escolhido inglês.
 * Um aluno em inglês chegava aqui e lia "Excluir definitivamente" ao lado de um
 * campo pedindo "APAGAR CONTA" — na tela onde errar é irreversível.
 *
 * A FRASE DE CONFIRMAÇÃO É TRADUZIDA, e ela é a decisão delicada deste arquivo.
 * Ela não é um token de protocolo: é o gesto deliberado de escrever, letra por
 * letra, o que vai acontecer. Esse gesto só é deliberado se a pessoa entende a
 * frase — então "DELETE ACCOUNT" em inglês e "APAGAR CONTA" em português, e o
 * servidor aceita as duas (ver `@/server/account-deletion`). A alternativa, que
 * era traduzir no cliente para um token único, faria o servidor validar algo que
 * o cliente fabrica em vez do que a pessoa digitou.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { getBrowserSupabase } from '@/lib/auth/supabase-browser'
import { deleteDatabase } from '@/lib/storage/indexeddb-repository'
import styles from './AccountPanel.module.css'

type Mode = 'login' | 'signup' | 'reset'
type Feedback = { ok: boolean; text: string } | null

function downloadJson(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'lancezero-account-' + new Date().toISOString().slice(0, 10) + '.json'
  link.click()
  URL.revokeObjectURL(url)
}

export function AccountPanel() {
  const router = useRouter()
  const { t } = useIdioma()
  const configuredSupabase = getBrowserSupabase()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<{ email?: string } | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const frase = t('account.deletePhrase')

  useEffect(() => {
    if (!configuredSupabase) return
    void configuredSupabase.auth.getSession().then(({ data }) => {
      setSession(data.session?.user ?? null)
    })
    const { data } = configuredSupabase.auth.onAuthStateChange((_event, next) => {
      setSession(next?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [configuredSupabase])

  if (!configuredSupabase) {
    return (
      <section className={styles.section}>
        <h2>{t('account.unavailableTitle')}</h2>
        <p>{t('account.unavailableBody')}</p>
      </section>
    )
  }

  const supabase = configuredSupabase

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setFeedback(null)
    const result =
      mode === 'reset'
        ? await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/account',
          })
        : mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin + '/account' },
            })
    setBusy(false)
    setFeedback(
      result.error
        ? /*
            O ERRO DO SUPABASE CHEGA EM INGLÊS, sempre, e é ele que aparece aqui.
            Traduzi-lo por tabela exigiria manter uma lista de mensagens de um
            serviço que muda sem avisar — e uma tradução errada de "invalid login
            credentials" é pior que a frase original, porque manda a pessoa
            investigar a coisa errada.
          */
          { ok: false, text: result.error.message }
        : {
            ok: true,
            text:
              mode === 'reset'
                ? t('account.checkEmail')
                : mode === 'signup'
                  ? t('account.signedUp')
                  : t('account.signedIn'),
          },
    )
  }

  async function exportar() {
    const current = await supabase.auth.getSession()
    const token = current.data.session?.access_token
    if (!token) return setFeedback({ ok: false, text: t('account.sessionExpired') })
    setBusy(true)
    const response = await fetch('/api/account/export', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    })
    setBusy(false)
    if (!response.ok) return setFeedback({ ok: false, text: t('account.exportFailed') })
    downloadJson(await response.json())
    setFeedback({ ok: true, text: t('account.exportDone') })
  }

  async function excluir() {
    if (confirmation !== frase)
      return setFeedback({ ok: false, text: t('account.deleteConfirmRequired', { frase }) })
    const current = await supabase.auth.getSession()
    const token = current.data.session?.access_token
    if (!token) return setFeedback({ ok: false, text: t('account.sessionExpired') })
    setBusy(true)
    const response = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation }),
    })
    if (response.ok) {
      await supabase.auth.signOut({ scope: 'local' })
      await deleteDatabase()
      router.push('/')
      return
    }
    setBusy(false)
    setFeedback({ ok: false, text: t('account.deleteFailed') })
  }

  if (session) {
    return (
      <div>
        <section className={styles.section}>
          <h2>{t('account.profile')}</h2>
          <p>{t('account.signedInAs')}</p>
          <p>{session.email ?? t('account.authenticated')}</p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => void exportar()} disabled={busy}>
              {t('account.downloadData')}
            </button>
            <button className={styles.ghost} onClick={() => void supabase.auth.signOut()}>
              {t('account.signOut')}
            </button>
          </div>
        </section>
        <section className={styles.danger} aria-labelledby="seguranca-privacidade">
          <h2 id="seguranca-privacidade">{t('account.securityTitle')}</h2>
          <h3>{t('account.deleteTitle')}</h3>
          <p>{t('account.deleteBody')}</p>
          <label htmlFor="delete-confirmation">{t('account.deleteLabel', { frase })}</label>
          <input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <button className={styles.dangerButton} onClick={() => void excluir()} disabled={busy}>
            {t('account.deleteButton')}
          </button>
        </section>
        {feedback && <p role={feedback.ok ? 'status' : 'alert'}>{feedback.text}</p>}
      </div>
    )
  }

  return (
    <section className={styles.section}>
      <h2>
        {mode === 'reset'
          ? t('account.recover')
          : mode === 'login'
            ? t('account.signIn')
            : t('account.signUp')}
      </h2>
      <form onSubmit={submit} className={styles.form}>
        <label htmlFor="account-email">{t('account.email')}</label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {mode !== 'reset' && (
          <>
            <label htmlFor="account-password">{t('account.password')}</label>
            <input
              id="account-password"
              type="password"
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </>
        )}
        <button className={styles.primary} disabled={busy}>
          {mode === 'reset'
            ? t('account.submitRecover')
            : mode === 'login'
              ? t('account.submitSignIn')
              : t('account.submitSignUp')}
        </button>
      </form>
      <div className={styles.actions}>
        <button
          className={styles.ghost}
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? t('account.signUp') : t('account.haveAccount')}
        </button>
        <button
          className={styles.ghost}
          onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')}
        >
          {t('account.forgotPassword')}
        </button>
      </div>
      {feedback && <p role={feedback.ok ? 'status' : 'alert'}>{feedback.text}</p>}
    </section>
  )
}
