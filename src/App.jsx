import { useCallback, useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '' : 'https://sprint.blinus.in')
).replace(/\/$/, '')

const emptyForm = {
  teamName: '',
  leaderName: '',
  leaderContact: '',
  githubLink: '',
  pptLink: '',
  deployedLink: '',
}

async function api(path, options = {}) {
  const url =
    typeof path === 'string' && path.startsWith('/')
      ? `${API_BASE_URL}${path}`
      : path
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text || 'Invalid response' }
  }
  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      (typeof data === 'string' ? data : `Request failed (${res.status})`)
    const err = new Error(msg)
    err.details = data?.details
    err.detail = data?.detail
    err.status = res.status
    throw err
  }
  return data
}

function LoginPanel({ onAuthed }) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ accessKey: key }),
      })
      onAuthed()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <p className="eyebrow">Restricted</p>
        <h1>Enter access key</h1>
        <p className="lede">
          Use the event key from organizers. It is stored only in your
          browser session cookie after verification.
        </p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span className="label">Access key</span>
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Checking…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

function TeamForm({ onLogout }) {
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState('')
  const [loadMsg, setLoadMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
  }

  const loadExisting = useCallback(async () => {
    setLoadMsg('')
    setStatus('')
    const q = new URLSearchParams({
      teamName: form.teamName,
      leaderContact: form.leaderContact,
    })
    setBusy(true)
    try {
      const data = await api(`/api/team/entry?${q.toString()}`)
      const e = data.entry
      setForm({
        teamName: e.teamName,
        leaderName: e.leaderName,
        leaderContact: e.leaderContact,
        githubLink: e.githubLink,
        pptLink: e.pptLink,
        deployedLink: e.deployedLink,
      })
      setLoadMsg('Loaded your last submission — edit and submit to update.')
    } catch (err) {
      if (err.status === 404) {
        setLoadMsg('No saved row yet for this team name and contact.')
      } else {
        setLoadMsg(err.message)
      }
    } finally {
      setBusy(false)
    }
  }, [form.teamName, form.leaderContact])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('')
    setLoadMsg('')
    setBusy(true)
    try {
      const data = await api('/api/team/submit', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setStatus(
        data.mode === 'updated'
          ? 'Submission updated in the sheet.'
          : 'Submission saved to the sheet.',
      )
    } catch (err) {
      const fieldDetail =
        err.details &&
        typeof err.details === 'object' &&
        err.details.fieldErrors
          ? Object.values(err.details.fieldErrors).flat().join(' ')
          : ''
      const apiDetail = err.detail ? String(err.detail) : ''
      const parts = [err.message, apiDetail, fieldDetail].filter(Boolean)
      setStatus(parts.join(' — '))
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    onLogout()
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">Team registration</p>
          <h1>Project submission</h1>
          <p className="lede narrow">
            Same team name and leader contact as before will update the
            existing row instead of creating a duplicate.
          </p>
        </div>
        <button type="button" className="ghost" onClick={logout}>
          Sign out
        </button>
      </header>

      <form className="paper stack" onSubmit={handleSubmit}>
        <div className="grid2">
          <label className="field">
            <span className="label">Team name</span>
            <input
              required
              value={form.teamName}
              onChange={(e) => setField('teamName', e.target.value)}
              autoComplete="organization"
            />
          </label>
          <label className="field">
            <span className="label">Team leader name</span>
            <input
              required
              value={form.leaderName}
              onChange={(e) => setField('leaderName', e.target.value)}
              autoComplete="name"
            />
          </label>
        </div>

        <label className="field">
          <span className="label">Team leader contact number</span>
          <input
            required
            inputMode="tel"
            value={form.leaderContact}
            onChange={(e) => setField('leaderContact', e.target.value)}
            autoComplete="tel"
          />
        </label>

        <label className="field">
          <span className="label">GitHub repository</span>
          <input
            required
            type="url"
            placeholder="https://github.com/org/repo"
            value={form.githubLink}
            onChange={(e) => setField('githubLink', e.target.value)}
          />
        </label>

        <p className="field-hint">
          Presentation and deployed links: fill <strong>at least one</strong> (both
          allowed).
        </p>

        <label className="field">
          <span className="label">Presentation link with PPT or Video (optional)</span>
          <input
            type="url"
            placeholder="https://… (optional if deployed link is set)"
            value={form.pptLink}
            onChange={(e) => setField('pptLink', e.target.value)}
          />
        </label>

        <label className="field">
          <span className="label">Deployed app link</span>
          <input
            type="url"
            placeholder="https://… (optional if presentation link is set)"
            value={form.deployedLink}
            onChange={(e) => setField('deployedLink', e.target.value)}
          />
        </label>

        <div className="row-actions">
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Submit'}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={busy || !form.teamName || !form.leaderContact}
            onClick={loadExisting}
          >
            Load saved submission
          </button>
        </div>

        {loadMsg ? <p className="hint">{loadMsg}</p> : null}
        {status ? (
          <p className={/^Submission\b/.test(status) ? 'success' : 'error'}>
            {status}
          </p>
        ) : null}
      </form>
    </div>
  )
}

export default function App() {
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await api('/api/auth/me')
        if (!cancelled) setAuthed(Boolean(me.authenticated))
      } catch {
        if (!cancelled) setAuthed(false)
      } finally {
        if (!cancelled) setChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!checked) {
    return (
      <div className="gate">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!authed) {
    return <LoginPanel onAuthed={() => setAuthed(true)} />
  }

  return <TeamForm onLogout={() => setAuthed(false)} />
}
