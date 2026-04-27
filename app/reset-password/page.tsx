'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    // Supabase automatically handles the token from the URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
      }
      setChecking(false)
    })

    // Fallback: check if there's already a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
        setChecking(false)
      }
    })
  }, [])

  const handleReset = async () => {
    setError('')

    if (!password || !confirm) {
      setError('Punan ang lahat ng fields.')
      return
    }
    if (password.length < 6) {
      setError('Ang password ay dapat hindi bababa sa 6 na characters.')
      return
    }
    if (password !== confirm) {
      setError('Hindi magkapareho ang mga password. Subukan ulit.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 3000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleReset()
  }

  const strength = (() => {
    if (password.length === 0) return null
    if (password.length < 6) return 'weak'
    if (password.length < 10) return 'medium'
    return 'strong'
  })()

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
        .auth-tips {
          display: flex; flex-direction: column; gap: 10px; margin-top: 40px;
        }
        .auth-tip {
          background: rgba(255,255,255,0.12);
          border-radius: 12px; padding: 13px 16px;
          display: flex; align-items: flex-start; gap: 10px;
        }
        .auth-tip-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
        .auth-tip-text { font-size: 13px; color: rgba(255,255,255,0.85); line-height: 1.5; }

        /* ── Right Panel ── */
        .auth-right {
          background: #fff; padding: 44px 40px;
          display: flex; flex-direction: column; justify-content: center;
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
        .auth-input-wrap { position: relative; }
        .auth-input {
          width: 100%; padding: 11px 40px 11px 14px;
          border: 1.5px solid #E5E7EB; border-radius: 10px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          color: #111; outline: none; transition: border-color .15s; background: #fff;
        }
        .auth-input:focus { border-color: #EE4D2D; }
        .auth-input::placeholder { color: #C4C9D4; }
        .auth-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #9CA3AF;
          display: flex; align-items: center; padding: 0;
          transition: color .15s;
        }
        .auth-eye:hover { color: #EE4D2D; }

        /* Password strength */
        .strength-bar {
          display: flex; gap: 4px; margin-top: 8px;
        }
        .strength-seg {
          height: 3px; flex: 1; border-radius: 2px; background: #E5E7EB;
          transition: background .3s;
        }
        .strength-label {
          font-size: 11px; margin-top: 4px; font-weight: 600;
        }
        .weak .strength-seg:nth-child(1) { background: #EF4444; }
        .medium .strength-seg:nth-child(1),
        .medium .strength-seg:nth-child(2) { background: #F59E0B; }
        .strong .strength-seg { background: #22C55E; }
        .weak .strength-label { color: #EF4444; }
        .medium .strength-label { color: #F59E0B; }
        .strong .strength-label { color: #22C55E; }

        .auth-error {
          background: #FFF0ED; border: 1px solid #FECACA;
          color: #B91C1C; padding: 10px 14px; border-radius: 10px;
          font-size: 13px; margin-bottom: 16px;
          display: flex; align-items: center; gap: 7px;
        }
        .auth-success {
          background: #F0FDF4; border: 1px solid #BBF7D0;
          color: #15803D; padding: 20px 18px; border-radius: 12px;
          font-size: 14px; line-height: 1.65; text-align: center;
        }
        .auth-success-icon { font-size: 36px; margin-bottom: 10px; }
        .auth-success strong { display: block; font-size: 16px; margin-bottom: 6px; }

        .auth-btn {
          width: 100%; padding: 12px;
          background: #EE4D2D; color: #fff; border: none;
          border-radius: 10px; font-size: 15px; font-weight: 700;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          transition: opacity .15s, transform .15s; margin-top: 4px;
        }
        .auth-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .auth-invalid {
          text-align: center; padding: 32px 0;
        }
        .auth-invalid-icon { font-size: 40px; margin-bottom: 12px; }
        .auth-invalid h2 {
          font-size: 18px; font-weight: 700; color: #111; margin-bottom: 8px;
        }
        .auth-invalid p { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 20px; }
        .auth-link {
          color: #EE4D2D; font-weight: 600; font-size: 14px; text-decoration: none;
        }
        .auth-link:hover { text-decoration: underline; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .auth-card { grid-template-columns: 1fr; }
          .auth-left { min-height: auto; padding: 32px 28px; }
          .auth-tips { flex-direction: row; flex-wrap: wrap; }
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
                Ligtas ang iyong<br />account sa amin
              </h2>
              <p className="auth-left-sub">
                Gumawa ng malakas na password para maprotektahan ang iyong shop data at mga buyers.
              </p>
            </div>
            <div className="auth-tips">
              <div className="auth-tip">
                <span className="auth-tip-icon">🔒</span>
                <span className="auth-tip-text">Gumamit ng hindi bababa sa 8 characters</span>
              </div>
              <div className="auth-tip">
                <span className="auth-tip-icon">🔡</span>
                <span className="auth-tip-text">Pagsamahin ang letters, numbers, at symbols</span>
              </div>
              <div className="auth-tip">
                <span className="auth-tip-icon">🚫</span>
                <span className="auth-tip-text">Huwag gamitin ang iyong pangalan o birthday</span>
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="auth-right">
            {checking ? (
              <div style={{ textAlign: 'center', color: '#888', fontSize: 14 }}>
                Checking reset link…
              </div>
            ) : success ? (
              <div className="auth-success">
                <div className="auth-success-icon">🎉</div>
                <strong>Na-reset na ang password!</strong>
                Ikaw ay nire-redirect sa dashboard in 3 seconds…
                <br /><br />
                <a href="/dashboard" className="auth-link">Pumunta na sa Dashboard →</a>
              </div>
            ) : !validSession ? (
              <div className="auth-invalid">
                <div className="auth-invalid-icon">⚠️</div>
                <h2>Invalid o Expired na Link</h2>
                <p>Ang reset link na ito ay hindi na valid. Maaaring expired na o nagamit na.</p>
                <a href="/login" className="auth-link">← Bumalik sa Login at mag-request ng bago</a>
              </div>
            ) : (
              <>
                <h1 className="auth-form-heading">Gumawa ng Bagong Password 🔑</h1>
                <p className="auth-form-sub">Piliin ang malakas na password para sa iyong account.</p>

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
                  <label className="auth-label">Bagong Password</label>
                  <div className="auth-input-wrap">
                    <input
                      className="auth-input"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                      autoFocus
                    />
                    <button className="auth-eye" onClick={() => setShowPass(p => !p)} type="button">
                      {showPass ? (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {strength && (
                    <div className={strength}>
                      <div className="strength-bar">
                        <div className="strength-seg"/>
                        <div className="strength-seg"/>
                        <div className="strength-seg"/>
                      </div>
                      <div className="strength-label">
                        {strength === 'weak' ? '⚠️ Mahina' : strength === 'medium' ? '👍 Katamtaman' : '✅ Malakas'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="auth-field">
                  <label className="auth-label">Ulitin ang Password</label>
                  <div className="auth-input-wrap">
                    <input
                      className="auth-input"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                    />
                    <button className="auth-eye" onClick={() => setShowConfirm(p => !p)} type="button">
                      {showConfirm ? (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {confirm && password && (
                    <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600, color: confirm === password ? '#22C55E' : '#EF4444' }}>
                      {confirm === password ? '✅ Magkapareho ang passwords' : '❌ Hindi magkapareho'}
                    </div>
                  )}
                </div>

                <button className="auth-btn" onClick={handleReset} disabled={loading}>
                  {loading ? 'Sine-save…' : 'I-save ang Bagong Password →'}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}