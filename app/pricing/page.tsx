'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  detectCurrency,
  formatPrice,
  annualBilled,
  PRICES,
  CURRENCY_LABELS,
  type Currency,
} from '@/lib/currency'

type BillingCycle = 'monthly' | 'annual'
type PlanKey = 'free' | 'starter' | 'pro'

interface Feature {
  label: string
  included: boolean
}

interface PlanConfig {
  key: PlanKey
  name: string
  desc: string
  featured: boolean
  badge: { text: string; color: string; bg: string } | null
  limits: { rules: string; templates: string; orders: string }
  features: Feature[]
  ctaLabel: string
  ctaStyle: 'primary' | 'secondary' | 'outline'
}

const PLANS: PlanConfig[] = [
  {
    key: 'free',
    name: 'Free',
    desc: 'Try the basics, no credit card needed.',
    featured: false,
    badge: null,
    limits: { rules: '1', templates: '3', orders: '30 / month' },
    features: [
      { label: 'Message queue', included: true },
      { label: 'Basic triggers (2)', included: true },
      { label: 'AI generation', included: false },
      { label: 'All 8 triggers', included: false },
      { label: 'Priority support', included: false },
    ],
    ctaLabel: 'Get started free',
    ctaStyle: 'secondary',
  },
  {
    key: 'starter',
    name: 'Starter',
    desc: 'Perfect for growing Shopee sellers.',
    featured: true,
    badge: { text: 'Most popular', color: '#C2410C', bg: '#FFF7ED' },
    limits: { rules: '5', templates: '15', orders: '300 / month' },
    features: [
      { label: 'All 8 triggers', included: true },
      { label: 'AI generation (15/month)', included: true },
      { label: 'no_review + repeat_buyer', included: true },
      { label: 'Priority support', included: false },
      { label: 'Early access to new features', included: false },
    ],
    ctaLabel: 'Start 7-day trial',
    ctaStyle: 'primary',
  },
  {
    key: 'pro',
    name: 'Pro',
    desc: 'For high-volume sellers. No limits.',
    featured: false,
    badge: { text: 'Best value', color: '#166534', bg: '#F0FDF4' },
    limits: { rules: 'Unlimited', templates: 'Unlimited', orders: 'Unlimited' },
    features: [
      { label: 'Everything in Starter', included: true },
      { label: 'Unlimited AI generation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Early access to new features', included: true },
      { label: 'Dedicated onboarding', included: true },
    ],
    ctaLabel: 'Start 7-day trial',
    ctaStyle: 'outline',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Auto-detect currency on mount
  useEffect(() => {
    setCurrency(detectCurrency())
  }, [])

  const isAnnual = billing === 'annual'
  const isPHP = currency === 'PHP'

  function getPrice(plan: PlanKey): string {
    if (plan === 'free') return isPHP ? '₱0' : '$0'
    const cycle = isAnnual ? 'annual' : 'monthly'
    const amount = PRICES[plan as 'starter' | 'pro'][cycle][currency]
    return formatPrice(amount, currency)
  }

  function getBilledNote(plan: PlanKey): string {
    if (plan === 'free' || !isAnnual) return ''
    return `billed ${annualBilled(plan as 'starter' | 'pro', currency)}/year`
  }

  // ── Checkout ─────────────────────────────────────────────────────────────

  async function handleCheckout(plan: PlanKey) {
    if (plan === 'free') {
      window.location.href = '/signup'
      return
    }
    setLoading(plan)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = `/signup?plan=${plan}&billing=${billing}&currency=${currency}`
        return
      }

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

      if (!res.ok) throw new Error('Checkout failed')
      const { url } = await res.json()
      if (url) window.location.href = url

    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      padding: '48px 24px',
      maxWidth: 980,
      margin: '0 auto',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 8px' }}>
          All paid plans include a
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
          7-day free trial
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          No credit card required. Cancel anytime.
        </p>
      </div>

      {/* ── Controls: Billing toggle + Currency switcher ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 20, marginBottom: 36, flexWrap: 'wrap',
      }}>

        {/* Billing toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, color: !isAnnual ? '#111' : '#9CA3AF', fontWeight: !isAnnual ? 600 : 400 }}>
            Monthly
          </span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            style={{
              width: 48, height: 26, borderRadius: 13, border: 'none',
              background: isAnnual ? '#EE4D2D' : '#D1D5DB',
              position: 'relative', cursor: 'pointer', padding: 0,
              transition: 'background .2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: isAnnual ? 25 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
              boxShadow: '0 1px 3px rgba(0,0,0,.2)',
              display: 'block',
            }} />
          </button>
          <span style={{ fontSize: 14, color: isAnnual ? '#111' : '#9CA3AF', fontWeight: isAnnual ? 600 : 400 }}>
            Annual{' '}
            <span style={{
              fontSize: 11, background: '#F0FDF4', color: '#166534',
              padding: '2px 8px', borderRadius: 20, fontWeight: 600,
            }}>
              Save 20%
            </span>
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />

        {/* Currency switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>Currency:</span>
          <div style={{
            display: 'flex', background: '#F3F4F6', borderRadius: 8,
            padding: 3, gap: 3,
          }}>
            {(['USD', 'PHP'] as Currency[]).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  transition: 'all .15s',
                  background: currency === c ? '#fff' : 'transparent',
                  color: currency === c ? '#EE4D2D' : '#9CA3AF',
                  boxShadow: currency === c ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {CURRENCY_LABELS[c]}
              </button>
            ))}
          </div>
          {isPHP && (
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
              🇵🇭 auto-detected
            </span>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
          padding: '11px 16px', borderRadius: 10, marginBottom: 20,
          fontSize: 14, fontWeight: 500, textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* ── Pricing cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {PLANS.map(plan => {
          const isLoadingThis = loading === plan.key
          const billedNote = getBilledNote(plan.key)

          return (
            <div
              key={plan.key}
              style={{
                background: '#fff',
                border: plan.featured ? '2px solid #EE4D2D' : '1.5px solid #E5E7EB',
                borderRadius: 16,
                padding: '24px 22px',
                boxShadow: plan.featured
                  ? '0 8px 30px rgba(238,77,45,0.10)'
                  : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {/* Badge */}
              <div style={{ minHeight: 26, marginBottom: 10 }}>
                {plan.badge && (
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 20,
                    color: plan.badge.color, background: plan.badge.bg,
                  }}>
                    {plan.badge.text}
                  </span>
                )}
              </div>

              <p style={{ fontSize: 19, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>
                {plan.name}
              </p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 20px' }}>
                {plan.desc}
              </p>

              {/* Price */}
              <p style={{ fontSize: 36, fontWeight: 700, color: '#111', margin: 0, lineHeight: 1 }}>
                {getPrice(plan.key)}{' '}
                <span style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 400 }}>
                  {plan.key === 'free' ? '/ forever' : '/ month'}
                </span>
              </p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '5px 0 0', minHeight: 20 }}>
                {billedNote || ' '}
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '18px 0' }} />

              {/* Limits */}
              <p style={{
                fontSize: 11, fontWeight: 700, color: '#9CA3AF',
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px',
              }}>
                Usage limits
              </p>
              {[
                { label: 'Active rules', value: plan.limits.rules },
                { label: 'Templates', value: plan.limits.templates },
                { label: 'Orders', value: plan.limits.orders },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, padding: '5px 0',
                  borderBottom: '1px solid #F9FAFB',
                }}>
                  <span style={{ color: '#6B7280' }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: '#111' }}>{item.value}</span>
                </div>
              ))}

              <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '18px 0' }} />

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {plan.features.map(f => (
                  <div key={f.label} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    fontSize: 13,
                    color: f.included ? '#374151' : '#C4C9D4',
                  }}>
                    {f.included ? (
                      <span style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: '#EE4D2D',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 1,
                      }}>
                        <svg width="8" height="6" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 8 6">
                          <polyline points="1 3 3 5 7 1" />
                        </svg>
                      </span>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"
                        viewBox="0 0 16 16" style={{ flexShrink: 0, marginTop: 1 }}>
                        <rect x="3" y="7" width="10" height="7" rx="2" />
                        <path d="M5 7V5a3 3 0 0 1 6 0v2" />
                      </svg>
                    )}
                    {f.label}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCheckout(plan.key)}
                disabled={isLoadingThis}
                style={{
                  display: 'block', width: '100%',
                  padding: '11px', borderRadius: 10,
                  fontSize: 14, fontWeight: 600,
                  cursor: isLoadingThis ? 'not-allowed' : 'pointer',
                  border: 'none',
                  ...(plan.ctaStyle === 'primary' && {
                    background: isLoadingThis ? '#F87171' : '#EE4D2D',
                    color: '#fff',
                  }),
                  ...(plan.ctaStyle === 'secondary' && {
                    background: '#F3F4F6',
                    color: '#374151',
                  }),
                  ...(plan.ctaStyle === 'outline' && {
                    background: '#fff',
                    color: '#EE4D2D',
                    border: '1.5px solid #EE4D2D',
                  }),
                }}
              >
                {isLoadingThis ? 'Redirecting…' : plan.ctaLabel}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', marginTop: 28 }}>
        All plans include a 7-day free trial. No charges until the trial ends.
        Questions?{' '}
        <a href="mailto:support@followshop.app" style={{ color: '#EE4D2D', fontWeight: 600 }}>
          Contact us
        </a>
      </p>
    </div>
  )
}