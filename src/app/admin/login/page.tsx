'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Wrong password')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f0' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px 48px', width: '100%', maxWidth: 380, boxShadow: '0 2px 24px rgba(0,0,0,0.07)' }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#c8a96e' }}>Admin</p>
        <h1 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 500 }}>Sign in</h1>
        <form onSubmit={handleLogin}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 15, marginBottom: 16, boxSizing: 'border-box' }}
            autoFocus
          />
          {error && <p style={{ color: '#e24b4a', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            style={{ width: '100%', padding: '11px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: loading || !password ? 0.5 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
