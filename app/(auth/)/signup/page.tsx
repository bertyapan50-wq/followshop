'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 380 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#EE4D2D' }}>FollowShop</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Create your account</div>
        </div>
        {error && (
          <div style={{ background: '#fff0ed', color: '#EE4D2D', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }} />
        </div>
        <button onClick={handleSignup} disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#EE4D2D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
          May account na? <Link href="/login" style={{ color: '#EE4D2D' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}