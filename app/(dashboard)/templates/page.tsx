'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Template { id: string; name: string; content: string; created_at: string }
interface FormState { name: string; content: string }
type Plan = 'free' | 'starter' | 'pro'

const EMPTY_FORM: FormState = { name: '', content: '' }

const PLAN_LIMITS: Record<Plan, number> = {
  free: 3,
  starter: 15,
  pro: Infinity,
}

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
}

const VARIABLES = [
  { tag: '{{buyer_name}}', label: 'Buyer Name' },
  { tag: '{{product}}', label: 'Product' },
  { tag: '{{order_date}}', label: 'Order Date' },
  { tag: '{{delivery_date}}', label: 'Delivery Date' },
  { tag: '{{shop_name}}', label: 'Shop Name' },
]

const SAMPLE_DATA: Record<string, string> = {
  '{{buyer_name}}': 'Juan dela Cruz',
  '{{product}}': 'Wireless Earbuds',
  '{{order_date}}': 'Jan 15, 2025',
  '{{delivery_date}}': 'Jan 18, 2025',
  '{{shop_name}}': 'My Shopee Store',
}

function renderPreview(content: string): string {
  let result = content
  VARIABLES.forEach(v => { result = result.replaceAll(v.tag, SAMPLE_DATA[v.tag]) })
  return result
}

