const SUPABASE_URL = 'https://gdovfvlediqpwkvuilzf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Y0y-7TZo3hkJl6NK96z9Fw_PrtZ9Pff' // palitan mo

document.getElementById('login').addEventListener('click', async () => {
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const status = document.getElementById('status')
  const error = document.getElementById('error')

  status.textContent = 'Logging in...'
  error.textContent = ''

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (data.access_token) {
      await chrome.storage.local.set({
        followshop_session: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user_id: data.user.id
        }
      })
      status.textContent = '✓ Logged in! Extension is active.'
    } else {
      error.textContent = 'Invalid email or password.'
    }
  } catch (e) {
    error.textContent = 'Connection error. Try again.'
  }
})

// Check kung may existing session na
chrome.storage.local.get(['followshop_session'], (result) => {
  if (result.followshop_session) {
    document.getElementById('status').textContent = '✓ Already logged in!'
  }
})