import {useEffect, useMemo, useState, type FormEvent} from 'react'
import {paymentApi, bookingApi, userApi } from '../services/api'
import type {Payment, PaymentData, PaymentMethod, PaymentStatus, Booking, User} from '../services/api'
import {ui, badgeTone} from './ui'

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'ONLINE']
const STATUSES: PaymentStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time
const toInputDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const emptyForm = () => ({
    bookingId: '',
    userId: '',
    amount: '',
    paymentMethod: 'CASH' as PaymentMethod,
    transactionId: '',
    paymentDate: toInputDate(new Date().toISOString()),
    status: 'COMPLETED' as PaymentStatus,
})

type PaymentForm = ReturnType<typeof emptyForm>

const idOf = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id ?? '')

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

const formatDate = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function PaymentManagement() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [form, setForm] = useState<PaymentForm>(emptyForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL')

    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')
            const [paymentData, bookingData, userData] = await Promise.all([
                paymentApi.getAll(),
                bookingApi.getAll(),
                userApi.getAll(),
            ])
            setPayments(paymentData)
            setBookings(bookingData)
            setUsers(userData)
        } catch (err) {
            console.error('Failed to load payments:', err)
            setError('Unable to load data. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadPayments = async () => {
        try {
            setPayments(await paymentApi.getAll())
        } catch (err) {
            console.error('Failed to load payments:', err)
            setError('Unable to load payments. Please try again.')
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    const userName = useMemo(() => {
        const map = new Map(users.map((u) => [u._id, u.userName]))
        return (ref: Payment['userId']) =>
            (typeof ref === 'object' && ref?.userName) || map.get(idOf(ref)) || '-'
    }, [users])

    const bookingLabel = useMemo(() => {
        const userMap = new Map(users.map((u) => [u._id, u.userName]))
        return (b: Booking) =>
            `${userMap.get(idOf(b.userId)) ?? 'Customer'} - ${formatDate(b.pickupDate)} - LKR ${Number(b.totalAmount).toLocaleString()}`
    }, [users])

    const bookingShort = useMemo(() => {
        const map = new Map(bookings.map((b) => [b._id, b]))
        return (ref: Payment['bookingId']) => {
            const booking = map.get(idOf(ref))
            return booking ? formatDate(booking.pickupDate) : '-'
        }
    }, [bookings])

    const filteredPayments = useMemo(() => {
        const term = search.trim().toLowerCase()
        return payments.filter((p) => {
            if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
            if (!term) return true
            return `${userName(p.userId)} ${p.transactionId}`.toLowerCase().includes(term)
        })
    }, [payments, search, statusFilter, userName])

    const updateField = <K extends keyof PaymentForm>(field: K, value: PaymentForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    // Picking a booking fills in the customer and the booking amount (both can still be changed)
    const selectBooking = (bookingId: string) => {
        const booking = bookings.find((b) => b._id === bookingId)
        setForm((current) => ({
            ...current,
            bookingId,
            ...(booking
                ? { userId: idOf(booking.userId), amount: String(booking.totalAmount) }
                : {}),
        }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(emptyForm())
        setError('')
    }

    const savePayment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const amount = Number(form.amount)

        if (
            !form.bookingId ||
            !form.userId ||
            !form.transactionId.trim() ||
            !form.paymentDate
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (!(amount > 0)) {
            setError('Amount must be greater than 0.')
            return
        }

        const payload: PaymentData = {
            bookingId: form.bookingId,
            userId: form.userId,
            amount,
            paymentMethod: form.paymentMethod,
            transactionId: form.transactionId.trim(),
            paymentDate: new Date(form.paymentDate).toISOString(),
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await paymentApi.update(selectedId, payload)
                setSuccess('Payment updated successfully.')
            } else {
                await paymentApi.create(payload)
                setSuccess('Payment saved successfully.')
            }

            clearForm()
            await loadPayments()
        } catch (err) {
            console.error('Failed to save payment:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save payment. The transaction ID may already exist.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editPayment = (payment: Payment) => {
        setSelectedId(payment._id)
        setForm({
            bookingId: idOf(payment.bookingId),
            userId: idOf(payment.userId),
            amount: String(payment.amount),
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            paymentDate: toInputDate(payment.paymentDate),
            status: payment.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deletePayment = async (payment: Payment) => {
        if (!window.confirm(`Delete payment ${payment.transactionId}?`)) return

        try {
            setError('')
            setSuccess('')
            await paymentApi.remove(payment._id)
            if (selectedId === payment._id) clearForm()
            setSuccess('Payment deleted successfully.')
            await loadPayments()
        } catch (err) {
            console.error('Failed to delete payment:', err)
            setError('Unable to delete payment. Please try again.')
        }
    }

    const missingRefs = !loading && bookings.length === 0

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Payment Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}
            {missingRefs && (
                <p className={ui.hint}>
                    You need at least one booking before recording a payment. Create a booking first.
                </p>
            )}

            <form className={ui.form} onSubmit={savePayment}>
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
                    <label className={ui.label} htmlFor="amount">Amount (LKR) *</label>
                    <input
                        className={ui.input}
                        id="amount"
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="54000"
                        value={form.amount}
                        onChange={(e) => updateField('amount', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="paymentMethod">Payment Method *</label>
                    <select
                        className={ui.input}
                        id="paymentMethod"
                        value={form.paymentMethod}
                        onChange={(e) => updateField('paymentMethod', e.target.value as PaymentMethod)}
                        required
                    >
                        {METHODS.map((m) => (
                            <option key={m} value={m}>{label(m)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="transactionId">Transaction ID *</label>
                    <input
                        className={ui.input}
                        id="transactionId"
                        type="text"
                        placeholder="TXN-0001"
                        value={form.transactionId}
                        onChange={(e) => updateField('transactionId', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="paymentDate">Payment Date *</label>
                    <input
                        className={ui.input}
                        id="paymentDate"
                        type="datetime-local"
                        value={form.paymentDate}
                        onChange={(e) => updateField('paymentDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
                        className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as PaymentStatus)}
                        required
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Payment' : 'Save Payment'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Payment List</h2>

            <div className={ui.toolbar}>
                <input
                    className={ui.search}
                    type="search"
                    placeholder="Search by customer or transaction ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search payments"
                />
                <select
                    className={ui.filter}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | PaymentStatus)}
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Loading payments...</p>
            ) : (
                <>
                    <p className={ui.count}>
                        Showing {filteredPayments.length} of {payments.length} payments
                    </p>
                    <div className={ui.tableWrap}>
                        <table className={ui.table}>
                            <thead className={ui.thead}>
                            <tr>
                                <th className={ui.th}>Transaction ID</th>
                                <th className={ui.th}>Customer</th>
                                <th className={ui.th}>Booking (Pickup)</th>
                                <th className={ui.th}>Amount</th>
                                <th className={ui.th}>Method</th>
                                <th className={ui.th}>Payment Date</th>
                                <th className={ui.th}>Status</th>
                                <th className={ui.th}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredPayments.length === 0 ? (
                                <tr className={ui.tr}>
                                    <td className={ui.td} colSpan={8}>No payments found.</td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr className={ui.tr} key={p._id}>
                                        <td className={ui.td}>{p.transactionId}</td>
                                        <td className={ui.td}>{userName(p.userId)}</td>
                                        <td className={ui.td}>{bookingShort(p.bookingId)}</td>
                                        <td className={ui.td}>{Number(p.amount).toLocaleString()}</td>
                                        <td className={ui.td}>{label(p.paymentMethod)}</td>
                                        <td className={ui.td}>{formatDate(p.paymentDate)}</td>
                                        <td className={ui.td}>
                                            <span className={`${ui.badge} ${badgeTone[p.status]}`}>{label(p.status)}</span>
                                        </td>
                                        <td className={ui.td}>
                                            <button type="button" className={ui.btnEdit} onClick={() => editPayment(p)}>Edit</button>
                                            <button type="button" className={ui.btnDelete} onClick={() => void deletePayment(p)}>Delete</button>
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

export default PaymentManagement