import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('dodo_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.dodo_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    // Get customer portal URL from Dodo
    const response = await fetch(
      `https://api.dodopayments.com/customers/${subscription.dodo_customer_id}/portal`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.DODO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get portal URL')
    }

    const data = await response.json()
    return NextResponse.json({ url: data.url })

  } catch (err) {
    console.error('Dodo Portal error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}