'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { detectCurrency, formatPrice, PRICES, type Currency } from '@/lib/currency'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setChecking(false)
    })
    setCurrency(detectCurrency())
  }, [])

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', fontFamily: 'sans-serif', color: '#888', fontSize: 14,
      }}>
        Loading…
      </div>
    )
  }

  const isAnnual = billing === 'annual'
  const isPHP = currency === 'PHP'

  function getPrice(plan: 'starter' | 'pro') {
    const cycle = isAnnual ? 'annual' : 'monthly'
    return formatPrice(PRICES[plan][cycle][currency], currency)
  }

  function getAnnualNote(plan: 'starter' | 'pro') {
    const annual = PRICES[plan].annual[currency]
    const total = Math.round(annual * 12)
    return `billed ${isPHP ? '₱' : '$'}${total}/year`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --orange: #EE4D2D;
          --orange-dim: rgba(238,77,45,0.08);
          --orange-border: rgba(238,77,45,0.2);
          --bg: #FFFFFF;
          --bg2: #F8F8F8;
          --bg3: #F2F2F2;
          --border: #E8E8E8;
          --text: #111111;
          --sub: #444444;
          --muted: #888888;
        }

        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.6; overflow-x: hidden; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .fade-up { animation: fadeUp 0.6s ease both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.45s; }

        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 64px; padding: 0 40px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 8px; }
        .nav-logo-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--orange); display: inline-block; animation: blink 2s ease infinite; }
        .nav-links { display: flex; align-items: center; gap: 28px; }
        .nav-links a { color: var(--sub); font-size: 14px; font-weight: 500; text-decoration: none; transition: color .15s; }
        .nav-links a:hover { color: var(--orange); }
        .nav-cta { background: var(--orange) !important; color: #fff !important; padding: 8px 18px !important; border-radius: 8px !important; font-weight: 700 !important; }
        .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
        .hamburger span { display: block; width: 22px; height: 2px; background: var(--text); border-radius: 2px; }
        .mobile-menu { display: none; position: fixed; top: 64px; left: 0; right: 0; z-index: 99; background: #fff; border-bottom: 1px solid var(--border); padding: 20px 24px; flex-direction: column; gap: 16px; }
        .mobile-menu.open { display: flex; }
        .mobile-menu a { color: var(--sub); font-size: 15px; font-weight: 500; text-decoration: none; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .mobile-menu a:last-child { border-bottom: none; }
        .mob-cta { background: var(--orange); color: #fff !important; text-align: center; padding: 12px !important; border-radius: 10px; font-weight: 700 !important; border-bottom: none !important; }

        .hero { padding: 120px 24px 80px; text-align: center; position: relative; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(238,77,45,0.07) 0%, transparent 70%); }
        .hero-badge { display: inline-flex; align-items: center; gap: 7px; background: var(--orange-dim); border: 1px solid var(--orange-border); padding: 5px 14px; border-radius: 100px; font-size: 13px; font-weight: 600; color: var(--orange); margin-bottom: 12px; }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--orange); animation: blink 1.5s ease infinite; }
        .trial-pill { display: inline-flex; align-items: center; gap: 6px; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 5px 14px; border-radius: 100px; font-size: 13px; font-weight: 600; color: #166534; margin-bottom: 20px; }
        h1 { font-family: 'Syne', sans-serif; font-size: clamp(36px, 6vw, 68px); font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; color: var(--text); max-width: 820px; margin: 0 auto 20px; }
        h1 em { font-style: normal; color: var(--orange); }
        .hero-sub { font-size: clamp(15px, 2vw, 18px); color: var(--sub); max-width: 500px; margin: 0 auto 36px; line-height: 1.7; }
        .hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: 10px; background: var(--orange); color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; transition: opacity .2s, transform .2s; box-shadow: 0 4px 20px rgba(238,77,45,0.3); border: none; cursor: pointer; font-family: inherit; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-outline { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: 10px; background: #fff; color: var(--text); font-size: 15px; font-weight: 600; text-decoration: none; border: 1.5px solid var(--border); transition: border-color .2s; }
        .btn-outline:hover { border-color: #ccc; }

        .hero-mockup { margin: 56px auto 0; max-width: 760px; width: 100%; background: #fff; border: 1.5px solid var(--border); border-radius: 18px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05); animation: float 5s ease-in-out infinite; }
        .mockup-bar { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 11px 18px; display: flex; align-items: center; gap: 7px; }
        .m-dot { width: 11px; height: 11px; border-radius: 50%; }
        .mockup-body { padding: 20px; }
        .mock-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .mock-stat { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
        .mock-stat-label { font-size: 11px; color: var(--muted); margin-bottom: 4px; font-weight: 500; }
        .mock-stat-value { font-size: 22px; font-weight: 800; font-family: 'Syne', sans-serif; }
        .mock-msgs { display: flex; flex-direction: column; gap: 8px; }
        .mock-msg { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; }
        .mock-avatar { width: 34px; height: 34px; border-radius: 9px; background: var(--orange-dim); font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mock-info { flex: 1; min-width: 0; }
        .mock-name { font-size: 13px; font-weight: 700; color: var(--text); }
        .mock-text { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .mock-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; flex-shrink: 0; }
        .badge-p { background: rgba(249,115,22,0.1); color: #EA580C; }
        .badge-s { background: rgba(34,197,94,0.1); color: #16A34A; }
        .mock-copy { padding: 5px 11px; border-radius: 7px; background: var(--orange); color: #fff; font-size: 11px; font-weight: 700; border: none; cursor: pointer; flex-shrink: 0; }

        .marquee-wrap { overflow: hidden; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 13px 0; background: var(--bg2); }
        .marquee-track { display: flex; gap: 48px; width: max-content; animation: marquee 24s linear infinite; }
        .marquee-item { font-size: 13px; font-weight: 600; color: var(--muted); display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .marquee-item .accent { color: var(--orange); }

        section { padding: 80px 24px; }
        .container { max-width: 1060px; margin: 0 auto; }
        .section-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--orange); margin-bottom: 14px; }
        h2 { font-family: 'Syne', sans-serif; font-size: clamp(28px, 4vw, 46px); font-weight: 800; color: var(--text); line-height: 1.1; letter-spacing: -0.02em; }
        .section-sub { font-size: 16px; color: var(--sub); max-width: 480px; line-height: 1.7; margin-top: 14px; }
        .alt-bg { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }

        .cards-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 48px; }
        .card { background: #fff; border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; transition: border-color .2s, transform .2s; }
        .card:hover { border-color: var(--orange-border); transform: translateY(-2px); }
        .card-icon { font-size: 26px; margin-bottom: 14px; }
        .card-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 7px; }
        .card-desc { font-size: 14px; color: var(--sub); line-height: 1.65; }

        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 48px; }
        .step-card { background: #fff; border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; text-align: center; }
        .step-num { width: 44px; height: 44px; border-radius: 12px; background: var(--orange); color: #fff; font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .step-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 7px; }
        .step-desc { font-size: 14px; color: var(--sub); line-height: 1.65; }

        .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 48px; }
        .feat-card { background: #fff; border: 1.5px solid var(--border); border-radius: 14px; padding: 22px; display: flex; gap: 16px; align-items: flex-start; transition: border-color .2s; }
        .feat-card:hover { border-color: var(--orange-border); }
        .feat-card.highlight { border-color: var(--orange-border); background: var(--orange-dim); }
        .feat-icon { width: 44px; height: 44px; border-radius: 11px; background: var(--orange-dim); border: 1px solid var(--orange-border); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .feat-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 5px; }
        .feat-desc { font-size: 13px; color: var(--sub); line-height: 1.6; }
        .feat-new { display: inline-block; font-size: 10px; font-weight: 700; background: var(--orange); color: #fff; padding: 2px 8px; border-radius: 20px; margin-left: 6px; vertical-align: middle; }

        /* PRICING */
        .pricing-controls { display: flex; align-items: center; gap: 20px; margin-top: 28px; flex-wrap: wrap; }
        .toggle-track { width: 44px; height: 24px; border-radius: 12px; border: none; background: #D1D5DB; position: relative; cursor: pointer; padding: 0; transition: background .2s; }
        .toggle-track.on { background: var(--orange); }
        .toggle-thumb { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); display: block; }
        .toggle-track.on .toggle-thumb { left: 23px; }
        .save-pill { font-size: 11px; background: #F0FDF4; color: #166534; padding: 2px 8px; border-radius: 20px; font-weight: 700; }
        .currency-switch { display: flex; background: var(--bg3); border-radius: 8px; padding: 3px; gap: 3px; }
        .curr-btn { padding: 4px 12px; border-radius: 6px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; background: transparent; color: var(--muted); }
        .curr-btn.active { background: #fff; color: var(--orange); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 28px; align-items: start; }
        .price-card { background: #fff; border: 1.5px solid var(--border); border-radius: 18px; padding: 28px 24px; position: relative; }
        .price-card.featured { border-color: var(--orange); box-shadow: 0 0 0 4px var(--orange-dim); }
        .price-popular { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--orange); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 14px; border-radius: 100px; white-space: nowrap; }
        .price-plan { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .price-amount { font-family: 'Syne', sans-serif; font-size: 40px; font-weight: 800; color: var(--text); line-height: 1; }
        .price-period { font-size: 13px; color: var(--muted); margin: 4px 0 4px; }
        .price-billed { font-size: 12px; color: var(--muted); margin-bottom: 14px; min-height: 18px; }
        .price-trial-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #166534; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 3px 10px; border-radius: 20px; margin-bottom: 16px; }
        .price-divider { height: 1px; background: var(--border); margin-bottom: 16px; }
        .limit-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px solid var(--bg3); }
        .limit-row:last-child { border-bottom: none; }
        .limit-label { color: var(--muted); }
        .limit-val { font-weight: 700; color: var(--text); }
        .price-features { list-style: none; display: flex; flex-direction: column; gap: 9px; margin: 16px 0 20px; }
        .price-features li { font-size: 13px; color: var(--sub); display: flex; align-items: flex-start; gap: 8px; line-height: 1.4; }
        .chk { width: 16px; height: 16px; border-radius: 5px; background: rgba(34,197,94,0.12); color: #16A34A; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
        .lck { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; color: #D1D5DB; }
        .price-btn { display: block; width: 100%; padding: 11px; border-radius: 9px; border: none; cursor: pointer; font-size: 14px; font-weight: 700; text-align: center; text-decoration: none; transition: opacity .2s, transform .2s; font-family: inherit; }
        .price-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .p-orange { background: var(--orange); color: #fff; }
        .p-ghost { background: transparent; color: var(--text); border: 1.5px solid var(--border) !important; }
        .p-outline { background: #fff; color: var(--orange); border: 1.5px solid var(--orange) !important; }

        .cta-section { text-align: center; padding: 80px 24px 100px; background: var(--orange-dim); border-top: 1px solid var(--orange-border); }
        .cta-section h2 { margin-bottom: 14px; }
        .cta-section p { color: var(--sub); font-size: 17px; margin-bottom: 32px; }

        footer { background: var(--bg2); border-top: 1px solid var(--border); padding: 28px 40px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .footer-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; color: var(--text); text-decoration: none; }
        .footer-links { display: flex; gap: 20px; }
        .footer-links a { font-size: 13px; color: var(--muted); text-decoration: none; }
        .footer-links a:hover { color: var(--orange); }
        .footer-copy { font-size: 13px; color: var(--muted); }

        @media (max-width: 768px) {
          nav { padding: 0 20px; }
          .nav-links { display: none; }
          .hamburger { display: flex; }
          .hero { padding: 96px 20px 60px; }
          .cards-3, .steps-grid, .pricing-grid, .features-grid { grid-template-columns: 1fr; }
          section { padding: 60px 20px; }
          footer { padding: 24px 20px; flex-direction: column; text-align: center; }
          .footer-links { justify-content: center; }
          .mock-copy { display: none; }
          .pricing-controls { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .hero-ctas { flex-direction: column; align-items: stretch; }
          .btn-primary, .btn-outline { justify-content: center; }
        }
      `}</style>

      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo"><span className="nav-logo-dot"></span>FollowShop</a>
        <div className="nav-links">
          <a href="#how">How it Works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="/login" className="nav-cta">Log in →</a>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          <span/><span/><span/>
        </button>
      </nav>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        <a href="#how" onClick={() => setMenuOpen(false)}>How it Works</a>
        <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
        <a href="/signup" className="mob-cta">Start Free Trial →</a>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-badge fade-up"><span className="badge-dot"></span>For Shopee, Lazada & TikTok Shop Sellers</div>
        <div className="trial-pill fade-up">✅ 7-day free trial — no credit card required</div>
        <h1 className="fade-up delay-1">Automate your<br/><em>buyer follow-ups</em><br/>in minutes</h1>
        <p className="hero-sub fade-up delay-2">Set rules once — FollowShop automatically queues the right message to the right buyer at the right time.</p>
        <div className="hero-ctas fade-up delay-3">
          <a href="/signup" className="btn-primary">
            Start Free Trial
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <a href="#how" className="btn-outline">See how it works</a>
        </div>
        <div className="hero-mockup fade-up delay-4">
          <div className="mockup-bar">
            <div className="m-dot" style={{background:'#FF5F57'}}></div>
            <div className="m-dot" style={{background:'#FFBD2E'}}></div>
            <div className="m-dot" style={{background:'#28C840'}}></div>
            <span style={{marginLeft:10,fontSize:12,color:'var(--muted)',fontWeight:500}}>FollowShop — Dashboard</span>
          </div>
          <div className="mockup-body">
            <div className="mock-stats">
              <div className="mock-stat"><div className="mock-stat-label">Total Orders</div><div className="mock-stat-value" style={{color:'var(--orange)'}}>247</div></div>
              <div className="mock-stat"><div className="mock-stat-label">Delivered</div><div className="mock-stat-value" style={{color:'#16A34A'}}>189</div></div>
              <div className="mock-stat"><div className="mock-stat-label">Queued Msgs</div><div className="mock-stat-value" style={{color:'#D97706'}}>12</div></div>
            </div>
            <div className="mock-msgs">
              {[
                { name: 'Maria Santos',   text: 'Hi Maria! Salamat sa iyong order ng Wireless Earbuds. Naihatid na ba?',          status: 'Pending', sent: false },
                { name: 'Juan dela Cruz', text: 'Kumusta ang iyong Phone Case? Pwede ka mag-leave ng review? 😊',                 status: 'Sent ✓',  sent: true  },
                { name: 'Ana Reyes',      text: 'Special discount para sa iyong next order! 10% off gamit ang code FOLLOW10',     status: 'Pending', sent: false },
              ].map((m, i) => (
                <div className="mock-msg" key={i}>
                  <div className="mock-avatar">👤</div>
                  <div className="mock-info">
                    <div className="mock-name">{m.name}</div>
                    <div className="mock-text">{m.text}</div>
                  </div>
                  <span className={`mock-badge ${m.sent ? 'badge-s' : 'badge-p'}`}>{m.status}</span>
                  <button className="mock-copy" style={m.sent ? {background:'var(--bg3)',color:'var(--muted)'} : {}}>Copy</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {['📦 Automated Follow-ups','⭐ Review Reminders','🔁 Repeat Buyer Detection','📋 CSV Import','✉️ Custom Templates','⚡ Rule Builder','✨ AI Generator','🧩 Chrome Extension'].map((item, i) => (
            <div className="marquee-item" key={i}>{item}</div>
          ))}
          <div className="marquee-item"><span className="accent">PH 🇵🇭 · ID 🇮🇩 · MY 🇲🇾 · BR 🇧🇷 · MX 🇲🇽</span></div>
          {['📦 Automated Follow-ups','⭐ Review Reminders','🔁 Repeat Buyer Detection','📋 CSV Import','✉️ Custom Templates','⚡ Rule Builder','✨ AI Generator','🧩 Chrome Extension'].map((item, i) => (
            <div className="marquee-item" key={`b${i}`}>{item}</div>
          ))}
          <div className="marquee-item"><span className="accent">PH 🇵🇭 · ID 🇮🇩 · MY 🇲🇾 · BR 🇧🇷 · MX 🇲🇽</span></div>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="alt-bg">
        <div className="container">
          <div className="section-tag">⚠️ The Problem</div>
          <h2>You're losing repeat buyers<br/>without follow-ups</h2>
          <p className="section-sub">Most sellers skip follow-ups — it's slow, repetitive, and easy to forget.</p>
          <div className="cards-3">
            {[
              { icon: '🛒', title: 'Buyers don\'t come back',     desc: 'One order, then gone. No follow-up means no repeat purchase. Repeat buyers generate the most lifetime revenue.' },
              { icon: '⏰', title: 'Manual messaging is slow',    desc: '50 orders a week? Copy-pasting messages one by one isn\'t scalable — and it\'s inconsistent.' },
              { icon: '⭐', title: 'Reviews are left behind',     desc: 'Happy buyers rarely leave reviews unless asked. More reviews = higher Shopee ranking = more sales.' },
            ].map((c, i) => (
              <div className="card" key={i}>
                <div className="card-icon">{c.icon}</div>
                <div className="card-title">{c.title}</div>
                <div className="card-desc">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="container">
          <div className="section-tag">🚀 How It Works</div>
          <h2>Set once,<br/>automated forever</h2>
          <p className="section-sub">Three simple steps — then sit back and let FollowShop do the work.</p>
          <div className="steps-grid">
            {[
              { n:'1', title:'Import Your Orders',  desc:'Export orders from Shopee Seller Center and import via CSV — or add manually. All buyer data organized automatically.' },
              { n:'2', title:'Create Rules',         desc:'Set when and what to send. "3 days after delivery → Thank You + review request." Configure once, runs forever.' },
              { n:'3', title:'Copy & Send',          desc:'Every day your dashboard shows ready-to-send messages. One click to copy, paste into Shopee chat — done.' },
            ].map((s, i) => (
              <div className="step-card" key={i}>
                <div className="step-num">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="alt-bg">
        <div className="container">
          <div className="section-tag">✨ Features</div>
          <h2>Everything you need<br/>to grow repeat sales</h2>
          <div className="features-grid">
            {[
              { icon:'📋', title:'CSV Import',           desc:'Export from Shopee, upload to FollowShop. All buyer data organized instantly — no manual entry needed.' },
              { icon:'⚡', title:'Rule Builder',          desc:'Create custom triggers — "1 day after order", "7 days after delivery", "repeat buyer". Simple and powerful.' },
              { icon:'✉️', title:'Message Templates',     desc:'Dynamic variables — {{buyer_name}}, {{product}}, {{delivery_date}}. Every message feels personal.' },
              { icon:'📬', title:'Message Queue',         desc:'All ready-to-send messages in one place. Click Copy, paste into Shopee. Mark as sent to track.' },
              { icon:'✨', title:'AI Message Generator',  desc:'Generate professional follow-up templates in seconds — in Taglish, Filipino, or English.', isNew:true },
              { icon:'📊', title:'Dashboard Overview',    desc:'Track total orders, delivered, queued messages, and active rules — all in one screen.' },
              { icon:'🔁', title:'Auto-Scheduling',       desc:'FollowShop auto-generates messages based on your rules every hour. No daily check-in needed.' },
              { icon:'🧩', title:'Chrome Extension',      desc:'See pending messages while on Shopee. One-click copy, then send — without leaving your seller page.', isNew:true },
            ].map((f, i) => (
              <div className={`feat-card${f.isNew ? ' highlight' : ''}`} key={i}>
                <div className="feat-icon">{f.icon}</div>
                <div>
                  <div className="feat-title">{f.title}{f.isNew && <span className="feat-new">NEW</span>}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="container">
          <div className="section-tag">💰 Pricing</div>
          <h2>Simple pricing,<br/>big value</h2>
          <p className="section-sub">Start free. Upgrade when you're ready. Cancel anytime.</p>

          <div className="pricing-controls">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:14,color:!isAnnual?'var(--text)':'var(--muted)',fontWeight:!isAnnual?700:400}}>Monthly</span>
              <button className={`toggle-track${isAnnual?' on':''}`} onClick={() => setBilling(b => b==='monthly'?'annual':'monthly')}>
                <span className="toggle-thumb"/>
              </button>
              <span style={{fontSize:14,color:isAnnual?'var(--text)':'var(--muted)',fontWeight:isAnnual?700:400}}>
                Annual <span className="save-pill">Save 20%</span>
              </span>
            </div>
            <div style={{width:1,height:24,background:'var(--border)'}}/>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:13,color:'var(--muted)'}}>Currency:</span>
              <div className="currency-switch">
                {(['USD','PHP'] as Currency[]).map(c => (
                  <button key={c} className={`curr-btn${currency===c?' active':''}`} onClick={()=>setCurrency(c)}>
                    {c==='USD'?'USD $':'PHP ₱'}
                  </button>
                ))}
              </div>
              {isPHP && <span style={{fontSize:11,color:'var(--muted)'}}>🇵🇭 auto-detected</span>}
            </div>
          </div>

          <div className="pricing-grid">

            {/* FREE */}
            <div className="price-card">
              <div className="price-plan">Free</div>
              <div className="price-amount">{isPHP?'₱':'$'}0</div>
              <div className="price-period">forever</div>
              <div className="price-billed">&nbsp;</div>
              <div className="price-divider"/>
              <div style={{marginBottom:14}}>
                {[['Active rules','1'],['Templates','3'],['Orders / mo','30']].map(([l,v])=>(
                  <div className="limit-row" key={l}><span className="limit-label">{l}</span><span className="limit-val">{v}</span></div>
                ))}
              </div>
              <ul className="price-features">
                <li><span className="chk">✓</span>Message queue</li>
                <li><span className="chk">✓</span>Basic triggers (2)</li>
                <li><span className="lck"><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg></span><span style={{color:'var(--muted)'}}>AI generation</span></li>
                <li><span className="lck"><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg></span><span style={{color:'var(--muted)'}}>All 8 triggers</span></li>
              </ul>
              <a href="/signup" className="price-btn p-ghost">Get started free</a>
            </div>

            {/* STARTER */}
            <div className="price-card featured">
              <div className="price-popular">Most Popular</div>
              <div className="price-plan">Starter</div>
              <div className="price-amount">{getPrice('starter')}</div>
              <div className="price-period">/ month</div>
              <div className="price-billed">{isAnnual ? getAnnualNote('starter') : '\u00a0'}</div>
              <div className="price-trial-badge">✅ 7-day free trial</div>
              <div className="price-divider"/>
              <div style={{marginBottom:14}}>
                {[['Active rules','5'],['Templates','15'],['Orders / mo','300']].map(([l,v])=>(
                  <div className="limit-row" key={l}><span className="limit-label">{l}</span><span className="limit-val">{v}</span></div>
                ))}
              </div>
              <ul className="price-features">
                <li><span className="chk">✓</span>All 8 triggers</li>
                <li><span className="chk">✓</span>AI generation (15/mo)</li>
                <li><span className="chk">✓</span>no_review + repeat_buyer</li>
                <li><span className="lck"><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg></span><span style={{color:'var(--muted)'}}>Priority support</span></li>
              </ul>
              <a href="/signup?plan=starter" className="price-btn p-orange">Start 7-day trial</a>
            </div>

            {/* PRO */}
            <div className="price-card">
              <div className="price-plan">Pro</div>
              <div className="price-amount">{getPrice('pro')}</div>
              <div className="price-period">/ month</div>
              <div className="price-billed">{isAnnual ? getAnnualNote('pro') : '\u00a0'}</div>
              <div className="price-trial-badge">✅ 7-day free trial</div>
              <div className="price-divider"/>
              <div style={{marginBottom:14}}>
                {[['Active rules','Unlimited'],['Templates','Unlimited'],['Orders / mo','Unlimited']].map(([l,v])=>(
                  <div className="limit-row" key={l}><span className="limit-label">{l}</span><span className="limit-val">{v}</span></div>
                ))}
              </div>
              <ul className="price-features">
                <li><span className="chk">✓</span>Everything in Starter</li>
                <li><span className="chk">✓</span>Unlimited AI generation</li>
                <li><span className="chk">✓</span>Priority support</li>
                <li><span className="chk">✓</span>Early feature access</li>
              </ul>
              <a href="/signup?plan=pro" className="price-btn p-outline">Start 7-day trial</a>
            </div>

          </div>
        </div>
      </section>
{/* TESTIMONIALS */}
<section className="alt-bg">
  <div className="container">
    <div className="section-tag">💬 What Sellers Say</div>
    <h2>Trusted by Shopee<br/>sellers across PH</h2>
    <div className="cards-3" style={{marginTop:40}}>
      {[
        {
          name: 'Maria Santos',
          shop: 'MariaPH Shop · Cebu',
          avatar: '👩',
          stars: 5,
          text: 'Dati 1-2 oras ako sa pag-copy paste ng messages. Ngayon 5 minutes lang. Yung repeat buyers ko tumaas ng 30% after using FollowShop!',
        },
        {
          name: 'Carlo Reyes',
          shop: 'TechGadgetsPH · Manila',
          avatar: '👨',
          stars: 5,
          text: 'Yung AI generator is a game changer. Hindi na ko nag-iisip ng messages — generates na siya ng magandang Taglish messages para sa buyers ko.',
        },
        {
          name: 'Ana Villanueva',
          shop: 'AnaFashion · Davao',
          avatar: '👩',
          stars: 5,
          text: 'Ang daming reviews na natanggap ko after using FollowShop. Dati 3-4 reviews per week, ngayon 15-20 na. Malaking tulong sa ranking ko sa Shopee!',
        },
      ].map((t, i) => (
        <div className="card" key={i} style={{position:'relative'}}>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:16}}>
            <div style={{
              width:44,height:44,borderRadius:12,
              background:'var(--orange-dim)',border:'1px solid var(--orange-border)',
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
            }}>{t.avatar}</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{t.name}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:1}}>{t.shop}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:2,marginBottom:12}}>
            {Array.from({length:t.stars}).map((_,j)=>(
              <span key={j} style={{color:'#F59E0B',fontSize:14}}>★</span>
            ))}
          </div>
          <p style={{fontSize:14,color:'var(--sub)',lineHeight:1.7,margin:0}}>"{t.text}"</p>
        </div>
      ))}
    </div>
  </div>
</section>

{/* FAQ */}
<section>
  <div className="container">
    <div className="section-tag">❓ FAQ</div>
    <h2>Common questions</h2>
    <div style={{marginTop:40,display:'flex',flexDirection:'column',gap:12,maxWidth:720}}>
      {[
        {
          q: 'Kailangan ba ng Shopee API?',
          a: 'Hindi! FollowShop works without any API. I-export mo lang ang orders mo mula sa Shopee Seller Center as CSV, i-upload dito, at handa na. Simple lang.',
        },
        {
          q: 'Auto ba talaga ang pag-send ng messages?',
          a: 'FollowShop automatically generates at queues ang tamang messages based sa iyong rules. Ikaw na lang mag-copy at mag-paste sa Shopee chat — 5 seconds per message.',
        },
        {
          q: 'Safe ba ang buyer data ko?',
          a: 'Yes. Naka-store ang lahat ng data sa iyong sariling account lang. Hindi namin ibinabahagi ang data mo sa kahit sino. Ginagamit namin ang Supabase para sa secure na storage.',
        },
        {
          q: 'Pwede ba sa Lazada at TikTok Shop?',
          a: 'Oo! Kahit saang platform ka mag-export ng CSV orders, pwede mo i-import sa FollowShop. Works sa Shopee, Lazada, TikTok Shop, at iba pa.',
        },
        {
          q: 'Paano kung mag-cancel ako?',
          a: 'Cancel anytime — walang lock-in. Mag-go ka lang sa Settings → Billing at i-cancel mo ang subscription. Hindi ka machi-charge after ng cancellation.',
        },
        {
          q: 'May free plan ba talaga?',
          a: 'Oo! Ang free plan ay forever free — 1 rule, 3 templates, 30 orders per month. Perfect para masubukan ang app bago mag-upgrade.',
        },
      ].map((item, i) => (
        <FAQItem key={i} q={item.q} a={item.a} />
      ))}
    </div>
  </div>
</section>
      {/* CTA */}
      <section className="cta-section">
        <div className="section-tag" style={{justifyContent:'center'}}>🚀 Get Started</div>
        <h2>Ready to automate<br/>your follow-ups?</h2>
        <p>Free to start. 7-day trial on paid plans. No credit card needed.</p>
        <a href="/signup" className="btn-primary" style={{margin:'0 auto',fontSize:16,padding:'15px 32px'}}>
          Create Free Account
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </section>

      {/* FOOTER */}
      <footer>
        <a href="/" className="footer-logo">Follow<span style={{color:'var(--orange)'}}>Shop</span></a>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="/pricing">Pricing</a>
          <a href="mailto:support@followshop.app">Contact</a>
        </div>
        <span className="footer-copy">© 2025 FollowShop. Made with ❤️ for SEA sellers.</span>
      </footer>
    </>
  )
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        background: '#fff',
        border: '1.5px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color .2s',
        ...(open ? {borderColor:'var(--orange-border)'} : {}),
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '16px 20px',
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: 12,
        }}
      >
        <span style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{q}</span>
        <span style={{
          width:24,height:24,borderRadius:6,
          background: open ? 'var(--orange)' : 'var(--bg3)',
          display:'flex',alignItems:'center',justifyContent:'center',
          flexShrink:0,transition:'background .2s',
        }}>
          <svg width="12" height="12" fill="none" stroke={open?'#fff':'var(--muted)'} strokeWidth="2.5" viewBox="0 0 24 24">
            {open
              ? <polyline points="18 15 12 9 6 15"/>
              : <polyline points="6 9 12 15 18 9"/>
            }
          </svg>
        </span>
      </button>
      {open && (
        <div style={{padding:'0 20px 16px',fontSize:14,color:'var(--sub)',lineHeight:1.7}}>
          {a}
        </div>
      )}
    </div>
  )
}
}