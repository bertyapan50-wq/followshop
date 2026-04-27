import { NextRequest, NextResponse } from 'next/server'
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'
import { supabase } from '@/lib/supabase'

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('lemon_squeezy_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.lemon_squeezy_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Direct URL to Lemon Squeezy customer portal
    const portalUrl = `https://app.lemonsqueezy.com/my-orders`

    return NextResponse.json({ url: portalUrl })

  } catch (err) {
    console.error('Portal route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}