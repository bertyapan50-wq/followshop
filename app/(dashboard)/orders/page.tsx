'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Plan } from '@/types'

type OrderStatus = 'pending' | 'delivered' | 'cancelled' | 'returned'

interface Order {
  id: string
  buyer_name: string
  product: string
  order_date: string
  delivery_date: string | null
  status: string
  created_at: string
}

interface FormState {
  buyer_name: string
  product: string
  order_date: string
  delivery_date: string
  status: OrderStatus
}

const EMPTY_FORM: FormState = {
  buyer_name: '', product: '', order_date: '', delivery_date: '', status: 'pending',
}

const PLAN_LIMITS: Record<Plan, number> = {
  free: 30, starter: 300, pro: Infinity,
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:       { label: 'Pending',   bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  delivered:     { label: 'Delivered', bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  cancelled:     { label: 'Cancelled', bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  returned:      { label: 'Returned',  bg: '#F5F3FF', color: '#6D28D9', dot: '#8B5CF6' },
  READY_TO_SHIP: { label: 'To Ship',   bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  SHIPPED:       { label: 'Shipped',   bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  COMPLETED:     { label: 'Completed', bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  CANCELLED:     { label: 'Cancelled', bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  UNPAID:        { label: 'Unpaid',    bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  TO_RETURN:     { label: 'To Return', bg: '#F5F3FF', color: '#6D28D9', dot: '#8B5CF6' },
}
const DEFAULT_STATUS = { label: 'Unknown', bg: '#F9FAFB', color: '#6B7280', dot: '#9CA3AF' }

function parseCSV(text: string): Omit<Order, 'id' | 'created_at'>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const results: Omit<Order, 'id' | 'created_at'>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    results.push({
      buyer_name: row.buyer_name || row['buyer name'] || '',
      product: row.product || '',
      order_date: row.order_date || row['order date'] || '',
      delivery_date: row.delivery_date || row['delivery date'] || null,
      status: row.status || 'pending',
    })
  }
  return results.filter(r => r.buyer_name && r.product)
}

export default function OrdersPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [plan, setPlan] = useState<Plan>('free')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [csvPreview, setCsvPreview] = useState<Omit<Order, 'id' | 'created_at'>[] | null>(null)
  const [csvFileName, setCsvFileName] = useState('')

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: sub } = await supabase.from('subscriptions').select('plan').eq('user_id', uid).single()
        setPlan((sub?.plan as Plan) || 'free')
      }
    })
    fetchOrders()
  }, [])

  function notify(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
  }

  // ── Plan limit check ────────────────────────────────────────────────────────
  const orderLimit = PLAN_LIMITS[plan]
  const isAtLimit = orders.length >= orderLimit
  const isNearLimit = orders.length >= orderLimit * 0.8 && !isAtLimit

  function checkLimit(): boolean {
    if (isAtLimit) {
      notify(`You've reached the ${orderLimit} order limit on the ${plan} plan. Please upgrade to add more.`, 'error')
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!checkLimit()) return
    if (!form.buyer_name || !form.product || !form.order_date) return notify('Please fill in all required fields.', 'error')
    if (!userId) return notify('Not logged in.', 'error')
    setSubmitting(true)
    const { error } = await supabase.from('orders').insert([{
      buyer_name: form.buyer_name, product: form.product,
      order_date: form.order_date, delivery_date: form.delivery_date || null,
      status: form.status, user_id: userId,
    }])
    setSubmitting(false)
    if (error) return notify(error.message, 'error')
    notify('Order added!', 'success')
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchOrders()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (!parsed.length) return notify('No valid rows found in CSV.', 'error')

      // Check if CSV would exceed limit
      if (plan !== 'pro' && orders.length + parsed.length > orderLimit) {
        const canAdd = orderLimit - orders.length
        notify(
          canAdd <= 0
            ? `You've reached the ${orderLimit} order limit. Upgrade to import more.`
            : `CSV has ${parsed.length} rows but you can only add ${canAdd} more (limit: ${orderLimit}). Upgrade or reduce CSV rows.`,
          'error'
        )
        setCsvFileName('')
        if (fileRef.current) fileRef.current.value = ''
        return
      }
      setCsvPreview(parsed)
    }
    reader.readAsText(file)
  }

  async function handleCsvImport() {
    if (!csvPreview?.length || !userId) return
    setCsvUploading(true)
    const rowsWithUser = csvPreview.map(row => ({ ...row, user_id: userId }))
    const { error } = await supabase.from('orders').insert(rowsWithUser)
    setCsvUploading(false)
    if (error) return notify(error.message, 'error')
    notify(`${csvPreview.length} orders imported!`, 'success')
    setCsvPreview(null); setCsvFileName('')
    if (fileRef.current) fileRef.current.value = ''
    fetchOrders()
  }

  function cancelCsvPreview() {
    setCsvPreview(null); setCsvFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(id: string) {
    setOrders(prev => prev.filter(o => o.id !== id))
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) { fetchOrders(); notify(error.message, 'error') }
  }

  const filtered = orders.filter(o => {
    const matchSearch = o.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) || o.product.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Orders</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {plan !== 'pro' && (
              <span style={{ color: isAtLimit ? '#EF4444' : isNearLimit ? '#F97316' : '#9CA3AF' }}>
                {' '}/ {orderLimit} limit
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            border: '1.5px solid #E5E7EB', borderRadius: 10,
            cursor: isAtLimit ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 500,
            color: isAtLimit ? '#9CA3AF' : '#374151',
            background: '#fff', opacity: isAtLimit ? 0.6 : 1,
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import CSV
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} disabled={isAtLimit} />
          </label>
          <button
            onClick={() => { if (!checkLimit()) return; setShowForm(v => !v); setForm(EMPTY_FORM) }}
            disabled={isAtLimit}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: isAtLimit ? '#F3F4F6' : '#EE4D2D',
              color: isAtLimit ? '#9CA3AF' : '#fff',
              border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              cursor: isAtLimit ? 'not-allowed' : 'pointer',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Order
          </button>
        </div>
      </div>

      {/* ── Limit warning banner ── */}
      {(isAtLimit || isNearLimit) && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 12,
          background: isAtLimit ? '#FEF2F2' : '#FFFBEB',
          border: `1.5px solid ${isAtLimit ? '#FECACA' : '#FDE68A'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>{isAtLimit ? '🚨' : '⚠️'}</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: isAtLimit ? '#B91C1C' : '#92400E', margin: 0 }}>
              {isAtLimit
                ? `You've reached the ${orderLimit}-order limit on the ${plan} plan.`
                : `${orders.length}/${orderLimit} orders used — almost at your limit!`}
            </p>
          </div>
          <Link href="/pricing" style={{
            padding: '7px 16px', borderRadius: 8, background: '#EE4D2D', color: '#fff',
            fontSize: 13, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Upgrade plan →
          </Link>
        </div>
      )}

      {/* ── Toasts ── */}
      {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>✅ {success}</div>}
      {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>❌ {error}</div>}

      {/* ── CSV Preview ── */}
      {csvPreview && (
        <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontWeight: 700, color: '#0369A1', fontSize: 14, margin: 0 }}>📋 CSV Preview — {csvFileName}</p>
              <p style={{ fontSize: 12, color: '#0369A1', margin: '3px 0 0' }}>{csvPreview.length} rows ready to import</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelCsvPreview} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #BAE6FD', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={handleCsvImport} disabled={csvUploading} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: csvUploading ? '#7DD3FC' : '#0369A1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: csvUploading ? 'not-allowed' : 'pointer' }}>
                {csvUploading ? 'Importing…' : `Import ${csvPreview.length} orders`}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12, color: '#0369A1' }}>
            {csvPreview.slice(0, 5).map((r, i) => (
              <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid #E0F2FE' }}>
                {r.buyer_name} — {r.product} ({r.status})
              </div>
            ))}
            {csvPreview.length > 5 && <p style={{ margin: '6px 0 0', color: '#7DD3FC' }}>+{csvPreview.length - 5} more rows…</p>}
          </div>
        </div>
      )}

      {/* ── Add Order Form ── */}
      {showForm && (
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 24, marginBottom: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 20px' }}>New Order</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              <div>
                <label style={labelStyle}>Buyer Name *</label>
                <input type="text" placeholder="e.g. Juan dela Cruz" value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Product *</label>
                <input type="text" placeholder="e.g. Wireless Earbuds" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Order Date *</label>
                <input type="date" value={form.order_date} onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Delivery Date</label>
                <input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as OrderStatus }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="pending">Pending</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: submitting ? '#F87171' : '#EE4D2D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <input type="text" placeholder="Search buyer or product…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ ...inputStyle, paddingLeft: 36, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: statusFilter === s ? 'none' : '1.5px solid #E5E7EB',
              background: statusFilter === s ? '#EE4D2D' : '#fff',
              color: statusFilter === s ? '#fff' : '#6B7280',
            }}>
              {s === 'all' ? 'All' : (STATUS_CONFIG[s]?.label || s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 6px', fontSize: 15 }}>
              {orders.length === 0 ? 'No orders yet' : 'No results found'}
            </p>
            <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
              {orders.length === 0 ? 'Add your first order or import via CSV.' : 'Try a different search or filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #F3F4F6', background: '#FAFAFA' }}>
                  {['Buyer Name', 'Product', 'Order Date', 'Delivery Date', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <tr key={order.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111' }}>{order.buyer_name}</td>
                    <td style={{ padding: '14px 16px', color: '#374151' }}>{order.product}</td>
                    <td style={{ padding: '14px 16px', color: '#6B7280' }}>{formatDate(order.order_date)}</td>
                    <td style={{ padding: '14px 16px', color: '#6B7280' }}>{order.delivery_date ? formatDate(order.delivery_date) : <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={order.status} /></td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button onClick={() => handleDelete(order.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 6, borderRadius: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                      >
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, textAlign: 'right' }}>
          Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || DEFAULT_STATUS
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111',
  outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return dateStr }
}