import { NextRequest, NextResponse } from 'next/server'
import { createDodoCheckout, DODO_PLAN_IDS } from '@/lib/dodo'
import type { Plan } from '@/types'

type BillingCycle = 'monthly' | 'annual'

export async function POST(req: NextRequest) {
  try {
    const { plan, billing = 'monthly', userId, userEmail } = await req.json() as {
      plan: Exclude<Plan, 'free'>
      billing: BillingCycle
      userId: string
      userEmail: string
    }

    const planKey = `${plan}_${billing}` as keyof typeof DODO_PLAN_IDS
    const productId = DODO_PLAN_IDS[planKey]

    if (!productId) {
      return NextResponse.json({ error: 'Invalid plan or billing cycle' }, { status: 400 })
    }

    const data = await createDodoCheckout({
      productId,
      userId,
      userEmail,
      plan,
      billing,
    })

    const checkoutUrl = data.payment_link
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'No checkout URL returned' }, { status: 500 })
    }

    return NextResponse.json({ url: checkoutUrl })

  } catch (err: any) {
    console.error('Dodo Checkout error:', err?.message ?? err)
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 })
  }
}