import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Rate limit store (in-memory) ────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMIT: Record<string, number> = {
  free: 5,
  starter: 15,
  pro: 60,
}

function checkRateLimit(userId: string, plan: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const limit = RATE_LIMIT[plan] ?? 5
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

export async function POST(req: NextRequest) {
  // ── 1. Auth check ───────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized — invalid session' }, { status: 401 })
  }

  // ── 2. Get plan ─────────────────────────────────────────────────────────────
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = sub?.plan ?? 'free'

  // ── 3. Rate limit ───────────────────────────────────────────────────────────
  const { allowed, remaining } = checkRateLimit(user.id, plan)
  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. ${RATE_LIMIT[plan]} generations/hour on ${plan} plan. Upgrade for more.` },
      { status: 429 }
    )
  }

  // ── 4. Validate prompt ──────────────────────────────────────────────────────
  const body = await req.json()
  const { prompt } = body

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
  }
  if (prompt.length > 2000) {
    return NextResponse.json({ error: 'Prompt too long (max 2000 chars)' }, { status: 400 })
  }

  // ── 5. Gemini API ───────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
        }),
      }
    )

    const data = await res.json()

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({ error: 'No text generated' }, { status: 500 })
    }

    const text = data.candidates[0].content.parts[0].text.trim()
    return NextResponse.json({ text, remaining })

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Generation failed', message }, { status: 500 })
  }
}