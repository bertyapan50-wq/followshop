'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setLoading(true)
    setError('')

    if (password.length < 8) {
  setError('Password must be at least 8 characters.')
  setLoading(false)
  return
}
if (!/[A-Z]/.test(password)) {
  setError('Password must contain at least one uppercase letter.')
  setLoading(false)
  return
}
if (!/[0-9]/.test(password)) {
  setError('Password must contain at least one number.')
  setLoading(false)
  return
}

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      window.location.href = '/dashboard'
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSignup()
  }

  // ── Email confirmation screen ──
  if (success) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'DM Sans', sans-serif; }
        `}</style>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#F7F7F7', padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '48px 40px',
            maxWidth: 420, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: '#FFF0ED', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px', fontSize: 28,
            }}>📧</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: '#111', marginBottom: 10 }}>
              Check your email!
            </h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65, marginBottom: 8 }}>
              Nagpadala kami ng confirmation link sa
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 24 }}>
              {email}
            </p>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.65, marginBottom: 28 }}>
              I-click ang link para ma-activate ang iyong account. Check din ang spam folder kung hindi mo makita.
            </p>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#EE4D2D', fontSize: 14, fontWeight: 600, textDecoration: 'none',
            }}>
              ← Bumalik sa Login
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }

        .auth-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F7F7F7;
          padding: 24px;
        }
        .auth-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          width: 100%;
          max-width: 860px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .auth-left {
          background: #EE4D2D;
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 560px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          margin-bottom: 36px;
        }
        .auth-logo-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: rgba(255,255,255,0.6);
        }
        .auth-logo-text {
          font-family: 'Syne', sans-serif;
          font-size: 18px; font-weight: 800; color: #fff;
        }
        .auth-left-heading {
          font-family: 'Syne', sans-serif;
          font-size: 26px; font-weight: 800; color: #fff;
          line-height: 1.25; margin-bottom: 12px; letter-spacing: -0.02em;
        }
        .auth-left-sub {
          font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.6;
        }
        .auth-checklist {
          display: flex; flex-direction: column; gap: 10px; margin-top: 36px;
        }
        .auth-check-item {
          display: flex; align-items: center; gap: 10px;
        }
        .auth-check-icon {
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .auth-check-text {
          font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 500;
        }
        .auth-right {
          background: #fff;
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .auth-form-heading {
          font-size: 22px; font-weight: 700; color: #111; margin-bottom: 4px;
        }
        .auth-form-sub {
          font-size: 14px; color: #888; margin-bottom: 32px;
        }
        .auth-field { margin-bottom: 16px; }
        .auth-label {
          display: block; font-size: 12px; font-weight: 600;
          color: #374151; margin-bottom: 6px; letter-spacing: 0.02em;
        }
        .auth-input {
          width: 100%; padding: 11px 14px;
          border: 1.5px solid #E5E7EB; border-radius: 10px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          color: #111; outline: none; transition: border-color .15s; background: #fff;
        }
        .auth-input:focus { border-color: #EE4D2D; }
        .auth-input::placeholder { color: #C4C9D4; }
        .auth-hint {
          font-size: 11px; color: #9CA3AF; margin-top: 5px;
        }
        .auth-error {
          background: #FFF0ED; border: 1px solid #FECACA; color: #B91C1C;
          padding: 10px 14px; border-radius: 10px; font-size: 13px;
          margin-bottom: 16px; display: flex; align-items: center; gap: 7px;
        }
        .auth-btn {
          width: 100%; padding: 12px;
          background: #EE4D2D; color: #fff; border: none; border-radius: 10px;
          font-size: 15px; font-weight: 700; font-family: 'DM Sans', sans-serif;
          cursor: pointer; transition: opacity .15s, transform .15s; margin-top: 4px;
        }
        .auth-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .auth-free-badge {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: #F0FDF4; border: 1px solid #BBF7D0;
          border-radius: 8px; padding: 8px 14px; margin-bottom: 20px;
          font-size: 12px; font-weight: 600; color: #15803D;
        }
        .auth-divider {
          height: 1px; background: #F3F4F6; margin: 24px 0;
        }
        .auth-footer {
          text-align: center; font-size: 13px; color: #888;
        }
        .auth-footer a {
          color: #EE4D2D; font-weight: 600; text-decoration: none;
        }
        .auth-footer a:hover { text-decoration: underline; }

        @media (max-width: 640px) {
          .auth-card { grid-template-columns: 1fr; }
          .auth-left { min-height: auto; padding: 32px 28px; }
          .auth-right { padding: 32px 28px; }
        }
      `}</style>

      <div className="auth-wrapper">
        <div className="auth-card">

          {/* ── Left Panel ── */}
          <div className="auth-left">
            <div>
              <a href="/" className="auth-logo">
                <span className="auth-logo-dot"></span>
                <span className="auth-logo-text">FollowShop</span>
              </a>
              <h2 className="auth-left-heading">
                Libre. Walang<br />credit card.<br />Setup in 5 mins.
              </h2>
              <p className="auth-left-sub">
                Samahan ang mga Shopee sellers na nag-aautomate ng follow-up messages.
              </p>
            </div>
            <div className="auth-checklist">
              {[
                'Auto-generate follow-up messages',
                'Chrome Extension para sa Shopee',
                'Daily email reminders',
                'CSV import ng orders',
                'Custom message templates',
              ].map((item, i) => (
                <div className="auth-check-item" key={i}>
                  <div className="auth-check-icon">
                    <svg width="10" height="8" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 10 8">
                      <polyline points="1 4 3.5 6.5 9 1"/>
                    </svg>
                  </div>
                  <span className="auth-check-text">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="auth-right">
            <h1 className="auth-form-heading">Gumawa ng account 🎉</h1>
            <p className="auth-form-sub">I-automate na ang iyong Shopee follow-ups</p>

            <div className="auth-free-badge">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Libre — walang credit card needed
            </div>

            {error && (
              <div className="auth-error">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <div className="auth-field">
  <label className="auth-label">Password</label>
  <input
    className="auth-input"
    type="password"
    value={password}
    onChange={e => setPassword(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="••••••••"
  />

  {/* Strength indicator */}
  {password.length > 0 && (() => {
    const hasUpper = /[A-Z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasLength = password.length >= 8
    const score = [hasUpper, hasNumber, hasLength].filter(Boolean).length
    const levels = [
      { label: 'Weak', color: '#EF4444', width: '33%' },
      { label: 'Fair', color: '#F97316', width: '66%' },
      { label: 'Strong', color: '#22C55E', width: '100%' },
    ]
    const level = levels[score - 1] || levels[0]
    return (
      <div style={{ marginTop: 8 }}>
        {/* Bar */}
        <div style={{ height: 4, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: level.width, background: level.color, borderRadius: 4, transition: 'all .3s' }} />
        </div>
        {/* Requirements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[
            { label: 'At least 8 characters', met: hasLength },
            { label: 'One uppercase letter (A-Z)', met: hasUpper },
            { label: 'One number (0-9)', met: hasNumber },
          ].map(req => (
            <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: req.met ? '#22C55E' : '#9CA3AF', fontWeight: 600 }}>
                {req.met ? '✓' : '○'}
              </span>
              <span style={{ fontSize: 11, color: req.met ? '#374151' : '#9CA3AF' }}>
                {req.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  })()}
</div>

            <button className="auth-btn" onClick={handleSignup} disabled={loading}>
              {loading ? 'Creating account…' : 'Create account →'}
            </button>

            <div className="auth-divider" />

            <div className="auth-footer">
              May account na?{' '}
              <Link href="/login">Sign in</Link>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}