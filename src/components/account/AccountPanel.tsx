'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const configuredSupabase = getBrowserSupabase()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<{ email?: string } | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    if (!configuredSupabase) return
    void configuredSupabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session?.user ?? null))
    const { data } = configuredSupabase.auth.onAuthStateChange((_event, next) =>
      setSession(next?.user ?? null),
    )
    return () => data.subscription.unsubscribe()
  }, [configuredSupabase])

  if (!configuredSupabase) {
    return (
      <section className={styles.section}>
        <h2>Conta online indisponível</h2>
        <p>
          Configure o Supabase para ativar o acesso à conta. Seus dados locais continuam
          disponíveis em Ajustes.
        </p>
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
        ? { ok: false, text: result.error.message }
        : {
            ok: true,
            text:
              mode === 'reset'
                ? 'Confira seu e-mail.'
                : mode === 'signup'
                  ? 'Cadastro criado. Confirme seu e-mail se necessário.'
                  : 'Login realizado.',
          },
    )
  }

  async function exportar() {
    const current = await supabase.auth.getSession()
    const token = current.data.session?.access_token
    if (!token) return setFeedback({ ok: false, text: 'Sessão expirada.' })
    setBusy(true)
    const response = await fetch('/api/account/export', {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store',
    })
    setBusy(false)
    if (!response.ok) return setFeedback({ ok: false, text: 'Não foi possível exportar a conta.' })
    downloadJson(await response.json())
    setFeedback({ ok: true, text: 'Exportação baixada.' })
  }

  async function excluir() {
    if (confirmation !== 'APAGAR CONTA')
      return setFeedback({ ok: false, text: 'Digite APAGAR CONTA para confirmar.' })
    const current = await supabase.auth.getSession()
    const token = current.data.session?.access_token
    if (!token) return setFeedback({ ok: false, text: 'Sessão expirada.' })
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
    setFeedback({ ok: false, text: 'Não foi possível excluir a conta.' })
  }

  if (session)
    return (
      <div>
        <section className={styles.section}>
          <h2>Perfil</h2>
          <p>Você está conectado como:</p>
          <p>{session.email ?? 'Conta autenticada'}</p>
          <div className={styles.actions}>
            <button className={styles.primary} onClick={() => void exportar()} disabled={busy}>
              Baixar meus dados
            </button>
            <button className={styles.ghost} onClick={() => void supabase.auth.signOut()}>
              Sair
            </button>
          </div>
        </section>
        <section className={styles.danger} aria-labelledby="seguranca-privacidade">
          <h2 id="seguranca-privacidade">Segurança e privacidade</h2>
          <h3>Excluir conta</h3>
          <p>Esta ação remove a conta, os dados persistidos e o banco local deste aparelho.</p>
          <label htmlFor="delete-confirmation">Digite APAGAR CONTA</label>
          <input
            id="delete-confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <button className={styles.dangerButton} onClick={() => void excluir()} disabled={busy}>
            Excluir definitivamente
          </button>
        </section>
        {feedback && <p role={feedback.ok ? 'status' : 'alert'}>{feedback.text}</p>}
      </div>
    )

  return (
    <section className={styles.section}>
      <h2>{mode === 'reset' ? 'Recuperar acesso' : mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
      <form onSubmit={submit} className={styles.form}>
        <label htmlFor="account-email">E-mail</label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode !== 'reset' && (
          <>
            <label htmlFor="account-password">Senha</label>
            <input
              id="account-password"
              type="password"
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}
        <button className={styles.primary} disabled={busy}>
          {mode === 'reset' ? 'Enviar recuperação' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
        </button>
      </form>
      <div className={styles.actions}>
        <button
          className={styles.ghost}
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Criar conta' : 'Já tenho conta'}
        </button>
        <button
          className={styles.ghost}
          onClick={() => setMode(mode === 'reset' ? 'login' : 'reset')}
        >
          Esqueci a senha
        </button>
      </div>
      {feedback && <p role={feedback.ok ? 'status' : 'alert'}>{feedback.text}</p>}
    </section>
  )
}
