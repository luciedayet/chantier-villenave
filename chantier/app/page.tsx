'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/chantier')
    } else {
      setError('Mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#1C1F26',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif", padding: 20,
    }}>
      <div style={{
        background: '#252930', border: '1px solid #383E4A',
        borderRadius: 12, padding: 32, width: '100%', maxWidth: 360,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, background: '#F5C518', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🏗</div>
          <span style={{ color: '#E8EAF0', fontWeight: 700, fontSize: 18 }}>Chantier</span>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#8B92A5', marginBottom: 6 }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            required
            style={{
              width: '100%', background: '#1C1F26', border: '1px solid #383E4A',
              borderRadius: 8, color: '#E8EAF0', padding: '10px 14px',
              fontSize: 16, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box', marginBottom: 8,
            }}
          />
          {error && (
            <div style={{ color: '#E74C3C', fontSize: 14, marginBottom: 12 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px 0', background: '#F5C518',
              color: '#1C1F26', border: 'none', borderRadius: 8,
              fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginTop: 4,
            }}
          >
            {loading ? 'Connexion…' : 'Accéder'}
          </button>
        </form>
      </div>
    </div>
  )
}
