import type { Config } from '@netlify/functions'

export default async function handler() {
  const baseUrl = process.env.URL || 'https://followshop.netlify.app'

  const res = await fetch(`${baseUrl}/api/process-rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET!,
    },
  })

  const data = await res.json()
  console.log('process-rules result:', data)
}

export const config: Config = {
  schedule: '0 8 * * *', // Runs 8 AM UTC daily (4 PM Manila time)
}