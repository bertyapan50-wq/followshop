'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rule {
  id: string
  trigger: string
  message_template: string
  is_active: boolean
  created_at: string
}

interface Template {
  id: string
  name: string
  content: string
}

interface FormState {
  trigger: string
  message_template: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  trigger: '',
  message_template: '',
  is_active: true,
}

// ─── Trigger options ──────────────────────────────────────────────────────────

const TRIGGERS = [
  {
    group: 'After Delivery',
    options: [
      { value: 'delivered_1day',  label: '1 day after delivery',  icon: '📦', desc: 'Sent 1 day after order is marked delivered' },
      { value: 'delivered_3days', label: '3 days after delivery', icon: '📦', desc: 'Sent 3 days after order is marked delivered' },
      { value: 'delivered_7days', label: '7 days after delivery', icon: '📦', desc: 'Sent 7 days after order is marked delivered' },
    ],
  },
  {
    group: 'After Order',
    options: [
      { value: 'order_1day',  label: '1 day after order',  icon: '🛒', desc: 'Sent 1 day after order is placed' },
      { value: 'order_3days', label: '3 days after order', icon: '🛒', desc: 'Sent 3 days after order is placed' },
      { value: 'order_7days', label: '7 days after order', icon: '🛒', desc: 'Sent 7 days after order is placed' },
    ],
  },
  {
    group: 'Special',
    options: [
      { value: 'no_review_7days', label: 'No review after 7 days', icon: '⭐', desc: 'If buyer has not left a review 7 days after delivery' },
      { value: 'repeat_buyer',    label: 'Repeat buyer',           icon: '🔁', desc: 'When a buyer places their 2nd or more order' },
    ],
  },
]

// Flat map for lookup
const TRIGGER_MAP: Record<string, { label: string; icon: string; desc: string }> = {}
TRIGGERS.forEach(g => g.options.forEach(o => { TRIGGER_MAP[o.value] = o }))

// ─── Component ────────────────────────────────────────────────────────────────

