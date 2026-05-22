'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Booking } from '@/lib/db'

const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || 'The Barbershop'

type AdminTab = 'today' | 'calendar' | 'customers' | 'block' | 'walkin'

interface Stats {
  total: number
  confirmed: number
  completed: number
  noShow: number
  revenue: number
}

interface Customer {
  customer_email: string
  customer_name: string
  customer_phone: string
  visit_count: number
  last_visit: string
  total_spent: number
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No-show',
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#e8f5e9',
  completed: '#eeeeee',
  cancelled: '#fce4ec',
  'no-show': '#fce4ec',
}

const STATUS_TEXT: Record<string, string> = {
  confirmed: '#2e7d32',
  completed: '#666',
  cancelled: '#c62828',
  'no-show': '#c62828',
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function formatDate(d: string): string {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('today')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const loadToday = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin?action=today')
    const data = await res.json() as { bookings: Booking[]; stats: Stats }
    setBookings(data.bookings || [])
    setStats(data.stats || null)
    setLoading(false)
  }, [])

  useEffect(() => { loadToday() }, [loadToday])

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadToday()
  }

  async function loadCustomers() {
    const res = await fetch('/api/admin?action=customers')
    setCustomers(await res.json() as Customer[])
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  const s = {
    wrap: { maxWidth: 760, margin: '0 auto', padding: '28px 16px', fontFamily: 'system-ui, sans-serif' } as React.CSSProperties,
    tabBar: { display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' as const },
    tab: (active: boolean): React.CSSProperties => ({
      padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
      border: active ? 'none' : '1px solid #e8e8e8',
      background: active ? '#1a1a1a' : 'none',
      color: active ? '#fff' : '#666',
    }),
    statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 } as React.CSSProperties,
    statCard: { background: '#f5f5f0', borderRadius: 10, padding: '12px 14px' } as React.CSSProperties,
    bookingRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #efefef', background: '#fff', marginBottom: 8 } as React.CSSProperties,
    timeBadge: { fontSize: 12, fontWeight: 600, background: '#fdf8ee', color: '#8a6a30', padding: '4px 10px', borderRadius: 6, minWidth: 70, textAlign: 'center' as const, flexShrink: 0 },
    statusPill: (status: string): React.CSSProperties => ({
      fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
      background: STATUS_COLORS[status] || '#eee',
      color: STATUS_TEXT[status] || '#666',
      flexShrink: 0,
    }),
    actBtn: { padding: '5px 10px', fontSize: 12, border: '1px solid #e8e8e8', borderRadius: 6, background: 'none', cursor: 'pointer', color: '#666' } as React.CSSProperties,
    input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, boxSizing: 'border-box' as const, marginBottom: 12 },
    btn: { padding: '10px 20px', background: '#c8a96e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
    sectionHead: { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' } as React.CSSProperties,
  }

  return (
    <div style={s.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#c8a96e' }}>{SHOP_NAME}</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 500 }}>Admin</h1>
        </div>
        <button style={{ ...s.actBtn, fontSize: 13 }} onClick={handleLogout}>Sign out</button>
      </div>

      <div style={s.tabBar}>
        {(['today', 'calendar', 'customers', 'block', 'walkin'] as AdminTab[]).map(t => (
          <button key={t} style={s.tab(tab === t)} onClick={() => {
            setTab(t)
            if (t === 'customers') loadCustomers()
          }}>
            {{ today: 'Today', calendar: 'Calendar', customers: 'Customers', block: 'Block time', walkin: 'Add walk-in' }[t]}
          </button>
        ))}
      </div>

      {/* TODAY */}
      {tab === 'today' && (
        <>
          {stats && (
            <div style={s.statGrid}>
              <div style={s.statCard}><div style={{ fontSize: 24, fontWeight: 500 }}>{stats.total}</div><div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Bookings</div></div>
              <div style={s.statCard}><div style={{ fontSize: 24, fontWeight: 500 }}>{stats.confirmed}</div><div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Confirmed</div></div>
              <div style={s.statCard}><div style={{ fontSize: 24, fontWeight: 500 }}>{stats.completed}</div><div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Completed</div></div>
              <div style={s.statCard}><div style={{ fontSize: 24, fontWeight: 500 }}>${(stats.revenue / 100).toFixed(0)}</div><div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Revenue</div></div>
            </div>
          )}
          <div style={s.sectionHead}>Today's bookings</div>
          {loading ? <p style={{ color: '#aaa' }}>Loading…</p> : bookings.length === 0 ? (
            <p style={{ color: '#aaa', fontSize: 14 }}>No bookings today.</p>
          ) : bookings.map(b => (
            <div key={b.id} style={s.bookingRow}>
              <div style={s.timeBadge}>{formatTime(b.booking_time)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.customer_name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{b.service_name} · {b.customer_phone}</div>
              </div>
              <span style={s.statusPill(b.status)}>{STATUS_LABELS[b.status]}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {b.status === 'confirmed' && (
                  <>
                    <button style={s.actBtn} onClick={() => updateStatus(b.id, 'completed')}>✓ Done</button>
                    <button style={s.actBtn} onClick={() => updateStatus(b.id, 'no-show')}>No-show</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {/* CALENDAR */}
      {tab === 'calendar' && <CalendarView />}

      {/* CUSTOMERS */}
      {tab === 'customers' && (
        <>
          <div style={s.sectionHead}>All customers</div>
          {customers.map(c => (
            <div key={c.customer_email} style={{ ...s.bookingRow, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{c.customer_name}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{c.customer_email} · {c.customer_phone}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>Last visit: {formatDate(c.last_visit)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{c.visit_count} visits</div>
                <div style={{ fontSize: 12, color: '#888' }}>${(c.total_spent / 100).toFixed(0)} total</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* BLOCK TIME */}
      {tab === 'block' && <BlockTimeForm />}

      {/* WALK-IN */}
      {tab === 'walkin' && <WalkInForm onAdded={loadToday} />}
    </div>
  )
}

function CalendarView() {
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    const monday = new Date()
    monday.setDate(monday.getDate() - monday.getDay() + 1)
    const dates = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d.toISOString().split('T')[0]
    })
    const start = dates[0], end = dates[dates.length - 1]
    fetch(`/api/admin?action=bookings`)
      .then(r => r.json() as Promise<Booking[]>)
      .then((all: Booking[]) => setBookings(all.filter(b => b.booking_date >= start && b.booking_date <= end)))
  }, [])

  const monday = new Date()
  monday.setDate(monday.getDate() - monday.getDay() + 1)
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12 }}>This week</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {weekDates.map(d => {
          const iso = d.toISOString().split('T')[0]
          const dayBks = bookings.filter(b => b.booking_date === iso)
          return (
            <div key={iso} style={{ background: '#f9f9f7', borderRadius: 10, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', marginBottom: 8, textTransform: 'uppercase' }}>
                {d.toLocaleDateString('en-CA', { weekday: 'short' })}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{d.getDate()}</div>
              {dayBks.map(b => (
                <div key={b.id} style={{ background: '#fdf8ee', borderRadius: 6, padding: '5px 7px', marginBottom: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8a6a30' }}>{formatTime(b.booking_time)}</div>
                  <div style={{ fontSize: 11, color: '#a07840', marginTop: 1 }}>{b.customer_name.split(' ')[0]}</div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BlockTimeForm() {
  const [form, setForm] = useState({ date: '', startTime: '12:00', endTime: '13:00', reason: '', recurring: false })
  const [saved, setSaved] = useState(false)

  async function save() {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'block', date: form.date || null, start_time: form.startTime, end_time: form.endTime, reason: form.reason, recurring: form.recurring }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, boxSizing: 'border-box' as const, marginBottom: 12 }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12 }}>Block off time</div>
      <div style={{ background: '#f9f9f7', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Date (leave blank for recurring)</label>
            <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Start time</label>
            <input type="time" style={inp} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>End time</label>
            <input type="time" style={inp} value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Reason</label>
        <input style={inp} placeholder="Vacation, lunch break, training…" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#666', marginBottom: 16 }}>
          <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} style={{ accentColor: '#c8a96e' }} />
          Recurring (weekly)
        </label>
        <button style={{ padding: '10px 20px', background: '#c8a96e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={save}>
          {saved ? '✓ Saved' : 'Save block'}
        </button>
      </div>
    </div>
  )
}

function WalkInForm({ onAdded }: { onAdded: () => void }) {
  const [services, setServices] = useState<Array<{ id: number; name: string; price: number }>>([])
  const [form, setForm] = useState({ name: '', phone: '', email: '', serviceId: '', date: '', time: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/services').then(r => r.json() as Promise<Array<{ id: number; name: string; price: number }>>) .then(setServices)
  }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'walkin', customer_name: form.name, customer_phone: form.phone, customer_email: form.email || 'walkin@local', service_id: form.serviceId, staff_id: 1, booking_date: form.date, booking_time: form.time }),
    })
    setSaving(false)
    setForm({ name: '', phone: '', email: '', serviceId: '', date: '', time: '' })
    onAdded()
  }

  const ready = form.name && form.serviceId && form.date && form.time
  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, boxSizing: 'border-box' as const, marginBottom: 12 }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12 }}>Add walk-in or phone booking</div>
      <div style={{ background: '#f9f9f7', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Name</label>
            <input style={inp} placeholder="Customer name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Phone</label>
            <input style={inp} placeholder="(604) 555-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Service</label>
        <select style={inp} value={form.serviceId} onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}>
          <option value="">Select service…</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.price / 100}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Date</label>
            <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#888', display: 'block', marginBottom: 5 }}>Time</label>
            <input type="time" style={inp} value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
        </div>
        <button
          disabled={!ready || saving}
          style={{ padding: '10px 20px', background: '#c8a96e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5 }}
          onClick={save}
        >
          {saving ? 'Adding…' : 'Add booking'}
        </button>
      </div>
    </div>
  )
}
