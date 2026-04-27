import DodoPayments from 'dodopayments'

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_TEST_API_KEY!,
  environment: 'test_mode',
})


export const DODO_PLAN_IDS = {
  starter_monthly: process.env.DODO_TEST_STARTER_MONTHLY_ID!,
  starter_annual:  process.env.DODO_TEST_STARTER_ANNUAL_ID!,
  pro_monthly:     process.env.DODO_TEST_PRO_MONTHLY_ID!,
  pro_annual:      process.env.DODO_TEST_PRO_ANNUAL_ID!,
}

export async function createDodoCheckout({
  productId,
  userId,
  userEmail,
  plan,
  billing,
}: {
  productId: string
  userId: string
  userEmail: string
  plan: string
  billing: string
}) {
  const session = await dodo.subscriptions.create({
    billing: {
      city: '',
      country: 'PH',
      state: '',
      street: '',
      zipcode: '',
    },
    customer: {
      email: userEmail,
      name: userEmail,
    },
    metadata: {
      user_id: userId,
      plan: plan,
      billing: billing,
    },
    payment_link: true,
    product_id: productId,
    quantity: 1,
    return_url: 'https://followshop.netlify.app/dashboard?payment=success',
  })

  return session
}