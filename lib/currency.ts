// ─── Currency detection utility ───────────────────────────────────────────────

export type Currency = 'USD' | 'PHP'

const PH_TIMEZONES = ['Asia/Manila']

/**
 * Detect user currency based on browser timezone.
 * Falls back to USD if timezone is unavailable.
 */
export function detectCurrency(): Currency {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    return PH_TIMEZONES.includes(timezone) ? 'PHP' : 'USD'
  } catch {
    return 'USD'
  }
}

// ─── Pricing constants ────────────────────────────────────────────────────────

export const PRICES = {
  starter: {
    monthly: { USD: 9,    PHP: 499  },
    annual:  { USD: 7.20, PHP: 399  },  // billed as $86.40 / ₱4,788 per year
  },
  pro: {
    monthly: { USD: 19,   PHP: 999  },
    annual:  { USD: 15.20, PHP: 799 },  // billed as $182.40 / ₱9,588 per year
  },
} as const

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  PHP: '₱',
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD $',
  PHP: 'PHP ₱',
}

/**
 * Format a price for display.
 * Whole numbers: no decimals (₱499, $9)
 * Decimals only when needed ($7.20)
 */
export function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  const formatted = Number.isInteger(amount)
    ? amount.toString()
    : amount.toFixed(2)
  return `${symbol}${formatted}`
}

/**
 * Get annual billed amount (monthly price × 12 × 0.8)
 */
export function annualBilled(plan: 'starter' | 'pro', currency: Currency): string {
  const monthly = PRICES[plan].monthly[currency]
  const total = Math.round(monthly * 12 * 0.8)
  return formatPrice(total, currency)
}