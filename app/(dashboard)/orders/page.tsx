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

  // Parse headers
  const headers = lines[0].split('\t').map(h => h.trim().replace(/^"|"$/g, ''))

  // Helper to find column index (case-insensitive)
  const col = (name: string) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase())

  // Detect if this is a Shopee export or generic CSV
  const isShopee = col('Username (Buyer)') !== -1 || col('Order ID') !== -1

  const results: Omit<Order, 'id' | 'created_at'>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle both tab-separated (Shopee) and comma-separated (generic)
    const values = isShopee
      ? line.split('\t').map(v => v.trim().replace(/^"|"$/g, ''))
      : parseCSVLine(line)

    const get = (name: string) => {
      const idx = col(name)
      return idx !== -1 ? (values[idx] || '').trim() : ''
    }

    let buyer_name: string
    let product: string
    let order_date: string
    let delivery_date: string | null
    let status: string

    if (isShopee) {
      // ── Shopee format ──
      buyer_name   = get('Receiver Name') || get('Username (Buyer)')
      product      = get('Product Name')
      order_date   = formatShopeeDate(get('Order Creation Date'))
      delivery_date = get('Order Complete Time')
        ? formatShopeeDate(get('Order Complete Time'))
        : null
      status       = mapShopeeStatus(get('Order Status'))
    } else {
      // ── Generic CSV format ──
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h] = values[idx] || '' })
      buyer_name    = row['buyer_name'] || row['buyer name'] || row['Buyer Name'] || ''
      product       = row['product'] || row['Product'] || row['Product Name'] || ''
      order_date    = row['order_date'] || row['order date'] || row['Order Date'] || ''
      delivery_date = row['delivery_date'] || row['delivery date'] || null
      status        = row['status'] || row['Status'] || 'pending'
    }

    if (!buyer_name || !product) continue

    results.push({ buyer_name, product, order_date, delivery_date: delivery_date || null, status })
  }

  return results
}

// ── Parse a single CSV line (handles quoted fields with commas) ──
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// ── Convert Shopee date format to YYYY-MM-DD ──
// Shopee format: "2024-01-15 14:30:00" or "15/01/2024 14:30"
function formatShopeeDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0]
    }
    // Try DD/MM/YYYY format
    const parts = dateStr.split(/[\/\s]/)
    if (parts.length >= 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
  } catch { /* ignore */ }
  return dateStr
}

// ── Map Shopee status to our status values ──
function mapShopeeStatus(shopeeStatus: string): string {
  const map: Record<string, string> = {
    'READY_TO_SHIP': 'READY_TO_SHIP',
    'SHIPPED':       'SHIPPED',
    'COMPLETED':     'delivered',
    'CANCELLED':     'cancelled',
    'UNPAID':        'pending',
    'TO_RETURN':     'returned',
    'IN_CANCEL':     'cancelled',
    'TO_CONFIRM_RECEIVE': 'SHIPPED',
  }
  return map[shopeeStatus] || shopeeStatus || 'pending'
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

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    // ✅ Excel file
    reader.onload = async ev => {
      const XLSX = await import('xlsx')
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const text = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' })
      processParsed(text)
    }
    reader.readAsArrayBuffer(file)
  } else {
    // ✅ CSV file
    reader.onload = ev => {
      const text = ev.target?.result as string
      processParsed(text)
    }
    reader.readAsText(file)
  }
}

