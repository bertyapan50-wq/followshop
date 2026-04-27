import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const event = JSON.parse(payload)
    const eventType = event.type
    const data = event.data
    const userId = data?.metadata?.user_id
    const plan = data?.metadata?.plan ?? "free"

    console.log("Webhook received:", eventType, userId, plan)

    if (!userId) {
      return NextResponse.json({ error: "No user_id" }, { status: 400 })
    }

    if (
      eventType === "subscription.active" ||
      eventType === "subscription.created" ||
      eventType === "subscription.updated"
    ) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan: plan,
          status: data.status === "active" ? "active" : "on_trial",
          dodo_id: data.subscription_id,
          dodo_customer_id: data.customer?.customer_id,
          product_id: data.product_id,
          renews_at: data.next_billing_date ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })

      if (error) {
        console.error("Supabase error:", error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const e = err as Error
    console.error("Webhook error:", e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
