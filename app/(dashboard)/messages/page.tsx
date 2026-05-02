'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageStatus = 'pending' | 'sent' | 'failed'

interface Message {
  id: string
  order_id: string
  buyer_name: string
  message: string
  trigger: string
  scheduled_at: string
  status: MessageStatus
}

const TRIGGER_LABELS: Record<string, string> = {
  delivered_1day:  '1 day after delivery',
  delivered_3days: '3 days after delivery',
  delivered_7days: '7 days after delivery',
  order_1day:      '1 day after order',
  order_3days:     '3 days after order',
  order_7days:     '7 days after order',
  no_review_7days: 'No review after 7 days',
  repeat_buyer:    'Repeat buyer',
}

const STATUS_CONFIG: Record<MessageStatus, { label: string; bg: string; color: string; dot: string }> = {
  pending: { label: 'Pending', bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  sent:    { label: 'Sent',    bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  failed:  { label: 'Failed',  bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchMessages() {
    setLoading(true)
    const { data, error } = await supabase
      .from('message_queue')
      .select('*')
      .order('scheduled_at', { ascending: false })
    if (error) notify(error.message, 'error')
    else setMessages(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMessages() }, [])

  function notify(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
  }

  // ── Copy & Mark as Sent in 1 click ───────────────────────────────────────
  async function copyAndMarkSent(msg: Message) {
    // 1. Copy to clipboard
    await navigator.clipboard.writeText(msg.message)
    setCopiedId(msg.id)
    setTimeout(() => setCopiedId(null), 2000)

    // 2. Mark as sent
    setMarkingId(msg.id)
    const { error } = await supabase
      .from('message_queue')
      .update({ status: 'sent' })
      .eq('id', msg.id)
    setMarkingId(null)
    if (error) return notify(error.message, 'error')

    notify('✅ Copied! I-paste na sa Shopee chat.', 'success')
    fetchMessages()
  }

  // ── Copy only ─────────────────────────────────────────────────────────────
  async function copyMessage(msg: Message) {
    await navigator.clipboard.writeText(msg.message)
    setCopiedId(msg.id)
    setTimeout(() => setCopiedId(null), 2000)
    notify('Copied to clipboard!', 'success')
  }

  // ── Mark as sent ──────────────────────────────────────────────────────────
  async function markAsSent(id: string) {
    setMarkingId(id)
    const { error } = await supabase
      .from('message_queue')
      .update({ status: 'sent' })
      .eq('id', id)
    setMarkingId(null)
    if (error) return notify(error.message, 'error')
    notify('Marked as sent!', 'success')
    fetchMessages()
  }

  // ── Mark as failed ────────────────────────────────────────────────────────
  async function markAsFailed(id: string) {
    setMarkingId(id)
    const { error } = await supabase
      .from('message_queue')
      .update({ status: 'failed' })
      .eq('id', id)
    setMarkingId(null)
    if (error) return notify(error.message, 'error')
    notify('Marked as failed.', 'success')
    fetchMessages()
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Delete this message from the queue?')) return
    const { error } = await supabase.from('message_queue').delete().eq('id', id)
    if (error) return notify(error.message, 'error')
    notify('Message deleted.', 'success')
    fetchMessages()
  }

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filtered = messages.filter(m => {
    const matchSearch =
      m.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    all:     messages.length,
    pending: messages.filter(m => m.status === 'pending').length,
    sent:    messages.filter(m => m.status === 'sent').length,
    failed:  messages.filter(m => m.status === 'failed').length,
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto', fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .msg-card { transition: box-shadow .15s; }
        .msg-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important; }

        .copy-sent-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 9px; border: none;
          background: #EE4D2D; color: #fff;
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: opacity .15s, transform .15s;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(238,77,45,0.25);
        }
        .copy-sent-btn:hover { opacity: .9; transform: translateY(-1px); }
        .copy-sent-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
        .copy-sent-btn.copied { background: #16A34A; }

        .copy-only-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 14px; border-radius: 9px;
          border: 1.5px solid #E5E7EB; background: #fff;
          color: #374151; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: all .15s;
          white-space: nowrap;
        }
        .copy-only-btn:hover { border-color: #EE4D2D; color: #EE4D2D; }

        .icon-btn {
          padding: 8px; border-radius: 8px;
          border: 1.5px solid #E5E7EB; background: #fff;
          color: #D1D5DB; cursor: pointer;
          transition: color .15s;
          display: flex; align-items: center; justify-content: center;
        }
        .icon-btn:hover { color: #EF4444; }

        @media (max-width: 768px) {
          .msg-actions { flex-wrap: wrap; }
          .copy-sent-btn { flex: 1; justify-content: center; }
        }
        @media (max-width: 600px) {
          .page-wrap { padding: 20px 16px !important; }
          .msg-actions { width: 100%; margin-top: 10px; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Messages</h1>
        <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
          {counts.pending} pending · {counts.sent} sent · {counts.all} total
        </p>
      </div>

      {/* ── How to use banner (only if may pending) ── */}
      {counts.pending > 0 && (
        <div style={{
          background: '#FFF7ED', border: '1.5px solid #FED7AA',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <p style={{ fontSize: 13, color: '#92400E', margin: 0, fontWeight: 500 }}>
            I-click ang <strong>"📋 Copy & Mark Sent"</strong> → pumunta sa Shopee chat → i-paste (Ctrl+V) → Send!
          </p>
        </div>
      )}

      {/* ── Toasts ── */}
      {success && <Toast msg={success} type="success" />}
      {error && <Toast msg={error} type="error" />}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="15" height="15" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search buyer or message…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'sent', 'failed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: statusFilter === s ? 'none' : '1.5px solid #E5E7EB',
              background: statusFilter === s ? '#EE4D2D' : '#fff',
              color: statusFilter === s ? '#fff' : '#6B7280',
              transition: 'all .15s', whiteSpace: 'nowrap',
            }}>
              {s === 'all' ? `All (${counts.all})` : `${STATUS_CONFIG[s as MessageStatus]?.label} (${counts[s]})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages List ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Loading messages…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
          padding: 60, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
          <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 6px', fontSize: 15 }}>
            {messages.length === 0 ? 'No messages yet' : 'No results found'}
          </p>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
            {messages.length === 0
              ? 'Messages will appear here once rules start triggering.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(msg => {
            const cfg = STATUS_CONFIG[msg.status]
            const isCopied = copiedId === msg.id
            const isMarking = markingId === msg.id
            return (
              <div key={msg.id} className="msg-card" style={{
                background: '#fff',
                border: `1.5px solid ${msg.status === 'pending' ? '#FED7AA' : '#E5E7EB'}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ padding: '16px 18px' }}>

                  {/* Top row — buyer + trigger + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#111', margin: 0 }}>
                      {msg.buyer_name}
                    </p>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: '#C2410C',
                      background: '#FFF7ED', border: '1px solid #FED7AA',
                      padding: '2px 8px', borderRadius: 10,
                    }}>
                      {TRIGGER_LABELS[msg.trigger] || msg.trigger}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: cfg.color, background: cfg.bg,
                      padding: '2px 8px', borderRadius: 10,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
                      {formatDate(msg.scheduled_at)}
                    </span>
                  </div>

                  {/* Message preview box */}
                  <div style={{
                    background: '#FAFAFA', border: '1px solid #F3F4F6',
                    borderRadius: 10, padding: '12px 14px', marginBottom: 12,
                    fontSize: 13, color: '#374151', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.message}
                  </div>

                  {/* Actions */}
                  <div className="msg-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

                    {/* PRIMARY: Copy & Mark Sent (only pending) */}
                    {msg.status === 'pending' && (
                      <button
                        className={`copy-sent-btn${isCopied ? ' copied' : ''}`}
                        onClick={() => copyAndMarkSent(msg)}
                        disabled={isMarking}
                      >
                        {isCopied ? (
                          <>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            {isMarking ? 'Saving…' : '📋 Copy & Mark Sent'}
                          </>
                        )}
                      </button>
                    )}

                    {/* SECONDARY: Copy only (for sent/failed) */}
                    {msg.status !== 'pending' && (
                      <button className="copy-only-btn" onClick={() => copyMessage(msg)}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    )}

                    {/* Open Shopee chat */}
                    <a
                      href="https://seller.shopee.ph/chat"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '9px 14px', borderRadius: 9,
                        border: '1.5px solid #E5E7EB', background: '#fff',
                        color: '#374151', fontSize: 13, fontWeight: 600,
                        textDecoration: 'none', transition: 'all .15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = '#EE4D2D'
                        ;(e.currentTarget as HTMLAnchorElement).style.color = '#EE4D2D'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E5E7EB'
                        ;(e.currentTarget as HTMLAnchorElement).style.color = '#374151'
                      }}
                    >
                      🛍️ Open Shopee
                    </a>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      {/* Mark as sent manually (if pending) */}
                      {msg.status === 'pending' && (
                        <button
                          className="icon-btn"
                          onClick={() => markAsSent(msg.id)}
                          disabled={isMarking}
                          title="Mark as sent without copying"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                      )}

                      {/* Mark as failed (if pending) */}
                      {msg.status === 'pending' && (
                        <button
                          className="icon-btn"
                          onClick={() => markAsFailed(msg.id)}
                          disabled={isMarking}
                          title="Mark as failed"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        className="icon-btn"
                        onClick={() => handleDelete(msg.id)}
                        title="Delete"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, textAlign: 'right' }}>
          Showing {filtered.length} of {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  const isSuccess = type === 'success'
  return (
    <div style={{
      background: isSuccess ? '#F0FDF4' : '#FEF2F2',
      border: `1px solid ${isSuccess ? '#BBF7D0' : '#FECACA'}`,
      color: isSuccess ? '#15803D' : '#B91C1C',
      padding: '11px 16px', borderRadius: 10, marginBottom: 16,
      fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {isSuccess
        ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {msg}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111',
  outline: 'none', background: '#fff', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return dateStr }
}