function processParsed(text: string) {
  const lines = text.trim().split('\n')
  console.log('=== HEADERS ===', lines[0])
  console.log('=== ROW 1 ===', lines[1])
  console.log('=== TOTAL LINES ===', lines.length)

  const parsed = parseCSV(text)
  console.log('=== PARSED RESULT ===', parsed)

  if (!parsed.length) return notify('No valid rows found. Check your file format.', 'error')
  if (plan !== 'pro' && orders.length + parsed.length > orderLimit) {
    const canAdd = orderLimit - orders.length
    notify(
      canAdd <= 0
        ? `You've reached the ${orderLimit} order limit. Upgrade to import more.`
        : `File has ${parsed.length} rows but you can only add ${canAdd} more (limit: ${orderLimit}).`,
      'error'
    )
    setCsvFileName('')
    if (fileRef.current) fileRef.current.value = ''
    return
  }
  setCsvPreview(parsed)
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
    <div className="orders-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .orders-page {
  padding: 28px 32px;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'DM Sans', sans-serif;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

        /* ── Page header ── */
        .orders-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 12px;
        }
        .orders-header-actions {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }

        /* ── Form grid ── */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 20px;
        }

        /* ── Filter row ── */
        .filter-row {
          display: flex;
          gap: 10px;
          margin-bottom: 18px;
          flex-wrap: wrap;
          align-items: center;
          overflow: hidden;
        }
        .filter-search {
          position: relative;
          flex: 1 1 220px;
          min-width: 0;
        }
        .filter-search input {
          width: 100%;
          box-sizing: border-box;
        }
        .filter-status-group {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-wrap: wrap;
        }

        /* ── Table card rows on mobile ── */
        .orders-table-wrap {
  background: #fff;
  border: 1.5px solid #E5E7EB;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  max-width: 100%;
}
        .orders-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .orders-table th {
          padding: 13px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #9CA3AF;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: #FAFAFA;
          border-bottom: 1.5px solid #F3F4F6;
        }
        .orders-table td {
          padding: 14px 16px;
        }
        /* columns to hide on mobile */
        .col-delivery,
        .col-delivery-head {
          /* visible by default */
        }

        /* ── Mobile card list (hidden on desktop) ── */
        .mobile-orders-list {
          display: none;
        }
        .mobile-order-card {
          padding: 16px;
          border-bottom: 1px solid #F3F4F6;
        }
        .mobile-order-card:last-child {
          border-bottom: none;
        }
        .mobile-order-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 6px;
        }
        .mobile-order-buyer {
          font-weight: 700;
          color: #111;
          font-size: 15px;
          line-height: 1.3;
        }
        .mobile-order-product {
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 8px;
        }
        .mobile-order-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mobile-order-date {
          font-size: 12px;
          color: #9CA3AF;
        }

        /* ── CSV preview ── */
        .csv-preview-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* ── Responsive: tablet (≤768px) ── */
        @media (max-width: 768px) {
          .orders-page {
            padding: 20px 16px;
            overflow-x: hidden;
          }

          /* Stack header vertically */
          .orders-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }
          .orders-header-actions {
            width: 100%;
          }
          .orders-header-actions > * {
            flex: 1;
            justify-content: center;
          }

          /* Single-column form */
          .form-grid {
            grid-template-columns: 1fr;
          }

          /* Hide table, show cards */
          .orders-table-desktop {
            display: none !important;
          }
          .mobile-orders-list {
            display: block;
          }

          /* Filter row: search full width, status pills wrap */
          .filter-row {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-search {
            flex: unset;
            width: 100%;
          }
          .filter-status-group {
            overflow-x: scroll;
            flex-wrap: nowrap;
            padding-bottom: 4px;
            scrollbar-width: none;
            width: 100%;
            display: flex;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-x;
            max-width: 100%;
          }
          .filter-status-group::-webkit-scrollbar {
            display: none;
          }

          /* CSV preview */
          .csv-preview-actions {
            justify-content: stretch;
          }
          .csv-preview-actions > button {
            flex: 1;
          }
        }

        /* ── Responsive: small mobile (≤480px) ── */
        @media (max-width: 480px) {
          .orders-page {
            padding: 16px 12px;
          }
          .orders-header-actions {
            flex-direction: column;
          }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="orders-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: 0 }}>Orders</h1>
          <p style={{ fontSize: 14, color: '#888', margin: '4px 0 0' }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {plan !== 'pro' && (
              <span style={{ color: isAtLimit ? '#EF4444' : isNearLimit ? '#F97316' : '#9CA3AF' }}>
                {' '}/ {orderLimit} limit
              </span>
            )}
          </p>
        </div>
        <div className="orders-header-actions">
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px 16px',
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
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"  style={{ display: 'none' }} onChange={handleFileChange} disabled={isAtLimit} />
          </label>
          <button
            onClick={() => { if (!checkLimit()) return; setShowForm(v => !v); setForm(EMPTY_FORM) }}
            disabled={isAtLimit}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 18px',
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
      {success && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          ✅ {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '11px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
          ❌ {error}
        </div>
      )}

      {/* ── CSV Preview ── */}
      {csvPreview && (
        <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontWeight: 700, color: '#0369A1', fontSize: 14, margin: 0 }}>📋 CSV Preview — {csvFileName}</p>
              <p style={{ fontSize: 12, color: '#0369A1', margin: '3px 0 0' }}>{csvPreview.length} rows ready to import</p>
            </div>
            <div className="csv-preview-actions">
              <button onClick={cancelCsvPreview} style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #BAE6FD', background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
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
            {csvPreview.length > 5 && (
              <p style={{ margin: '6px 0 0', color: '#7DD3FC' }}>+{csvPreview.length - 5} more rows…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Add Order Form ── */}
      {showForm && (
        <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: 24, marginBottom: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111', margin: '0 0 20px' }}>New Order</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
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
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ flex: '0 0 auto', padding: '9px 18px', borderRadius: 9, border: '1.5px solid #E5E7EB', background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} style={{ flex: '1 1 auto', padding: '9px 22px', borderRadius: 9, border: 'none', background: submitting ? '#F87171' : '#EE4D2D', color: '#fff', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Saving…' : 'Save Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="filter-row">
        <div className="filter-search">
          <input
            type="text"
            placeholder="Search buyer or product…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div className="filter-status-group">
          {(['all', 'pending', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: statusFilter === s ? 'none' : '1.5px solid #E5E7EB',
              background: statusFilter === s ? '#EE4D2D' : '#fff',
              color: statusFilter === s ? '#fff' : '#6B7280',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {s === 'all' ? 'All' : (STATUS_CONFIG[s]?.label || s)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Orders Table (desktop) / Cards (mobile) ── */}
      <div className="orders-table-wrap">
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
          <>
            {/* Desktop table */}
            <div className="orders-table-desktop" style={{ overflowX: 'auto' }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Buyer Name</th>
                    <th>Product</th>
                    <th>Order Date</th>
                    <th className="col-delivery-head">Delivery Date</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => (
                    <tr key={order.id}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ fontWeight: 600, color: '#111' }}>{order.buyer_name}</td>
                      <td style={{ color: '#374151' }}>{order.product}</td>
                      <td style={{ color: '#6B7280' }}>{formatDate(order.order_date)}</td>
                      <td className="col-delivery" style={{ color: '#6B7280' }}>
                        {order.delivery_date ? formatDate(order.delivery_date) : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td><StatusBadge status={order.status} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <DeleteButton onClick={() => handleDelete(order.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="mobile-orders-list">
              {filtered.map((order) => (
                <div key={order.id} className="mobile-order-card">
                  <div className="mobile-order-top">
                    <div>
                      <div className="mobile-order-buyer">{order.buyer_name}</div>
                      <div className="mobile-order-product">{order.product}</div>
                    </div>
                    <DeleteButton onClick={() => handleDelete(order.id)} />
                  </div>
                  <div className="mobile-order-meta">
                    <StatusBadge status={order.status} />
                    <span className="mobile-order-date">
                      {formatDate(order.order_date)}
                      {order.delivery_date && ` → ${formatDate(order.delivery_date)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
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

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 6, borderRadius: 6, flexShrink: 0 }}
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