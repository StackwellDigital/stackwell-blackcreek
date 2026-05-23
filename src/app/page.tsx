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

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT']

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

  /* ── CALENDAR ─────────────────────────────── */

  .bcb-cal-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1px solid #333;
    margin-bottom: 24px;
  }

  .bcb-cal-left {
    border-right: 1px solid #333;
    padding: 14px;
    background: #1a1a1a;
  }

  .bcb-cal-right {
    padding: 14px;
    background: #161616;
    min-height: 260px;
  }

  .bcb-cal-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .bcb-cal-month {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 0.06em;
    color: #f0f0f0;
  }

  .bcb-cal-navbtn {
    background: none;
    border: 1px solid #444;
    color: #f0f0f0;
    cursor: pointer;
    width: 26px;
    height: 26px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    font-family: sans-serif;
  }

  .bcb-cal-navbtn:hover { border-color: #aaa; }

  .bcb-cal-day-headers {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 4px;
  }

  .bcb-cal-day-hdr {
    font-size: 9px;
    letter-spacing: 0.08em;
    color: #555;
    text-align: center;
    padding: 3px 0;
  }

  .bcb-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .bcb-cal-cell {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    cursor: pointer;
    position: relative;
    color: #3a3a3a;
  }

  .bcb-cal-cell.avail {
    color: #e0e0e0;
    background: #222;
    cursor: pointer;
  }

  .bcb-cal-cell.avail:hover { background: #2e2e2e; }

  .bcb-cal-cell.selected {
    background: #f0f0f0 !important;
    color: #0a0a0a !important;
    font-weight: 700;
  }

  .bcb-cal-cell.today-dot::after {
    content: '';
    position: absolute;
    bottom: 3px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 3px;
    background: #f0f0f0;
    border-radius: 50%;
  }

  .bcb-cal-cell.selected.today-dot::after { background: #0a0a0a; }

  /* slots panel */
  .bcb-slots-heading {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 15px;
    letter-spacing: 0.06em;
    color: #f0f0f0;
    margin-bottom: 4px;
  }

  .bcb-slots-date {
    font-size: 10px;
    color: #555;
    margin-bottom: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .bcb-slots-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }

  .bcb-slot-btn {
    border: 1px solid #333;
    padding: 7px 8px;
    font-size: 12px;
    cursor: pointer;
    text-align: center;
    color: #e0e0e0;
    background: #222;
    font-family: 'Barlow', sans-serif;
    transition: all 0.12s;
  }

  .bcb-slot-btn:hover { border-color: #888; background: #2a2a2a; }

  .bcb-slot-btn.selected {
    background: #f0f0f0;
    color: #0a0a0a;
    border-color: #f0f0f0;
    font-weight: 700;
  }

  .bcb-slot-btn.unavail {
    color: #333;
    border-color: #1e1e1e;
    background: #141414;
    cursor: default;
    text-decoration: line-through;
  }

  .bcb-no-date {
    font-size: 13px;
    color: #444;
    padding-top: 40px;
    text-align: center;
  }

  .bcb-slots-loading {
    font-size: 12px;
    color: #444;
    padding-top: 40px;
    text-align: center;
  }

  /* ── rest of existing styles ──────────────── */

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

  .bcb-input:focus { border-color: #444; }
  .bcb-input::placeholder { color: #333; }

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

  .bcb-checkbox { width: 16px; height: 16px; accent-color: #f0f0f0; }

  .bcb-checkbox-label { font-size: 13px; color: #555; }

  .bcb-summary { border: 1px solid #1e1e1e; margin-bottom: 32px; }

  .bcb-summary-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #111;
    font-size: 14px;
  }

  .bcb-summary-row:last-child { border-bottom: none; }
  .bcb-summary-label { color: #444; font-weight: 300; }
  .bcb-summary-val { color: #e0e0e0; font-weight: 500; }

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

  .bcb-nav { display: flex; gap: 10px; margin-top: 8px; }

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

  .bcb-btn-primary:disabled { opacity: 0.25; cursor: default; }
  .bcb-btn-primary:hover:not(:disabled) { background: #fff; }

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

  .bcb-btn-back:hover { border-color: #333; color: #888; }

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
    .bcb-cal-layout { grid-template-columns: 1fr; }
    .bcb-cal-left { border-right: none; border-bottom: 1px solid #333; }
  }
`

export default function BookingPage() {
  const [step, setStep] = useState<Step>('service')
  const [services, setServices] = useState<Service[]>([])
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // calendar state
  const today = new Date()
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

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

  // Build set of available date strings within booking window
  const availableDateSet = new Set<string>()
  for (let i = 1; i <= BOOKING_WINDOW; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    if (d.getDay() !== 0) { // filter Sunday — adapt as needed
      availableDateSet.add(d.toISOString().split('T')[0])
    }
  }

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

  // ── Calendar component ──────────────────────────────────────────────────────
  function CalendarPicker() {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ day: number | null; iso: string | null; avail: boolean; isToday: boolean }> = []

    // leading empty cells
    for (let i = 0; i < firstDow; i++) {
      cells.push({ day: null, iso: null, avail: false, isToday: false })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year
      cells.push({ day: d, iso, avail: availableDateSet.has(iso), isToday })
    }

    function prevMonth() {
      setCalMonth(new Date(year, month - 1, 1))
    }
    function nextMonth() {
      setCalMonth(new Date(year, month + 1, 1))
    }

    // selected date label
    let selectedLabel = ''
    if (state.date) {
      const sd = new Date(state.date + 'T12:00:00')
      selectedLabel = `${DAY_NAMES[sd.getDay()]}, ${MONTHS[sd.getMonth()]} ${sd.getDate()}`
    }

    return (
      <div className="bcb-cal-layout">
        {/* left: month grid */}
        <div className="bcb-cal-left">
          <div className="bcb-cal-nav">
            <button className="bcb-cal-navbtn" onClick={prevMonth}>‹</button>
            <div className="bcb-cal-month">{MONTHS[month]} {year}</div>
            <button className="bcb-cal-navbtn" onClick={nextMonth}>›</button>
          </div>
          <div className="bcb-cal-day-headers">
            {DAY_NAMES.map(d => <div key={d} className="bcb-cal-day-hdr">{d}</div>)}
          </div>
          <div className="bcb-cal-grid">
            {cells.map((cell, i) => {
              if (!cell.day) return <div key={i} className="bcb-cal-cell" />
              const isSel = state.date === cell.iso
              let cls = 'bcb-cal-cell'
              if (cell.avail) cls += ' avail'
              if (isSel) cls += ' selected'
              if (cell.isToday) cls += ' today-dot'
              return (
                <div
                  key={cell.iso}
                  className={cls}
                  onClick={() => {
                    if (!cell.avail) return
                    setState(s => ({ ...s, date: cell.iso!, time: '' }))
                  }}
                >
                  {cell.day}
                </div>
              )
            })}
          </div>
        </div>

        {/* right: time slots */}
        <div className="bcb-cal-right">
          {!state.date ? (
            <div className="bcb-no-date">← Select a date</div>
          ) : loadingSlots ? (
            <div className="bcb-slots-loading">Loading…</div>
          ) : (
            <>
              <div className="bcb-slots-heading">AVAILABLE TIMES</div>
              <div className="bcb-slots-date">{selectedLabel}</div>
              {slots.length === 0 ? (
                <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>No availability — try another day.</div>
              ) : (
                <div className="bcb-slots-grid">
                  {slots.map(t => (
                    <button
                      key={t}
                      className={`bcb-slot-btn${state.time === t ? ' selected' : ''}`}
                      onClick={() => setState(s => ({ ...s, time: t }))}
                    >
                      {formatTime(t)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
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

            <CalendarPicker />

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
