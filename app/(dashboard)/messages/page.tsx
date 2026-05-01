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
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch ─────────────────────────────────────────────────────────────────

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

  // ── Notify ────────────────────────────────────────────────────────────────

  function notify(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
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

  // ── Copy message ──────────────────────────────────────────────────────────

  function copyMessage(text: string) {
    navigator.clipboard.writeText(text)
    notify('Message copied to clipboard!', 'success')
  }

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = messages.filter(m => {
    const matchSearch =
      m.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  })

  // ── Counts ────────────────────────────────────────────────────────────────

  const counts = {
    all:     messages.length,
    pending: messages.filter(m => m.status === 'pending').length,
    sent:    messages.filter(m => m.status === 'sent').length,
    failed:  messages.filter(m => m.status === 'failed').length,
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="messages-wrap" style={{ padding: '32px', maxWidth: 1000, margin: '0 auto', fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @media (max-width: 768px) {
          .messages-wrap { padding: 20px 16px !important; }
          .messages-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .messages-filters { flex-direction: column !important; align-items: stretch !important; }
          .messages-search { flex: unset !important; width: 100% !important; }
          .messages-pills { overflow-x: auto; flex-wrap: nowrap !important; scrollbar-width: none; -webkit-overflow-scrolling: touch; touch-action: pan-x; width: 100%; }
          .messages-pills::-webkit-scrollbar { display: none; }
          .messages-row { flex-wrap: wrap !important; }
          .messages-actions { width: 100%; justify-content: flex-end !important; margin-top: 6px; }
        }
        @media (max-width: 480px) {
          .messages-wrap { padding: 16px 12px !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="messages-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Messages</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
            {messages.length} total · {counts.pending} pending · {counts.sent} sent
          </p>
        </div>
      </div>

      {/* ── Toasts ── */}
      {success && <Toast msg={success} type="success" />}
      {error && <Toast msg={error} type="error" />}

      {/* ── Filters ── */}
      <div className="messages-filters" style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div className="messages-search" style={{ position: 'relative', flex: '1 1 220px' }}>
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

        {/* Status pills */}
        <div className="messages-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'pending', 'sent', 'failed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: statusFilter === s ? 'none' : '1.5px solid #E5E7EB',
              background: statusFilter === s ? '#EE4D2D' : '#fff',
              color: statusFilter === s ? '#fff' : '#6B7280',
              transition: 'all .15s',
            }}>
              {s === 'all' ? `All (${counts.all})` : `${STATUS_CONFIG[s].label} (${counts[s]})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages List ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
          Loading messages…
        </div>
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
            const isExpanded = expandedId === msg.id
            return (
              <div key={msg.id} style={{
                background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
                overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'box-shadow .15s',
              }}>
                {/* Row */}
                <div className="messages-row" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>

                  {/* Status dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: cfg.dot, flexShrink: 0,
                  }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#111', margin: 0 }}>
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
                    </div>
                    <p style={{
                      fontSize: 13, color: '#6B7280', margin: '4px 0 0',
                      whiteSpace: isExpanded ? 'pre-wrap' : 'nowrap',
                      overflow: isExpanded ? 'visible' : 'hidden',
                      textOverflow: isExpanded ? 'unset' : 'ellipsis',
                      lineHeight: 1.55,
                    }}>
                      {msg.message}
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
                      {formatDate(msg.scheduled_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="messages-actions" style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    {/* Expand/collapse */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                      title={isExpanded ? 'Collapse' : 'Expand message'}
                      style={{
                        padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E5E7EB',
                        background: isExpanded ? '#F3F4F6' : '#fff', cursor: 'pointer',
                        color: '#6B7280', transition: 'all .15s',
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        {isExpanded
                          ? <polyline points="18 15 12 9 6 15"/>
                          : <polyline points="6 9 12 15 18 9"/>
                        }
                      </svg>
                    </button>

                    {/* Copy */}
                    <button
                      onClick={() => copyMessage(msg.message)}
                      title="Copy message"
                      style={{
                        padding: '6px 8px', borderRadius: 8, border: '1.5px solid #E5E7EB',
                        background: '#fff', cursor: 'pointer', color: '#6B7280',
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>

                    {/* Mark sent (only if pending) */}
                    {msg.status === 'pending' && (
                      <button
                        onClick={() => markAsSent(msg.id)}
                        disabled={markingId === msg.id}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: 'none',
                          background: markingId === msg.id ? '#F3F4F6' : '#EE4D2D',
                          color: markingId === msg.id ? '#9CA3AF' : '#fff',
                          fontSize: 12, fontWeight: 600,
                          cursor: markingId === msg.id ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {markingId === msg.id ? '…' : '✓ Sent'}
                      </button>
                    )}

                    {/* Mark failed (only if pending) */}
                    {msg.status === 'pending' && (
                      <button
                        onClick={() => markAsFailed(msg.id)}
                        disabled={markingId === msg.id}
                        title="Mark as failed"
                        style={{
                          padding: '6px 8px', borderRadius: 8,
                          border: '1.5px solid #E5E7EB',
                          background: '#fff', cursor: 'pointer',
                          color: '#D1D5DB', transition: 'color .15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
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
                      onClick={() => handleDelete(msg.id)}
                      title="Delete"
                      style={{
                        padding: '6px 8px', borderRadius: 8,
                        border: '1.5px solid #E5E7EB',
                        background: '#fff', cursor: 'pointer',
                        color: '#D1D5DB', transition: 'color .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
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
            )
          })}
        </div>
      )}

      {/* ── Footer count ── */}
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

// ─── Styles / utils ───────────────────────────────────────────────────────────

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