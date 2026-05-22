'use client'
// src/app/cancel/page.tsx

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Booking {
  id: string
  customer_name: string
  customer_email: string
  service_name: string
  service_price: number
  service_duration: number
  booking_date: string
  booking_time: string
  status: string
}

type State =
  | { phase: 'loading' }
  | { phase: 'loaded'; booking: Booking }
  | { phase: 'too_close'; message: string; phone: string }
  | { phase: 'cancelled' }
  | { phase: 'error'; message: string }

function formatDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a0a; color: #f0f0f0; font-family: 'Barlow', sans-serif; min-height: 100vh; }
`

function CancelPage() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') ?? ''
  const email = params.get('email') ?? ''
  const isReschedule = params.get('action') === 'reschedule'

  const [state, setState] = useState<State>({ phase: 'loading' })
  const [confirming, setConfirming] = useState(false)
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME ?? 'Black Creek Barber'

  useEffect(() => {
    if (!id || !email) {
      setState({ phase: 'error', message: 'Invalid cancellation link.' })
      return
    }
    fetch(`/api/bookings/cancel?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.error === 'Already cancelled') setState({ phase: 'cancelled' })
        else if (data.booking) setState({ phase: 'loaded', booking: data.booking })
        else setState({ phase: 'error', message: data.error ?? 'Booking not found.' })
      })
      .catch(() => setState({ phase: 'error', message: 'Something went wrong.' }))
  }, [id, email])

  async function handleCancel() {
    if (state.phase !== 'loaded') return
    setConfirming(true)
    const res = await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email }),
    })
    const data = await res.json() as any
    if (res.ok) setState({ phase: 'cancelled' })
    else if (data.error === 'too_close') setState({ phase: 'too_close', message: data.message, phone: data.phone })
    else setState({ phase: 'error', message: data.error ?? 'Failed to cancel.' })
    setConfirming(false)
  }

  function handleReschedule() {
    if (state.phase !== 'loaded') return
    const { booking } = state
    const qs = new URLSearchParams({ reschedule: booking.id, email: booking.customer_email, name: booking.customer_name })
    router.push(`/?${qs.toString()}`)
  }

  const wrap: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0a0a0a', padding: '24px', fontFamily: "'Barlow', sans-serif",
  }

  const card: React.CSSProperties = {
    background: '#0f0f0f', border: '1px solid #1e1e1e',
    padding: '40px 36px', maxWidth: '480px', width: '100%',
  }

  const heading: React.CSSProperties = {
    fontFamily: "'Bebas Neue', sans-serif", fontSize: 36,
    letterSpacing: '0.05em', color: '#fff', marginBottom: 8,
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid #111', fontSize: 14,
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div style={wrap}>
        <div style={card}>
          <div style={{ textAlign: 'center', marginBottom: 36, paddingBottom: 28, borderBottom: '1px solid #1a1a1a' }}>
            <img src="/BCBlogo.png" alt={shopName} style={{ height: 60, marginBottom: 8 }} />
          </div>

          {state.phase === 'loading' && (
            <p style={{ color: '#333', textAlign: 'center', letterSpacing: '0.1em', fontSize: 13 }}>LOADING…</p>
          )}

          {state.phase === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: '#ef4444' }}>!</p>
              <h2 style={heading}>Something's Wrong</h2>
              <p style={{ color: '#444', fontSize: 14 }}>{state.message}</p>
            </div>
          )}

          {state.phase === 'cancelled' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, color: '#fff', lineHeight: 1 }}>✓</p>
              <h2 style={{ ...heading, marginTop: 16 }}>Appointment Cancelled</h2>
              <p style={{ color: '#444', fontSize: 14, marginTop: 8 }}>A confirmation has been sent to your email.</p>
            </div>
          )}

          {state.phase === 'too_close' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: '#f0f0f0' }}>⏰</p>
              <h2 style={heading}>Can't Cancel Online</h2>
              <p style={{ color: '#555', fontSize: 14, margin: '12px 0 24px' }}>{state.message}</p>
              {state.phone && (
                <a href={`tel:${state.phone}`} style={{
                  display: 'inline-block', padding: '12px 28px',
                  background: '#f0f0f0', color: '#0a0a0a',
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 18,
                  letterSpacing: '0.1em', textDecoration: 'none',
                }}>
                  Call {state.phone}
                </a>
              )}
            </div>
          )}

          {state.phase === 'loaded' && (
            <>
              <h2 style={heading}>{isReschedule ? 'Reschedule' : 'Manage Booking'}</h2>
              <p style={{ color: '#444', fontSize: 13, marginBottom: 24 }}>
                {isReschedule ? 'Cancel this appointment and pick a new time.' : 'Cancel or reschedule your appointment below.'}
              </p>

              <div style={{ border: '1px solid #1a1a1a', marginBottom: 24 }}>
                {[
                  ['Service', state.booking.service_name],
                  ['Date', formatDate(state.booking.booking_date)],
                  ['Time', formatTime(state.booking.booking_time)],
                  ['Duration', `${state.booking.service_duration} min`],
                  ['Price', `$${(state.booking.service_price / 100).toFixed(0)}`],
                ].map(([label, val]) => (
                  <div key={label} style={rowStyle}>
                    <span style={{ color: '#444', fontWeight: 300 }}>{label}</span>
                    <span style={{ color: '#e0e0e0', fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>

              <p style={{ color: '#2a2a2a', fontSize: 12, marginBottom: 24, letterSpacing: '0.05em' }}>
                Cancellations must be made at least 24 hours in advance.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={handleReschedule} style={{
                  width: '100%', padding: '13px', background: 'transparent',
                  border: '1px solid #333', color: '#888',
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 18,
                  letterSpacing: '0.1em', cursor: 'pointer',
                }}>
                  Reschedule
                </button>
                <button onClick={handleCancel} disabled={confirming} style={{
                  width: '100%', padding: '13px', background: confirming ? '#1a1a1a' : '#ef4444',
                  border: 'none', color: confirming ? '#444' : '#fff',
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 18,
                  letterSpacing: '0.1em', cursor: confirming ? 'not-allowed' : 'pointer',
                }}>
                  {confirming ? 'Cancelling…' : 'Cancel Appointment'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function CancelPageWrapper() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#222', fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: 12 }}>LOADING…</p>
      </div>
    }>
      <CancelPage />
    </Suspense>
  )
}
