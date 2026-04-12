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