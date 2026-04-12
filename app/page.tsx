'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    })
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --orange: #EE4D2D;
          --orange-light: #FF6B47;
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
        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Plus Jakarta Sans', sans-serif;
          line-height: 1.6;
          overflow-x: hidden;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        .fade-up  { animation: fadeUp 0.6s ease both; }
        .delay-1  { animation-delay: 0.1s; }
        .delay-2  { animation-delay: 0.2s; }
        .delay-3  { animation-delay: 0.3s; }
        .delay-4  { animation-delay: 0.45s; }

        /* NAV */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 64px; padding: 0 40px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          color: var(--text); text-decoration: none;
          display: flex; align-items: center; gap: 8px;
        }
        .nav-logo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--orange); display: inline-block;
          animation: blink 2s ease infinite;
        }
        .nav-links { display: flex; align-items: center; gap: 28px; }
        .nav-links a {
          color: var(--sub); font-size: 14px; font-weight: 500;
          text-decoration: none; transition: color .15s;
        }
        .nav-links a:hover { color: var(--orange); }
        .nav-cta {
          background: var(--orange) !important; color: #fff !important;
          padding: 8px 18px !important; border-radius: 8px !important;
          font-weight: 700 !important;
        }
        .hamburger {
          display: none; flex-direction: column; gap: 5px;
          background: none; border: none; cursor: pointer; padding: 4px;
        }
        .hamburger span { display: block; width: 22px; height: 2px; background: var(--text); border-radius: 2px; }
        .mobile-menu {
          display: none; position: fixed; top: 64px; left: 0; right: 0; z-index: 99;
          background: #fff; border-bottom: 1px solid var(--border);
          padding: 20px 24px; flex-direction: column; gap: 16px;
        }
        .mobile-menu.open { display: flex; }
        .mobile-menu a {
          color: var(--sub); font-size: 15px; font-weight: 500;
          text-decoration: none; padding: 8px 0; border-bottom: 1px solid var(--border);
        }
        .mobile-menu a:last-child { border-bottom: none; }
        .mob-cta {
          background: var(--orange); color: #fff !important; text-align: center;
          padding: 12px !important; border-radius: 10px; font-weight: 700 !important;
          border-bottom: none !important;
        }

        /* HERO */
        .hero {
          padding: 120px 24px 80px; text-align: center;
          position: relative; overflow: hidden;
        }
        .hero-bg {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(238,77,45,0.07) 0%, transparent 70%);
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--orange-dim); border: 1px solid var(--orange-border);
          padding: 5px 14px; border-radius: 100px;
          font-size: 13px; font-weight: 600; color: var(--orange); margin-bottom: 24px;
        }
        .badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--orange); animation: blink 1.5s ease infinite;
        }
        h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(36px, 6vw, 68px); font-weight: 800;
          line-height: 1.08; letter-spacing: -0.03em;
          color: var(--text); max-width: 820px; margin: 0 auto 20px;
        }
        h1 em { font-style: normal; color: var(--orange); }
        .hero-sub {
          font-size: clamp(15px, 2vw, 18px); color: var(--sub);
          max-width: 500px; margin: 0 auto 36px; line-height: 1.7;
        }
        .hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; border-radius: 10px;
          background: var(--orange); color: #fff;
          font-size: 15px; font-weight: 700; text-decoration: none;
          transition: opacity .2s, transform .2s;
          box-shadow: 0 4px 20px rgba(238,77,45,0.3);
          border: none; cursor: pointer; font-family: inherit;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-outline {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; border-radius: 10px;
          background: #fff; color: var(--text);
          font-size: 15px; font-weight: 600; text-decoration: none;
          border: 1.5px solid var(--border); transition: border-color .2s;
        }
        .btn-outline:hover { border-color: #ccc; }

        /* MOCKUP */
        .hero-mockup {
          margin: 56px auto 0; max-width: 760px; width: 100%;
          background: #fff; border: 1.5px solid var(--border); border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05);
          animation: float 5s ease-in-out infinite;
        }
        .mockup-bar {
          background: var(--bg2); border-bottom: 1px solid var(--border);
          padding: 11px 18px; display: flex; align-items: center; gap: 7px;
        }
        .m-dot { width: 11px; height: 11px; border-radius: 50%; }
        .mockup-body { padding: 20px; }
        .mock-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;
        }
        .mock-stat {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;
        }
        .mock-stat-label { font-size: 11px; color: var(--muted); margin-bottom: 4px; font-weight: 500; }
        .mock-stat-value { font-size: 22px; font-weight: 800; font-family: 'Syne', sans-serif; }
        .mock-msgs { display: flex; flex-direction: column; gap: 8px; }
        .mock-msg {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
          padding: 12px 14px; display: flex; align-items: center; gap: 12px;
        }
        .mock-avatar {
          width: 34px; height: 34px; border-radius: 9px;
          background: var(--orange-dim); font-size: 16px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mock-info { flex: 1; min-width: 0; }
        .mock-name { font-size: 13px; font-weight: 700; color: var(--text); }
        .mock-text { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .mock-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; flex-shrink: 0; }
        .badge-p { background: rgba(249,115,22,0.1); color: #EA580C; }
        .badge-s { background: rgba(34,197,94,0.1); color: #16A34A; }
        .mock-copy {
          padding: 5px 11px; border-radius: 7px;
          background: var(--orange); color: #fff;
          font-size: 11px; font-weight: 700; border: none; cursor: pointer; flex-shrink: 0;
        }

        /* MARQUEE */
        .marquee-wrap {
          overflow: hidden; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
          padding: 13px 0; background: var(--bg2);
        }
        .marquee-track {
          display: flex; gap: 48px; width: max-content;
          animation: marquee 22s linear infinite;
        }
        .marquee-item {
          font-size: 13px; font-weight: 600; color: var(--muted);
          display: flex; align-items: center; gap: 8px; white-space: nowrap;
        }
        .marquee-item .accent { color: var(--orange); }

        /* SECTIONS */
        section { padding: 80px 24px; }
        .container { max-width: 1060px; margin: 0 auto; }
        .section-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--orange); margin-bottom: 14px;
        }
        h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(28px, 4vw, 46px); font-weight: 800;
          color: var(--text); line-height: 1.1; letter-spacing: -0.02em;
        }
        .section-sub { font-size: 16px; color: var(--sub); max-width: 480px; line-height: 1.7; margin-top: 14px; }
        .alt-bg { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }

        /* CARDS */
        .cards-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 48px; }
        .card {
          background: #fff; border: 1.5px solid var(--border); border-radius: 16px; padding: 24px;
          transition: border-color .2s, transform .2s;
        }
        .card:hover { border-color: var(--orange-border); transform: translateY(-2px); }
        .card-icon { font-size: 26px; margin-bottom: 14px; }
        .card-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 7px; }
        .card-desc { font-size: 14px; color: var(--sub); line-height: 1.65; }

        /* STEPS */
        .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 48px; }
        .step-card {
          background: #fff; border: 1.5px solid var(--border); border-radius: 16px; padding: 24px; text-align: center;
        }
        .step-num {
          width: 44px; height: 44px; border-radius: 12px; background: var(--orange); color: #fff;
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
        }
        .step-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 7px; }
        .step-desc { font-size: 14px; color: var(--sub); line-height: 1.65; }

        /* FEATURES */
        .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 48px; }
        .feat-card {
          background: #fff; border: 1.5px solid var(--border); border-radius: 14px; padding: 22px;
          display: flex; gap: 16px; align-items: flex-start; transition: border-color .2s;
        }
        .feat-card:hover { border-color: var(--orange-border); }
        .feat-card.highlight { border-color: var(--orange-border); background: var(--orange-dim); }
        .feat-icon {
          width: 44px; height: 44px; border-radius: 11px;
          background: var(--orange-dim); border: 1px solid var(--orange-border);
          display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;
        }
        .feat-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 5px; }
        .feat-desc { font-size: 13px; color: var(--sub); line-height: 1.6; }
        .feat-new {
          display: inline-block; font-size: 10px; font-weight: 700;
          background: var(--orange); color: #fff;
          padding: 2px 8px; border-radius: 20px; margin-left: 6px;
          vertical-align: middle; letter-spacing: 0.04em;
        }

        /* TESTIMONIALS */
        .testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 48px; }
        .testi-card { background: #fff; border: 1.5px solid var(--border); border-radius: 14px; padding: 22px; }
        .testi-stars { color: #F59E0B; font-size: 13px; margin-bottom: 12px; }
        .testi-text { font-size: 14px; color: var(--sub); line-height: 1.7; margin-bottom: 16px; font-style: italic; }
        .testi-author { display: flex; align-items: center; gap: 10px; }
        .testi-avatar {
          width: 34px; height: 34px; border-radius: 9px; background: var(--orange-dim);
          font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .testi-name { font-size: 13px; font-weight: 700; color: var(--text); }
        .testi-role { font-size: 12px; color: var(--muted); }

        /* EARLY ACCESS */
        .early-access-card {
          background: #fff; border: 1.5px solid var(--orange-border);
          border-radius: 18px; padding: 48px 36px; text-align: center;
          background: linear-gradient(135deg, var(--orange-dim) 0%, #fff 100%);
          margin-top: 48px;
        }
        .early-icon { font-size: 48px; margin-bottom: 16px; }
        .early-title { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; color: var(--text); margin-bottom: 10px; }
        .early-sub { font-size: 16px; color: var(--sub); margin-bottom: 28px; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto; }
        .early-slots {
          display: inline-flex; align-items: center; gap: 7px;
          background: #FFF7ED; border: 1px solid #FED7AA;
          padding: 5px 14px; border-radius: 100px;
          font-size: 13px; font-weight: 600; color: #C2410C; margin-bottom: 24px;
        }

        /* PRICING */
        .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 48px; align-items: start; }
        .price-card {
          background: #fff; border: 1.5px solid var(--border); border-radius: 18px; padding: 28px 24px; position: relative;
        }
        .price-card.featured { border-color: var(--orange); box-shadow: 0 0 0 4px var(--orange-dim); }
        .price-popular {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--orange); color: #fff; font-size: 11px; font-weight: 700;
          letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 14px; border-radius: 100px; white-space: nowrap;
        }
        .price-plan { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .price-amount { font-family: 'Syne', sans-serif; font-size: 42px; font-weight: 800; color: var(--text); line-height: 1; }
        .price-amount sup { font-size: 18px; vertical-align: super; }
        .price-period { font-size: 13px; color: var(--muted); margin: 4px 0 22px; }
        .price-divider { height: 1px; background: var(--border); margin-bottom: 20px; }
        .price-features { list-style: none; display: flex; flex-direction: column; gap: 11px; margin-bottom: 24px; }
        .price-features li { font-size: 14px; color: var(--sub); display: flex; align-items: center; gap: 9px; }
        .price-features li::before {
          content: '✓'; width: 19px; height: 19px; border-radius: 6px;
          background: rgba(34,197,94,0.1); color: #16A34A;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; flex-shrink: 0;
        }
        .price-btn {
          display: block; width: 100%; padding: 11px; border-radius: 9px; border: none; cursor: pointer;
          font-size: 14px; font-weight: 700; text-align: center; text-decoration: none;
          transition: opacity .2s, transform .2s; font-family: inherit;
        }
        .price-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .price-btn-orange { background: var(--orange); color: #fff; }
        .price-btn-ghost { background: transparent; color: var(--text); border: 1.5px solid var(--border) !important; }
        .price-btn-soon {
          background: var(--bg3); color: var(--muted);
          border: 1.5px solid var(--border) !important; cursor: not-allowed;
        }
        .price-btn-soon:hover { opacity: 1; transform: none; }
        .price-coming-soon {
          text-align: center; font-size: 11px; color: var(--muted);
          margin-top: 8px; font-weight: 500;
        }

        /* CTA */
        .cta-section {
          text-align: center; padding: 80px 24px 100px;
          background: var(--orange-dim); border-top: 1px solid var(--orange-border);
        }
        .cta-section h2 { margin-bottom: 14px; }
        .cta-section p { color: var(--sub); font-size: 17px; margin-bottom: 32px; }

        /* FOOTER */
        footer {
          background: var(--bg2); border-top: 1px solid var(--border);
          padding: 28px 40px; display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 16px;
        }
        .footer-logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; color: var(--text); text-decoration: none; }
        .footer-links { display: flex; gap: 20px; }
        .footer-links a { font-size: 13px; color: var(--muted); text-decoration: none; }
        .footer-links a:hover { color: var(--orange); }
        .footer-copy { font-size: 13px; color: var(--muted); }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          nav { padding: 0 20px; }
          .nav-links { display: none; }
          .hamburger { display: flex; }
          .hero { padding: 96px 20px 60px; }
          .cards-3, .steps-grid, .testi-grid, .pricing-grid, .features-grid { grid-template-columns: 1fr; }
          section { padding: 60px 20px; }
          footer { padding: 24px 20px; flex-direction: column; text-align: center; }
          .footer-links { justify-content: center; }
          .mock-copy { display: none; }
        }
        @media (max-width: 480px) {
          .hero-ctas { flex-direction: column; align-items: stretch; }
          .btn-primary, .btn-outline { justify-content: center; }
        }
      `}</style>

      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo">
          <span className="nav-logo-dot"></span>
          FollowShop
        </a>
        <div className="nav-links">
          <a href="#how">Paano Gumagana</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="/login" className="nav-cta">Mag-login →</a>
        </div>
        <button className="hamburger" onClick={() => {
          const m = document.querySelector('.mobile-menu')
          m?.classList.toggle('open')
        }} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </nav>

      {/* MOBILE MENU */}
      <div className="mobile-menu">
        <a href="#how">Paano Gumagana</a>
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="/signup" className="mob-cta">Subukan nang Libre →</a>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-badge fade-up"><span className="badge-dot"></span>Para sa Shopee Sellers ng Pilipinas</div>
        <h1 className="fade-up delay-1">I-automate ang<br/><em>follow-up messages</em><br/>sa iyong buyers</h1>
        <p className="hero-sub fade-up delay-2">Huwag hayaang mawala ang buyers pagkatapos mag-order. Set once — automatic na ang tamang message sa tamang oras.</p>
        <div className="hero-ctas fade-up delay-3">
          <a href="/signup" className="btn-primary">
            Subukan nang Libre
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
          <a href="#how" className="btn-outline">Paano gumagana?</a>
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
                { name: 'Maria Santos', text: 'Hi Maria! Salamat sa iyong order ng Wireless Earbuds. Naihatid na ba?', status: 'Pending', sent: false },
                { name: 'Juan dela Cruz', text: 'Kumusta ang iyong Phone Case? Pwede ka mag-leave ng review? 😊', status: 'Sent ✓', sent: true },
                { name: 'Ana Reyes', text: 'Special discount para sa iyong next order! 10% off gamit ang code FOLLOW10', status: 'Pending', sent: false },
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
          {['📦 Automated Follow-ups','⭐ Review Reminders','🔁 Repeat Buyer Campaigns','📋 CSV Import','✉️ Custom Templates','⚡ Rule Builder','🧩 Chrome Extension'].map((item, i) => (
            <div className="marquee-item" key={i}>{item}</div>
          ))}
          <div className="marquee-item"><span className="accent">Para sa Shopee Sellers 🇵🇭</span></div>
          {['📦 Automated Follow-ups','⭐ Review Reminders','🔁 Repeat Buyer Campaigns','📋 CSV Import','✉️ Custom Templates','⚡ Rule Builder','🧩 Chrome Extension'].map((item, i) => (
            <div className="marquee-item" key={`b${i}`}>{item}</div>
          ))}
          <div className="marquee-item"><span className="accent">Para sa Shopee Sellers 🇵🇭</span></div>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="alt-bg">
        <div className="container">
          <div className="section-tag">⚠️ Ang Problema</div>
          <h2>Nawawala ang pera mo<br/>dahil sa walang follow-up</h2>
          <p className="section-sub">Karamihan sa mga Shopee sellers ay hindi nag-fofollow up — dahil matagal at paulit-ulit ang proseso.</p>
          <div className="cards-3">
            {[
              { icon: '🛒', title: 'Buyers hindi bumabalik', desc: 'Nag-order sila once, tapos wala na. Walang follow-up = walang repeat purchase. Repeat buyers ang nagbibigay ng pinaka-malaking kita.' },
              { icon: '⏰', title: 'Matagal mag-manually send', desc: 'Kung may 50 orders ka kada linggo, mano-mano ka pa ring nagco-copy-paste? Hindi scalable at hindi consistent.' },
              { icon: '⭐', title: 'Mababa ang reviews', desc: 'Kahit satisfied ang buyer, hindi sila nag-iiwan ng review unless hinihingan. Mas maraming reviews = mas mataas na Shopee ranking.' },
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
          <div className="section-tag">🚀 Paano Gumagana</div>
          <h2>Set once,<br/>automatic na ang lahat</h2>
          <p className="section-sub">Tatlong simpleng hakbang — tapos huwag nang alalahanin pa.</p>
          <div className="steps-grid">
            {[
              { n: '1', title: 'I-upload ang Orders', desc: 'I-export ang orders mula sa Shopee Seller Center, i-import sa FollowShop via CSV — o manual input kung gusto mo.' },
              { n: '2', title: 'Gumawa ng Rules', desc: 'I-set kung kailan at anong message ang isesend. "3 days after delivery → Thank You + review request." Isang beses lang i-set.' },
              { n: '3', title: 'I-copy at I-send', desc: 'Araw-araw, makikita mo sa dashboard ang ready-to-send messages. I-copy, i-paste sa Shopee chat — tapos na!' },
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
          <h2>Lahat ng kailangan mo<br/>— wala nang kulang</h2>
          <div className="features-grid">
            {[
              { icon: '📋', title: 'CSV Import', desc: 'I-export ang orders sa Shopee, i-upload sa FollowShop. Lahat ng buyer data — automatic na naka-organize.' },
              { icon: '⚡', title: 'Rule Builder', desc: 'Gumawa ng custom rules — "1 day after order", "7 days after delivery", "repeat buyer". Simple at madaling gamitin.' },
              { icon: '✉️', title: 'Message Templates', desc: 'Templates na may dynamic variables — {{buyer_name}}, {{product}}, {{delivery_date}}. Personalized ang dating ng bawat message.' },
              { icon: '📬', title: 'Message Queue', desc: 'Ready-to-send messages nasa isang lugar. I-click ang Copy, i-paste sa Shopee. Mark as sent para ma-track.' },
              { icon: '📊', title: 'Dashboard Overview', desc: 'I-track ang lahat — total orders, delivered, pending messages, active rules. Lahat nakikita sa isang screen.' },
              { icon: '🔁', title: 'Auto-Scheduling', desc: 'Hindi mo kailangang mag-check araw-araw. Automatic na nag-ge-generate ng messages base sa rules — every hour nag-rurun.' },
              { icon: '🧩', title: 'Chrome Extension', desc: 'I-install ang FollowShop extension — makita ang lahat ng pending messages kahit nasa Shopee ka na. One-click copy, tapos send!', isNew: true },
            ].map((f, i) => (
              <div className={`feat-card${f.isNew ? ' highlight' : ''}`} key={i}>
                <div className="feat-icon">{f.icon}</div>
                <div>
                  <div className="feat-title">
                    {f.title}
                    {f.isNew && <span className="feat-new">NEW</span>}
                  </div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — Early Access */}
      <section>
        <div className="container">
          <div className="section-tag">💬 Mga Sabi Nila</div>
          <h2>Maging isa sa mga<br/>unang makakapagsabi</h2>
          <div className="early-access-card">
            <div className="early-icon">🚀</div>
            <div className="early-title">Bagong-Launch pa lang kami!</div>
            <p className="early-sub">
              Naghahanap kami ng mga unang Shopee sellers na magtitry ng FollowShop — libre, walang credit card.
              Ang iyong feedback ang magiging pundasyon ng product na ito.
            </p>
            <div className="early-slots">
              <span style={{width:7,height:7,borderRadius:'50%',background:'#EE4D2D',display:'inline-block',animation:'blink 1.5s ease infinite'}}></span>
              Limitado lang ang early access slots
            </div>
            <br/>
            <a href="/signup" className="btn-primary" style={{display:'inline-flex',margin:'0 auto'}}>
              Maging Beta User — Libre
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="alt-bg">
        <div className="container">
          <div className="section-tag">💰 Pricing</div>
          <h2>Simple ang presyo,<br/>malaki ang value</h2>
          <p className="section-sub">Subukan nang libre — walang credit card needed.</p>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-plan">Free</div>
              <div className="price-amount"><sup>₱</sup>0</div>
              <div className="price-period">habang buhay</div>
              <div className="price-divider"></div>
              <ul className="price-features">
                <li>50 orders / buwan</li>
                <li>3 message templates</li>
                <li>2 active rules</li>
                <li>Basic dashboard</li>
                <li>Chrome Extension</li>
              </ul>
              <a href="/signup" className="price-btn price-btn-orange">Magsimula nang Libre</a>
            </div>
            <div className="price-card featured">
              <div className="price-popular">Coming Soon</div>
              <div className="price-plan">Pro</div>
              <div className="price-amount"><sup>₱</sup>299</div>
              <div className="price-period">bawat buwan</div>
              <div className="price-divider"></div>
              <ul className="price-features">
                <li>Unlimited orders</li>
                <li>Unlimited templates</li>
                <li>Unlimited rules</li>
                <li>Priority message queue</li>
                <li>Email support</li>
              </ul>
              <a href="mailto:hello@followshop.com?subject=Notify me about Pro plan" className="price-btn price-btn-soon">I-notify ako kapag available</a>
              <p className="price-coming-soon">📧 Ipadala namin sa email mo</p>
            </div>
            <div className="price-card">
              <div className="price-plan">Business</div>
              <div className="price-amount"><sup>₱</sup>599</div>
              <div className="price-period">bawat buwan</div>
              <div className="price-divider"></div>
              <ul className="price-features">
                <li>Lahat ng Pro features</li>
                <li>Multiple shops</li>
                <li>Team access</li>
                <li>Smart message AI</li>
                <li>Priority support</li>
              </ul>
              <a href="mailto:hello@followshop.com?subject=Notify me about Business plan" className="price-btn price-btn-soon">I-notify ako kapag available</a>
              <p className="price-coming-soon">📧 Ipadala namin sa email mo</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="section-tag" style={{justifyContent:'center'}}>🚀 Simulan Na</div>
        <h2>Handa ka na bang<br/>mag-automate?</h2>
        <p>Libre ang magsimula. Walang credit card. Setup in 5 minutes.</p>
        <a href="/signup" className="btn-primary" style={{margin:'0 auto',fontSize:16,padding:'15px 32px'}}>
          Gumawa ng Account — Libre
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </section>

      {/* FOOTER */}
      <footer>
        <a href="/" className="footer-logo">Follow<span style={{color:'var(--orange)'}}>Shop</span></a>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="mailto:hello@followshop.com">Contact</a>
        </div>
        <span className="footer-copy">© 2025 FollowShop. Made in 🇵🇭</span>
      </footer>
    </>
  )
}