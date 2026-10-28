import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { invoiceApi, bookingApi, userApi } from '../services/api'
import type { Invoice, InvoiceData, InvoiceStatus, Booking, User } from '../services/api'
import { ui, badgeTone } from './ui'

const STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'PAID', 'CANCELLED']

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time
const toInputDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm = (invoiceNumber = '') => ({
    invoiceNumber,
    bookingId: '',
    userId: '',
    subtotal: '',
    taxAmount: '0',
    discountAmount: '0',
    issuedDate: toInputDate(new Date().toISOString()),
    status: 'DRAFT' as InvoiceStatus,
})

type InvoiceForm = ReturnType<typeof emptyForm>

const idOf = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id ?? '')

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

const formatDate = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const money = (value: number) => Number(value).toLocaleString()

// Suggests the next number in the INV-0001 style, based on the invoices that already exist
const nextInvoiceNumber = (invoices: Invoice[]) => {
    const highest = invoices.reduce((max, inv) => {
        const match = /^INV-(\d+)$/i.exec(inv.invoiceNumber)
        return match ? Math.max(max, Number(match[1])) : max
    }, 0)
    return `INV-${String(highest + 1).padStart(4, '0')}`
}

function InvoiceManagement() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [form, setForm] = useState<InvoiceForm>(() => emptyForm())
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL')

    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')
            const [invoiceData, bookingData, userData] = await Promise.all([
                invoiceApi.getAll(),
                bookingApi.getAll(),
                userApi.getAll(),
            ])
            setInvoices(invoiceData)
            setBookings(bookingData)
            setUsers(userData)
            setForm((current) =>
                current.invoiceNumber ? current : { ...current, invoiceNumber: nextInvoiceNumber(invoiceData) },
            )
        } catch (err) {
            console.error('Failed to load invoices:', err)
            setError('Unable to load data. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadInvoices = async () => {
        try {
            const data = await invoiceApi.getAll()
            setInvoices(data)
            return data
        } catch (err) {
            console.error('Failed to load invoices:', err)
            setError('Unable to load invoices. Please try again.')
            return invoices
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    const userName = useMemo(() => {
        const map = new Map(users.map((u) => [u._id, u.userName]))
        return (ref: Invoice['userId']) =>
            (typeof ref === 'object' && ref?.userName) || map.get(idOf(ref)) || '-'
    }, [users])

    const bookingLabel = useMemo(() => {
        const userMap = new Map(users.map((u) => [u._id, u.userName]))
        return (b: Booking) =>
            `${userMap.get(idOf(b.userId)) ?? 'Customer'} - ${formatDate(b.pickupDate)} - LKR ${money(b.totalAmount)}`
    }, [users])

    const filteredInvoices = useMemo(() => {
        const term = search.trim().toLowerCase()
        return invoices.filter((inv) => {
            if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
            if (!term) return true
            return `${inv.invoiceNumber} ${userName(inv.userId)}`.toLowerCase().includes(term)
        })
    }, [invoices, search, statusFilter, userName])

    // Final amount = subtotal + tax - discount
    const total = Math.max(
        0,
        (Number(form.subtotal) || 0) + (Number(form.taxAmount) || 0) - (Number(form.discountAmount) || 0),
    )

    const updateField = <K extends keyof InvoiceForm>(field: K, value: InvoiceForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    // Picking a booking fills in the customer and the subtotal (both can still be changed)
    const selectBooking = (bookingId: string) => {
        const booking = bookings.find((b) => b._id === bookingId)
        setForm((current) => ({
            ...current,
            bookingId,
            ...(booking
                ? { userId: idOf(booking.userId), subtotal: String(booking.totalAmount) }
                : {}),
        }))
    }

    const clearForm = (existing: Invoice[] = invoices) => {
        setSelectedId(null)
        setForm(emptyForm(nextInvoiceNumber(existing)))
        setError('')
    }

    const saveInvoice = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const subtotal = Number(form.subtotal)
        const taxAmount = Number(form.taxAmount)
        const discountAmount = Number(form.discountAmount)

        if (
            !form.invoiceNumber.trim() ||
            !form.bookingId ||
            !form.userId ||
            !form.issuedDate ||
            form.subtotal.trim() === ''
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (!(subtotal >= 0) || !(taxAmount >= 0) || !(discountAmount >= 0)) {
            setError('Subtotal, tax and discount cannot be negative.')
            return
        }

        if (discountAmount > subtotal + taxAmount) {
            setError('Discount cannot be more than the subtotal plus tax.')
            return
        }

        const payload: InvoiceData = {
            invoiceNumber: form.invoiceNumber.trim().toUpperCase(),
            bookingId: form.bookingId,
            userId: form.userId,
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount: total,
            issuedDate: new Date(form.issuedDate).toISOString(),
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await invoiceApi.update(selectedId, payload)
                setSuccess('Invoice updated successfully.')
            } else {
                await invoiceApi.create(payload)
                setSuccess('Invoice saved successfully.')
            }

            clearForm(await loadInvoices())
        } catch (err) {
            console.error('Failed to save invoice:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save invoice. The invoice number may already exist.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editInvoice = (invoice: Invoice) => {
        setSelectedId(invoice._id)
        setForm({
            invoiceNumber: invoice.invoiceNumber,
            bookingId: idOf(invoice.bookingId),
            userId: idOf(invoice.userId),
            subtotal: String(invoice.subtotal),
            taxAmount: String(invoice.taxAmount),
            discountAmount: String(invoice.discountAmount),
            issuedDate: toInputDate(invoice.issuedDate),
            status: invoice.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteInvoice = async (invoice: Invoice) => {
        if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return

        try {
            setError('')
            setSuccess('')
            await invoiceApi.remove(invoice._id)
            setSuccess('Invoice deleted successfully.')
            const data = await loadInvoices()
            if (selectedId === invoice._id) clearForm(data)
        } catch (err) {
            console.error('Failed to delete invoice:', err)
            setError('Unable to delete invoice. Please try again.')
        }
    }

    const missingRefs = !loading && bookings.length === 0

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Invoice Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}
            {missingRefs && (
                <p className={ui.hint}>
                    You need at least one booking before creating an invoice. Create a booking first.
                </p>
            )}

            <form className={ui.form} onSubmit={saveInvoice}>
                <div className={ui.field}>
                    <label className={ui.label} htmlFor="invoiceNumber">Invoice Number *</label>
                    <input
                        className={ui.input}
                        id="invoiceNumber"
                        type="text"
                        placeholder="INV-0001"
                        value={form.invoiceNumber}
                        onChange={(e) => updateField('invoiceNumber', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="issuedDate">Issued Date *</label>
                    <input
                        className={ui.input}
                        id="issuedDate"
                        type="datetime-local"
                        value={form.issuedDate}
                        onChange={(e) => updateField('issuedDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="bookingId">Booking *</label>
                    <select
                        className={ui.input}
                        id="bookingId"
                        value={form.bookingId}
                        onChange={(e) => selectBooking(e.target.value)}
                        required
                    >
                        <option value="">Select booking</option>
                        {bookings.map((b) => (
                            <option key={b._id} value={b._id}>{bookingLabel(b)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="userId">Customer *</label>
                    <select
                        className={ui.input}
                        id="userId"
                        value={form.userId}
                        onChange={(e) => updateField('userId', e.target.value)}
                        required
                    >
                        <option value="">Select customer</option>
                        {users.map((u) => (
                            <option key={u._id} value={u._id}>{u.userName} ({u.email})</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
                        className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as InvoiceStatus)}
                        required
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="subtotal">Subtotal (LKR) *</label>
                    <input
                        className={ui.input}
                        id="subtotal"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="50000"
                        value={form.subtotal}
                        onChange={(e) => updateField('subtotal', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="taxAmount">Tax Amount (LKR) *</label>
                    <input
                        className={ui.input}
                        id="taxAmount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.taxAmount}
                        onChange={(e) => updateField('taxAmount', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="discountAmount">Discount Amount (LKR) *</label>
                    <input
                        className={ui.input}
                        id="discountAmount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.discountAmount}
                        onChange={(e) => updateField('discountAmount', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="totalAmount">Total Amount (LKR)</label>
                    <input
                        className={`${ui.input} bg-gray-50 font-semibold`}
                        id="totalAmount"
                        type="text"
                        value={money(total)}
                        readOnly
                        aria-label="Total amount, calculated as subtotal plus tax minus discount"
                    />
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Invoice' : 'Save Invoice'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={() => clearForm()}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Invoice List</h2>

            <div className={ui.toolbar}>
                <input
                    className={ui.search}
                    type="search"
                    placeholder="Search by invoice number or customer"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search invoices"
                />
                <select
                    className={ui.filter}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | InvoiceStatus)}
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Loading invoices...</p>
            ) : (
                <>
                    <p className={ui.count}>
                        Showing {filteredInvoices.length} of {invoices.length} invoices
                    </p>
                    <div className={ui.tableWrap}>
                        <table className={ui.table}>
                            <thead className={ui.thead}>
                            <tr>
                                <th className={ui.th}>Invoice No.</th>
                                <th className={ui.th}>Customer</th>
                                <th className={ui.th}>Issued Date</th>
                                <th className={ui.th}>Subtotal</th>
                                <th className={ui.th}>Tax</th>
                                <th className={ui.th}>Discount</th>
                                <th className={ui.th}>Total</th>
                                <th className={ui.th}>Status</th>
                                <th className={ui.th}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredInvoices.length === 0 ? (
                                <tr className={ui.tr}>
                                    <td className={ui.td} colSpan={9}>No invoices found.</td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr className={ui.tr} key={inv._id}>
                                        <td className={ui.td}>{inv.invoiceNumber}</td>
                                        <td className={ui.td}>{userName(inv.userId)}</td>
                                        <td className={ui.td}>{formatDate(inv.issuedDate)}</td>
                                        <td className={ui.td}>{money(inv.subtotal)}</td>
                                        <td className={ui.td}>{money(inv.taxAmount)}</td>
                                        <td className={ui.td}>{money(inv.discountAmount)}</td>
                                        <td className={`${ui.td} font-semibold`}>{money(inv.totalAmount)}</td>
                                        <td className={ui.td}>
                                            <span className={`${ui.badge} ${badgeTone[inv.status]}`}>{label(inv.status)}</span>
                                        </td>
                                        <td className={ui.td}>
                                            <button type="button" className={ui.btnEdit} onClick={() => editInvoice(inv)}>Edit</button>
                                            <button type="button" className={ui.btnDelete} onClick={() => void deleteInvoice(inv)}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </main>
    )
}

export default InvoiceManagement