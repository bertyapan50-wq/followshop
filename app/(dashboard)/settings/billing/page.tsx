'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  detectCurrency,
  formatPrice,
  annualBilled,
  PRICES,
  CURRENCY_LABELS,
  type Currency,
} from '@/lib/currency'
import type { Subscription, Plan } from '@/types'

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setCurrency(detectCurrency())
    fetchSubscription()
  }, [])

  async function fetchSubscription() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setSubscription(data)
    setLoading(false)
  }

  // ── Upgrade / checkout ────────────────────────────────────────────────────

  async function handleUpgrade(plan: Exclude<Plan, 'free'>, billing: 'monthly' | 'annual') {
    setUpgrading(`${plan}_${billing}`)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          billing,
          currency,
          userId: user.id,
          userEmail: user.email,
        }),
      })

      if (!res.ok) throw new Error('Failed to create checkout')
      const { url } = await res.json()
      if (url) window.location.href = url

    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  // ── Manage portal (cancel, update card) ──────────────────────────────────

  async function openCustomerPortal() {
    try {
      const res = await fetch('/api/dodo/portal', { method: 'POST' })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      setError('Could not open billing portal. Please contact support.')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily: "'DM Sans', sans-serif", color: '#9CA3AF', textAlign: 'center', paddingTop: 80 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
        Loading billing info…
      </div>
    )
  }

  const currentPlan: Plan = subscription?.plan ?? 'free'
  const isActive = subscription?.status === 'active' || subscription?.status === 'on_trial'
  const isOnTrial = subscription?.status === 'on_trial'
  const isPHP = currency === 'PHP'

  return (
    <div style={{ padding: '32px', maxWidth: 760, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Billing</h1>
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: '4px 0 0' }}>
            Manage your plan and subscription
          </p>
        </div>

        {/* Currency switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Currency:</span>
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['USD', 'PHP'] as Currency[]).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  background: currency === c ? '#fff' : 'transparent',
                  color: currency === c ? '#EE4D2D' : '#9CA3AF',
                  boxShadow: currency === c ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {CURRENCY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toasts ── */}
      {success && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          ❌ {error}
        </div>
      )}

      {/* ── Current plan card ── */}
      <div style={{
        background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
        padding: '20px 24px', marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
              Current Plan
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, textTransform: 'capitalize' }}>
                {currentPlan}
              </p>
              {isOnTrial && (
                <span style={{ fontSize: 11, fontWeight: 600, background: '#EFF6FF', color: '#1D4ED8', padding: '3px 10px', borderRadius: 20 }}>
                  Trial
                </span>
              )}
              {isActive && !isOnTrial && currentPlan !== 'free' && (
                <span style={{ fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#166534', padding: '3px 10px', borderRadius: 20 }}>
                  Active
                </span>
              )}
              {subscription?.status === 'cancelled' && (
                <span style={{ fontSize: 11, fontWeight: 600, background: '#FEF2F2', color: '#991B1B', padding: '3px 10px', borderRadius: 20 }}>
                  Cancelled
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            {isOnTrial && subscription?.trial_ends_at && (
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 2px' }}>
                Trial ends{' '}
                <strong style={{ color: '#111' }}>
                  {new Date(subscription.trial_ends_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </strong>
              </p>
            )}
            {subscription?.renews_at && subscription.status === 'active' && (
              <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 2px' }}>
                Renews{' '}
                <strong style={{ color: '#111' }}>
                  {new Date(subscription.renews_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </strong>
              </p>
            )}
            {subscription?.ends_at && subscription.status === 'cancelled' && (
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                Access until{' '}
                <strong>
                  {new Date(subscription.ends_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </strong>
              </p>
            )}
            {currentPlan !== 'free' && (
              <button
                onClick={openCustomerPortal}
                style={{
                  marginTop: 8, padding: '6px 14px', borderRadius: 8,
                  border: '1.5px solid #E5E7EB', background: '#fff',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151',
                }}
              >
                Manage subscription →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Plan comparison / upgrade cards ── */}
      {currentPlan !== 'pro' && (
        <>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '28px 0 14px' }}>
            {currentPlan === 'free' ? 'Upgrade your plan' : 'Upgrade to Pro'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Starter card — show if on free */}
            {currentPlan === 'free' && (
              <UpgradeCard
                plan="starter"
                currency={currency}
                upgrading={upgrading}
                onUpgrade={handleUpgrade}
                featured
              />
            )}

            {/* Pro card — show if on free or starter */}
            <UpgradeCard
              plan="pro"
              currency={currency}
              upgrading={upgrading}
              onUpgrade={handleUpgrade}
              featured={currentPlan === 'starter'}
            />
          </div>
        </>
      )}

      {/* ── Already on Pro ── */}
      {currentPlan === 'pro' && (
        <div style={{
          background: '#F0FDF4', border: '1.5px solid #BBF7D0',
          borderRadius: 14, padding: '20px 24px', marginTop: 20,
        }}>
          <p style={{ fontWeight: 700, color: '#15803D', fontSize: 15, margin: '0 0 4px' }}>
            🎉 You're on the Pro plan
          </p>
          <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
            You have access to all features — unlimited rules, templates, orders, and AI generation.
          </p>
        </div>
      )}

      {/* ── FAQ / notes ── */}
      <div style={{ marginTop: 32, padding: '16px 20px', background: '#F9FAFB', borderRadius: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>
          Billing notes
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#6B7280', lineHeight: 1.8 }}>
          <li>All paid plans include a <strong>7-day free trial</strong> — no charges until it ends.</li>
          <li>You can cancel anytime from the <em>Manage subscription</em> link above.</li>
          <li>PHP prices are charged in Philippine Peso via your payment method.</li>
          <li>Annual plans are billed once per year and save you 20%.</li>
          <li>Need help? <a href="mailto:support@followshop.app" style={{ color: '#EE4D2D', fontWeight: 600 }}>Contact support</a></li>
        </ul>
      </div>
    </div>
  )
}

// ─── UpgradeCard sub-component ────────────────────────────────────────────────

interface UpgradeCardProps {
  plan: 'starter' | 'pro'
  currency: Currency
  upgrading: string | null
  featured?: boolean
  onUpgrade: (plan: 'starter' | 'pro', billing: 'monthly' | 'annual') => void
}

function UpgradeCard({ plan, currency, upgrading, featured, onUpgrade }: UpgradeCardProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const isAnnual = billing === 'annual'

  const monthlyPrice = formatPrice(PRICES[plan].monthly[currency], currency)
  const annualMonthlyPrice = formatPrice(PRICES[plan].annual[currency], currency)
  const annualTotal = annualBilled(plan, currency)

  const features = plan === 'starter'
    ? ['5 active rules', '15 templates', '300 orders/month', 'All 8 triggers', 'AI generation (15/mo)']
    : ['Unlimited rules, templates & orders', 'Unlimited AI generation', 'Priority support', 'Early feature access']

  return (
    <div style={{
      background: '#fff',
      border: featured ? '2px solid #EE4D2D' : '1.5px solid #E5E7EB',
      borderRadius: 14, padding: '20px 24px',
      boxShadow: featured ? '0 4px 20px rgba(238,77,45,0.08)' : '0 2px 6px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>

        {/* Left: plan info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#111', margin: 0, textTransform: 'capitalize' }}>
              {plan}
            </p>
            {featured && (
              <span style={{ fontSize: 11, fontWeight: 600, background: '#FFF7ED', color: '#C2410C', padding: '2px 8px', borderRadius: 20 }}>
                {plan === 'starter' ? 'Most popular' : 'Best value'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
            {features.map(f => (
              <span key={f} style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#EE4D2D', fontWeight: 700 }}>✓</span> {f}
              </span>
            ))}
          </div>
        </div>

        {/* Right: price + billing toggle + CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>

          {/* Billing cycle toggle */}
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 8, padding: 3, gap: 3 }}>
            {(['monthly', 'annual'] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                  background: billing === b ? '#fff' : 'transparent',
                  color: billing === b ? '#EE4D2D' : '#9CA3AF',
                  boxShadow: billing === b ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  textTransform: 'capitalize',
                }}
              >
                {b}
                {b === 'annual' && (
                  <span style={{ marginLeft: 4, fontSize: 10, color: billing === 'annual' ? '#15803D' : '#9CA3AF' }}>
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Price display */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0, lineHeight: 1 }}>
              {isAnnual ? annualMonthlyPrice : monthlyPrice}
              <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>/mo</span>
            </p>
            {isAnnual && (
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>
                billed {annualTotal}/year
              </p>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={() => onUpgrade(plan, billing)}
            disabled={upgrading === `${plan}_${billing}`}
            style={{
              padding: '9px 22px', borderRadius: 10, border: 'none',
              background: upgrading === `${plan}_${billing}` ? '#F87171' : '#EE4D2D',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: upgrading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {upgrading === `${plan}_${billing}` ? 'Redirecting…' : `Upgrade to ${plan.charAt(0).toUpperCase() + plan.slice(1)}`}
          </button>
        </div>
      </div>
    </div>
  )
}