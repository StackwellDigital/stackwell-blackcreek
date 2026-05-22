'use client'
// src/components/AdminAvailabilityTab.tsx

import { useEffect, useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIMES = Array.from({ length: 28 }, (_, i) => {
  const totalMins = 7 * 60 + i * 30
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const hh = h.toString().padStart(2, '0')
  const mm = m.toString().padStart(2, '0')
  const label = `${h % 12 || 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`
  return { value: `${hh}:${mm}`, label }
})

interface DaySchedule {
  day_of_week: number
  start_time: string | null
  end_time: string | null
  id: number | null
}

const input: React.CSSProperties = {
  padding: '0.5rem 0.65rem',
  borderRadius: '0.4rem',
  border: '1.5px solid #e5e7eb',
  fontSize: '0.875rem',
  background: '#fff',
}

export default function AdminAvailabilityTab() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/availability')
      .then(r => r.json() as Promise<{ schedule: DaySchedule[] }>)
      .then(data => {
        setSchedule(data.schedule)
        setLoading(false)
      })
  }, [])

  function setDay(dayOfWeek: number, patch: Partial<DaySchedule>) {
    setSchedule(prev =>
      prev.map(d => d.day_of_week === dayOfWeek ? { ...d, ...patch } : d)
    )
    setSaved(false)
  }

  function toggleDay(dayOfWeek: number, open: boolean) {
    setDay(dayOfWeek, {
      start_time: open ? '09:00' : null,
      end_time: open ? '17:00' : null,
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    for (const d of schedule) {
      if (d.start_time && d.end_time) {
        if (d.start_time >= d.end_time) {
          setError(`${DAYS[d.day_of_week]}: closing time must be after opening time.`)
          setSaving(false)
          return
        }
      }
    }

    const res = await fetch('/api/admin/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule }),
    })

    const data = await res.json() as any
    if (!res.ok) {
      setError(data.error ?? 'Failed to save.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) return <p style={{ color: '#6b7280' }}>Loading schedule…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Hours & Availability</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.5rem 1.1rem',
            borderRadius: '0.4rem',
            border: 'none',
            background: saved ? '#16a34a' : '#111',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Hours'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {schedule.map(day => {
          const isOpen = day.start_time !== null && day.end_time !== null
          return (
            <div
              key={day.day_of_week}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 60px 1fr',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.25rem',
                background: isOpen ? '#fff' : '#f9fafb',
                border: '1.5px solid #e5e7eb',
                borderRadius: '0.6rem',
                opacity: isOpen ? 1 : 0.6,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{DAYS[day.day_of_week]}</span>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                <div
                  onClick={() => toggleDay(day.day_of_week, !isOpen)}
                  style={{
                    width: '36px',
                    height: '20px',
                    borderRadius: '999px',
                    background: isOpen ? '#111' : '#d1d5db',
                    position: 'relative',
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: isOpen ? '18px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </label>

              {isOpen ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    style={input}
                    value={day.start_time ?? '09:00'}
                    onChange={e => setDay(day.day_of_week, { start_time: e.target.value })}
                  >
                    {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>to</span>
                  <select
                    style={input}
                    value={day.end_time ?? '17:00'}
                    onChange={e => setDay(day.day_of_week, { end_time: e.target.value })}
                  >
                    {TIMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Closed</span>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '1rem' }}>
        Slot interval is controlled by the <code>SLOT_INTERVAL</code> env var (default: 30 min).
      </p>
    </div>
  )
}
