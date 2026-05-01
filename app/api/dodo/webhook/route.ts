import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import type { Plan, SubscriptionStatus } from '@/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Signature verification ───────────────────────────────────────────────────
function verifySignature(payload: string, signature: string, timestamp: string): boolean {
  const secret = process.env.DODO_WEBHOOK_SECRET!
  const signedPayload = `${timestamp}.${payload}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64')

  // Dodo sends: "v1,<base64sig>"
  const provided = signature.split(',')[1] ?? ''

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
  } catch {
    return false
  }
}

// ── Timestamp freshness check (prevent replay attacks) ───────────────────────
function isTimestampFresh(timestamp: string): boolean {
  const fiveMinutes = 5 * 60 * 1000
  const webhookTime = parseInt(timestamp, 10) * 1000
  return Math.abs(Date.now() - webhookTime) < fiveMinutes
}

function mapStatus(dodoStatus: string): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    active:    'active',
    on_trial:  'on_trial',
    paused:    'paused',
    past_due:  'past_due',
    unpaid:    'unpaid',
    cancelled: 'cancelled',
    expired:   'expired',
    failed:    'expired',
  }
  return statusMap[dodoStatus] ?? 'expired'
}

export async function POST(req: NextRequest) {
  try {
    const payload   = await req.text()
    const signature = req.headers.get('webhook-signature') ?? ''
    const timestamp = req.headers.get('webhook-timestamp') ?? ''
    const webhookId = req.headers.get('webhook-id') ?? ''

    // ── 1. Verify signature ─────────────────────────────────────────────────
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 401 })
    }
    if (!isTimestampFresh(timestamp)) {
      return NextResponse.json({ error: 'Webhook expired' }, { status: 401 })
    }
    if (!verifySignature(payload, signature, timestamp)) {
      console.warn(`Invalid webhook signature [id: ${webhookId}]`)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // ── 2. Parse event ──────────────────────────────────────────────────────
    const event     = JSON.parse(payload)
    const eventType = event.type as string
    const data      = event.data
    const userId    = data?.metadata?.user_id as string
    const plan      = (data?.metadata?.plan ?? 'free') as Plan

    console.log(`Dodo Webhook ✓ [${eventType}] user=${userId} plan=${plan}`)

    if (!userId) {
      return NextResponse.json({ error: 'No user_id in metadata' }, { status: 400 })
    }

    // ── 3. Handle subscription events ───────────────────────────────────────
    const activeEvents = [
      'subscription.active',
      'subscription.created',
      'subscription.updated',
      'subscription.resumed',
    ]

    if (activeEvents.includes(eventType)) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id:          userId,
            plan,
            status:           mapStatus(data.status),
            dodo_id:          data.subscription_id,
            dodo_customer_id: data.customer?.customer_id,
            product_id:       data.product_id,
            renews_at:        data.next_billing_date ?? null,
            ends_at:          data.ends_at ?? null,
            trial_ends_at:    data.trial_ends_at ?? null,
            updated_at:       new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.error('Supabase upsert error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log(`Subscription updated ✓ user=${userId}`)
    }

    return NextResponse.json({ received: true })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Dodo Webhook error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}