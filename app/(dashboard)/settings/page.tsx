'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [shopName, setShopName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('shop_name')
        .eq('id', user.id)
        .single()

      if (data?.shop_name) setShopName(data.shop_name)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in.'); setSaving(false); return }

    const { error } = await supabase
      .from('profiles')
      .update({ shop_name: shopName })
      .eq('id', user.id)

    setSaving(false)
    if (error) { setError(error.message); return }
    setSuccess('Settings saved!')
    setTimeout(() => setSuccess(null), 3000)
  }

  return (
   <div className="settings-wrap" style={{ padding: '32px', maxWidth: 600, margin: '0 auto', fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @media (max-width: 768px) {
          .settings-wrap { padding: 20px 16px !important; }
        }
        @media (max-width: 480px) {
          .settings-wrap { padding: 16px 12px !important; }
        }
      `}</style>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>Manage your shop preferences</p>
      </div>

      {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>✅ {success}</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>❌ {error}</div>}

      {loading ? (
        <div style={{ color: '#9CA3AF', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 20px' }}>Shop Information</h2>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Shop Name
              </label>
              <input
                type="text"
                placeholder="e.g. Ate Nene's Shop"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                style={{
                  width: '100%', padding: '9px 13px', borderRadius: 9,
                  border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111',
                  outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '5px 0 0' }}>
                Ito ang gagamitin sa AI-generated messages at templates.
              </p>
            </div>

            <button type="submit" disabled={saving} style={{
              padding: '9px 22px', borderRadius: 9, border: 'none',
              background: saving ? '#F87171' : '#EE4D2D', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}