async function generateWithGemini(prompt: string, token: string): Promise<string> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Generation failed')
  return data.text || ''
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [aiTrigger, setAiTrigger] = useState('1 day after order')
  const [aiTone, setAiTone] = useState('friendly')
  const [aiLanguage, setAiLanguage] = useState('Taglish')
  const [aiShopName, setAiShopName] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('profiles').select('shop_name').eq('id', data.user.id).single()
        .then(({ data }) => { if (data?.shop_name) setAiShopName(data.shop_name) })
    })
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [templatesRes, subRes] = await Promise.all([
      supabase.from('templates').select('*').order('created_at', { ascending: false }),
      user ? supabase.from('subscriptions').select('plan').eq('user_id', user.id).single() : Promise.resolve({ data: null, error: null }),
    ])
    if (templatesRes.error) notify(templatesRes.error.message, 'error')
    else setTemplates(templatesRes.data || [])
    if (subRes.data?.plan) setPlan(subRes.data.plan as Plan)
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  // ── Limit check ───────────────────────────────────────────────────────────
  const limit = PLAN_LIMITS[plan]
  const isAtLimit = templates.length >= limit && plan !== 'pro'

  function notify(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
  }

  function handleNewTemplateClick() {
    if (isAtLimit && !editingId) {
      notify(`You've reached the ${PLAN_LABELS[plan]} plan limit (${limit} templates). Upgrade to add more.`, 'error')
      return
    }
    resetForm()
    setShowAI(false)
    setShowForm(v => !v)
  }

  function handleAIClick() {
    if (isAtLimit) {
      notify(`You've reached the ${PLAN_LABELS[plan]} plan limit (${limit} templates). Upgrade to add more.`, 'error')
      return
    }
    setShowAI(v => !v)
    setShowForm(false)
    setAiResult('')
  }

  async function handleGenerate() {
    setAiGenerating(true)
    setAiResult('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { notify('Not logged in.', 'error'); setAiGenerating(false); return }
      const shopInfo = aiShopName ? `The shop name is "${aiShopName}".` : ''
      const prompt = `You are a Shopee seller writing a follow-up message to a buyer.
${shopInfo}
Trigger: ${aiTrigger}
Tone: ${aiTone}
Language: ${aiLanguage} (mix of Tagalog and English if Taglish)
Write a short warm follow-up message (2-3 sentences max).
Use these variables exactly: {{buyer_name}}, {{product}}
Always write a complete sentence. Never cut off mid-sentence.
Return ONLY the message text, nothing else.`
      const result = await generateWithGemini(prompt, session.access_token)
      setAiResult(result)
    } catch {
      notify('AI generation failed. Try again.', 'error')
    }
    setAiGenerating(false)
  }

  function useAiResult() {
    const nameMap: Record<string, string> = {
      '1 day after order': '1 Day After Order',
      '3 days after order': '3 Days After Order',
      '7 days - review': '7 Days - Review Request',
      'after delivery': 'After Delivery',
      'custom': 'Custom Message',
    }
    setForm({ name: nameMap[aiTrigger] || aiTrigger, content: aiResult })
    setShowAI(false)
    setShowForm(true)
    setEditingId(null)
    setAiResult('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.content.trim()) return notify('Template name and content are required.', 'error')

    // Double-check limit on submit
    if (!editingId && isAtLimit) {
      return notify(`You've reached the ${PLAN_LABELS[plan]} plan limit of ${limit} templates. Upgrade to add more.`, 'error')
    }

    setSubmitting(true)
    if (editingId) {
      const { error } = await supabase.from('templates').update({ name: form.name, content: form.content }).eq('id', editingId)
      if (error) { notify(error.message, 'error'); setSubmitting(false); return }
      notify('Template updated!', 'success')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { notify('Not logged in.', 'error'); setSubmitting(false); return }
      const { error } = await supabase.from('templates').insert([{ name: form.name, content: form.content, user_id: user.id }])
      if (error) { notify(error.message, 'error'); setSubmitting(false); return }
      notify('Template created!', 'success')
    }
    setSubmitting(false)
    resetForm()
    fetchTemplates()
  }

  function handleEdit(t: Template) {
    setEditingId(t.id)
    setForm({ name: t.name, content: t.content })
    setShowForm(true)
    setShowAI(false)
    setPreviewId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    const { error } = await supabase.from('templates').delete().eq('id', id)
    if (error) return notify(error.message, 'error')
    notify('Template deleted.', 'success')
    if (previewId === id) setPreviewId(null)
    fetchTemplates()
  }

  function resetForm() { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false) }
  function insertVariable(tag: string) { setForm(f => ({ ...f, content: f.content + tag })) }

  return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Templates</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
            {templates.length} / {plan === 'pro' ? '∞' : limit} templates
            {plan !== 'pro' && (
              <span style={{ marginLeft: 8, fontSize: 12, color: isAtLimit ? '#EF4444' : '#9CA3AF', fontWeight: isAtLimit ? 700 : 400 }}>
                {isAtLimit ? '— limit reached' : `(${limit - templates.length} remaining)`}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleAIClick} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            background: isAtLimit ? '#F3F4F6' : showAI ? '#7C3AED' : '#EDE9FE',
            color: isAtLimit ? '#9CA3AF' : showAI ? '#fff' : '#7C3AED',
            border: isAtLimit ? '1.5px solid #E5E7EB' : 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {isAtLimit ? '🔒 Limit Reached' : '✨ Generate with AI'}
          </button>
          <button onClick={handleNewTemplateClick} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
            background: isAtLimit ? '#F3F4F6' : '#EE4D2D',
            color: isAtLimit ? '#9CA3AF' : '#fff',
            border: isAtLimit ? '1.5px solid #E5E7EB' : 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {isAtLimit ? '🔒 Limit Reached' : '+ New Template'}
          </button>
        </div>
      </div>

      {/* ── Plan Limit Banner ── */}
      {isAtLimit && (
        <div style={{
          background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF1EE 100%)',
          border: '1.5px solid #FED7AA', borderRadius: 14,
          padding: '18px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF1EE', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              🔒
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#C2410C', margin: '0 0 3px' }}>
                {PLAN_LABELS[plan]} plan limit reached — {limit} templates max
              </p>
              <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                Upgrade to {plan === 'free' ? 'Starter (15 templates)' : 'Pro (unlimited)'} to create more templates.
              </p>
            </div>
          </div>
          <Link href="/pricing" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 18px', background: '#EE4D2D', color: '#fff',
            border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            Upgrade Plan →
          </Link>
        </div>
      )}

      {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>✅ {success}</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>❌ {error}</div>}

      {/* ── AI Generator ── */}
      {showAI && !isAtLimit && (
        <div style={{ background: '#FAF5FF', border: '1.5px solid #DDD6FE', borderRadius: 14, padding: 24, marginBottom: 28, boxShadow: '0 4px 24px rgba(124,58,237,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#5B21B6', margin: 0 }}>AI Template Generator</h2>
              <p style={{ fontSize: 13, color: '#8B5CF6', margin: '2px 0 0' }}>Powered by Google Gemini</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', marginBottom: 16 }}>
            <div>
              <label style={{ ...labelStyle, color: '#5B21B6' }}>Trigger Type</label>
              <select value={aiTrigger} onChange={e => setAiTrigger(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="1 day after order">1 Day After Order</option>
                <option value="3 days after order">3 Days After Order</option>
                <option value="7 days - review">7 Days - Review Request</option>
                <option value="after delivery">After Delivery</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, color: '#5B21B6' }}>Tone</label>
              <select value={aiTone} onChange={e => setAiTone(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="friendly">Friendly 😊</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="excited">Excited 🎉</option>
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, color: '#5B21B6' }}>Language</label>
              <select value={aiLanguage} onChange={e => setAiLanguage(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="Taglish">Taglish 🇵🇭</option>
                <option value="Filipino">Filipino</option>
                <option value="English">English</option>
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, color: '#5B21B6' }}>Shop Name (optional)</label>
              <input type="text" placeholder="e.g. Ate Nene's Shop" value={aiShopName} onChange={e => setAiShopName(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button onClick={handleGenerate} disabled={aiGenerating} style={{
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: aiGenerating ? '#A78BFA' : '#7C3AED', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: aiGenerating ? 'not-allowed' : 'pointer',
          }}>
            {aiGenerating ? '✨ Generating…' : '✨ Generate Message'}
          </button>

          {aiResult && (
            <div style={{ marginTop: 16 }}>
              <label style={{ ...labelStyle, color: '#5B21B6' }}>Generated Message</label>
              <textarea value={aiResult} onChange={e => setAiResult(e.target.value)} rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, borderColor: '#DDD6FE' }} />
              <p style={{ fontSize: 12, color: '#8B5CF6', margin: '4px 0 12px' }}>Pwede mo pa i-edit bago i-save.</p>
              <div style={{ background: '#fff', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', margin: '0 0 8px' }}>Preview</p>
                <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.6 }}>{renderPreview(aiResult)}</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleGenerate} disabled={aiGenerating} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #DDD6FE', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#7C3AED' }}>
                  {aiGenerating ? 'Generating…' : 'Regenerate'}
                </button>
                <button onClick={useAiResult} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Use This Template →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manual Form ── */}
      {showForm && !isAtLimit && (
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 24, marginBottom: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 20px' }}>{editingId ? 'Edit Template' : 'New Template'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Template Name *</label>
              <input type="text" placeholder="e.g. Post-Delivery Thank You" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Insert Variable</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                {VARIABLES.map(v => (
                  <button key={v.tag} type="button" onClick={() => insertVariable(v.tag)} style={{ padding: '5px 12px', borderRadius: 20, border: '1.5px solid #FED7AA', background: '#FFF7ED', color: '#C2410C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{v.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Message Content *</label>
              <textarea placeholder="Hi {{buyer_name}}! Salamat sa iyong order ng {{product}}..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0' }}>{form.content.length} characters</p>
            </div>
            {form.content && (
              <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 8px' }}>Live Preview</p>
                <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{renderPreview(form.content)}</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={resetForm} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: submitting ? '#F87171' : '#EE4D2D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Saving…' : editingId ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Templates List ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Loading templates…</div>
      ) : templates.length === 0 ? (
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✉️</div>
          <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No templates yet</p>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>Create manually or use AI to generate one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" fill="none" stroke="#EE4D2D" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#111', fontSize: 15, margin: 0 }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>{t.content.length} chars · {formatDate(t.created_at)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setPreviewId(previewId === t.id ? null : t.id)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1.5px solid #E5E7EB', background: previewId === t.id ? '#F3F4F6' : '#fff', color: '#374151', cursor: 'pointer' }}>{previewId === t.id ? 'Hide' : 'Preview'}</button>
                  <button onClick={() => handleEdit(t)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(t.id)} style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#D1D5DB', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
              <div style={{ padding: '0 20px 16px', fontSize: 13, color: '#6B7280' }}>
                {previewId !== t.id && <p style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.content}</p>}
              </div>
              {previewId === t.id && (
                <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 20px', background: '#FAFAFA' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 10px' }}>Preview (sample data)</p>
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, borderBottomLeftRadius: 4, padding: '12px 16px', maxWidth: 420, fontSize: 14, lineHeight: 1.65, color: '#111', whiteSpace: 'pre-wrap' }}>
                    {renderPreview(t.content)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111',
  outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return dateStr }
}