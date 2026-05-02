'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Default content ──────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE = {
  name: 'Post-Delivery Thank You',
  content: `Hi {{buyer_name}}! 😊 Salamat sa iyong order ng {{product}} mula sa {{shop_name}}! Umaasa kami na nai-deliver na ito sa iyo nang maayos. Kung may tanong ka, huwag kang mag-atubiling mag-message sa amin. Mag-iwan ka rin ng review kung satisfied ka — malaking tulong iyon sa amin! ❤️`,
}

const DEFAULT_RULE_TRIGGER = 'delivered_3days'
const DEFAULT_RULE_TRIGGER_LABEL = '3 days after delivery'

const PLATFORMS = [
  { value: 'shopee',    label: 'Shopee',     emoji: '🛒' },
  { value: 'lazada',   label: 'Lazada',     emoji: '📦' },
  { value: 'tiktok',   label: 'TikTok Shop', emoji: '🎵' },
  { value: 'multiple', label: 'Multiple',   emoji: '🌐' },
]

const STEPS = ['Shop Info', 'Default Template', 'Default Rule']

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [shopName, setShopName] = useState('')
  const [platform, setPlatform] = useState('shopee')
  const [templateName, setTemplateName] = useState(DEFAULT_TEMPLATE.name)
  const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUserId(session.user.id)

      // If already onboarded, skip to dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded')
        .eq('id', session.user.id)
        .single()

      if (profile?.onboarded) {
        router.replace('/dashboard')
        return
      }
      setCheckingAuth(false)
    })
  }, [])

  

  // ── Live preview ────────────────────────────────────────────────────────────
  const preview = templateContent
    .replace(/{{buyer_name}}/g, 'Juan dela Cruz')
    .replace(/{{product}}/g, 'Wireless Earbuds')
    .replace(/{{shop_name}}/g, shopName.trim() || 'My Shop')
    .replace(/{{order_date}}/g, 'Jan 15, 2025')
    .replace(/{{delivery_date}}/g, 'Jan 18, 2025')

  // ── Final submit ────────────────────────────────────────────────────────────
  async function handleFinish() {
    if (!userId) return
    setSaving(true)
    setError(null)

    try {
      // 1. Upsert profile with shop name + platform + onboarded flag
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          shop_name: shopName.trim() || null,
          platform,
          onboarded: true,
          updated_at: new Date().toISOString(),
        })
      if (profileError) throw profileError

      // 2. Create default template
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .insert([{
          user_id: userId,
          name: templateName.trim() || DEFAULT_TEMPLATE.name,
          content: templateContent.trim(),
        }])
        .select('id')
        .single()
      if (templateError) throw templateError

      // 3. Create default rule using the template
      const { error: ruleError } = await supabase
        .from('rules')
        .insert([{
          user_id: userId,
          trigger: DEFAULT_RULE_TRIGGER,
          message_template: template.id,
          is_active: true,
        }])
      if (ruleError) throw ruleError

      // Done — go to dashboard
      router.replace('/dashboard?welcome=1')

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setError(msg)
      setSaving(false)
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#FAFAFA',
        fontFamily: "'DM Sans', sans-serif", color: '#9CA3AF', fontSize: 14,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
        Loading…
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAFA',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 16px 80px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .step-panel { animation: fadeUp .3s ease both; }

        .ob-input {
          width: 100%; padding: 10px 14px;
          border: 1.5px solid #E5E7EB; border-radius: 10px;
          font-size: 14px; color: #111; outline: none;
          background: #fff; font-family: 'DM Sans', sans-serif;
          transition: border-color .15s;
        }
        .ob-input:focus { border-color: #EE4D2D; }

        .ob-textarea {
          width: 100%; padding: 10px 14px;
          border: 1.5px solid #E5E7EB; border-radius: 10px;
          font-size: 13px; color: #111; outline: none;
          background: #fff; font-family: 'DM Sans', sans-serif;
          resize: vertical; line-height: 1.65;
          transition: border-color .15s;
        }
        .ob-textarea:focus { border-color: #EE4D2D; }

        .platform-btn {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; padding: 14px 10px; border-radius: 12px;
          border: 1.5px solid #E5E7EB; background: #fff;
          cursor: pointer; transition: all .15s; flex: 1; min-width: 0;
        }
        .platform-btn.active {
          border-color: #EE4D2D; background: #FFF1EE;
        }
        .platform-btn:hover:not(.active) { border-color: #D1D5DB; }

        .next-btn {
          width: 100%; padding: 12px; border-radius: 10px;
          background: #EE4D2D; color: #fff; border: none;
          font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity .15s, transform .15s;
        }
        .next-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .next-btn:disabled { opacity: .6; cursor: not-allowed; }

        .back-btn {
          background: none; border: none; cursor: pointer;
          font-size: 13px; color: #9CA3AF; font-family: 'DM Sans', sans-serif;
          padding: 8px 0; transition: color .15s;
        }
        .back-btn:hover { color: #374151; }

        .var-chip {
          padding: 4px 10px; border-radius: 20px;
          border: 1.5px solid #FED7AA; background: #FFF7ED;
          color: #C2410C; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all .15s; white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }
        .var-chip:hover { background: #FFEDD5; }

        @media (max-width: 480px) {
          .platform-btn { padding: 10px 6px; }
        }
      `}</style>

      {/* ── Logo ── */}
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EE4D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📬</div>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#111' }}>FollowShop</span>
      </a>

      {/* ── Card ── */}
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#fff', border: '1.5px solid #E5E7EB',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
      }}>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#F3F4F6' }}>
          <div style={{
            height: '100%', background: '#EE4D2D',
            width: `${((step + 1) / STEPS.length) * 100}%`,
            transition: 'width .4s ease', borderRadius: '0 2px 2px 0',
          }} />
        </div>

        {/* Step indicator */}
        <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: i < step ? '#EE4D2D' : i === step ? '#EE4D2D' : '#F3F4F6',
                  color: i <= step ? '#fff' : '#9CA3AF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  transition: 'all .3s',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: i === step ? 700 : 400,
                  color: i === step ? '#111' : '#9CA3AF',
                  display: window && window.innerWidth < 400 ? 'none' : 'block',
                }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 20, height: 1, background: '#E5E7EB' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '24px 28px 28px' }}>

          {/* ── STEP 0: Shop Info ── */}
          {step === 0 && (
            <div className="step-panel">
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>
                Welcome to FollowShop 👋
              </h1>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
                Setup lang to ng 2 minuto — tapos automatic na ang lahat.
              </p>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Shop Name <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  className="ob-input"
                  placeholder="e.g. Ate Nene's Shop"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  autoFocus
                />
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0' }}>
                  Gagamitin sa <code style={{ background: '#FFF7ED', color: '#C2410C', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>{'{{shop_name}}'}</code> variable sa iyong messages.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>
                  Primary Platform
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PLATFORMS.map(p => (
                    <button
                      key={p.value}
                      className={`platform-btn${platform === p.value ? ' active' : ''}`}
                      onClick={() => setPlatform(p.value)}
                    >
                      <span style={{ fontSize: 22 }}>{p.emoji}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: platform === p.value ? '#EE4D2D' : '#6B7280',
                      }}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button className="next-btn" onClick={() => setStep(1)}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 1: Default Template ── */}
          {step === 1 && (
            <div className="step-panel">
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>
                Your first template ✉️
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.6 }}>
                Gawa na kami ng sample — i-edit mo kung gusto mo bago i-save.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Template Name
                </label>
                <input
                  type="text"
                  className="ob-input"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                />
              </div>

              {/* Variable chips */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>
                  Insert variable
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['{{buyer_name}}', '{{product}}', '{{shop_name}}', '{{delivery_date}}'].map(v => (
                    <button
                      key={v}
                      className="var-chip"
                      onClick={() => setTemplateContent(c => c + v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Message Content
                </label>
                <textarea
                  className="ob-textarea"
                  rows={5}
                  value={templateContent}
                  onChange={e => setTemplateContent(e.target.value)}
                />
              </div>

              {/* Live preview */}
              <div style={{
                background: '#F8FAFC', border: '1.5px solid #E2E8F0',
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.06em' }}>
                  Preview
                </p>
                <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {preview}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="next-btn"
                  onClick={() => setStep(2)}
                  disabled={!templateContent.trim() || !templateName.trim()}
                >
                  Looks good! Continue →
                </button>
                <button className="back-btn" onClick={() => setStep(0)}>← Back</button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Default Rule ── */}
          {step === 2 && (
            <div className="step-panel">
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>
                Your first rule ⚡
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.6 }}>
                Ito ang magsisimula ng automation mo. Pwede mo palaging baguhin later.
              </p>

              {/* Rule visualization */}
              <div style={{
                background: '#FAFAFA', border: '1.5px solid #E5E7EB',
                borderRadius: 14, padding: '20px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Trigger */}
                  <div style={{
                    flex: 1, minWidth: 120,
                    background: '#FFF7ED', border: '1px solid #FED7AA',
                    borderRadius: 12, padding: '14px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📦</div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '0.05em' }}>Trigger</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#C2410C', margin: 0 }}>{DEFAULT_RULE_TRIGGER_LABEL}</p>
                  </div>

                  {/* Arrow */}
                  <svg width="20" height="20" fill="none" stroke="#D1D5DB" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>

                  {/* Template */}
                  <div style={{
                    flex: 1, minWidth: 120,
                    background: '#F0F9FF', border: '1px solid #BAE6FD',
                    borderRadius: 12, padding: '14px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>✉️</div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '0.05em' }}>Template</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0369A1', margin: 0 }}>{templateName || DEFAULT_TEMPLATE.name}</p>
                  </div>

                  {/* Arrow */}
                  <svg width="20" height="20" fill="none" stroke="#D1D5DB" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>

                  {/* Result */}
                  <div style={{
                    flex: 1, minWidth: 120,
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                    borderRadius: 12, padding: '14px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📬</div>
                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px', letterSpacing: '0.05em' }}>Result</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#15803D', margin: 0 }}>Message Queued</p>
                  </div>
                </div>

                <div style={{ marginTop: 16, padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #F3F4F6' }}>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                    💡 3 days pagkatapos ma-deliver ang order, awtomatikong mag-ge-generate ng message para sa buyer. Ikaw na lang mag-copy-paste sa Shopee chat.
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  color: '#B91C1C', padding: '10px 14px',
                  borderRadius: 10, fontSize: 13, marginBottom: 16,
                }}>
                  ❌ {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  className="next-btn"
                  onClick={handleFinish}
                  disabled={saving}
                >
                  {saving ? '⏳ Setting up your account…' : '🚀 Finish Setup & Go to Dashboard'}
                </button>
                <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
              </div>

              <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: '12px 0 0' }}>
                Pwede mong i-edit o dagdagan ng rules anytime sa dashboard.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Step label below card */}
      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>
    </div>
  )
}