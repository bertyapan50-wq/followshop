export type Plan = 'free' | 'starter' | 'pro'

export type Order = {
  id: string
  user_id: string
  buyer_name: string
  product: string
  order_date: string
  delivery_date?: string
  status: 'processing' | 'in_transit' | 'delivered'
  created_at: string
}

export type Rule = {
  id: string
  user_id: string
  trigger: string
  message_template: string
  is_active: boolean
  created_at: string
}

export type MessageQueue = {
  id: string
  user_id: string
  order_id: string
  buyer_name: string
  product: string
  message: string
  trigger: string
  scheduled_at: string
  status: 'pending' | 'ready' | 'sent'
}
// Idagdag ito sa dulo ng types/index.ts

export type SubscriptionStatus =
  | 'active'
  | 'paused'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'expired'
  | 'on_trial'

export type Subscription = {
  id: string
  user_id: string
  plan: Plan
  status: SubscriptionStatus
  lemon_squeezy_id: string
  lemon_squeezy_customer_id: string
  variant_id: string
  renews_at: string | null
  ends_at: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}