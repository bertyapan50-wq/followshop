import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Plan, SubscriptionStatus } from '@/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const payload = await req.text()
    const event = JSON.parse(payload)

    const eventType: string = event.type
    const data = event.data
    const userId: string = data?.metadata?.user_id
    const plan: Plan = data?.metadata?.plan ?? 'free'

    console.log(`Dodo Webhook: ${eventType} for user ${userId} plan ${plan}`)

    if (!userId) {
      return NextResponse.json({ error: 'No user_id' }, { status: 400 })
    }

    if (
      eventType === 'subscription.active' ||
      eventType === 'subscription.created' ||
      eventType === 'subscription.updated' ||
      eventType === 'subscription.resumed'
    ) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert(
          {
            user_id:          userId,
            plan:             plan,
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
        console.error('Supabase error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('Subscription updated successfully!')
    }

    return NextResponse.json({ received: true })

  } catch (err: any) {
    console.error('Dodo Webhook error:', err?.message ?? err)
    return NextResponse.json(
      { error: err?.message ?? 'Webhook processing failed' },
      { status: 500 }
    )
  }
}