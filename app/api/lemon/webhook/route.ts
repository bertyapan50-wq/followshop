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
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

function mapStatus(lsStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    paused: 'paused',
    past_due: 'past_due',
    unpaid: 'unpaid',
    cancelled: 'cancelled',
    expired: 'expired',
    on_trial: 'on_trial',
  }
  return statusMap[lsStatus] ?? 'expired'
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get('x-signature') ?? ''

    if (!verifySignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(payload)
    const eventName: string = event.meta?.event_name
    const attributes = event.data?.attributes
    const userId: string = event.meta?.custom_data?.user_id
    const plan: Plan = event.meta?.custom_data?.plan ?? 'free'

    console.log(`LS Webhook: ${eventName} for user ${userId}`)

    if (!userId) {
      return NextResponse.json({ error: 'No user_id' }, { status: 400 })
    }

    if (
      eventName === 'subscription_created' ||
      eventName === 'subscription_updated' ||
      eventName === 'subscription_resumed'
    ) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            plan: plan,
            status: mapStatus(attributes.status),
            lemon_squeezy_id: String(event.data.id),
            lemon_squeezy_customer_id: String(attributes.customer_id),
            variant_id: String(attributes.variant_id),
            renews_at: attributes.renews_at ?? null,
            ends_at: attributes.ends_at ?? null,
            trial_ends_at: attributes.trial_ends_at ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) console.error('Supabase upsert error:', error)
    }

    if (
      eventName === 'subscription_cancelled' ||
      eventName === 'subscription_expired'
    ) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: mapStatus(attributes.status),
          ends_at: attributes.ends_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}