'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
      } else {
        setUserEmail(session.user.email || '')
        setLoading(false)
        // Fetch pending message count
        const { count } = await supabase
          .from('message_queue')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
        setPendingCount(count || 0)
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: (active: boolean) => (
        <svg width="16" height="16" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      href: '/orders',
      label: 'Orders',
      icon: (active: boolean) => (
        <svg width="16" height="16" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      ),
    },
    {
      href: '/rules',
      label: 'Rules',
      icon: (active: boolean) => (
        <svg width="16" height="16" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
    },
    {
      href: '/messages',
      label: 'Messages',
      badge: pendingCount,
      icon: (active: boolean) => (
        <svg width="16" height="16" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      href: '/templates',
      label: 'Templates',
      icon: (active: boolean) => (
        <svg width="16" height="16" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
  ]

  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?'

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F7F7F7', fontSize: 13, color: '#9CA3AF', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: '#EE4D2D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', fontSize: 16,
        }}>📬</div>
        Loading…
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 9px;
          text-decoration: none;
          margin-bottom: 2px;
          transition: background .15s;
          color: #6B7280;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
        }
        .sidebar-nav-item:hover {
          background: #F9FAFB;
          color: #374151;
        }
        .sidebar-nav-item.active {
          background: #FFF1EE;
          color: #EE4D2D;
        }
        .sidebar-logout {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 10px;
          border-radius: 9px;
          cursor: pointer;
          color: #9CA3AF;
          font-size: 13px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          background: none;
          border: none;
          width: 100%;
          transition: background .15s, color .15s;
        }
        .sidebar-logout:hover {
          background: #FFF1EE;
          color: #EE4D2D;
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 224, background: '#fff',
          borderRight: '1px solid #F3F4F6',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>

          {/* Logo */}
          <div style={{ padding: '18px 16px', borderBottom: '1px solid #F3F4F6' }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: '#EE4D2D',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
              }}>📬</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', fontFamily: "'Syne', sans-serif" }}>FollowShop</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>Seller Automation</div>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: '12px 10px' }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: '#9CA3AF',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              padding: '0 8px', marginBottom: 8,
            }}>Menu</p>

            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className={`sidebar-nav-item${active ? ' active' : ''}`}>
                  {item.icon(active)}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span style={{
                      background: '#EE4D2D', color: '#fff',
                      fontSize: 10, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 20,
                    }}>
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#EE4D2D', flexShrink: 0,
                    }} />
                  )}
                </Link>
              )
            })}
          </div>

          {/* User + Logout */}
          <div style={{ padding: '10px', borderTop: '1px solid #F3F4F6' }}>
            {/* User info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 9,
              background: '#F9FAFB', marginBottom: 4,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: '#FFF1EE', color: '#EE4D2D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {userInitial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: '#111',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  maxWidth: 130,
                }}>
                  {userEmail}
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF' }}>Free plan</div>
              </div>
            </div>

            {/* Logout */}
            <button className="sidebar-logout" onClick={handleLogout}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, background: '#F7F7F7', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </>
  )
}