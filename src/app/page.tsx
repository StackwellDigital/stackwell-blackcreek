'use client'

import { useState, useEffect } from 'react'
import type { Service } from '@/lib/db'

// ── Config (matches wrangler.toml vars) ─────────────────
const MULTI_STAFF = process.env.NEXT_PUBLIC_MULTI_STAFF === 'true'
const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || 'The Barbershop'
const BOOKING_WINDOW = parseInt(process.env.NEXT_PUBLIC_BOOKING_WINDOW_DAYS || '14')
const DEFAULT_STAFF_ID = 1

type Step = 'service' | 'staff' | 'datetime' | 'info' | 'review' | 'done'

interface BookingState {
  service: Service | null
  staffId: number
  staffName: string
  date: string
  time: string
  firstName: string
  lastName: string
  phone: string
  email: string
  returning: boolean
  bookingId: number | null
}

const STEPS: Step[] = MULTI_STAFF
  ? ['service', 'staff', 'datetime', 'info', 'review', 'done']
  : ['service', 'datetime', 'info', 'review', 'done']

function stepIndex(step: Step) { return STEPS.indexOf(step) }
function stepNum(step: Step) { return STEPS.filter(s => s !== 'done').indexOf(step) + 1 }
function totalSteps() { return STEPS.filter(s => s !== 'done').length }

