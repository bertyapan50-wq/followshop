'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Ilagay ang email at password.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Ilagay muna ang iyong email address.')
      return
    }
    setResetLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://followshopapp.com/reset-password',
    })
    setResetLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      forgotMode ? handleForgotPassword() : handleLogin()
    }
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

        /* ── Left Panel ── */
        .auth-left {
          background: #EE4D2D;
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 520px;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          margin-bottom: 36px;
        }
        .auth-logo-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: rgba(255,255,255,0.6);
        }
        .auth-logo-text {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: #fff;
        }
        .auth-left-heading {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          line-height: 1.25;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }
        .auth-left-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
        }
        .auth-stats {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 40px;
        }
        .auth-stat {
          background: rgba(255,255,255,0.12);
          border-radius: 12px;
          padding: 14px 16px;
        }
        .auth-stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.65);
          margin-bottom: 3px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .auth-stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          color: #fff;
        }

        /* ── Right Panel ── */
        .auth-right {
          background: #fff;
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .auth-form-heading {
          font-size: 22px;
          font-weight: 700;
          color: #111;
          margin-bottom: 4px;
        }
        .auth-form-sub {
          font-size: 14px;
          color: #888;
          margin-bottom: 32px;
        }
        .auth-field {
          margin-bottom: 16px;
        }
        .auth-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
          letter-spacing: 0.02em;
        }
        .auth-input {
          width: 100%;
          padding: 11px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #111;
          outline: none;
          transition: border-color .15s;
          background: #fff;
        }
        .auth-input:focus { border-color: #EE4D2D; }
        .auth-input::placeholder { color: #C4C9D4; }

        .auth-error {
          background: #FFF0ED;
          border: 1px solid #FECACA;
          color: #B91C1C;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .auth-success {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          color: #15803D;
          padding: 14px 16px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
          line-height: 1.6;
        }
        .auth-success strong {
          display: block;
          font-size: 14px;
          margin-bottom: 3px;
        }

        .auth-btn {
          width: 100%;
          padding: 12px;
          background: #EE4D2D;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: opacity .15s, transform .15s;
          margin-top: 4px;
        }
        .auth-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .auth-forgot-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
          margin-bottom: 16px;
        }
        .auth-forgot-link {
          background: none;
          border: none;
          color: #EE4D2D;
          font-size: 12px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          padding: 0;
          text-decoration: none;
          transition: opacity .15s;
        }
        .auth-forgot-link:hover { opacity: 0.75; text-decoration: underline; }

        .auth-back-link {
          background: none;
          border: none;
          color: #888;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 24px;
          transition: color .15s;
        }
        .auth-back-link:hover { color: #111; }

        .auth-footer {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #888;
        }
        .auth-footer a {
          color: #EE4D2D;
          font-weight: 600;
          text-decoration: none;
        }
        .auth-footer a:hover { text-decoration: underline; }

        .auth-divider {
          height: 1px;
          background: #F3F4F6;
          margin: 24px 0;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .auth-card { grid-template-columns: 1fr; }
          .auth-left { min-height: auto; padding: 32px 28px; }
          .auth-stats { flex-direction: row; }
          .auth-stat { flex: 1; }
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
                I-automate ang<br />follow-up messages<br />sa iyong buyers
              </h2>
              <p className="auth-left-sub">
                Set once — automatic na ang tamang message sa tamang oras. Para sa mga Shopee sellers ng Pilipinas.
              </p>
            </div>
            <div className="auth-stats">
              <div className="auth-stat">
                <div className="auth-stat-label">Messages sent</div>
                <div className="auth-stat-value">2,847</div>
              </div>
              <div className="auth-stat">
                <div className="auth-stat-label">Active sellers</div>
                <div className="auth-stat-value">143</div>
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="auth-right">

            {/* ── FORGOT PASSWORD MODE ── */}
            {forgotMode ? (
              <>
                <button className="auth-back-link" onClick={() => { setForgotMode(false); setError(''); setResetSent(false) }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Bumalik sa login
                </button>

                <h1 className="auth-form-heading">Reset Password 🔑</h1>
                <p className="auth-form-sub">Ilagay ang iyong email — magpapadala kami ng reset link.</p>

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

                {resetSent ? (
                  <div className="auth-success">
                    <strong>✅ Na-send na ang reset link!</strong>
                    Tingnan ang iyong email ({email}) at i-click ang link para ma-reset ang password. Check din ang spam folder.
                  </div>
                ) : (
                  <>
                    <div className="auth-field">
                      <label className="auth-label">Email</label>
                      <input
                        className="auth-input"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="you@email.com"
                        autoFocus
                      />
                    </div>
                    <button className="auth-btn" onClick={handleForgotPassword} disabled={resetLoading}>
                      {resetLoading ? 'Nagpapadala…' : 'Magpadala ng Reset Link →'}
                    </button>
                  </>
                )}
              </>
            ) : (
              /* ── LOGIN MODE ── */
              <>
                <h1 className="auth-form-heading">Welcome back 👋</h1>
                <p className="auth-form-sub">Sign in sa iyong FollowShop account</p>

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
                  <label className="auth-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="you@email.com"
                  />
                </div>

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
                </div>

                {/* ── Forgot Password Link ── */}
                <div className="auth-forgot-row">
                  <button className="auth-forgot-link" onClick={() => { setForgotMode(true); setError('') }}>
                    Nakalimutan ang password?
                  </button>
                </div>

                <button className="auth-btn" onClick={handleLogin} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in →'}
                </button>

                <div className="auth-divider" />

                <div className="auth-footer">
                  Wala pang account?{' '}
                  <Link href="/signup">Mag-sign up — libre</Link>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}