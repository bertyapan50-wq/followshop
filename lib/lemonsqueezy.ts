// lib/lemonsqueezy.ts
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js'

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => console.error('LemonSqueezy Error:', error),
})

export const PLAN_VARIANT_IDS = {
  starter_monthly: process.env.LEMONSQUEEZY_STARTER_MONTHLY_VARIANT_ID!,
  starter_annual:  process.env.LEMONSQUEEZY_STARTER_ANNUAL_VARIANT_ID!,
  pro_monthly:     process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID!,
  pro_annual:      process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID!,
}

export { createCheckout }