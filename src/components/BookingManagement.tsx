import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { bookingApi, userApi, vehicleApi, branchApi } from '../services/api'
import type { Booking, BookingData, BookingStatus, User, Vehicle, Branch } from '../services/api'
import { ui, badgeTone } from './ui'

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']

const initialForm = {
    userId: '',
    vehicleId: '',
    pickupBranchId: '',
    returnBranchId: '',
    pickupDate: '',
    returnDate: '',
    totalAmount: '',
    status: 'PENDING' as BookingStatus,
    notes: '',
}

type BookingForm = typeof initialForm

const idOf = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id ?? '')

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time
const toInputDate = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDate = (iso: string) => {
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function BookingManagement() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [form, setForm] = useState<BookingForm>(initialForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL')

    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')
            const [bookingData, userData, vehicleData, branchData] = await Promise.all([
                bookingApi.getAll(),
                userApi.getAll(),
                vehicleApi.getAll(),
                branchApi.getAll(),
            ])
            setBookings(bookingData)
            setUsers(userData)
            setVehicles(vehicleData)
            setBranches(branchData)
        } catch (err) {
            console.error('Failed to load bookings:', err)
            setError('Unable to load data. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadBookings = async () => {
        try {
            setBookings(await bookingApi.getAll())
        } catch (err) {
            console.error('Failed to load bookings:', err)
            setError('Unable to load bookings. Please try again.')
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    const userName = useMemo(() => {
        const map = new Map(users.map((u) => [u._id, u.userName]))
        return (ref: Booking['userId']) =>
            (typeof ref === 'object' && ref?.userName) || map.get(idOf(ref)) || '-'
    }, [users])

    const vehicleName = useMemo(() => {
        const map = new Map(vehicles.map((v) => [v._id, `${v.registrationNumber} - ${v.brand} ${v.model}`]))
        return (ref: Booking['vehicleId']) =>
            (typeof ref === 'object' && ref?.registrationNumber) || map.get(idOf(ref)) || '-'
    }, [vehicles])

    const branchName = useMemo(() => {
        const map = new Map(branches.map((b) => [b._id, b.branchName]))
        return (ref: Booking['pickupBranchId']) =>
            (typeof ref === 'object' && ref?.branchName) || map.get(idOf(ref)) || '-'
    }, [branches])

    const filteredBookings = useMemo(() => {
        const term = search.trim().toLowerCase()
        return bookings.filter((b) => {
            if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
            if (!term) return true
            return `${userName(b.userId)} ${vehicleName(b.vehicleId)}`.toLowerCase().includes(term)
        })
    }, [bookings, search, statusFilter, userName, vehicleName])

    // Estimated amount = number of days (rounded up, min 1) x vehicle daily rate
    const estimateAmount = (vehicleId: string, pickupDate: string, returnDate: string) => {
        const vehicle = vehicles.find((v) => v._id === vehicleId)
        const start = new Date(pickupDate).getTime()
        const end = new Date(returnDate).getTime()
        if (!vehicle || Number.isNaN(start) || Number.isNaN(end) || end <= start) return ''
        const days = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)))
        return String(days * vehicle.dailyRate)
    }

    // Changing vehicle or dates refreshes the estimated amount (it can still be edited by hand)
    const updateField = <K extends keyof BookingForm>(field: K, value: BookingForm[K]) => {
        setForm((current) => {
            const next = { ...current, [field]: value }
            if (field === 'vehicleId' || field === 'pickupDate' || field === 'returnDate') {
                const amount = estimateAmount(next.vehicleId, next.pickupDate, next.returnDate)
                if (amount) next.totalAmount = amount
            }
            return next
        })
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(initialForm)
        setError('')
    }

    const saveBooking = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const totalAmount = Number(form.totalAmount)

        if (
            !form.userId ||
            !form.vehicleId ||
            !form.pickupBranchId ||
            !form.returnBranchId ||
            !form.pickupDate ||
            !form.returnDate
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (new Date(form.returnDate).getTime() <= new Date(form.pickupDate).getTime()) {
            setError('Return date must be after the pickup date.')
            return
        }

        if (!(totalAmount > 0)) {
            setError('Total amount must be greater than 0.')
            return
        }

        const payload: BookingData = {
            userId: form.userId,
            vehicleId: form.vehicleId,
            pickupBranchId: form.pickupBranchId,
            returnBranchId: form.returnBranchId,
            pickupDate: new Date(form.pickupDate).toISOString(),
            returnDate: new Date(form.returnDate).toISOString(),
            totalAmount,
            status: form.status,
            notes: form.notes.trim(),
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await bookingApi.update(selectedId, payload)
                setSuccess('Booking updated successfully.')
            } else {
                await bookingApi.create(payload)
                setSuccess('Booking saved successfully.')
            }

            clearForm()
            await loadBookings()
        } catch (err) {
            console.error('Failed to save booking:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save booking. Check the entered details and try again.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editBooking = (booking: Booking) => {
        setSelectedId(booking._id)
        setForm({
            userId: idOf(booking.userId),
            vehicleId: idOf(booking.vehicleId),
            pickupBranchId: idOf(booking.pickupBranchId),
            returnBranchId: idOf(booking.returnBranchId),
            pickupDate: toInputDate(booking.pickupDate),
            returnDate: toInputDate(booking.returnDate),
            totalAmount: String(booking.totalAmount),
            status: booking.status,
            notes: booking.notes ?? '',
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteBooking = async (booking: Booking) => {
        if (!window.confirm('Are you sure you want to delete this booking?')) return

        try {
            setError('')
            setSuccess('')
            await bookingApi.remove(booking._id)
            if (selectedId === booking._id) clearForm()
            setSuccess('Booking deleted successfully.')
            await loadBookings()
        } catch (err) {
            console.error('Failed to delete booking:', err)
            setError('Unable to delete booking. Please try again.')
        }
    }

    const missingRefs =
        !loading && (users.length === 0 || vehicles.length === 0 || branches.length === 0)

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Booking Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}
            {missingRefs && (
                <p className={ui.hint}>
                    You need at least one user, one vehicle and one branch before creating a booking.
                </p>
            )}

            <form className={ui.form} onSubmit={saveBooking}>
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
                    <label className={ui.label} htmlFor="vehicleId">Vehicle *</label>
                    <select
            className={ui.input}
                        id="vehicleId"
                        value={form.vehicleId}
                        onChange={(e) => updateField('vehicleId', e.target.value)}
                        required
                    >
                        <option value="">Select vehicle</option>
                        {vehicles.map((v) => (
                            <option key={v._id} value={v._id}>
                                {v.registrationNumber} - {v.brand} {v.model}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="pickupBranchId">Pickup Branch *</label>
                    <select
            className={ui.input}
                        id="pickupBranchId"
                        value={form.pickupBranchId}
                        onChange={(e) => updateField('pickupBranchId', e.target.value)}
                        required
                    >
                        <option value="">Select branch</option>
                        {branches.map((b) => (
                            <option key={b._id} value={b._id}>{b.branchName}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="returnBranchId">Return Branch *</label>
                    <select
            className={ui.input}
                        id="returnBranchId"
                        value={form.returnBranchId}
                        onChange={(e) => updateField('returnBranchId', e.target.value)}
                        required
                    >
                        <option value="">Select branch</option>
                        {branches.map((b) => (
                            <option key={b._id} value={b._id}>{b.branchName}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="pickupDate">Pickup Date *</label>
                    <input
            className={ui.input}
                        id="pickupDate"
                        type="datetime-local"
                        value={form.pickupDate}
                        onChange={(e) => updateField('pickupDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="returnDate">Return Date *</label>
                    <input
            className={ui.input}
                        id="returnDate"
                        type="datetime-local"
                        min={form.pickupDate || undefined}
                        value={form.returnDate}
                        onChange={(e) => updateField('returnDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="totalAmount">Total Amount (LKR) *</label>
                    <input
            className={ui.input}
                        id="totalAmount"
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="Calculated from vehicle rate and dates"
                        value={form.totalAmount}
                        onChange={(e) => updateField('totalAmount', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
            className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as BookingStatus)}
                        required
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="notes">Notes</label>
                    <textarea
            className={ui.textarea}
                        id="notes"
                        placeholder="Optional customer instructions"
                        value={form.notes}
                        onChange={(e) => updateField('notes', e.target.value)}
                    />
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Booking' : 'Save Booking'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Booking List</h2>

            <div className={ui.toolbar}>
                <input
          className={ui.search}
                    type="search"
                    placeholder="Search by customer or vehicle"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search bookings"
                />
                <select
          className={ui.filter}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | BookingStatus)}
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Loading bookings...</p>
            ) : (
                <>
                    <p className={ui.count}>
                        Showing {filteredBookings.length} of {bookings.length} bookings
                    </p>
                    <div className={ui.tableWrap}>
                        <table className={ui.table}>
                            <thead className={ui.thead}>
                            <tr>
                                <th className={ui.th}>Customer</th>
                                <th className={ui.th}>Vehicle</th>
                                <th className={ui.th}>Pickup Branch</th>
                                <th className={ui.th}>Return Branch</th>
                                <th className={ui.th}>Pickup Date</th>
                                <th className={ui.th}>Return Date</th>
                                <th className={ui.th}>Total Amount</th>
                                <th className={ui.th}>Status</th>
                                <th className={ui.th}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredBookings.length === 0 ? (
                                <tr className={ui.tr}>
                                    <td className={ui.td} colSpan={9}>No bookings found.</td>
                                </tr>
                            ) : (
                                filteredBookings.map((b) => (
                                    <tr className={ui.tr} key={b._id}>
                                        <td className={ui.td}>{userName(b.userId)}</td>
                                        <td className={ui.td}>{vehicleName(b.vehicleId)}</td>
                                        <td className={ui.td}>{branchName(b.pickupBranchId)}</td>
                                        <td className={ui.td}>{branchName(b.returnBranchId)}</td>
                                        <td className={ui.td}>{formatDate(b.pickupDate)}</td>
                                        <td className={ui.td}>{formatDate(b.returnDate)}</td>
                                        <td className={ui.td}>{Number(b.totalAmount).toLocaleString()}</td>
                                        <td className={ui.td}>
                                            <span className={`${ui.badge} ${badgeTone[b.status]}`}>{label(b.status)}</span>
                                        </td>
                                        <td className={ui.td}>
                                            <button type="button" className={ui.btnEdit} onClick={() => editBooking(b)}>Edit</button>
                                            <button type="button" className={ui.btnDelete} onClick={() => void deleteBooking(b)}>Delete</button>
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

export default BookingManagement