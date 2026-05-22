'use client'
// src/components/AdminServicesTab.tsx

import { useEffect, useState } from 'react'

interface Service {
  id: number
  name: string
  duration_minutes: number
  price: number // cents
  is_active: number
}

interface FormState {
  name: string
  duration_minutes: string
  price_dollars: string
}

const EMPTY_FORM: FormState = { name: '', duration_minutes: '30', price_dollars: '' }

const btn = (bg: string, color = '#fff'): React.CSSProperties => ({
  padding: '0.45rem 0.9rem',
  borderRadius: '0.4rem',
  border: 'none',
  background: bg,
  color,
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
})

const input: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  borderRadius: '0.4rem',
  border: '1.5px solid #e5e7eb',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
}

export default function AdminServicesTab() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/services')
    const data = await res.json() as { services: Service[] }
    setServices(data.services)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(s: Service) {
    setEditingId(s.id)
    setForm({
      name: s.name,
      duration_minutes: String(s.duration_minutes),
      price_dollars: (s.price / 100).toFixed(2),
    })
    setShowAdd(false)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowAdd(false)
    setError('')
  }

  async function handleSave(id?: number) {
    setError('')
    if (!form.name.trim() || !form.duration_minutes || !form.price_dollars) {
      setError('All fields are required.')
      return
    }
    setSaving(true)

    const payload = {
      ...(id ? { id } : {}),
      name: form.name.trim(),
      duration_minutes: parseInt(form.duration_minutes),
      price_dollars: parseFloat(form.price_dollars),
    }

    const res = await fetch('/api/admin/services', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json() as any
    if (!res.ok) {
      setError(data.error ?? 'Failed to save.')
    } else {
      cancelEdit()
      await load()
    }
    setSaving(false)
  }

  async function handleToggle(s: Service) {
    await fetch('/api/admin/services', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
    })
    await load()
  }

  async function handleDelete(s: Service) {
    if (!confirm(`Delete "${s.name}"? This can't be undone.`)) return
    const res = await fetch(`/api/admin/services?id=${s.id}`, { method: 'DELETE' })
    const data = await res.json() as any
    if (!res.ok) {
      alert(data.error)
    } else {
      await load()
    }
  }

  if (loading) return <p style={{ color: '#6b7280' }}>Loading services…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Services</h2>
        {!showAdd && editingId === null && (
          <button style={btn('#111')} onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); setError('') }}>
            + Add Service
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <ServiceForm
          form={form}
          setForm={setForm}
          onSave={() => handleSave()}
          onCancel={cancelEdit}
          saving={saving}
          error={error}
          title="New Service"
        />
      )}

      {/* Service list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {services.length === 0 && !showAdd && (
          <p style={{ color: '#6b7280' }}>No services yet. Add one above.</p>
        )}
        {services.map(s => (
          <div key={s.id} style={{
            background: s.is_active ? '#fff' : '#f9fafb',
            border: '1.5px solid #e5e7eb',
            borderRadius: '0.6rem',
            padding: '1rem 1.25rem',
            opacity: s.is_active ? 1 : 0.65,
          }}>
            {editingId === s.id ? (
              <ServiceForm
                form={form}
                setForm={setForm}
                onSave={() => handleSave(s.id)}
                onCancel={cancelEdit}
                saving={saving}
                error={error}
                title="Edit Service"
              />
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {s.name}
                    {!s.is_active && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 400 }}>inactive</span>}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '2px' }}>
                    {s.duration_minutes} min · ${(s.price / 100).toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={btn(s.is_active ? '#f3f4f6', '#374151')} onClick={() => handleToggle(s)}>
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button style={btn('#f3f4f6', '#374151')} onClick={() => startEdit(s)}>Edit</button>
                  <button style={btn('#fee2e2', '#dc2626')} onClick={() => handleDelete(s)}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ServiceForm({
  form, setForm, onSave, onCancel, saving, error, title
}: {
  form: FormState
  setForm: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  error: string
  title: string
}) {
  const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120]

  return (
    <div style={{ background: '#f9fafb', borderRadius: '0.6rem', padding: '1.25rem', marginBottom: '0.75rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Service Name</label>
          <input
            style={input}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Fade"
          />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Duration</label>
          <select
            style={{ ...input }}
            value={form.duration_minutes}
            onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
          >
            {DURATIONS.map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Price ($)</label>
          <input
            style={input}
            type="number"
            min="0"
            step="0.01"
            value={form.price_dollars}
            onChange={e => setForm({ ...form, price_dollars: e.target.value })}
            placeholder="25.00"
          />
        </div>
      </div>
      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button style={btn('#111')} onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button style={btn('#f3f4f6', '#374151')} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
