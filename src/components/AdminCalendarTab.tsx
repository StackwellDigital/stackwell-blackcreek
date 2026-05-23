'use client'
// src/components/AdminCalendarTab.tsx

import { useEffect, useState } from 'react'

interface Booking {
  id: number
  customer_name: string
  service_name: string
  booking_date: string   // YYYY-MM-DD
  booking_time: string   // HH:MM
  customer_phone: string
  status: string
}

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT']

// Generate hour slots 9am–5pm in 30min increments
const TIME_SLOTS: string[] = []
for (let h = 9; h <= 17; h++) {
  for (const m of [0, 30]) {
    if (h === 17 && m === 30) break
    TIME_SLOTS.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function isoToDisplay(iso: string): string {
  const [h, m] = iso.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function AdminCalendarTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'week'>('month')

  const today = new Date()
  const [curMonth, setCurMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  // week start = Monday of the current week
  function getWeekStart(ref: Date): Date {
    const d = new Date(ref)
    const dow = d.getDay()
    // go to Monday (or Sunday if that's your preference — using Monday here)
    const diff = dow === 0 ? -6 : 1 - dow
    d.setDate(d.getDate() + diff)
    d.setHours(0,0,0,0)
    return d
  }
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))

  const [popup, setPopup] = useState<{ booking: Booking; x: number; y: number } | null>(null)

  useEffect(() => {
    fetch('/api/admin')
      .then(r => r.json() as Promise<{ bookings: Booking[] }>)
      .then(d => { setBookings(d.bookings || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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

  // ── MONTH VIEW ──────────────────────────────────────────────────────────────
  function MonthView() {
    const year = curMonth.getFullYear()
    const month = curMonth.getMonth()
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // leading days from prev month
    const leadingDays: Array<{ day: number; iso: string; other: true }> = []
    for (let i = 0; i < firstDow; i++) {
      const d = new Date(year, month, -firstDow + i + 1)
      leadingDays.push({ day: d.getDate(), iso: dateToIso(d), other: true })
    }

    const currentDays = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1)
      return { day: i + 1, iso: dateToIso(d), isToday: isToday(d) }
    })

    const totalCells = leadingDays.length + currentDays.length
    const trailingCount = (7 - (totalCells % 7)) % 7
    const trailingDays: Array<{ day: number; iso: string; other: true }> = []
    for (let i = 1; i <= trailingCount; i++) {
      const d = new Date(year, month + 1, i)
      trailingDays.push({ day: i, iso: dateToIso(d), other: true })
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderTop: '1px solid #333',
          borderLeft: '1px solid #333',
          minWidth: 420,
        }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{
              fontSize: 10, letterSpacing: '0.1em', color: '#666',
              textAlign: 'center', padding: '6px 0',
              borderRight: '1px solid #333', borderBottom: '1px solid #333',
              background: '#111',
            }}>{d}</div>
          ))}

          {[...leadingDays.map(c => ({ ...c, current: false })),
            ...currentDays.map(c => ({ ...c, other: false, current: true })),
            ...trailingDays.map(c => ({ ...c, current: false }))
          ].map((cell, i) => {
            const bks = cell.current ? bookingsForDate(cell.iso) : []
            const todayCell = cell.current && (cell as any).isToday
            return (
              <div key={i} style={{
                borderRight: '1px solid #333',
                borderBottom: '1px solid #333',
                padding: 6,
                minHeight: 80,
                background: !cell.current ? '#111' : todayCell ? '#1f1f1f' : '#1a1a1a',
              }}>
                <div style={{
                  fontSize: 12,
                  color: !cell.current ? '#333' : todayCell ? '#f0f0f0' : '#666',
                  fontWeight: todayCell ? 700 : 400,
                  marginBottom: 4,
                }}>{cell.day}</div>
                {bks.map(b => (
                  <div
                    key={b.id}
                    onMouseEnter={e => setPopup({ booking: b, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setPopup(null)}
                    style={{
                      fontSize: 11,
                      background: '#2a2a2a',
                      borderLeft: '2px solid #f0f0f0',
                      padding: '2px 5px',
                      marginBottom: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer',
                      color: '#ccc',
                    }}
                  >
                    {isoToDisplay(b.booking_time)} {b.customer_name}
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
  function WeekView() {
    const cols: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      cols.push(d)
    }

    const we = cols[6]
    const fmt = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
    const rangeLabel = `${fmt(weekStart)} – ${fmt(we)} ${weekStart.getFullYear()}`

    return (
      <>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 12, letterSpacing: '0.05em' }}>{rangeLabel}</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '52px repeat(7, 1fr)',
            borderTop: '1px solid #333',
            borderLeft: '1px solid #333',
            minWidth: 520,
          }}>
            {/* header row */}
            <div style={{ borderRight: '1px solid #333', borderBottom: '1px solid #333', background: '#111' }} />
            {cols.map((d, i) => (
              <div key={i} style={{
                fontSize: 10, letterSpacing: '0.08em',
                textAlign: 'center', padding: '8px 4px',
                borderRight: '1px solid #333', borderBottom: '1px solid #333',
                background: isToday(d) ? '#1f1f1f' : '#111',
                color: isToday(d) ? '#f0f0f0' : '#777',
              }}>
                {DAY_NAMES[d.getDay()]}<br />
                <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: '0.04em' }}>{d.getDate()}</span>
              </div>
            ))}

            {/* time rows */}
            {TIME_SLOTS.map(slot => (
              <>
                <div key={slot + '-label'} style={{
                  fontSize: 10, color: '#444',
                  textAlign: 'right', paddingRight: 6, paddingTop: 3,
                  borderRight: '1px solid #333', borderBottom: '1px solid #222',
                  height: 38, background: '#111',
                }}>
                  {formatTime(slot)}
                </div>
                {cols.map((d, ci) => {
                  const iso = dateToIso(d)
                  const bks = bookingsForDate(iso).filter(b => b.booking_time === slot)
                  return (
                    <div key={iso + slot} style={{
                      borderRight: '1px solid #333',
                      borderBottom: '1px solid #222',
                      height: 38,
                      position: 'relative',
                      background: isToday(d) ? '#1f1f1f' : '#1a1a1a',
                    }}>
                      {bks.map(b => (
                        <div
                          key={b.id}
                          onMouseEnter={e => setPopup({ booking: b, x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setPopup(null)}
                          style={{
                            position: 'absolute',
                            left: 2, right: 2, top: 2, bottom: 2,
                            background: '#2a2a2a',
                            borderLeft: '2px solid #f0f0f0',
                            padding: '2px 4px',
                            fontSize: 10,
                            overflow: 'hidden',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#f0f0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.customer_name}
                          </div>
                          <div style={{ color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {b.service_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            ))}
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
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 24, letterSpacing: '0.06em', flex: 1 }}>
          {titleLabel}
        </div>
        <button onClick={() => navigate(-1)} style={navBtn}>‹</button>
        <button onClick={() => navigate(1)} style={navBtn}>›</button>
        <div style={{ display: 'flex', border: '1px solid #444' }}>
          <button
            onClick={() => setView('month')}
            style={{ ...togBtn, background: view === 'month' ? '#f0f0f0' : 'none', color: view === 'month' ? '#0a0a0a' : '#555', fontWeight: view === 'month' ? 700 : 400 }}
          >MONTH</button>
          <button
            onClick={() => setView('week')}
            style={{ ...togBtn, background: view === 'week' ? '#f0f0f0' : 'none', color: view === 'week' ? '#0a0a0a' : '#555', fontWeight: view === 'week' ? 700 : 400 }}
          >WEEK</button>
        </div>
      </div>

      {view === 'month' ? <MonthView /> : <WeekView />}

      {/* hover popup */}
      {popup && (
        <div style={{
          position: 'fixed',
          left: popup.x + 12,
          top: popup.y + 12,
          background: '#1e1e1e',
          border: '1px solid #444',
          padding: '10px 14px',
          fontSize: 12,
          zIndex: 100,
          pointerEvents: 'none',
          minWidth: 180,
        }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: '0.06em', marginBottom: 6 }}>
            {popup.booking.customer_name}
          </div>
          <div style={{ color: '#666', marginBottom: 2 }}>Service: <span style={{ color: '#e0e0e0' }}>{popup.booking.service_name}</span></div>
          <div style={{ color: '#666', marginBottom: 2 }}>Time: <span style={{ color: '#e0e0e0' }}>{isoToDisplay(popup.booking.booking_time)}</span></div>
          {popup.booking.customer_phone && (
            <div style={{ color: '#666' }}>Phone: <span style={{ color: '#e0e0e0' }}>{popup.booking.customer_phone}</span></div>
          )}
        </div>
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'none',
  border: '1px solid #444',
  color: '#f0f0f0',
  cursor: 'pointer',
  width: 28,
  height: 28,
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'sans-serif',
  padding: 0,
  lineHeight: 1,
}

const togBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: "'Barlow', sans-serif",
  fontSize: 12,
  letterSpacing: '0.1em',
  padding: '6px 14px',
  cursor: 'pointer',
  transition: 'background 0.15s',
}
