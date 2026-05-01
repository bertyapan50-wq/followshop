import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Trigger → days config ─────────────────────────────────────────────────────
const TRIGGER_CONFIG: Record<string, { field: 'order_date' | 'delivery_date'; days: number }> = {
  order_1day:      { field: 'order_date',    days: 1 },
  order_3days:     { field: 'order_date',    days: 3 },
  order_7days:     { field: 'order_date',    days: 7 },
  delivered_1day:  { field: 'delivery_date', days: 1 },
  delivered_3days: { field: 'delivery_date', days: 3 },
  delivered_7days: { field: 'delivery_date', days: 7 },
  no_review_7days: { field: 'delivery_date', days: 7 },
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('rules')
      .select('id, user_id, trigger, message_template')
      .eq('is_active', true)

    if (rulesError) throw rulesError
    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'No active rules', queued: 0 })
    }

    console.log(`Processing ${rules.length} active rules...`)

    let totalQueued = 0
    const errors: string[] = []

    for (const rule of rules) {
      try {
        const queued = await processRule(rule)
        totalQueued += queued
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`Rule ${rule.id}: ${msg}`)
        console.error(`Rule ${rule.id} failed:`, msg)
      }
    }

    console.log(`Done! Queued ${totalQueued} messages.`)
    return NextResponse.json({ queued: totalQueued, errors })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('process-rules error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Process a single rule ─────────────────────────────────────────────────────
async function processRule(rule: {
  id: string
  user_id: string
  trigger: string
  message_template: string
}): Promise<number> {

  if (rule.trigger === 'repeat_buyer') {
    return processRepeatBuyer(rule)
  }

  const config = TRIGGER_CONFIG[rule.trigger]
  if (!config) {
    console.warn(`Unknown trigger: ${rule.trigger}`)
    return 0
  }

  // ── Compute target date ───────────────────────────────────────────────────
  const now = new Date()
  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() - config.days)

  // delivery_date at order_date ay date type sa Supabase — YYYY-MM-DD lang
  const dateStr = targetDate.toISOString().split('T')[0]

  // ── Fetch matching orders ─────────────────────────────────────────────────
  let query = supabaseAdmin
    .from('orders')
    .select('id, buyer_name, product, order_date, delivery_date, status')
    .eq('user_id', rule.user_id)
    .eq(config.field, dateStr)

  if (config.field === 'delivery_date') {
    query = query.eq('status', 'delivered')
  }

  const { data: orders, error } = await query
  if (error) throw error
  if (!orders || orders.length === 0) return 0

  // ── Get template ──────────────────────────────────────────────────────────
  const { data: template } = await supabaseAdmin
    .from('templates')
    .select('content')
    .eq('id', rule.message_template)
    .single()

  if (!template) {
    console.warn(`Template ${rule.message_template} not found`)
    return 0
  }

  // ── Filter already queued ─────────────────────────────────────────────────
  const orderIds = orders.map(o => o.id)
  const { data: existing } = await supabaseAdmin
    .from('message_queue')
    .select('order_id')
    .eq('user_id', rule.user_id)
    .eq('trigger', rule.trigger)
    .in('order_id', orderIds)

  const alreadyQueued = new Set((existing || []).map(e => e.order_id))
  const newOrders = orders.filter(o => !alreadyQueued.has(o.id))
  if (newOrders.length === 0) return 0

  // ── Insert into message_queue ─────────────────────────────────────────────
  const messages = newOrders.map(order => ({
    user_id:      rule.user_id,
    order_id:     order.id,
    buyer_name:   order.buyer_name,
    trigger:      rule.trigger,
    message:      fillTemplate(template.content, order),
    status:       'pending',
    scheduled_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabaseAdmin
    .from('message_queue')
    .insert(messages)

  if (insertError) throw insertError

  console.log(`Rule ${rule.trigger}: queued ${messages.length} messages`)
  return messages.length
}

// ── Repeat buyer logic ────────────────────────────────────────────────────────
async function processRepeatBuyer(rule: {
  id: string
  user_id: string
  trigger: string
  message_template: string
}): Promise<number> {

  const today = new Date().toISOString().split('T')[0]

  const { data: todayOrders } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_name, product, order_date, delivery_date')
    .eq('user_id', rule.user_id)
    .eq('order_date', today)

  if (!todayOrders || todayOrders.length === 0) return 0

  const repeatOrders = []
  for (const order of todayOrders) {
    const { count } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', rule.user_id)
      .eq('buyer_name', order.buyer_name)
      .lt('order_date', today)

    if ((count || 0) >= 1) {
      repeatOrders.push(order)
    }
  }

  if (repeatOrders.length === 0) return 0

  const { data: template } = await supabaseAdmin
    .from('templates')
    .select('content')
    .eq('id', rule.message_template)
    .single()

  if (!template) return 0

  const orderIds = repeatOrders.map(o => o.id)
  const { data: existing } = await supabaseAdmin
    .from('message_queue')
    .select('order_id')
    .eq('user_id', rule.user_id)
    .eq('trigger', 'repeat_buyer')
    .in('order_id', orderIds)

  const alreadyQueued = new Set((existing || []).map(e => e.order_id))
  const newOrders = repeatOrders.filter(o => !alreadyQueued.has(o.id))
  if (newOrders.length === 0) return 0

  const messages = newOrders.map(order => ({
    user_id:      rule.user_id,
    order_id:     order.id,
    buyer_name:   order.buyer_name,
    trigger:      'repeat_buyer',
    message:      fillTemplate(template.content, order),
    status:       'pending',
    scheduled_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin.from('message_queue').insert(messages)
  if (error) throw error

  return messages.length
}

// ── Fill template variables ───────────────────────────────────────────────────
function fillTemplate(content: string, order: {
  buyer_name: string
  product: string
  order_date: string
  delivery_date?: string
}): string {
  return content
    .replace(/{{buyer_name}}/g, order.buyer_name)
    .replace(/{{product}}/g, order.product)
    .replace(/{{order_date}}/g, new Date(order.order_date).toLocaleDateString('en-PH', {
      month: 'short', day: 'numeric', year: 'numeric'
    }))
    .replace(/{{delivery_date}}/g, order.delivery_date
      ? new Date(order.delivery_date).toLocaleDateString('en-PH', {
          month: 'short', day: 'numeric', year: 'numeric'
        })
      : ''
    )
    .replace(/{{shop_name}}/g, '')
}