'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Plan } from '@/types'

interface Stats {
  totalOrders: number
  delivered: number
  pending: number
  totalTemplates: number
  activeRules: number
  queuedMessages: number
}

interface QueuedMessage {
  id: string
  buyer_name: string
  message: string
  trigger: string
  scheduled_at: string
  status: 'pending' | 'sent' | 'failed'
  order_id: string
}

interface RecentOrder {
  id: string
  buyer_name: string
  product: string
  status: string
  order_date: string
}

const TRIGGER_LABELS: Record<string, string> = {
  delivered_1day:  '1 day after delivery',
  delivered_3days: '3 days after delivery',
  delivered_7days: '7 days after delivery',
  order_1day:      '1 day after order',
  order_3days:     '3 days after order',
  order_7days:     '7 days after order',
  no_review_7days: 'No review after 7 days',
  repeat_buyer:    'Repeat buyer',
}

// ── Free plan limits ──────────────────────────────────────────────────────────
const FREE_LIMITS = { rules: 1, templates: 3, orders: 30 }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0, delivered: 0, pending: 0,
    totalTemplates: 0, activeRules: 0, queuedMessages: 0,
  })
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [plan, setPlan] = useState<Plan>('free')
  const [bannerDismissed, setBannerDismissed] = useState(false)

  async function fetchDashboard() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const [ordersRes, templatesRes, rulesRes, queueRes, subRes] = await Promise.all([
      supabase.from('orders').select('id, buyer_name, product, status, order_date').order('created_at', { ascending: false }),
      supabase.from('templates').select('id'),
      supabase.from('rules').select('id, is_active'),
      supabase.from('message_queue').select('*').order('scheduled_at', { ascending: true }),
      user ? supabase.from('subscriptions').select('plan').eq('user_id', user.id).single() : Promise.resolve({ data: null }),
    ])

    const orders = ordersRes.data || []
    const templates = templatesRes.data || []
    const rules = rulesRes.data || []
    const queue = queueRes.data || []

    setPlan((subRes.data?.plan as Plan) || 'free')
    setStats({
      totalOrders: orders.length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      pending: orders.filter(o => o.status === 'pending').length,
      totalTemplates: templates.length,
      activeRules: rules.filter(r => r.is_active).length,
      queuedMessages: queue.filter(q => q.status === 'pending').length,
    })
    setQueuedMessages(queue.filter(q => q.status === 'pending').slice(0, 10))
    setRecentOrders(orders.slice(0, 5))
    setLoading(false)
  }

  useEffect(() => { fetchDashboard() }, [])

  async function markAsSent(id: string) {
    setMarkingId(id)
    await supabase.from('message_queue').update({ status: 'sent' }).eq('id', id)
    setMarkingId(null)
    setSuccess('Message marked as sent!')
    setTimeout(() => setSuccess(null), 3000)
    fetchDashboard()
  }

  // ── Compute limit warnings ────────────────────────────────────────────────
  const rulesUsedPct   = Math.min((stats.activeRules / FREE_LIMITS.rules) * 100, 100)
  const templatesUsedPct = Math.min((stats.totalTemplates / FREE_LIMITS.templates) * 100, 100)
  const ordersUsedPct  = Math.min((stats.totalOrders / FREE_LIMITS.orders) * 100, 100)
  const maxPct = Math.max(rulesUsedPct, templatesUsedPct, ordersUsedPct)

  const showUpgradeBanner = plan === 'free' && !bannerDismissed
  const isNearLimit = maxPct >= 60
  const isAtLimit   = maxPct >= 90

  if (loading) return (
    <div style={{ padding: 32, fontFamily: "'DM Sans', sans-serif", color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingTop: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      Loading dashboard…
    </div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .upgrade-banner { animation: slideDown .3s ease; }
        .limit-bar-track { height: 5px; border-radius: 5px; background: rgba(0,0,0,0.08); margin-top: 3px; overflow: hidden; }
        .limit-bar-fill { height: 100%; border-radius: 5px; transition: width .4s; }
        .danger-pulse { animation: pulse 1.5s ease infinite; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── FREE PLAN UPGRADE BANNER ── */}
      {showUpgradeBanner && (
        <div className="upgrade-banner" style={{
          marginBottom: 24,
          background: isAtLimit
            ? 'linear-gradient(135deg, #FEF2F2 0%, #FFF1EE 100%)'
            : isNearLimit
            ? 'linear-gradient(135deg, #FFFBEB 0%, #FFF7ED 100%)'
            : 'linear-gradient(135deg, #FFF1EE 0%, #FFF8F6 100%)',
          border: `1.5px solid ${isAtLimit ? '#FECACA' : isNearLimit ? '#FED7AA' : 'rgba(238,77,45,0.2)'}`,
          borderRadius: 14,
          padding: '18px 20px',
          position: 'relative',
        }}>
          {/* Dismiss button */}
          <button
            onClick={() => setBannerDismissed(true)}
            style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: 2 }}
          >×</button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>

            {/* Left: message */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{isAtLimit ? '🚨' : isNearLimit ? '⚠️' : '⚡'}</span>
                <p style={{
                  fontSize: 14, fontWeight: 700, margin: 0,
                  color: isAtLimit ? '#B91C1C' : isNearLimit ? '#92400E' : '#C2410C',
                }}>
                  {isAtLimit
                    ? 'You\'ve hit your free plan limit!'
                    : isNearLimit
                    ? 'You\'re close to your free plan limit!'
                    : 'You\'re on the Free plan — upgrade to unlock more!'}
                </p>
              </div>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 14px', lineHeight: 1.5 }}>
                {isAtLimit
                  ? 'Upgrade now to keep adding orders, rules, and templates — and unlock AI generation.'
                  : 'The Starter plan gives you 5 rules, 15 templates, 300 orders/month, all 8 triggers, and AI generation.'}
              </p>

              {/* Limit bars */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Rules', used: stats.activeRules, max: FREE_LIMITS.rules, pct: rulesUsedPct },
                  { label: 'Templates', used: stats.totalTemplates, max: FREE_LIMITS.templates, pct: templatesUsedPct },
                  { label: 'Orders', used: stats.totalOrders, max: FREE_LIMITS.orders, pct: ordersUsedPct },
                ].map(({ label, used, max, pct }) => (
                  <div key={label} style={{ minWidth: 100, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                      <span style={{ color: '#6B7280' }}>{label}</span>
                      <span style={{ color: pct >= 90 ? '#EF4444' : pct >= 60 ? '#F97316' : '#6B7280' }}>
                        {used}/{max}
                      </span>
                    </div>
                    <div className="limit-bar-track">
                      <div
                        className={`limit-bar-fill${pct >= 90 ? ' danger-pulse' : ''}`}
                        style={{
                          width: `${pct || 2}%`,
                          background: pct >= 90 ? '#EF4444' : pct >= 60 ? '#F97316' : '#EE4D2D',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, minWidth: 160 }}>
              <Link href="/pricing" style={{
                display: 'block', padding: '10px 20px',
                background: '#EE4D2D', color: '#fff', borderRadius: 10,
                fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center',
                boxShadow: '0 4px 14px rgba(238,77,45,0.3)',
              }}>
                Upgrade — starts at $9/mo
              </Link>
              <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
                ✅ 7-day free trial · No credit card
              </p>
              <Link href="/pricing" style={{ fontSize: 12, color: '#EE4D2D', fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                Compare plans →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {success && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '11px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          {success}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard icon="📦" label="Total Orders" value={stats.totalOrders} color="#EE4D2D" bg="#FFF1EE"
          warning={plan === 'free' && stats.totalOrders >= FREE_LIMITS.orders * 0.9}
          limit={plan === 'free' ? `${stats.totalOrders}/${FREE_LIMITS.orders}` : undefined}
        />
        <StatCard icon="✅" label="Delivered" value={stats.delivered} color="#15803D" bg="#F0FDF4" />
        <StatCard icon="⏳" label="Pending Orders" value={stats.pending} color="#C2410C" bg="#FFF7ED" />
        <StatCard icon="✉️" label="Templates" value={stats.totalTemplates} color="#0369A1" bg="#F0F9FF"
          warning={plan === 'free' && stats.totalTemplates >= FREE_LIMITS.templates * 0.9}
          limit={plan === 'free' ? `${stats.totalTemplates}/${FREE_LIMITS.templates}` : undefined}
        />
        <StatCard icon="⚡" label="Active Rules" value={stats.activeRules} color="#6D28D9" bg="#F5F3FF"
          warning={plan === 'free' && stats.activeRules >= FREE_LIMITS.rules}
          limit={plan === 'free' ? `${stats.activeRules}/${FREE_LIMITS.rules}` : undefined}
        />
        <StatCard icon="📬" label="Queued Messages" value={stats.queuedMessages} color="#B45309" bg="#FFFBEB"
          highlight={stats.queuedMessages > 0}
        />
      </div>

      {/* ── Main content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Pending Messages */}
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#111', margin: 0 }}>Pending Messages</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Messages ready to send</p>
            </div>
            {stats.queuedMessages > 0 && (
              <span style={{ background: '#EE4D2D', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                {stats.queuedMessages}
              </span>
            )}
          </div>
          {queuedMessages.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ fontWeight: 600, color: '#374151', fontSize: 14, margin: '0 0 4px' }}>No pending messages</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Messages will appear here when rules are triggered.</p>
            </div>
          ) : (
            <div>
              {queuedMessages.map((msg, i) => (
                <div key={msg.id} style={{ padding: '14px 20px', borderBottom: i < queuedMessages.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#111', margin: 0 }}>{msg.buyer_name}</p>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#C2410C', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '2px 7px', borderRadius: 10 }}>
                          {TRIGGER_LABELS[msg.trigger] || msg.trigger}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.message}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>Scheduled: {formatDate(msg.scheduled_at)}</p>
                    </div>
                    <button onClick={() => markAsSent(msg.id)} disabled={markingId === msg.id} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: markingId === msg.id ? '#F3F4F6' : '#EE4D2D', color: markingId === msg.id ? '#9CA3AF' : '#fff', fontSize: 12, fontWeight: 600, cursor: markingId === msg.id ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {markingId === msg.id ? '…' : 'Mark Sent'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#111', margin: 0 }}>Recent Orders</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>Last 5 orders</p>
            </div>
            <a href="/orders" style={{ fontSize: 13, color: '#EE4D2D', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
          </div>
          {recentOrders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              <p style={{ fontWeight: 600, color: '#374151', fontSize: 14, margin: '0 0 4px' }}>No orders yet</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}><a href="/orders" style={{ color: '#EE4D2D', fontWeight: 600 }}>Add your first order →</a></p>
            </div>
          ) : (
            <div>
              {recentOrders.map((order, i) => (
                <div key={order.id} style={{ padding: '14px 20px', borderBottom: i < recentOrders.length - 1 ? '1px solid #F9FAFB' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111', margin: 0 }}>{order.buyer_name}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.product}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <StatusDot status={order.status} />
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>{formatDate(order.order_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Setup Guide */}
      {stats.totalOrders === 0 && stats.totalTemplates === 0 && (
        <div style={{ marginTop: 20, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#111', margin: '0 0 16px' }}>🚀 Quick Setup Guide</p>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { step: '1', title: 'Add Orders',       desc: 'Import your Shopee orders via CSV or add manually.', href: '/orders',    cta: 'Go to Orders' },
              { step: '2', title: 'Create Templates', desc: 'Write follow-up message templates with variables.',  href: '/templates', cta: 'Go to Templates' },
              { step: '3', title: 'Set Rules',        desc: 'Define when to send which template automatically.',  href: '/rules',     cta: 'Go to Rules' },
            ].map(item => (
              <div key={item.step} style={{ flex: 1, padding: 16, borderRadius: 12, background: '#FAFAFA', border: '1px solid #F3F4F6' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EE4D2D', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{item.step}</div>
                <p style={{ fontWeight: 700, color: '#111', fontSize: 14, margin: '0 0 4px' }}>{item.title}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 12px', lineHeight: 1.5 }}>{item.desc}</p>
                <a href={item.href} style={{ fontSize: 13, fontWeight: 600, color: '#EE4D2D', textDecoration: 'none' }}>{item.cta} →</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, bg, highlight, warning, limit }: {
  icon: string; label: string; value: number; color: string; bg: string;
  highlight?: boolean; warning?: boolean; limit?: string
}) {
  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${warning ? '#FED7AA' : highlight ? color : '#E5E7EB'}`,
      borderRadius: 14, padding: '18px 20px',
      boxShadow: warning ? '0 0 0 3px #FFF7ED' : highlight ? `0 0 0 3px ${bg}` : '0 2px 8px rgba(0,0,0,0.03)',
      transition: 'all .2s', position: 'relative',
    }}>
      {warning && (
        <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 14 }}>⚠️</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <p style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500, margin: 0 }}>{label}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <p style={{ fontSize: 28, fontWeight: 700, color: warning ? '#F97316' : color, margin: 0, lineHeight: 1 }}>{value}</p>
        {limit && <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>/ {limit.split('/')[1]}</span>}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    pending:   { color: '#F97316', label: 'Pending' },
    delivered: { color: '#22C55E', label: 'Delivered' },
    cancelled: { color: '#EF4444', label: 'Cancelled' },
    returned:  { color: '#8B5CF6', label: 'Returned' },
  }
  const cfg = config[status] || { color: '#9CA3AF', label: status }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: cfg.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function formatDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return dateStr }
}