export default function RulesPage() {
  

  const [rules, setRules] = useState<Rule[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchAll() {
    setLoading(true)
    const [rulesRes, templatesRes] = await Promise.all([
      supabase.from('rules').select('*').order('created_at', { ascending: false }),
      supabase.from('templates').select('id, name, content').order('name'),
    ])
    if (rulesRes.error) notify(rulesRes.error.message, 'error')
    else setRules(rulesRes.data || [])
    if (templatesRes.error) notify(templatesRes.error.message, 'error')
    else setTemplates(templatesRes.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ── Notify ────────────────────────────────────────────────────────────────

  function notify(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.trigger) return notify('Please select a trigger.', 'error')
    if (!form.message_template) return notify('Please select a template.', 'error')

    // Check for duplicate trigger (excluding current edit)
    const duplicate = rules.find(r => r.trigger === form.trigger && r.id !== editingId)
    if (duplicate) return notify('A rule with this trigger already exists.', 'error')

    setSubmitting(true)
    if (editingId) {
      const { error } = await supabase.from('rules')
        .update({ trigger: form.trigger, message_template: form.message_template, is_active: form.is_active })
        .eq('id', editingId)
      if (error) { notify(error.message, 'error'); setSubmitting(false); return }
      notify('Rule updated!', 'success')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { notify('Not logged in.', 'error'); setSubmitting(false); return }

      const { error } = await supabase.from('rules')
        .insert([{ trigger: form.trigger, message_template: form.message_template, is_active: form.is_active, user_id: user.id }])
      if (error) { notify(error.message, 'error'); setSubmitting(false); return }
      notify('Rule created!', 'success')
    }
    setSubmitting(false)
    resetForm()
    fetchAll()
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function toggleActive(rule: Rule) {
    const { error } = await supabase.from('rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id)
    if (error) return notify(error.message, 'error')
    setRules(rs => rs.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function handleEdit(rule: Rule) {
    setEditingId(rule.id)
    setForm({ trigger: rule.trigger, message_template: rule.message_template, is_active: rule.is_active })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this rule?')) return
    const { error } = await supabase.from('rules').delete().eq('id', id)
    if (error) return notify(error.message, 'error')
    notify('Rule deleted.', 'success')
    fetchAll()
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  // ── Selected template preview ─────────────────────────────────────────────

  const selectedTemplate = templates.find(t => t.id === form.message_template)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Rules</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
            {rules.filter(r => r.is_active).length} active rule{rules.filter(r => r.is_active).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(v => !v) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            background: '#EE4D2D', color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Rule
        </button>
      </div>

      {/* ── Toasts ── */}
      {success && <Toast msg={success} type="success" />}
      {error && <Toast msg={error} type="error" />}

      {/* ── No templates warning ── */}
      {!loading && templates.length === 0 && (
        <div style={{
          background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12,
          padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <p style={{ fontSize: 14, color: '#92400E', margin: 0, fontWeight: 500 }}>
            No templates found. <a href="/templates" style={{ color: '#EE4D2D', fontWeight: 700 }}>Create a template first</a> before building rules.
          </p>
        </div>
      )}

      {/* ── Rule Form ── */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
          padding: 24, marginBottom: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 22px' }}>
            {editingId ? 'Edit Rule' : 'New Rule'}
          </h2>

          <form onSubmit={handleSubmit}>

            {/* Flow diagram: Trigger → Template */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
              padding: '14px 18px', background: '#F8FAFC', borderRadius: 12,
              border: '1px solid #E2E8F0',
            }}>
              <FlowStep
                icon="⚡"
                label="Trigger"
                value={form.trigger ? TRIGGER_MAP[form.trigger]?.label : 'Not selected'}
                active={!!form.trigger}
              />
              <svg width="24" height="24" fill="none" stroke="#D1D5DB" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              <FlowStep
                icon="✉️"
                label="Send Template"
                value={selectedTemplate ? selectedTemplate.name : 'Not selected'}
                active={!!form.message_template}
              />
              <svg width="24" height="24" fill="none" stroke="#D1D5DB" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              <FlowStep
                icon="📬"
                label="Message Queued"
                value="Auto-scheduled"
                active={!!(form.trigger && form.message_template)}
              />
            </div>

            {/* Step 1: Trigger */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>1. When should this rule trigger? *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TRIGGERS.map(group => (
                  <div key={group.group}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 7px' }}>
                      {group.group}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {group.options.map(opt => {
                        const isUsed = rules.some(r => r.trigger === opt.value && r.id !== editingId)
                        const isSelected = form.trigger === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={isUsed}
                            onClick={() => setForm(f => ({ ...f, trigger: opt.value }))}
                            title={isUsed ? 'Already used in another rule' : opt.desc}
                            style={{
                              padding: '8px 14px', borderRadius: 10, cursor: isUsed ? 'not-allowed' : 'pointer',
                              border: `1.5px solid ${isSelected ? '#EE4D2D' : '#E5E7EB'}`,
                              background: isSelected ? '#FFF1EE' : isUsed ? '#F9FAFB' : '#fff',
                              color: isSelected ? '#EE4D2D' : isUsed ? '#D1D5DB' : '#374151',
                              fontSize: 13, fontWeight: 500,
                              display: 'flex', alignItems: 'center', gap: 6,
                              opacity: isUsed ? 0.6 : 1,
                              transition: 'all .15s',
                            }}
                          >
                            <span>{opt.icon}</span>
                            {opt.label}
                            {isUsed && <span style={{ fontSize: 10, color: '#9CA3AF' }}>(in use)</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Template */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>2. Which message template to send? *</label>
              {templates.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>No templates available. Create one first.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {templates.map(t => {
                    const isSelected = form.message_template === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, message_template: t.id }))}
                        style={{
                          padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          border: `1.5px solid ${isSelected ? '#EE4D2D' : '#E5E7EB'}`,
                          background: isSelected ? '#FFF1EE' : '#fff',
                          transition: 'all .15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: isSelected ? '#FFDDD7' : '#F3F4F6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <svg width="15" height="15" fill="none" stroke={isSelected ? '#EE4D2D' : '#9CA3AF'} strokeWidth="1.8" viewBox="0 0 24 24">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, color: isSelected ? '#EE4D2D' : '#111', margin: 0, fontSize: 14 }}>{t.name}</p>
                            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {t.content}
                            </p>
                          </div>
                          {isSelected && (
                            <svg width="18" height="18" fill="none" stroke="#EE4D2D" strokeWidth="2.5" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Active toggle */}
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ ...labelStyle, margin: 0 }}>3. Activate rule immediately?</label>
              <Toggle value={form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <span style={{ fontSize: 13, color: form.is_active ? '#15803D' : '#9CA3AF', fontWeight: 500 }}>
                {form.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={resetForm} style={{
                padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E5E7EB',
                background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#374151',
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: submitting ? '#F87171' : '#EE4D2D', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
              }}>
                {submitting ? 'Saving…' : editingId ? 'Update Rule' : 'Save Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Rules List ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Loading rules…</div>
      ) : rules.length === 0 ? (
        <div style={{
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
          padding: 60, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
          <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 6px', fontSize: 15 }}>No rules yet</p>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
            Create your first rule to start automating follow-up messages.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.map(rule => {
            const triggerInfo = TRIGGER_MAP[rule.trigger]
            const template = templates.find(t => t.id === rule.message_template)
            return (
              <div key={rule.id} style={{
                background: '#fff', border: `1.5px solid ${rule.is_active ? '#E5E7EB' : '#F3F4F6'}`,
                borderRadius: 14, padding: '16px 20px',
                boxShadow: rule.is_active ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                opacity: rule.is_active ? 1 : 0.65,
                transition: 'all .2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {/* Trigger badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#FFF7ED', border: '1px solid #FED7AA',
                    padding: '6px 12px', borderRadius: 20, flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 14 }}>{triggerInfo?.icon || '⚡'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#C2410C' }}>
                      {triggerInfo?.label || rule.trigger}
                    </span>
                  </div>

                  {/* Arrow */}
                  <svg width="20" height="20" fill="none" stroke="#D1D5DB" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>

                  {/* Template badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: '#F0F9FF', border: '1px solid #BAE6FD',
                    padding: '6px 12px', borderRadius: 20, flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 14 }}>✉️</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0369A1' }}>
                      {template?.name || 'Unknown template'}
                    </span>
                  </div>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Toggle value={rule.is_active} onChange={() => toggleActive(rule)} />
                    <span style={{ fontSize: 12, color: rule.is_active ? '#15803D' : '#9CA3AF', fontWeight: 500 }}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Edit */}
                  <button onClick={() => handleEdit(rule)} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer',
                  }}>Edit</button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rule.id)}
                    style={{
                      padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB',
                      background: '#fff', color: '#D1D5DB', cursor: 'pointer', transition: 'color .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                  >
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>

                {/* Trigger description */}
                {triggerInfo && (
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: '10px 0 0', paddingLeft: 2 }}>
                    {triggerInfo.desc}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? '#EE4D2D' : '#D1D5DB',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        display: 'block',
      }} />
    </button>
  )
}

function FlowStep({ icon, label, value, active }: { icon: string; label: string; value: string; active: boolean }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, margin: '0 auto 6px',
        background: active ? '#FFF1EE' : '#F3F4F6',
        border: `1.5px solid ${active ? '#EE4D2D' : '#E5E7EB'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, transition: 'all .2s',
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>
        {label}
      </p>
      <p style={{ fontSize: 12, fontWeight: 600, color: active ? '#EE4D2D' : '#9CA3AF', margin: 0 }}>
        {value}
      </p>
    </div>
  )
}

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const isSuccess = type === 'success'
  return (
    <div style={{
      background: isSuccess ? '#F0FDF4' : '#FEF2F2',
      border: `1px solid ${isSuccess ? '#BBF7D0' : '#FECACA'}`,
      color: isSuccess ? '#15803D' : '#B91C1C',
      padding: '11px 16px', borderRadius: 10, marginBottom: 16,
      fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {isSuccess
        ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {msg}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10,
}