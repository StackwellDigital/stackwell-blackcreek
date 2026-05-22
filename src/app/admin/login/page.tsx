'use client'
// src/app/admin/login/page.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; }
`

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
      setError('Wrong password.')
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={{
        minHeight: '100vh', background: '#0a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Barlow', sans-serif", padding: '24px',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <img src="/BCBlogo.png" alt="Black Creek Barber" style={{ height: 56, marginBottom: 16 }} />
            <p style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 13,
              letterSpacing: '0.3em', color: '#333', textTransform: 'uppercase',
            }}>Admin Access</p>
          </div>

          <form onSubmit={handleLogin}>
            <label style={{
              display: 'block', fontSize: 10, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: '#333', marginBottom: 8,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '13px 14px',
                background: '#0f0f0f', border: '1px solid #1e1e1e',
                color: '#f0f0f0', fontFamily: "'Barlow', sans-serif",
                fontSize: 15, outline: 'none', marginBottom: 12,
              }}
              placeholder="••••••••"
            />

            {error && (
              <p style={{
                color: '#ef4444', fontSize: 12, letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: 12,
              }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%', padding: '14px',
                background: loading || !password ? '#111' : '#f0f0f0',
                color: loading || !password ? '#333' : '#0a0a0a',
                border: 'none', fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, letterSpacing: '0.15em', cursor: loading || !password ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Entering…' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
