'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = 'pending' | 'delivered' | 'cancelled' | 'returned'

interface Order {
  id: string
  buyer_name: string
  product: string
  order_date: string
  delivery_date: string | null
  status: OrderStatus
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
  buyer_name: '',
  product: '',
  order_date: '',
  delivery_date: '',
  status: 'pending',
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; color: string; dot: string }> = {
  pending:   { label: 'Pending',   bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  delivered: { label: 'Delivered', bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  returned:  { label: 'Returned',  bg: '#F5F3FF', color: '#6D28D9', dot: '#8B5CF6' },
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Omit<Order, 'id' | 'created_at'>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const results: Omit<Order, 'id' | 'created_at'>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })

    const status = (['pending', 'delivered', 'cancelled', 'returned'].includes(row.status)
      ? row.status : 'pending') as OrderStatus

    results.push({
      buyer_name: row.buyer_name || row['buyer name'] || '',
      product: row.product || '',
      order_date: row.order_date || row['order date'] || '',
      delivery_date: row.delivery_date || row['delivery date'] || null,
      status,
    })
  }

  return results.filter(r => r.buyer_name && r.product)
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [csvPreview, setCsvPreview] = useState<Omit<Order, 'id' | 'created_at'>[] | null>(null)
  const [csvFileName, setCsvFileName] = useState('')

  // ── Fetch orders ─────────────────────────────────────────────────────────────

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  // ── Notify helpers ───────────────────────────────────────────────────────────

  function notify(msg: string, type: 'success' | 'error') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
  }

  // ── Manual form submit ───────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  if (!form.buyer_name || !form.product || !form.order_date) {
    return notify('Please fill in all required fields.', 'error')
  }
  setSubmitting(true)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notify('Not logged in.', 'error')

  const { error } = await supabase.from('orders').insert([{
    buyer_name: form.buyer_name,
    product: form.product,
    order_date: form.order_date,
    delivery_date: form.delivery_date || null,
    status: form.status,
    user_id: user.id,
  }])

    setSubmitting(false)
    if (error) return notify(error.message, 'error')
    notify('Order added successfully!', 'success')
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchOrders()
  }

  // ── CSV upload ───────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseCSV(text)
      if (!parsed.length) return notify('No valid rows found in CSV. Check column headers.', 'error')
      setCsvPreview(parsed)
    }
    reader.readAsText(file)
  }

  async function handleCsvImport() {
  if (!csvPreview?.length) return
  setCsvUploading(true)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notify('Not logged in.', 'error')

  const rowsWithUser = csvPreview.map(row => ({ ...row, user_id: user.id }))
  const { error } = await supabase.from('orders').insert(rowsWithUser)
    setCsvUploading(false)
    if (error) return notify(error.message, 'error')
    notify(`${csvPreview.length} orders imported!`, 'success')
    setCsvPreview(null)
    setCsvFileName('')
    if (fileRef.current) fileRef.current.value = ''
    fetchOrders()
  }

  function cancelCsvPreview() {
    setCsvPreview(null)
    setCsvFileName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Delete order ─────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this order?')) return
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) return notify(error.message, 'error')
    notify('Order deleted.', 'success')
    fetchOrders()
  }

  // ── Filtered orders ──────────────────────────────────────────────────────────

  const filtered = orders.filter(o => {
    const matchSearch =
      o.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.product.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Google Font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>Orders</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
            {orders.length} total order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* CSV Upload button */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
            border: '1.5px solid #E5E7EB', borderRadius: 10, cursor: 'pointer',
            fontSize: 14, fontWeight: 500, color: '#374151', background: '#fff',
            transition: 'border-color .15s',
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import CSV
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>

          {/* Add Order button */}
          <button
            onClick={() => { setShowForm(v => !v); setForm(EMPTY_FORM) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              background: '#EE4D2D', color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Order
          </button>
        </div>
      </div>

      {/* ── Toast notifications ── */}
      {success && (
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D',
          padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {success}
        </div>
      )}
      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
          padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── CSV Preview Modal ── */}
      {csvPreview && (
        <div style={{
          background: '#FFFBF5', border: '1.5px solid #FED7AA', borderRadius: 14,
          padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#111', margin: 0 }}>
                CSV Preview — {csvFileName}
              </p>
              <p style={{ fontSize: 13, color: '#888', margin: '3px 0 0' }}>
                {csvPreview.length} rows detected. Review before importing.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelCsvPreview} style={{
                padding: '7px 14px', borderRadius: 8, border: '1.5px solid #E5E7EB',
                background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151',
              }}>Cancel</button>
              <button onClick={handleCsvImport} disabled={csvUploading} style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                background: '#EE4D2D', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                {csvUploading ? 'Importing…' : `Import ${csvPreview.length} Orders`}
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #FED7AA' }}>
                  {['Buyer Name', 'Product', 'Order Date', 'Delivery Date', 'Status'].map(h => (
                    <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600, color: '#C2410C' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvPreview.slice(0, 5).map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #FEE2B0' }}>
                    <td style={{ padding: '7px 12px', color: '#374151' }}>{row.buyer_name}</td>
                    <td style={{ padding: '7px 12px', color: '#374151' }}>{row.product}</td>
                    <td style={{ padding: '7px 12px', color: '#374151' }}>{row.order_date}</td>
                    <td style={{ padding: '7px 12px', color: '#374151' }}>{row.delivery_date || '—'}</td>
                    <td style={{ padding: '7px 12px' }}>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {csvPreview.length > 5 && (
              <p style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 12px 0', margin: 0 }}>
                + {csvPreview.length - 5} more rows not shown
              </p>
            )}
          </div>

          {/* Expected CSV format hint */}
          <details style={{ marginTop: 14 }}>
            <summary style={{ fontSize: 12, color: '#9CA3AF', cursor: 'pointer', userSelect: 'none' }}>
              Expected CSV format
            </summary>
            <pre style={{
              marginTop: 8, padding: '10px 14px', background: '#FFF7ED',
              borderRadius: 8, fontSize: 11, color: '#78350F', overflowX: 'auto',
            }}>
{`buyer_name,product,order_date,delivery_date,status
Juan dela Cruz,Wireless Earbuds,2024-01-15,2024-01-18,delivered
Maria Santos,Phone Case,2024-01-16,,pending`}
            </pre>
          </details>
        </div>
      )}

      {/* ── Add Order Form ── */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
          padding: 24, marginBottom: 28,
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 20px' }}>New Order</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              <FormField label="Buyer Name *">
                <input
                  type="text"
                  placeholder="e.g. Juan dela Cruz"
                  value={form.buyer_name}
                  onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Product *">
                <input
                  type="text"
                  placeholder="e.g. Wireless Earbuds"
                  value={form.product}
                  onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Order Date *">
                <input
                  type="date"
                  value={form.order_date}
                  onChange={e => setForm(f => ({ ...f, order_date: e.target.value }))}
                  required
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Delivery Date">
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))}
                  style={inputStyle}
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as OrderStatus }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="pending">Pending</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="returned">Returned</option>
                </select>
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{
                padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E5E7EB',
                background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#374151',
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                padding: '9px 22px', borderRadius: 9, border: 'none',
                background: submitting ? '#F87171' : '#EE4D2D', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
              }}>
                {submitting ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="15" height="15" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search buyer or product…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'delivered', 'cancelled', 'returned'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: statusFilter === s ? 'none' : '1.5px solid #E5E7EB',
              background: statusFilter === s ? '#EE4D2D' : '#fff',
              color: statusFilter === s ? '#fff' : '#6B7280',
              transition: 'all .15s',
            }}>
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Orders Table ── */}
      <div style={{
        background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14,
        overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
            Loading orders…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📦</div>
            <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 6px', fontSize: 15 }}>
              {orders.length === 0 ? 'No orders yet' : 'No results found'}
            </p>
            <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
              {orders.length === 0
                ? 'Add your first order manually or import a CSV file.'
                : 'Try a different search or filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #F3F4F6', background: '#FAFAFA' }}>
                  {['Buyer Name', 'Product', 'Order Date', 'Delivery Date', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '13px 16px', textAlign: 'left',
                      fontSize: 12, fontWeight: 600, color: '#9CA3AF',
                      letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <tr key={order.id} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                    transition: 'background .1s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#111' }}>
                      {order.buyer_name}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#374151' }}>
                      {order.product}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6B7280' }}>
                      {formatDate(order.order_date)}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6B7280' }}>
                      {order.delivery_date ? formatDate(order.delivery_date) : (
                        <span style={{ color: '#D1D5DB' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(order.id)}
                        title="Delete order"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#D1D5DB', padding: 6, borderRadius: 6,
                          transition: 'color .15s',
                        }}
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

      {/* ── Footer count ── */}
      {!loading && filtered.length > 0 && (
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12, textAlign: 'right' }}>
          Showing {filtered.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1.5px solid #E5E7EB', fontSize: 14, color: '#111',
  outline: 'none', background: '#fff', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return dateStr
  }
}