export default function BookingPage() {
  const [step, setStep] = useState<Step>('service')
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [state, setState] = useState<BookingState>({
    service: null,
    staffId: DEFAULT_STAFF_ID,
    staffName: '',
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    returning: false,
    bookingId: null,
  })

  // Load services on mount
  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(setServices)
      .catch(console.error)
  }, [])

  // Load slots when date or service changes
  useEffect(() => {
    if (!state.date || !state.service) return
    setLoadingSlots(true)
    setState(s => ({ ...s, time: '' }))
    fetch(`/api/availability?date=${state.date}&service_id=${state.service.id}&staff_id=${state.staffId}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .catch(console.error)
      .finally(() => setLoadingSlots(false))
  }, [state.date, state.service, state.staffId])

  function next() {
    const idx = stepIndex(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }
  function back() {
    const idx = stepIndex(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  // Generate available dates (next N days, excluding Sundays)
  const availableDates = Array.from({ length: BOOKING_WINDOW }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d
  }).filter(d => d.getDay() !== 0)

  function formatDisplayDate(dateStr: string): string {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-CA', {
      weekday: 'long', month: 'long', day: 'numeric'
    })
  }

  function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  async function submitBooking() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: `${state.firstName} ${state.lastName}`,
          customer_phone: state.phone,
          customer_email: state.email,
          service_id: state.service!.id,
          staff_id: state.staffId,
          booking_date: state.date,
          booking_time: state.time,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        if (res.status === 409) {
          // Slot taken — reload slots and go back
          setStep('datetime')
          setState(s => ({ ...s, time: '' }))
        }
        return
      }
      setState(s => ({ ...s, bookingId: data.id }))
      setStep('done')
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Styles ───────────────────────────────────────────────
  const s = {
    wrap: { maxWidth: 520, margin: '0 auto', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' } as React.CSSProperties,
    shopName: { fontSize: 13, fontWeight: 600 as const, letterSpacing: '.08em', textTransform: 'uppercase' as const, color: '#c8a96e', marginBottom: 4 },
    stepLabel: { fontSize: 11, color: '#aaa', marginBottom: 20, fontWeight: 500 as const },
    heading: { fontSize: 22, fontWeight: 500 as const, marginBottom: 6 },
    sub: { fontSize: 14, color: '#888', marginBottom: 24 },
    card: (selected: boolean): React.CSSProperties => ({
      border: selected ? '2px solid #c8a96e' : '1px solid #e8e8e8',
      borderRadius: 12,
      padding: '14px 16px',
      cursor: 'pointer',
      background: selected ? '#fdf8ee' : '#fff',
      transition: 'border-color .15s',
    }),
    pill: (selected: boolean): React.CSSProperties => ({
      padding: '8px 16px',
      borderRadius: 8,
      border: selected ? '2px solid #c8a96e' : '1px solid #e8e8e8',
      background: selected ? '#c8a96e' : '#fff',
      color: selected ? '#fff' : '#333',
      cursor: 'pointer',
      fontSize: 14,
      fontWeight: selected ? 600 : 400,
    }),
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 15, boxSizing: 'border-box' as const, marginBottom: 14 },
    btnPrimary: (disabled?: boolean): React.CSSProperties => ({
      padding: '11px 24px', background: '#c8a96e', color: '#fff', border: 'none',
      borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.45 : 1,
    }),
    btnSecondary: { padding: '11px 20px', background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#666' } as React.CSSProperties,
    navRow: { display: 'flex', gap: 10, marginTop: 24 } as React.CSSProperties,
    progressDots: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 } as React.CSSProperties,
    summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 } as React.CSSProperties,
  }

  function Progress() {
    if (step === 'done') return null
    const total = totalSteps()
    const current = stepNum(step)
    return (
      <div style={s.progressDots}>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i < current ? '#c8a96e' : i === current - 1 ? '#c8a96e' : '#e0e0e0',
            boxShadow: i === current - 1 ? '0 0 0 3px #f5eed9' : 'none',
            flex: 'none',
          }} />
        ))}
        <span style={{ fontSize: 12, color: '#aaa', marginLeft: 8 }}>{current} of {total}</span>
      </div>
    )
  }

  // ── Step renders ─────────────────────────────────────────

  if (step === 'service') return (
    <div style={s.wrap}>
      <p style={s.shopName}>{SHOP_NAME}</p>
      <Progress />
      <h1 style={s.heading}>What are you coming in for?</h1>
      <p style={s.sub}>Select a service to get started</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 24 }}>
        {services.map(svc => (
          <div key={svc.id} style={s.card(state.service?.id === svc.id)} onClick={() => setState(st => ({ ...st, service: svc }))}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{svc.name}</span>
              <span style={{ fontSize: 12, color: '#aaa' }}>{svc.duration} min</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>${svc.price / 100}</span>
          </div>
        ))}
      </div>
      <button style={s.btnPrimary(!state.service)} disabled={!state.service} onClick={next}>Continue →</button>
    </div>
  )

  if (step === 'datetime') return (
    <div style={s.wrap}>
      <p style={s.shopName}>{SHOP_NAME}</p>
      <Progress />
      <h1 style={s.heading}>Pick a date & time</h1>
      <p style={s.sub}>Available slots for {state.service?.name}</p>

      {/* Date selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {availableDates.map(d => {
          const iso = d.toISOString().split('T')[0]
          const sel = state.date === iso
          return (
            <button key={iso} style={s.pill(sel)} onClick={() => setState(st => ({ ...st, date: iso }))}>
              <div style={{ fontSize: 11, opacity: .7 }}>{d.toLocaleDateString('en-CA', { weekday: 'short' })}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{d.getDate()}</div>
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      {state.date && (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 12, letterSpacing: '.05em', textTransform: 'uppercase' }}>Available times</p>
          {loadingSlots ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>Loading slots…</p>
          ) : slots.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>No availability on this date — try another day.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {slots.map(t => (
                <button key={t} style={s.pill(state.time === t)} onClick={() => setState(st => ({ ...st, time: t }))}>
                  {formatTime(t)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div style={s.navRow}>
        <button style={s.btnSecondary} onClick={back}>← Back</button>
        <button style={s.btnPrimary(!state.date || !state.time)} disabled={!state.date || !state.time} onClick={next}>Continue →</button>
      </div>
    </div>
  )

  if (step === 'info') return (
    <div style={s.wrap}>
      <p style={s.shopName}>{SHOP_NAME}</p>
      <Progress />
      <h1 style={s.heading}>Your contact info</h1>
      <p style={s.sub}>We'll send a confirmation to your email and phone</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>First name</label>
          <input style={s.input} placeholder="Alex" value={state.firstName} onChange={e => setState(st => ({ ...st, firstName: e.target.value }))} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Last name</label>
          <input style={s.input} placeholder="Johnson" value={state.lastName} onChange={e => setState(st => ({ ...st, lastName: e.target.value }))} />
        </div>
      </div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Phone number</label>
      <input style={s.input} placeholder="(604) 555-0123" value={state.phone} onChange={e => setState(st => ({ ...st, phone: e.target.value }))} />
      <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Email address</label>
      <input style={s.input} placeholder="alex@email.com" type="email" value={state.email} onChange={e => setState(st => ({ ...st, email: e.target.value }))} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#666', marginBottom: 8 }}>
        <input type="checkbox" checked={state.returning} onChange={e => setState(st => ({ ...st, returning: e.target.checked }))} style={{ accentColor: '#c8a96e' }} />
        Returning customer
      </label>
      <div style={s.navRow}>
        <button style={s.btnSecondary} onClick={back}>← Back</button>
        <button
          style={s.btnPrimary(!state.firstName || !state.lastName || !state.phone || !state.email)}
          disabled={!state.firstName || !state.lastName || !state.phone || !state.email}
          onClick={next}
        >Review booking →</button>
      </div>
    </div>
  )

  if (step === 'review') return (
    <div style={s.wrap}>
      <p style={s.shopName}>{SHOP_NAME}</p>
      <Progress />
      <h1 style={s.heading}>Review & confirm</h1>
      <p style={s.sub}>Double-check your details before we lock it in</p>
      <div style={{ background: '#f9f9f7', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        {[
          ['Service', state.service?.name],
          ['Duration', `${state.service?.duration} minutes`],
          ['Date', formatDisplayDate(state.date)],
          ['Time', formatTime(state.time)],
          ['Name', `${state.firstName} ${state.lastName}`],
          ['Phone', state.phone],
          ['Email', state.email],
          ['Total', `$${(state.service?.price || 0) / 100}`],
        ].map(([label, val]) => (
          <div key={label as string} style={s.summaryRow}>
            <span style={{ color: '#888' }}>{label}</span>
            <span style={{ fontWeight: label === 'Total' ? 600 : 400, color: label === 'Total' ? '#c8a96e' : '#1a1a1a' }}>{val}</span>
          </div>
        ))}
      </div>
      {error && <p style={{ color: '#e24b4a', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={s.navRow}>
        <button style={s.btnSecondary} onClick={back}>← Back</button>
        <button style={s.btnPrimary(submitting)} disabled={submitting} onClick={submitBooking}>
          {submitting ? 'Booking…' : 'Confirm booking ✓'}
        </button>
      </div>
    </div>
  )

  if (step === 'done') return (
    <div style={{ ...s.wrap, textAlign: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
      <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>You're booked!</h1>
      <p style={{ color: '#888', fontSize: 15, marginBottom: 32 }}>
        {state.service?.name} on {formatDisplayDate(state.date)} at {formatTime(state.time)}
      </p>
      <p style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>
        Confirmation email sent to {state.email}
      </p>
      <button style={s.btnPrimary()} onClick={() => window.location.reload()}>Book another appointment</button>
    </div>
  )

  return null
}
