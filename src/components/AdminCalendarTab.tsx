'use client'
// src/components/AdminCalendarTab.tsx

import { useEffect, useState } from 'react'

interface Booking {
  id: number
  customer_name: string
  service_name: string
  service_duration: number  // minutes
  booking_date: string      // YYYY-MM-DD
  booking_time: string      // HH:MM
  customer_phone: string
  status: string
}

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER']
const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const DAY_NAMES_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const ROW_H = 38
const START_HOUR = 9
const END_HOUR = 17
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2

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

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function AdminCalendarTab() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  // desktop view: month | week. mobile always uses agenda.
  const [view, setView] = useState<'month' | 'week'>('month')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const today = new Date()
  today.setHours(0,0,0,0)

  const [curMonth, setCurMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  // Agenda state — which week/month window to show
  const [agendaOffset, setAgendaOffset] = useState(0) // offset in weeks from today

  function getWeekStart(ref: Date): Date {
    const d = new Date(ref)
    d.setHours(0,0,0,0)
    const dow = d.getDay()
    d.setDate(d.getDate() - dow) // week starts Sunday
    return d
  }
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today))

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function loadBookings() {
    setLoading(true)
    fetch('/api/admin?action=bookings')
      .then(r => r.json() as Promise<Booking[]>)
      .then(d => { setBookings(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadBookings() }, [])

  function bookingsForDate(iso: string): Booking[] {
    return bookings
      .filter(b => b.booking_date === iso && b.status !== 'cancelled')
      .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
  }

  function isToday(d: Date): boolean {
    return dateToIso(d) === dateToIso(today)
  }

  function navigate(dir: number) {
    if (isMobile) {
      setAgendaOffset(o => o + dir)
    } else if (view === 'month') {
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

  // ── AGENDA VIEW (mobile) ────────────────────────────────────────────────────
  // Shows 14 days starting from (today + agendaOffset * 14)
  function AgendaView() {
    const WINDOW = 14 // days per page
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() + agendaOffset * WINDOW)

    const days: { date: Date; iso: string; bks: Booking[] }[] = []
    for (let i = 0; i < WINDOW; i++) {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const iso = dateToIso(d)
      days.push({ date: d, iso, bks: bookingsForDate(iso) })
    }

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + WINDOW - 1)

    const fmtRange = () => {
      const sm = MONTHS_SHORT[startDate.getMonth()]
      const em = MONTHS_SHORT[endDate.getMonth()]
      if (sm === em) return `${sm} ${startDate.getDate()}–${endDate.getDate()} ${startDate.getFullYear()}`
      return `${sm} ${startDate.getDate()} – ${em} ${endDate.getDate()} ${endDate.getFullYear()}`
    }

    const totalBookings = days.reduce((sum, d) => sum + d.bks.length, 0)

    return (
      <div>
        {/* range label */}
        <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', marginBottom: 16, textTransform: 'uppercase' }}>
          {fmtRange()}
          {totalBookings === 0 && <span style={{ marginLeft: 8, color: '#444' }}>— no bookings</span>}
        </div>

        {days.map(({ date, iso, bks }) => {
          const todayFlag = isToday(date)
          const isPast = date < today
          const dow = date.getDay()

          return (
            <div key={iso} style={{ marginBottom: 4 }}>
              {/* date row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: todayFlag ? '#1f1f1f' : bks.length > 0 ? '#161616' : 'transparent',
                borderLeft: todayFlag ? '2px solid #f0f0f0' : bks.length > 0 ? '2px solid #333' : '2px solid transparent',
                marginBottom: bks.length > 0 ? 1 : 0,
              }}>
                {/* day number */}
                <div style={{ minWidth: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: todayFlag ? '#888' : '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {DAY_NAMES[dow]}
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontFamily: "'Bebas Neue', cursive",
                    letterSpacing: '0.04em',
                    color: todayFlag ? '#f0f0f0' : isPast ? '#333' : '#666',
                    lineHeight: 1,
                  }}>
                    {date.getDate()}
                  </div>
                </div>

                {/* booking summary or empty line */}
                <div style={{ flex: 1 }}>
                  {bks.length === 0 ? (
                    <div style={{ height: 1, background: '#1e1e1e' }} />
                  ) : (
                    <div style={{ fontSize: 11, color: '#555' }}>
                      {bks.length} booking{bks.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* booking cards */}
              {bks.map(b => (
                <div
                  key={b.id}
                  onClick={() => setSelected(b)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px 10px 56px', // indent under date column
                    background: '#1a1a1a',
                    borderLeft: '2px solid #f0f0f0',
                    borderBottom: '1px solid #111',
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* time */}
                  <div style={{
                    minWidth: 60,
                    fontSize: 13,
                    fontFamily: "'Bebas Neue', cursive",
                    letterSpacing: '0.06em',
                    color: '#f0f0f0',
                  }}>
                    {fmtTime(b.booking_time)}
                  </div>

                  {/* details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: '#f0f0f0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.customer_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.service_name} · {b.service_duration}min
                    </div>
                  </div>

                  {/* chevron */}
                  <div style={{ color: '#333', fontSize: 16 }}>›</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    )
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
            <div style={{ display: 'flex', marginLeft: timeColW, borderTop: '1px solid #333', borderLeft: '1px solid #333' }}>
              {cols.map((d, i) => (
                <div key={i} style={{ flex: 1, fontSize: 10, letterSpacing: '0.08em', textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #333', borderBottom: '1px solid #333', background: isToday(d) ? '#1f1f1f' : '#111', color: isToday(d) ? '#f0f0f0' : '#777' }}>
                  {DAY_NAMES[d.getDay()]}<br />
                  <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: '0.04em' }}>{d.getDate()}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', borderLeft: '1px solid #333' }}>
              <div style={{ width: timeColW, flexShrink: 0, background: '#111', borderRight: '1px solid #333' }}>
                {TIME_SLOTS.map(slot => (
                  <div key={slot} style={{ height: ROW_H, fontSize: 10, color: '#444', textAlign: 'right', paddingRight: 6, paddingTop: 3, borderBottom: '1px solid #222', boxSizing: 'border-box' }}>
                    {fmtTime(slot)}
                  </div>
                ))}
              </div>
              {cols.map((d, ci) => {
                const iso = dateToIso(d)
                const dayBks = bookingsForDate(iso)
                return (
                  <div key={ci} style={{ flex: 1, position: 'relative', height: totalH, background: isToday(d) ? '#1f1f1f' : '#1a1a1a', borderRight: '1px solid #333' }}>
                    {TIME_SLOTS.map((_, si) => (
                      <div key={si} style={{ position: 'absolute', top: si * ROW_H, left: 0, right: 0, height: ROW_H, borderBottom: '1px solid #222', boxSizing: 'border-box' }} />
                    ))}
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
                          style={{ position: 'absolute', top, left: 2, right: 2, height, background: '#2a2a2a', borderLeft: '2px solid #f0f0f0', padding: '3px 5px', fontSize: 10, overflow: 'hidden', cursor: 'pointer', zIndex: 1, boxSizing: 'border-box' }}
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

  if (loading) return <p style={{ color: '#555', fontFamily: "'Barlow', sans-serif" }}>Loading…</p>

  // ── TITLE LABEL ─────────────────────────────────────────────────────────────
  let titleLabel: string
  if (isMobile) {
    const WINDOW = 14
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() + agendaOffset * WINDOW)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + WINDOW - 1)
    const sm = MONTHS[startDate.getMonth()]
    const em = MONTHS[endDate.getMonth()]
    titleLabel = sm === em ? sm : `${MONTHS_SHORT[startDate.getMonth()]} / ${MONTHS_SHORT[endDate.getMonth()]}`
    titleLabel += ` ${startDate.getFullYear()}`
  } else if (view === 'month') {
    titleLabel = `${MONTHS[curMonth.getMonth()]} ${curMonth.getFullYear()}`
  } else {
    titleLabel = `${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`
  }

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif", color: '#f0f0f0', position: 'relative' }}>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 24, letterSpacing: '0.06em', flex: 1 }}>
          {titleLabel}
        </div>

        {/* today button — mobile only */}
        {isMobile && agendaOffset !== 0 && (
          <button
            onClick={() => setAgendaOffset(0)}
            style={{ ...navBtn, fontSize: 10, letterSpacing: '0.08em', padding: '0 10px', width: 'auto' }}
          >
            TODAY
          </button>
        )}

        <button onClick={() => navigate(-1)} style={navBtn}>‹</button>
        <button onClick={() => navigate(1)} style={navBtn}>›</button>

        {/* month/week toggle — desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', border: '1px solid #444' }}>
            <button onClick={() => setView('month')} style={{ ...togBtn, background: view === 'month' ? '#f0f0f0' : 'none', color: view === 'month' ? '#0a0a0a' : '#555', fontWeight: view === 'month' ? 700 : 400 }}>MONTH</button>
            <button onClick={() => setView('week')} style={{ ...togBtn, background: view === 'week' ? '#f0f0f0' : 'none', color: view === 'week' ? '#0a0a0a' : '#555', fontWeight: view === 'week' ? 700 : 400 }}>WEEK</button>
          </div>
        )}

        {/* agenda label — mobile only */}
        {isMobile && (
          <div style={{ fontSize: 9, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', alignSelf: 'center' }}>
            AGENDA
          </div>
        )}
      </div>

      {isMobile ? <AgendaView /> : view === 'month' ? <MonthView /> : <WeekView />}

      {/* booking detail popup */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1a1a1a',
            border: '1px solid #444',
            padding: '20px 24px',
            fontSize: 13,
            zIndex: 100,
            width: isMobile ? 'calc(100vw - 48px)' : undefined,
            minWidth: isMobile ? undefined : 240,
            maxWidth: isMobile ? undefined : 320,
            boxSizing: 'border-box',
          }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: '0.06em', marginBottom: 4 }}>
              {selected.customer_name}
            </div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 16, letterSpacing: '0.06em' }}>
              {DAY_NAMES_FULL[parseIso(selected.booking_date).getDay()]}, {MONTHS_SHORT[parseIso(selected.booking_date).getMonth()]} {parseIso(selected.booking_date).getDate()}
            </div>
            <div style={{ color: '#666', marginBottom: 6 }}>Service: <span style={{ color: '#e0e0e0' }}>{selected.service_name}</span></div>
            <div style={{ color: '#666', marginBottom: 6 }}>Time: <span style={{ color: '#e0e0e0' }}>{fmtTime(selected.booking_time)}</span></div>
            <div style={{ color: '#666', marginBottom: 6 }}>Duration: <span style={{ color: '#e0e0e0' }}>{selected.service_duration}min</span></div>
            {selected.customer_phone && (
              <div style={{ color: '#666', marginBottom: 16 }}>
                Phone:{' '}
                <a href={`tel:${selected.customer_phone}`} style={{ color: '#e0e0e0', textDecoration: 'none' }}>
                  {selected.customer_phone}
                </a>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => {
                  if (confirm(`Cancel booking for ${selected.customer_name}?`)) {
                    cancelBooking(selected.id)
                  }
                }}
                disabled={cancelling}
                style={{ flex: 1, padding: '10px 12px', background: '#3b0a0a', color: '#ef4444', border: '1px solid #ef4444', fontSize: 12, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", letterSpacing: '0.06em' }}
              >
                {cancelling ? 'CANCELLING…' : 'CANCEL BOOKING'}
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{ padding: '10px 16px', background: 'none', color: '#666', border: '1px solid #333', fontSize: 12, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}
              >
                CLOSE
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
