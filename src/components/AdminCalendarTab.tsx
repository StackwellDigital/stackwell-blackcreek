'use client'
// src/components/AdminCalendarTab.tsx

import { useEffect, useState } from 'react'

interface Booking {
  id: number
  customer_name: string
  service_name: string
  service_duration: number  // minutes — make sure /api/admin?action=bookings returns this
  booking_date: string      // YYYY-MM-DD
  booking_time: string      // HH:MM
  customer_phone: string
  status: string
}

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT']

const ROW_H = 38        // px per 30-min slot
const START_HOUR = 9    // 9am
const END_HOUR = 17     // 5pm (last slot 4:30)
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2  // 16 slots

// All 30-min slot labels
const TIME_SLOTS: string[] = []
for (let h = START_HOUR; h < END_HOUR; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2,'0')}:30`)
}

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function slotIndex(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - START_HOUR) * 2 + (m >= 30 ? 1 : 0)
}

export default function AdminCalendarTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'week'>('month')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const today = new Date()
  const [curMonth, setCurMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  function getWeekStart(ref: Date): Date {
    const d = new Date(ref)
    const dow = d.getDay()
    const diff = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))

  function loadBookings() {
    setLoading(true)
    fetch('/api/admin?action=bookings')
      .then(r => r.json() as Promise<Booking[]>)
      .then(d => { setBookings(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadBookings() }, [])

  function bookingsForDate(iso: string): Booking[] {
    return bookings.filter(b => b.booking_date === iso && b.status !== 'cancelled')
  }

  function dateToIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  function isToday(d: Date): boolean {
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }

  function navigate(dir: number) {
    if (view === 'month') {
      setCurMonth(new Date(curMonth.getFullYear(), curMonth.getMonth() + dir, 1))
    } else {
      const ws = new Date(weekStart)
      ws.setDate(ws.getDate() + dir * 7)
      setWeekStart(ws)
    }
  }

  async function cancelBooking(id: number) {
    setCancelling(true)
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    setCancelling(false)
    setSelected(null)
    loadBookings()
  }

  // ── MONTH VIEW ──────────────────────────────────────────────────────────────
  function MonthView() {
    const year = curMonth.getFullYear()
    const month = curMonth.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ day: number; iso: string; current: boolean; isToday?: boolean }> = []

    for (let i = 0; i < firstDow; i++) {
      const d = new Date(year, month, -firstDow + i + 1)
      cells.push({ day: d.getDate(), iso: dateToIso(d), current: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d)
      cells.push({ day: d, iso: dateToIso(dt), current: true, isToday: isToday(dt) })
    }
    const rem = (7 - cells.length % 7) % 7
    for (let i = 1; i <= rem; i++) {
      const d = new Date(year, month + 1, i)
      cells.push({ day: i, iso: dateToIso(d), current: false })
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid #333', borderLeft: '1px solid #333', minWidth: 420 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ fontSize: 10, letterSpacing: '0.1em', color: '#666', textAlign: 'center', padding: '6px 0', borderRight: '1px solid #333', borderBottom: '1px solid #333', background: '#111' }}>{d}</div>
          ))}
          {cells.map((cell, i) => {
            const bks = cell.current ? bookingsForDate(cell.iso) : []
            return (
              <div key={i} style={{ borderRight: '1px solid #333', borderBottom: '1px solid #333', padding: 6, minHeight: 80, background: !cell.current ? '#111' : cell.isToday ? '#1f1f1f' : '#1a1a1a' }}>
                <div style={{ fontSize: 12, color: !cell.current ? '#333' : cell.isToday ? '#f0f0f0' : '#666', fontWeight: cell.isToday ? 700 : 400, marginBottom: 4 }}>{cell.day}</div>
                {bks.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelected(b)}
                    style={{ fontSize: 11, background: '#2a2a2a', borderLeft: '2px solid #f0f0f0', padding: '2px 5px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', color: '#ccc' }}
                  >
                    {fmtTime(b.booking_time)} {b.customer_name}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── WEEK VIEW ───────────────────────────────────────────────────────────────
  // Uses absolute positioning inside a fixed-height column container so events
  // can span multiple 30-min rows based on service_duration.
  function WeekView() {
    const cols: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      cols.push(d)
    }

    const totalH = TOTAL_SLOTS * ROW_H
    const timeColW = 56
    const fmt = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

    return (
      <>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 12, letterSpacing: '0.05em' }}>
          {fmt(weekStart)} – {fmt(cols[6])} {weekStart.getFullYear()}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 560 }}>
            {/* day headers */}
            <div style={{ display: 'flex', marginLeft: timeColW, borderTop: '1px solid #333', borderLeft: '1px solid #333' }}>
              {cols.map((d, i) => (
                <div key={i} style={{ flex: 1, fontSize: 10, letterSpacing: '0.08em', textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #333', borderBottom: '1px solid #333', background: isToday(d) ? '#1f1f1f' : '#111', color: isToday(d) ? '#f0f0f0' : '#777' }}>
                  {DAY_NAMES[d.getDay()]}<br />
                  <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: '0.04em' }}>{d.getDate()}</span>
                </div>
              ))}
            </div>

            {/* body: time labels + day columns */}
            <div style={{ display: 'flex', borderLeft: '1px solid #333' }}>

              {/* time labels */}
              <div style={{ width: timeColW, flexShrink: 0, background: '#111', borderRight: '1px solid #333' }}>
                {TIME_SLOTS.map(slot => (
                  <div key={slot} style={{ height: ROW_H, fontSize: 10, color: '#444', textAlign: 'right', paddingRight: 6, paddingTop: 3, borderBottom: '1px solid #222', boxSizing: 'border-box' }}>
                    {fmtTime(slot)}
                  </div>
                ))}
              </div>

              {/* one column per day */}
              {cols.map((d, ci) => {
                const iso = dateToIso(d)
                const dayBks = bookingsForDate(iso)

                return (
                  <div key={ci} style={{ flex: 1, position: 'relative', height: totalH, background: isToday(d) ? '#1f1f1f' : '#1a1a1a', borderRight: '1px solid #333' }}>
                    {/* slot grid lines */}
                    {TIME_SLOTS.map((_, si) => (
                      <div key={si} style={{ position: 'absolute', top: si * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: '1px solid #222', boxSizing: 'border-box' }} />
                    ))}

                    {/* booking events — absolutely positioned, height based on duration */}
                    {dayBks.map(b => {
                      const si = slotIndex(b.booking_time)
                      if (si < 0 || si >= TOTAL_SLOTS) return null
                      const duration = b.service_duration || 30
                      const slotSpan = Math.ceil(duration / 30)
                      const top = si * ROW_H + 2
                      const height = slotSpan * ROW_H - 4

                      return (
                        <div
                          key={b.id}
                          onClick={() => setSelected(b)}
                          style={{
                            position: 'absolute',
                            top,
                            left: 2,
                            right: 2,
                            height,
                            background: '#2a2a2a',
                            borderLeft: '2px solid #f0f0f0',
                            padding: '3px 5px',
                            fontSize: 10,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            zIndex: 1,
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customer_name}</div>
                          <div style={{ color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.service_name}</div>
                          {height > 50 && (
                            <div style={{ color: '#555', marginTop: 2 }}>{fmtTime(b.booking_time)}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (loading) return <p style={{ color: '#555' }}>Loading…</p>

  const titleLabel = view === 'month'
    ? `${MONTHS[curMonth.getMonth()]} ${curMonth.getFullYear()}`
    : `${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif", color: '#f0f0f0', position: 'relative' }}>
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 24, letterSpacing: '0.06em', flex: 1 }}>{titleLabel}</div>
        <button onClick={() => navigate(-1)} style={navBtn}>‹</button>
        <button onClick={() => navigate(1)} style={navBtn}>›</button>
        <div style={{ display: 'flex', border: '1px solid #444' }}>
          <button onClick={() => setView('month')} style={{ ...togBtn, background: view === 'month' ? '#f0f0f0' : 'none', color: view === 'month' ? '#0a0a0a' : '#555', fontWeight: view === 'month' ? 700 : 400 }}>MONTH</button>
          <button onClick={() => setView('week')} style={{ ...togBtn, background: view === 'week' ? '#f0f0f0' : 'none', color: view === 'week' ? '#0a0a0a' : '#555', fontWeight: view === 'week' ? 700 : 400 }}>WEEK</button>
        </div>
      </div>

      {view === 'month' ? <MonthView /> : <WeekView />}

      {/* click popup with cancel */}
      {selected && (
        <>
          {/* backdrop */}
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#1a1a1a', border: '1px solid #444', padding: '20px 24px', fontSize: 13, zIndex: 100, minWidth: 240, maxWidth: 320 }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: '0.06em', marginBottom: 12 }}>{selected.customer_name}</div>
            <div style={{ color: '#666', marginBottom: 5 }}>Service: <span style={{ color: '#e0e0e0' }}>{selected.service_name}</span></div>
            <div style={{ color: '#666', marginBottom: 5 }}>Time: <span style={{ color: '#e0e0e0' }}>{fmtTime(selected.booking_time)}</span></div>
            <div style={{ color: '#666', marginBottom: 5 }}>Date: <span style={{ color: '#e0e0e0' }}>{selected.booking_date}</span></div>
            {selected.customer_phone && (
              <div style={{ color: '#666', marginBottom: 16 }}>Phone: <span style={{ color: '#e0e0e0' }}>{selected.customer_phone}</span></div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                onClick={() => {
                  if (confirm(`Cancel booking for ${selected.customer_name}?`)) {
                    cancelBooking(selected.id)
                  }
                }}
                disabled={cancelling}
                style={{ flex: 1, padding: '8px 12px', background: '#3b0a0a', color: '#ef4444', border: '1px solid #ef4444', fontSize: 12, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel booking'}
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{ padding: '8px 12px', background: 'none', color: '#666', border: '1px solid #333', fontSize: 12, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #444', color: '#f0f0f0', cursor: 'pointer',
  width: 28, height: 28, fontSize: 18, display: 'flex', alignItems: 'center',
  justifyContent: 'center', fontFamily: 'sans-serif', padding: 0, lineHeight: 1,
}

const togBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontFamily: "'Barlow', sans-serif",
  fontSize: 12, letterSpacing: '0.1em', padding: '6px 14px', cursor: 'pointer', transition: 'background 0.15s',
}
