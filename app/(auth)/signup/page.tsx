'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planFromUrl = searchParams.get('plan') // e.g. ?plan=starter

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSignup = async () => {
    setError('')

    // Client-side validation
    if (!email.trim()) return setError('Email is required.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')

    setLoading(true)

    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Pass plan in metadata so we can pick it up after onboarding
        data: { plan: planFromUrl || 'free' },
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // ✅ Redirect to onboarding instead of dashboard
    router.push('/onboarding')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSignup()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      padding: '24px 16px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        .signup-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          font-size: 14px;
          color: #111;
          outline: none;
          background: #fff;
          font-family: 'DM Sans', sans-serif;
          transition: border-color .15s;
        }
        .signup-input:focus { border-color: #EE4D2D; }

        .signup-btn {
          width: 100%;
          padding: 11px;
          background: #EE4D2D;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity .15s, transform .15s;
          box-shadow: 0 4px 16px rgba(238,77,45,0.25);
        }
        .signup-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .signup-btn:disabled { opacity: .65; cursor: not-allowed; transform: none; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EE4D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📬</div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#111' }}>FollowShop</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff',
          border: '1.5px solid #E5E7EB',
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 20, fontWeight: 800, color: '#111',
            margin: '0 0 4px',
          }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 24px' }}>
            Free to start · 7-day trial on paid plans
          </p>

          {/* Plan badge if coming from pricing */}
          {planFromUrl && (
            <div style={{
              background: '#FFF1EE', border: '1px solid #FECACA',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#C2410C', margin: 0 }}>
                You'll start with a 7-day free trial on the{' '}
                <strong style={{ textTransform: 'capitalize' }}>{planFromUrl}</strong> plan.
              </p>
            </div>
          )}

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

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              className="signup-input"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="signup-input"
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9CA3AF', fontSize: 13, padding: 2,
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="signup-input"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="new-password"
              style={{
                borderColor: confirmPassword && confirmPassword !== password ? '#FECACA' : undefined,
              }}
            />
            {confirmPassword && confirmPassword !== password && (
              <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0' }}>
                Passwords don't match
              </p>
            )}
          </div>

          <button
            className="signup-btn"
            onClick={handleSignup}
            disabled={loading || (!!confirmPassword && confirmPassword !== password)}
          >
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>

          {/* Trial note */}
          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '12px 0 0', lineHeight: 1.5 }}>
            ✅ No credit card required · Cancel anytime
          </p>
        </div>

        {/* Login link */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 20 }}>
          May account na?{' '}
          <Link href="/login" style={{ color: '#EE4D2D', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}