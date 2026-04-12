'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  content: string
  created_at: string
}

interface FormState {
  name: string
  content: string
}

const EMPTY_FORM: FormState = { name: '', content: '' }

// ─── Template variables available ────────────────────────────────────────────

const VARIABLES = [
  { tag: '{{buyer_name}}',    label: 'Buyer Name' },
  { tag: '{{product}}',       label: 'Product' },
  { tag: '{{order_date}}',    label: 'Order Date' },
  { tag: '{{delivery_date}}', label: 'Delivery Date' },
  { tag: '{{shop_name}}',     label: 'Shop Name' },
]

const SAMPLE_DATA: Record<string, string> = {
  '{{buyer_name}}':    'Juan dela Cruz',
  '{{product}}':       'Wireless Earbuds',
  '{{order_date}}':    'Jan 15, 2025',
  '{{delivery_date}}': 'Jan 18, 2025',
  '{{shop_name}}':     'My Shopee Store',
}

function renderPreview(content: string): string {
  let result = content
  VARIABLES.forEach(v => { result = result.replaceAll(v.tag, SAMPLE_DATA[v.tag]) })
  return result
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TemplatesPage() {

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchTemplates() {
    setLoading(true)
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) notify(error.message, 'error')
    else setTemplates(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  // ── Notify ────────────────────────────────────────────────────────────────

  function notify(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
  }

  // ── Save (create or update) ───────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.content.trim()) {
      return notify('Template name and content are required.', 'error')
    }
    setSubmitting(true)

    if (editingId) {
      const { error } = await supabase
        .from('templates')
        .update({ name: form.name, content: form.content })
        .eq('id', editingId)
      if (error) { notify(error.message, 'error'); setSubmitting(false); return }
      notify('Template updated!', 'success')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { notify('Not logged in.', 'error'); setSubmitting(false); return }

      const { error } = await supabase
        .from('templates')
        .insert([{ name: form.name, content: form.content, user_id: user.id }])
      if (error) { notify(error.message, 'error'); setSubmitting(false); return }
      notify('Template created!', 'success')
    }

    setSubmitting(false)
    resetForm()
    fetchTemplates()
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function handleEdit(t: Template) {
    setEditingId(t.id)
    setForm({ name: t.name, content: t.content })
    setShowForm(true)
    setPreviewId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    const { error } = await supabase.from('templates').delete().eq('id', id)
    if (error) return notify(error.message, 'error')
    notify('Template deleted.', 'success')
    if (previewId === id) setPreviewId(null)
    fetchTemplates()
  }

  // ── Reset form ────────────────────────────────────────────────────────────

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  // ── Insert variable into textarea ─────────────────────────────────────────

  function insertVariable(tag: string) {
    setForm(f => ({ ...f, content: f.content + tag }))
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Templates</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
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
          New Template
        </button>
      </div>

      {/* ── Toasts ── */}
      {success && <Toast msg={success} type="success" />}
      {error && <Toast msg={error} type="error" />}

      {/* ── Form ── */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
          padding: 24, marginBottom: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 20px' }}>
            {editingId ? 'Edit Template' : 'New Template'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Template Name *</label>
              <input
                type="text"
                placeholder="e.g. Post-Delivery Thank You"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>

            {/* Variable chips */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Insert Variable</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {VARIABLES.map(v => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertVariable(v.tag)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, border: '1.5px solid #FED7AA',
                      background: '#FFF7ED', color: '#C2410C', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', transition: 'background .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFEDD5')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#FFF7ED')}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Message Content *</label>
              <textarea
                placeholder={`Hi {{buyer_name}}! Salamat sa iyong order ng {{product}}. Nag-deliver na kami noong {{delivery_date}}. Sana ay nagustuhan mo! 😊`}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                required
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0' }}>
                {form.content.length} characters
              </p>
            </div>

            {/* Live preview */}
            {form.content && (
              <div style={{
                background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10,
                padding: 14, marginBottom: 20,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                  Live Preview
                </p>
                <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {renderPreview(form.content)}
                </p>
              </div>
            )}

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
                {submitting ? 'Saving…' : editingId ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Templates List ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
          Loading templates…
        </div>
      ) : templates.length === 0 ? (
        <div style={{
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
          padding: 60, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✉️</div>
          <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 6px', fontSize: 15 }}>No templates yet</p>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
            Create your first message template to use in follow-up rules.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map(t => (
            <div key={t.id} style={{
              background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
              overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              {/* Card header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: '#FFF7ED',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="18" height="18" fill="none" stroke="#EE4D2D" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#111', fontSize: 15, margin: 0 }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>
                      {t.content.length} chars · Created {formatDate(t.created_at)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Preview toggle */}
                  <button
                    onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      border: '1.5px solid #E5E7EB', background: previewId === t.id ? '#F3F4F6' : '#fff',
                      color: '#374151', cursor: 'pointer',
                    }}
                  >
                    {previewId === t.id ? 'Hide' : 'Preview'}
                  </button>
                  {/* Edit */}
                  <button onClick={() => handleEdit(t)} style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer',
                  }}>Edit</button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(t.id)}
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
              </div>

              {/* Raw content snippet */}
              <div style={{
                padding: '0 20px 16px',
                fontSize: 13, color: '#6B7280', lineHeight: 1.55,
                borderTop: previewId === t.id ? '1px solid #F3F4F6' : undefined,
              }}>
                {previewId !== t.id && (
                  <p style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.content}
                  </p>
                )}
              </div>

              {/* Preview panel */}
              {previewId === t.id && (
                <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px', background: '#FAFAFA' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                    Preview (sample data)
                  </p>
                  {/* Message bubble */}
                  <div style={{
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
                    borderBottomLeftRadius: 4, padding: '12px 16px', maxWidth: 420,
                    fontSize: 14, lineHeight: 1.65, color: '#111', whiteSpace: 'pre-wrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}>
                    {renderPreview(t.content)}
                  </div>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '8px 0 0' }}>
                    Variables replaced with sample data for preview.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Styles / utils ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111',
  outline: 'none', background: '#fff', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return dateStr }
}