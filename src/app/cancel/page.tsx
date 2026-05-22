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

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function CancelPage() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get('id') ?? ''
  const email = params.get('email') ?? ''
  const isReschedule = params.get('action') === 'reschedule'

  const [state, setState] = useState<State>({ phase: 'loading' })
  const [confirming, setConfirming] = useState(false)

  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME ?? 'Your Appointment'

  useEffect(() => {
    if (!id || !email) {
      setState({ phase: 'error', message: 'Invalid cancellation link.' })
      return
    }

    fetch(`/api/bookings/cancel?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then((data: any) => {
        if (data.error === 'Already cancelled') {
          setState({ phase: 'cancelled' })
        } else if (data.booking) {
          setState({ phase: 'loaded', booking: data.booking })
        } else {
          setState({ phase: 'error', message: data.error ?? 'Booking not found.' })
        }
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

    if (res.ok) {
      setState({ phase: 'cancelled' })
    } else if (data.error === 'too_close') {
      setState({ phase: 'too_close', message: data.message, phone: data.phone })
    } else {
      setState({ phase: 'error', message: data.error ?? 'Failed to cancel.' })
    }

    setConfirming(false)
  }

  function handleReschedule() {
    if (state.phase !== 'loaded') return
    const { booking } = state
    const qs = new URLSearchParams({
      reschedule: booking.id,
      email: booking.customer_email,
      name: booking.customer_name,
    })
    router.push(`/?${qs.toString()}`)
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f9fafb',
      fontFamily: 'system-ui, sans-serif',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{shopName}</h1>
        </div>

        {state.phase === 'loading' && (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading your appointment…</p>
        )}

        {state.phase === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem' }}>⚠️</p>
            <p style={{ color: '#dc2626', fontWeight: 600 }}>{state.message}</p>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              If you think this is a mistake, please contact the shop directly.
            </p>
          </div>
        )}

        {state.phase === 'cancelled' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2.5rem' }}>✅</p>
            <h2 style={{ fontWeight: 700 }}>Appointment Cancelled</h2>
            <p style={{ color: '#6b7280' }}>
              Your appointment has been cancelled. A confirmation has been sent to your email.
            </p>
          </div>
        )}

        {state.phase === 'too_close' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '2rem' }}>⏰</p>
            <h2 style={{ fontWeight: 700 }}>Can't Cancel Online</h2>
            <p style={{ color: '#374151' }}>{state.message}</p>
            {state.phone && (
              <a href={`tel:${state.phone}`} style={{
                display: 'inline-block',
                marginTop: '1rem',
                background: '#111',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}>
                📞 Call {state.phone}
              </a>
            )}
          </div>
        )}

        {state.phase === 'loaded' && (
          <>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
              {isReschedule ? 'Reschedule Appointment' : 'Manage Appointment'}
            </h2>

            <div style={{
              background: '#f3f4f6',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}>
              <Row label="Service" value={state.booking.service_name} />
              <Row label="Date" value={formatDate(state.booking.booking_date)} />
              <Row label="Time" value={formatTime(state.booking.booking_time)} />
              <Row label="Duration" value={`${state.booking.service_duration} min`} />
              <Row label="Price" value={formatPrice(state.booking.service_price)} last />
            </div>

            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Cancellations and reschedules must be made at least 24 hours before your appointment.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
              <button
                onClick={handleReschedule}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  border: '2px solid #111',
                  background: '#fff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                Reschedule
              </button>
              <button
                onClick={handleCancel}
                disabled={confirming}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: confirming ? '#9ca3af' : '#dc2626',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: confirming ? 'not-allowed' : 'pointer',
                }}
              >
                {confirming ? 'Cancelling…' : 'Cancel Appointment'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      paddingBottom: last ? 0 : '0.5rem',
      marginBottom: last ? 0 : '0.5rem',
      borderBottom: last ? 'none' : '1px solid #e5e7eb',
    }}>
      <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{value}</span>
    </div>
  )
}

export default function CancelPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>Loading…</div>}>
      <CancelPage />
    </Suspense>
  )
}
