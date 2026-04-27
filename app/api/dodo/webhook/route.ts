import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import type { Plan, SubscriptionStatus } from '@/types'

// ✅ Gamitin ang service role — bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.DODO_WEBHOOK_SECRET!
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(signature)
  )
}

function mapStatus(dodoStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active:    'active',
    paused:    'paused',
    past_due:  'past_due',
    unpaid:    'unpaid',
    cancelled: 'cancelled',
    expired:   'expired',
    on_trial:  'on_trial',
    failed:    'expired',
  }
  return statusMap[dodoStatus] ?? 'expired'
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get('webhook-signature') ?? ''

    if (!verifySignature(payload, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(payload)
    const eventType: string = event.type
    const data = event.data
    const userId: string = data?.metadata?.user_id
    const plan: Plan = data?.metadata?.plan ?? 'free'

    console.log(`Dodo Webhook: ${eventType} for user ${userId}`)

    if (!userId) {
      return NextResponse.json(
        { error: 'No user_id in metadata' },
        { status: 400 }
      )
    }

    // ── Subscription Created / Updated / Resumed ──────────────────
    if (
      eventType === 'subscription.created' ||
      eventType === 'subscription.updated' ||
      eventType === 'subscription.resumed'
    ) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id:            userId,
            plan:               plan,
            status:             mapStatus(data.status),
            dodo_id:            data.subscription_id,
            dodo_customer_id:   data.customer.customer_id,
            product_id:         data.product_id,
            renews_at:          data.next_billing_date ?? null,
            ends_at:            data.ends_at ?? null,
            trial_ends_at:      data.trial_ends_at ?? null,
            updated_at:         new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) console.error('Supabase upsert error:', error)
    }

    // ── Subscription Cancelled / Expired ─────────────────────────
    if (
      eventType === 'subscription.cancelled' ||
      eventType === 'subscription.expired'
    ) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status:     mapStatus(data.status),
          ends_at:    data.ends_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Dodo Webhook error:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}