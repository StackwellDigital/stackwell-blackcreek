'use client'

import { useState, useEffect } from 'react'
import type { Service } from '@/lib/db'

const MULTI_STAFF = process.env.NEXT_PUBLIC_MULTI_STAFF === 'true'
const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || 'Black Creek Barber'
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
function stepNum(step: Step) { return STEPS.filter(s => s !== 'done').indexOf(step as any) + 1 }
function totalSteps() { return STEPS.filter(s => s !== 'done').length }

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0a0a0a;
    color: #f0f0f0;
    font-family: 'Barlow', sans-serif;
    min-height: 100vh;
  }

  .bcb-wrap {
    max-width: 580px;
    margin: 0 auto;
    padding: 40px 20px 80px;
    min-height: 100vh;
  }

  .bcb-header {
    text-align: center;
    margin-bottom: 48px;
    padding-bottom: 32px;
    border-bottom: 1px solid #222;
  }

  .bcb-logo {
    height: 72px;
    width: auto;
    margin-bottom: 8px;
    filter: brightness(0) invert(1);
  }

  .bcb-tagline {
    font-size: 11px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #555;
    font-weight: 500;
  }

  .bcb-progress {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 40px;
  }

  .bcb-progress-step {
    flex: 1;
    height: 2px;
    background: #1e1e1e;
    transition: background 0.3s;
  }

  .bcb-progress-step.active {
    background: #f0f0f0;
  }

  .bcb-step-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #444;
    margin-bottom: 12px;
    font-weight: 500;
  }

  .bcb-heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 42px;
    letter-spacing: 0.04em;
    line-height: 1;
    margin-bottom: 8px;
    color: #fff;
  }

  .bcb-sub {
    font-size: 14px;
    color: #555;
    margin-bottom: 32px;
    font-weight: 300;
  }

  .bcb-service-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 32px;
  }

  .bcb-service-card {
    border: 1px solid #1e1e1e;
    padding: 16px;
    cursor: pointer;
    background: #0f0f0f;
    transition: border-color 0.15s, background 0.15s;
    position: relative;
  }

  .bcb-service-card:hover {
    border-color: #333;
    background: #141414;
  }

  .bcb-service-card.selected {
    border-color: #f0f0f0;
    background: #141414;
  }

  .bcb-service-card.selected::after {
    content: '✓';
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 11px;
    color: #f0f0f0;
  }

  .bcb-service-name {
    font-size: 13px;
    font-weight: 600;
    color: #e0e0e0;
    margin-bottom: 8px;
    line-height: 1.3;
    padding-right: 16px;
  }

  .bcb-service-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bcb-service-price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    color: #fff;
    letter-spacing: 0.05em;
  }

  .bcb-service-dur {
    font-size: 11px;
    color: #444;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .bcb-dates {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 32px;
  }

  .bcb-date-btn {
    padding: 10px 14px;
    border: 1px solid #1e1e1e;
    background: #0f0f0f;
    color: #888;
    cursor: pointer;
    font-family: 'Barlow', sans-serif;
    font-size: 13px;
    transition: all 0.15s;
    min-width: 52px;
    text-align: center;
  }

  .bcb-date-btn:hover {
    border-color: #333;
    color: #ccc;
  }

  .bcb-date-btn.selected {
    border-color: #f0f0f0;
    background: #f0f0f0;
    color: #0a0a0a;
  }

  .bcb-date-day {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 2px;
  }

  .bcb-date-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 20px;
    letter-spacing: 0.05em;
    line-height: 1;
  }

  .bcb-slots-label {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #444;
    margin-bottom: 12px;
  }

  .bcb-slots {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 32px;
  }

  .bcb-slot {
    padding: 8px 16px;
    border: 1px solid #1e1e1e;
    background: #0f0f0f;
    color: #888;
    cursor: pointer;
    font-family: 'Barlow', sans-serif;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.15s;
  }

  .bcb-slot:hover {
    border-color: #333;
    color: #ccc;
  }

  .bcb-slot.selected {
    border-color: #f0f0f0;
    background: #f0f0f0;
    color: #0a0a0a;
    font-weight: 600;
  }

  .bcb-field-label {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #444;
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .bcb-input {
    width: 100%;
    padding: 12px 14px;
    background: #0f0f0f;
    border: 1px solid #1e1e1e;
    color: #f0f0f0;
    font-family: 'Barlow', sans-serif;
    font-size: 15px;
    outline: none;
    transition: border-color 0.15s;
    margin-bottom: 20px;
  }

  .bcb-input:focus {
    border-color: #444;
  }

  .bcb-input::placeholder {
    color: #333;
  }

  .bcb-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .bcb-checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
    cursor: pointer;
  }

  .bcb-checkbox {
    width: 16px;
    height: 16px;
    accent-color: #f0f0f0;
  }

  .bcb-checkbox-label {
    font-size: 13px;
    color: #555;
  }

  .bcb-summary {
    border: 1px solid #1e1e1e;
    margin-bottom: 32px;
  }

  .bcb-summary-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #111;
    font-size: 14px;
  }

  .bcb-summary-row:last-child {
    border-bottom: none;
  }

  .bcb-summary-label {
    color: #444;
    font-weight: 300;
  }

  .bcb-summary-val {
    color: #e0e0e0;
    font-weight: 500;
  }

  .bcb-summary-total .bcb-summary-label {
    color: #888;
    font-weight: 500;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .bcb-summary-total .bcb-summary-val {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    color: #fff;
    letter-spacing: 0.05em;
  }

  .bcb-nav {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .bcb-btn-primary {
    flex: 1;
    padding: 14px 24px;
    background: #f0f0f0;
    color: #0a0a0a;
    border: none;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
  }

  .bcb-btn-primary:disabled {
    opacity: 0.25;
    cursor: default;
  }

  .bcb-btn-primary:hover:not(:disabled) {
    background: #fff;
  }

  .bcb-btn-back {
    padding: 14px 20px;
    background: transparent;
    color: #444;
    border: 1px solid #1e1e1e;
    font-family: 'Barlow', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }

  .bcb-btn-back:hover {
    border-color: #333;
    color: #888;
  }

  .bcb-error {
    color: #ef4444;
    font-size: 13px;
    margin-bottom: 16px;
    padding: 10px 14px;
    border: 1px solid #3b0a0a;
    background: #1a0505;
  }

  .bcb-done {
    text-align: center;
    padding: 60px 0;
  }

  .bcb-done-icon {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 80px;
    color: #fff;
    line-height: 1;
    margin-bottom: 24px;
    letter-spacing: 0.05em;
  }

  .bcb-done-heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    color: #fff;
    letter-spacing: 0.05em;
    margin-bottom: 12px;
  }

  .bcb-done-sub {
    font-size: 14px;
    color: #444;
    font-weight: 300;
    margin-bottom: 8px;
    line-height: 1.6;
  }

  .bcb-divider {
    border: none;
    border-top: 1px solid #1a1a1a;
    margin: 32px 0;
  }

  @media (max-width: 480px) {
    .bcb-service-grid { grid-template-columns: 1fr; }
    .bcb-grid-2 { grid-template-columns: 1fr; }
    .bcb-heading { font-size: 34px; }
  }
`

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

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json() as Promise<Service[]>)
      .then(data => setServices(data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!state.date || !state.service) return
    setLoadingSlots(true)
    setState(s => ({ ...s, time: '' }))
    fetch(`/api/availability?date=${state.date}&service_id=${state.service.id}&staff_id=${state.staffId}`)
      .then(r => r.json() as Promise<{ slots: string[] }>)
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
      const data = await res.json() as any
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        if (res.status === 409) {
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

  function Progress() {
    if (step === 'done') return null
    const total = totalSteps()
    const current = stepNum(step)
    return (
      <div className="bcb-progress">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`bcb-progress-step${i < current ? ' active' : ''}`} />
        ))}
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="bcb-wrap">
        <div className="bcb-header">
          <img src="/BCBlogo.png" alt="Black Creek Barber" className="bcb-logo" />
          <p className="bcb-tagline">Book your appointment</p>
        </div>

        {step === 'service' && (
          <>
            <Progress />
            <p className="bcb-step-label">Step {stepNum('service')} of {totalSteps()} — Service</p>
            <h1 className="bcb-heading">What are you in for?</h1>
            <p className="bcb-sub">Pick your service below</p>
            <div className="bcb-service-grid">
              {services.map(svc => (
                <div
                  key={svc.id}
                  className={`bcb-service-card${state.service?.id === svc.id ? ' selected' : ''}`}
                  onClick={() => setState(st => ({ ...st, service: svc }))}
                >
                  <div className="bcb-service-name">{svc.name}</div>
                  <div className="bcb-service-meta">
                    <span className="bcb-service-price">${svc.price / 100}</span>
                    <span className="bcb-service-dur">{svc.duration} min</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="bcb-btn-primary" style={{ width: '100%' }} disabled={!state.service} onClick={next}>
              Continue
            </button>
          </>
        )}

        {step === 'datetime' && (
          <>
            <Progress />
            <p className="bcb-step-label">Step {stepNum('datetime')} of {totalSteps()} — Date & Time</p>
            <h1 className="bcb-heading">Pick your date</h1>
            <p className="bcb-sub">{state.service?.name} · {state.service?.duration} min</p>

            <div className="bcb-dates">
              {availableDates.map(d => {
                const iso = d.toISOString().split('T')[0]
                const sel = state.date === iso
                return (
                  <button key={iso} className={`bcb-date-btn${sel ? ' selected' : ''}`} onClick={() => setState(st => ({ ...st, date: iso }))}>
                    <div className="bcb-date-day">{d.toLocaleDateString('en-CA', { weekday: 'short' })}</div>
                    <div className="bcb-date-num">{d.getDate()}</div>
                  </button>
                )
              })}
            </div>

            {state.date && (
              <>
                <p className="bcb-slots-label">Available times — {formatDisplayDate(state.date)}</p>
                {loadingSlots ? (
                  <p style={{ color: '#333', fontSize: 14, marginBottom: 32 }}>Loading…</p>
                ) : slots.length === 0 ? (
                  <p style={{ color: '#444', fontSize: 14, marginBottom: 32 }}>No availability — try another day.</p>
                ) : (
                  <div className="bcb-slots">
                    {slots.map(t => (
                      <button key={t} className={`bcb-slot${state.time === t ? ' selected' : ''}`} onClick={() => setState(st => ({ ...st, time: t }))}>
                        {formatTime(t)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="bcb-nav">
              <button className="bcb-btn-back" onClick={back}>← Back</button>
              <button className="bcb-btn-primary" disabled={!state.date || !state.time} onClick={next}>Continue</button>
            </div>
          </>
        )}

        {step === 'info' && (
          <>
            <Progress />
            <p className="bcb-step-label">Step {stepNum('info')} of {totalSteps()} — Your Info</p>
            <h1 className="bcb-heading">Contact info</h1>
            <p className="bcb-sub">We'll send a confirmation to your phone and email</p>

            <div className="bcb-grid-2">
              <div>
                <label className="bcb-field-label">First name</label>
                <input className="bcb-input" placeholder="Alex" value={state.firstName} onChange={e => setState(st => ({ ...st, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="bcb-field-label">Last name</label>
                <input className="bcb-input" placeholder="Johnson" value={state.lastName} onChange={e => setState(st => ({ ...st, lastName: e.target.value }))} />
              </div>
            </div>
            <label className="bcb-field-label">Phone number</label>
            <input className="bcb-input" placeholder="(604) 555-0123" value={state.phone} onChange={e => setState(st => ({ ...st, phone: e.target.value }))} />
            <label className="bcb-field-label">Email address</label>
            <input className="bcb-input" type="email" placeholder="alex@email.com" value={state.email} onChange={e => setState(st => ({ ...st, email: e.target.value }))} />

            <label className="bcb-checkbox-row">
              <input type="checkbox" className="bcb-checkbox" checked={state.returning} onChange={e => setState(st => ({ ...st, returning: e.target.checked }))} />
              <span className="bcb-checkbox-label">Returning customer</span>
            </label>

            <div className="bcb-nav">
              <button className="bcb-btn-back" onClick={back}>← Back</button>
              <button className="bcb-btn-primary" disabled={!state.firstName || !state.lastName || !state.phone || !state.email} onClick={next}>Review</button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <Progress />
            <p className="bcb-step-label">Step {stepNum('review')} of {totalSteps()} — Review</p>
            <h1 className="bcb-heading">Confirm booking</h1>
            <p className="bcb-sub">Double-check before we lock it in</p>

            <div className="bcb-summary">
              {[
                ['Service', state.service?.name ?? ''],
                ['Duration', `${state.service?.duration} min`],
                ['Date', formatDisplayDate(state.date)],
                ['Time', formatTime(state.time)],
                ['Name', `${state.firstName} ${state.lastName}`],
                ['Phone', state.phone],
                ['Email', state.email],
              ].map(([label, val]) => (
                <div key={label} className="bcb-summary-row">
                  <span className="bcb-summary-label">{label}</span>
                  <span className="bcb-summary-val">{val}</span>
                </div>
              ))}
              <div className="bcb-summary-row bcb-summary-total">
                <span className="bcb-summary-label">Total</span>
                <span className="bcb-summary-val">${(state.service?.price || 0) / 100}</span>
              </div>
            </div>

            {error && <div className="bcb-error">{error}</div>}

            <div className="bcb-nav">
              <button className="bcb-btn-back" onClick={back}>← Back</button>
              <button className="bcb-btn-primary" disabled={submitting} onClick={submitBooking}>
                {submitting ? 'Booking…' : 'Confirm'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="bcb-done">
            <div className="bcb-done-icon">✓</div>
            <h1 className="bcb-done-heading">You're booked</h1>
            <p className="bcb-done-sub">
              {state.service?.name}<br />
              {formatDisplayDate(state.date)} at {formatTime(state.time)}
            </p>
            <p className="bcb-done-sub" style={{ marginTop: 8 }}>
              Confirmation sent to {state.email}
            </p>
            <hr className="bcb-divider" />
            <button className="bcb-btn-primary" style={{ width: '100%' }} onClick={() => window.location.reload()}>
              Book another
            </button>
          </div>
        )}
      </div>
    </>
  )
}
