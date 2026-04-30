'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Plan } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [plan, setPlan] = useState<Plan>('free')
  const [usage, setUsage] = useState({ rules: 0, templates: 0, orders: 0 })
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
        return
      }
      setUserEmail(session.user.email || '')
      const uid = session.user.id

      const [
        { count: pendingMsgs },
        { data: sub },
        { count: rulesCount },
        { count: templatesCount },
        { count: ordersCount },
      ] = await Promise.all([
        supabase.from('message_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('subscriptions').select('plan').eq('user_id', uid).single(),
        supabase.from('rules').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('is_active', true),
        supabase.from('templates').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])

      setPendingCount(pendingMsgs || 0)
      setPlan((sub?.plan as Plan) || 'free')
      setUsage({
        rules:     rulesCount     || 0,
        templates: templatesCount || 0,
        orders:    ordersCount    || 0,
      })
      setLoading(false)
    })
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navItems = [
    {
      href: '/dashboard', label: 'Dashboard',
      icon: (active: boolean) => (
        <svg width="18" height="18" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      href: '/orders', label: 'Orders',
      icon: (active: boolean) => (
        <svg width="18" height="18" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      ),
    },
    {
      href: '/rules', label: 'Rules',
      icon: (active: boolean) => (
        <svg width="18" height="18" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
    },
    {
      href: '/messages', label: 'Messages', badge: pendingCount,
      icon: (active: boolean) => (
        <svg width="18" height="18" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      href: '/templates', label: 'Templates',
      icon: (active: boolean) => (
        <svg width="18" height="18" fill="none" stroke={active ? '#EE4D2D' : '#9CA3AF'} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
    },
  ]

  const planConfig: Record<Plan, { label: string; color: string; bg: string; dot: string }> = {
    free:    { label: 'Free plan',    color: '#6B7280', bg: '#F3F4F6',   dot: '#9CA3AF' },
    starter: { label: 'Starter plan', color: '#C2410C', bg: '#FFF7ED',   dot: '#F97316' },
    pro:     { label: 'Pro plan',     color: '#166534', bg: '#F0FDF4',   dot: '#22C55E' },
  }
  const pc = planConfig[plan] || planConfig.free
  const userInitial = userEmail ? userEmail[0].toUpperCase() : '?'
  const FREE_LIMITS = { rules: 1, templates: 3, orders: 30 }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F7F7F7', fontSize: 13, color: '#9CA3AF', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EE4D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 16 }}>📬</div>
        Loading…
      </div>
    </div>
  )

  // ── Shared upgrade card content ──────────────────────────────────────────────
  const UpgradeSection = () => (
    <>
      {plan === 'free' && (
        <div className="upgrade-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#111', margin: 0 }}>You're on Free</p>
          </div>
          {[
            { label: 'Rules', used: usage.rules, max: FREE_LIMITS.rules },
            { label: 'Templates', used: usage.templates, max: FREE_LIMITS.templates },
            { label: 'Orders/mo', used: usage.orders, max: FREE_LIMITS.orders },
          ].map(({ label, used, max }) => {
            const pct = Math.min((used / max) * 100, 100)
            const cls = pct >= 90 ? 'danger' : pct >= 60 ? 'warn' : ''
            return (
              <div key={label} style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
                  <span>{label}</span>
                  <span style={{ color: pct >= 90 ? '#EF4444' : '#9CA3AF' }}>{used}/{max}</span>
                </div>
                <div className="limit-bar-track">
                  <div className={`limit-bar-fill${cls ? ` ${cls}` : ''}`} style={{ width: `${pct || 3}%` }} />
                </div>
              </div>
            )
          })}
          <Link href="/pricing" className="upgrade-btn">
            Upgrade — 7-day free trial →
          </Link>
          <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>
            No credit card required
          </p>
        </div>
      )}
      {plan === 'starter' && (
        <div style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6', margin: '0 0 4px' }}>🚀 Upgrade to Pro</p>
          <p style={{ fontSize: 11, color: '#7C3AED', margin: '0 0 8px', lineHeight: 1.5 }}>
            Unlimited rules, unlimited AI + Priority support.
          </p>
          <Link href="/settings/billing" style={{ display: 'block', width: '100%', padding: '7px', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
            Upgrade to Pro →
          </Link>
        </div>
      )}
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }

        .sidebar-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 9px; text-decoration: none;
          margin-bottom: 2px; transition: background .15s;
          color: #6B7280; font-size: 13px; font-weight: 500;
          font-family: 'DM Sans', sans-serif;
        }
        .sidebar-nav-item:hover { background: #F9FAFB; color: #374151; }
        .sidebar-nav-item.active { background: #FFF1EE; color: #EE4D2D; }

        .sidebar-logout {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 10px; border-radius: 9px; cursor: pointer;
          color: #9CA3AF; font-size: 13px; font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          background: none; border: none; width: 100%;
          transition: background .15s, color .15s;
        }
        .sidebar-logout:hover { background: #FFF1EE; color: #EE4D2D; }

        .upgrade-card {
          background: linear-gradient(135deg, #FFF1EE 0%, #FFF7F5 100%);
          border: 1.5px solid rgba(238,77,45,0.25);
          border-radius: 12px; padding: 14px; margin-bottom: 10px;
        }
        .upgrade-btn {
          display: block; width: 100%; padding: 8px;
          background: #EE4D2D; color: #fff;
          border: none; border-radius: 8px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; text-decoration: none;
          text-align: center; margin-top: 10px;
          font-family: 'DM Sans', sans-serif;
          transition: opacity .15s;
        }
        .upgrade-btn:hover { opacity: .88; }
        .limit-bar-track {
          height: 4px; border-radius: 4px; background: #F3F4F6; margin-top: 4px; overflow: hidden;
        }
        .limit-bar-fill {
          height: 100%; border-radius: 4px; background: #EE4D2D; transition: width .3s;
        }
        .limit-bar-fill.warn   { background: #F97316; }
        .limit-bar-fill.danger { background: #EF4444; animation: pulse 1.5s ease infinite; }

        /* ── Mobile top header ─────────────────────────────── */
        .mobile-header {
          display: none;
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          height: 54px;
          background: #fff; border-bottom: 1px solid #F3F4F6;
          align-items: center; justify-content: space-between;
          padding: 0 16px;
        }

        /* ── Mobile bottom nav ─────────────────────────────── */
        .mobile-bottom-nav {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          height: 60px;
          background: #fff; border-top: 1px solid #F3F4F6;
          align-items: center; justify-content: space-around;
        }
        .mobile-nav-btn {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 6px 10px; border-radius: 10px;
          text-decoration: none; background: none; border: none;
          cursor: pointer; position: relative;
          font-family: 'DM Sans', sans-serif;
          transition: background .15s;
          flex: 1;
        }
        .mobile-nav-btn:hover { background: #F9FAFB; }
        .mobile-nav-btn span {
          font-size: 9px; font-weight: 600; color: #9CA3AF;
        }
        .mobile-nav-btn.active span { color: #EE4D2D; }

        /* ── Drawer overlay ────────────────────────────────── */
        .drawer-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.4);
          animation: fadeIn .2s ease;
        }
        .drawer {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 101;
          width: 280px; background: #fff;
          display: flex; flex-direction: column;
          animation: slideIn .25s ease;
          overflow-y: auto;
        }

        /* ── Hamburger button ──────────────────────────────── */
        .hamburger {
          width: 36px; height: 36px; border-radius: 9px;
          background: #F9FAFB; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .hamburger:hover { background: #FFF1EE; }

        /* ── Responsive breakpoints ────────────────────────── */
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header   { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
          .main-content    { padding-top: 54px !important; padding-bottom: 60px !important; }
        }
        @media (min-width: 768px) {
          .mobile-header     { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
          .drawer-overlay, .drawer { display: none !important; }
        }
      `}</style>

      {/* ── Mobile: Top Header ───────────────────────────────────────── */}
      <header className="mobile-header">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EE4D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📬</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111', fontFamily: "'Syne', sans-serif" }}>FollowShop</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Plan badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: pc.bg, borderRadius: 20, padding: '3px 8px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot, display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: pc.color, fontFamily: "'DM Sans', sans-serif" }}>{pc.label}</span>
          </div>
          {/* Hamburger → opens drawer */}
          <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <svg width="16" height="16" fill="none" stroke="#374151" strokeWidth="2.2" viewBox="0 0 24 24">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile: Slide-out Drawer ──────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer">
            {/* Drawer header */}
            <div style={{ padding: '16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EE4D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📬</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111', fontFamily: "'Syne', sans-serif" }}>FollowShop</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>Seller Automation</div>
                </div>
              </Link>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="14" height="14" fill="none" stroke="#374151" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Drawer nav */}
            <div style={{ padding: '12px 10px 0' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>Menu</p>
              {navItems.map(item => {
                const active = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} className={`sidebar-nav-item${active ? ' active' : ''}`}>
                    {item.icon(active)}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span style={{ background: '#EE4D2D', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>{item.badge}</span>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Drawer upgrade */}
            <div style={{ padding: '10px' }}>
              <UpgradeSection />
            </div>

            <div style={{ flex: 1 }} />

            {/* Drawer user + logout */}
            <div style={{ padding: '10px', borderTop: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 9, background: '#F9FAFB', marginBottom: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: pc.bg, color: pc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {userInitial}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userEmail}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, color: pc.color, fontWeight: 600 }}>{pc.label}</span>
                  </div>
                </div>
              </div>
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
        </>
      )}

      {/* ── Desktop layout ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

        {/* Desktop Sidebar */}
        <div className="desktop-sidebar" style={{ width: 224, background: '#fff', borderRight: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>

          {/* Logo */}
          <div style={{ padding: '18px 16px', borderBottom: '1px solid #F3F4F6' }}>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EE4D2D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>📬</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111', fontFamily: "'Syne', sans-serif" }}>FollowShop</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>Seller Automation</div>
              </div>
            </Link>
          </div>

          {/* Nav */}
          <div style={{ padding: '12px 10px 0' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>Menu</p>
            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link key={item.href} href={item.href} className={`sidebar-nav-item${active ? ' active' : ''}`}>
                  {item.icon(active)}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span style={{ background: '#EE4D2D', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20 }}>
                      {item.badge}
                    </span>
                  )}
                  {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EE4D2D', flexShrink: 0 }} />}
                </Link>
              )
            })}
          </div>

          {/* Upgrade card */}
          <div style={{ padding: '10px 10px 0' }}>
            <UpgradeSection />
          </div>

          <div style={{ flex: 1 }} />

          {/* User + Logout */}
          <div style={{ padding: '10px', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 9, background: '#F9FAFB', marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: pc.bg, color: pc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {userInitial}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                  {userEmail}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot, display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: pc.color, fontWeight: 600 }}>{pc.label}</span>
                </div>
              </div>
            </div>
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

        {/* Main content */}
        <div className="main-content" style={{ flex: 1, background: '#F7F7F7', overflowY: 'auto', minWidth: 0 }}>
          {children}
        </div>
      </div>

      {/* ── Mobile: Bottom Nav ────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-btn${active ? ' active' : ''}`}
            >
              <div style={{ position: 'relative' }}>
                {item.icon(active)}
                {item.badge && item.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    background: '#EE4D2D', color: '#fff',
                    fontSize: 9, fontWeight: 700,
                    padding: '1px 4px', borderRadius: 20,
                    lineHeight: 1.4,
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
              {active && (
                <span style={{ position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: '50%', background: '#EE4D2D' }} />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}