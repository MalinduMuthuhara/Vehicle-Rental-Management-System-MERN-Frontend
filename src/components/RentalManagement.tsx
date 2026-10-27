import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { rentalApi, bookingApi, userApi, vehicleApi } from '../services/api'
import type { Rental, RentalData, RentalStatus, Booking, User, Vehicle } from '../services/api'
import { ui, badgeTone } from './ui'

const STATUSES: RentalStatus[] = ['ONGOING', 'COMPLETED', 'CANCELLED']

const initialForm = {
    bookingId: '',
    userId: '',
    vehicleId: '',
    pickupDate: '',
    expectedReturnDate: '',
    actualReturnDate: '',
    startingMileage: '',
    endingMileage: '',
    status: 'ONGOING' as RentalStatus,
}

type RentalForm = typeof initialForm

const idOf = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id ?? '')

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time
const toInputDate = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDate = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function RentalManagement() {
    const [rentals, setRentals] = useState<Rental[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [form, setForm] = useState<RentalForm>(initialForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | RentalStatus>('ALL')

    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')
            const [rentalData, bookingData, userData, vehicleData] = await Promise.all([
                rentalApi.getAll(),
                bookingApi.getAll(),
                userApi.getAll(),
                vehicleApi.getAll(),
            ])
            setRentals(rentalData)
            setBookings(bookingData)
            setUsers(userData)
            setVehicles(vehicleData)
        } catch (err) {
            console.error('Failed to load rentals:', err)
            setError('Unable to load data. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadRentals = async () => {
        try {
            setRentals(await rentalApi.getAll())
        } catch (err) {
            console.error('Failed to load rentals:', err)
            setError('Unable to load rentals. Please try again.')
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    const userName = useMemo(() => {
        const map = new Map(users.map((u) => [u._id, u.userName]))
        return (ref: Rental['userId']) =>
            (typeof ref === 'object' && ref?.userName) || map.get(idOf(ref)) || '-'
    }, [users])

    const vehicleName = useMemo(() => {
        const map = new Map(vehicles.map((v) => [v._id, `${v.registrationNumber} - ${v.brand} ${v.model}`]))
        return (ref: Rental['vehicleId']) => map.get(idOf(ref)) || '-'
    }, [vehicles])

    const bookingLabel = useMemo(() => {
        const userMap = new Map(users.map((u) => [u._id, u.userName]))
        const vehicleMap = new Map(vehicles.map((v) => [v._id, v.registrationNumber]))
        return (b: Booking) =>
            `${userMap.get(idOf(b.userId)) ?? 'Customer'} - ${vehicleMap.get(idOf(b.vehicleId)) ?? 'Vehicle'} (${formatDate(b.pickupDate)})`
    }, [users, vehicles])

    const filteredRentals = useMemo(() => {
        const term = search.trim().toLowerCase()
        return rentals.filter((r) => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
            if (!term) return true
            return `${userName(r.userId)} ${vehicleName(r.vehicleId)}`.toLowerCase().includes(term)
        })
    }, [rentals, search, statusFilter, userName, vehicleName])

    const updateField = <K extends keyof RentalForm>(field: K, value: RentalForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    // Picking a booking fills in the customer, vehicle and dates (they can still be changed)
    const selectBooking = (bookingId: string) => {
        const booking = bookings.find((b) => b._id === bookingId)
        setForm((current) => ({
            ...current,
            bookingId,
            ...(booking
                ? {
                    userId: idOf(booking.userId),
                    vehicleId: idOf(booking.vehicleId),
                    pickupDate: toInputDate(booking.pickupDate),
                    expectedReturnDate: toInputDate(booking.returnDate),
                }
                : {}),
        }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(initialForm)
        setError('')
    }

    const saveRental = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const startingMileage = Number(form.startingMileage)
        const hasEnding = form.endingMileage.trim() !== ''
        const endingMileage = Number(form.endingMileage)

        if (
            !form.bookingId ||
            !form.userId ||
            !form.vehicleId ||
            !form.pickupDate ||
            !form.expectedReturnDate ||
            form.startingMileage.trim() === ''
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (!(startingMileage >= 0)) {
            setError('Starting mileage cannot be negative.')
            return
        }

        if (hasEnding && !(endingMileage >= startingMileage)) {
            setError('Ending mileage must be greater than or equal to the starting mileage.')
            return
        }

        const pickup = new Date(form.pickupDate).getTime()

        if (new Date(form.expectedReturnDate).getTime() <= pickup) {
            setError('Expected return date must be after the pickup date.')
            return
        }

        if (form.actualReturnDate && new Date(form.actualReturnDate).getTime() < pickup) {
            setError('Actual return date cannot be before the pickup date.')
            return
        }

        const payload: RentalData = {
            bookingId: form.bookingId,
            userId: form.userId,
            vehicleId: form.vehicleId,
            pickupDate: new Date(form.pickupDate).toISOString(),
            expectedReturnDate: new Date(form.expectedReturnDate).toISOString(),
            startingMileage,
            status: form.status,
            ...(form.actualReturnDate
                ? { actualReturnDate: new Date(form.actualReturnDate).toISOString() }
                : {}),
            ...(hasEnding ? { endingMileage } : {}),
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await rentalApi.update(selectedId, payload)
                setSuccess('Rental updated successfully.')
            } else {
                await rentalApi.create(payload)
                setSuccess('Rental saved successfully.')
            }

            clearForm()
            await loadRentals()
        } catch (err) {
            console.error('Failed to save rental:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save rental. Check the entered details and try again.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editRental = (rental: Rental) => {
        setSelectedId(rental._id)
        setForm({
            bookingId: idOf(rental.bookingId),
            userId: idOf(rental.userId),
            vehicleId: idOf(rental.vehicleId),
            pickupDate: toInputDate(rental.pickupDate),
            expectedReturnDate: toInputDate(rental.expectedReturnDate),
            actualReturnDate: toInputDate(rental.actualReturnDate),
            startingMileage: String(rental.startingMileage),
            endingMileage: rental.endingMileage == null ? '' : String(rental.endingMileage),
            status: rental.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteRental = async (rental: Rental) => {
        if (!window.confirm('Are you sure you want to delete this rental?')) return

        try {
            setError('')
            setSuccess('')
            await rentalApi.remove(rental._id)
            if (selectedId === rental._id) clearForm()
            setSuccess('Rental deleted successfully.')
            await loadRentals()
        } catch (err) {
            console.error('Failed to delete rental:', err)
            setError('Unable to delete rental. Please try again.')
        }
    }

    const missingRefs = !loading && bookings.length === 0

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Rental Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}
            {missingRefs && (
                <p className={ui.hint}>
                    You need at least one booking before creating a rental. Create a booking first.
                </p>
            )}

            <form className={ui.form} onSubmit={saveRental}>
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
                    <label className={ui.label} htmlFor="expectedReturnDate">Expected Return Date *</label>
                    <input
                        className={ui.input}
                        id="expectedReturnDate"
                        type="datetime-local"
                        min={form.pickupDate || undefined}
                        value={form.expectedReturnDate}
                        onChange={(e) => updateField('expectedReturnDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="actualReturnDate">Actual Return Date</label>
                    <input
                        className={ui.input}
                        id="actualReturnDate"
                        type="datetime-local"
                        min={form.pickupDate || undefined}
                        value={form.actualReturnDate}
                        onChange={(e) => updateField('actualReturnDate', e.target.value)}
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
                        className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as RentalStatus)}
                        required
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="startingMileage">Starting Mileage (km) *</label>
                    <input
                        className={ui.input}
                        id="startingMileage"
                        type="number"
                        min={0}
                        placeholder="45000"
                        value={form.startingMileage}
                        onChange={(e) => updateField('startingMileage', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="endingMileage">Ending Mileage (km)</label>
                    <input
                        className={ui.input}
                        id="endingMileage"
                        type="number"
                        min={0}
                        placeholder="Fill in when the vehicle is returned"
                        value={form.endingMileage}
                        onChange={(e) => updateField('endingMileage', e.target.value)}
                    />
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Rental' : 'Save Rental'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Rental List</h2>

            <div className={ui.toolbar}>
                <input
                    className={ui.search}
                    type="search"
                    placeholder="Search by customer or vehicle"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search rentals"
                />
                <select
                    className={ui.filter}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | RentalStatus)}
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Loading rentals...</p>
            ) : (
                <>
                    <p className={ui.count}>
                        Showing {filteredRentals.length} of {rentals.length} rentals
                    </p>
                    <div className={ui.tableWrap}>
                        <table className={ui.table}>
                            <thead className={ui.thead}>
                            <tr>
                                <th className={ui.th}>Customer</th>
                                <th className={ui.th}>Vehicle</th>
                                <th className={ui.th}>Pickup Date</th>
                                <th className={ui.th}>Expected Return</th>
                                <th className={ui.th}>Actual Return</th>
                                <th className={ui.th}>Start km</th>
                                <th className={ui.th}>End km</th>
                                <th className={ui.th}>Status</th>
                                <th className={ui.th}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredRentals.length === 0 ? (
                                <tr className={ui.tr}>
                                    <td className={ui.td} colSpan={9}>No rentals found.</td>
                                </tr>
                            ) : (
                                filteredRentals.map((r) => (
                                    <tr className={ui.tr} key={r._id}>
                                        <td className={ui.td}>{userName(r.userId)}</td>
                                        <td className={ui.td}>{vehicleName(r.vehicleId)}</td>
                                        <td className={ui.td}>{formatDate(r.pickupDate)}</td>
                                        <td className={ui.td}>{formatDate(r.expectedReturnDate)}</td>
                                        <td className={ui.td}>{formatDate(r.actualReturnDate)}</td>
                                        <td className={ui.td}>{Number(r.startingMileage).toLocaleString()}</td>
                                        <td className={ui.td}>
                                            {r.endingMileage == null ? '-' : Number(r.endingMileage).toLocaleString()}
                                        </td>
                                        <td className={ui.td}>
                                            <span className={`${ui.badge} ${badgeTone[r.status]}`}>{label(r.status)}</span>
                                        </td>
                                        <td className={ui.td}>
                                            <button type="button" className={ui.btnEdit} onClick={() => editRental(r)}>Edit</button>
                                            <button type="button" className={ui.btnDelete} onClick={() => void deleteRental(r)}>Delete</button>
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

export default RentalManagement