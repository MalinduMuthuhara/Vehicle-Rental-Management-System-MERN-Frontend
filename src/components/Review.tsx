import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { reviewApi, bookingApi, userApi, vehicleApi } from '../services/api'
import type { Review, ReviewData, ReviewStatus, Booking, User, Vehicle } from '../services/api'
import { ui, badgeTone } from './ui'

const STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
const RATINGS = [1, 2, 3, 4, 5]

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
    vehicleId: '',
    rating: '5',
    comment: '',
    reviewDate: toInputDate(new Date().toISOString()),
    status: 'PENDING' as ReviewStatus,
})

type ReviewForm = ReturnType<typeof emptyForm>

const idOf = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id ?? '')

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

const formatDate = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const stars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating))

function ReviewManagement() {
    const [reviews, setReviews] = useState<Review[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [form, setForm] = useState<ReviewForm>(emptyForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | ReviewStatus>('ALL')

    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')
            const [reviewData, bookingData, userData, vehicleData] = await Promise.all([
                reviewApi.getAll(),
                bookingApi.getAll(),
                userApi.getAll(),
                vehicleApi.getAll(),
            ])
            setReviews(reviewData)
            setBookings(bookingData)
            setUsers(userData)
            setVehicles(vehicleData)
        } catch (err) {
            console.error('Failed to load reviews:', err)
            setError('Unable to load data. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadReviews = async () => {
        try {
            setReviews(await reviewApi.getAll())
        } catch (err) {
            console.error('Failed to load reviews:', err)
            setError('Unable to load reviews. Please try again.')
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    const userName = useMemo(() => {
        const map = new Map(users.map((u) => [u._id, u.userName]))
        return (ref: Review['userId']) =>
            (typeof ref === 'object' && ref?.userName) || map.get(idOf(ref)) || '-'
    }, [users])

    const vehicleName = useMemo(() => {
        const map = new Map(vehicles.map((v) => [v._id, `${v.registrationNumber} - ${v.brand} ${v.model}`]))
        return (ref: Review['vehicleId']) => map.get(idOf(ref)) || '-'
    }, [vehicles])

    const bookingLabel = useMemo(() => {
        const userMap = new Map(users.map((u) => [u._id, u.userName]))
        const vehicleMap = new Map(vehicles.map((v) => [v._id, v.registrationNumber]))
        return (b: Booking) =>
            `${userMap.get(idOf(b.userId)) ?? 'Customer'} - ${vehicleMap.get(idOf(b.vehicleId)) ?? 'Vehicle'} (${formatDate(b.pickupDate)})`
    }, [users, vehicles])

    const filteredReviews = useMemo(() => {
        const term = search.trim().toLowerCase()
        return reviews.filter((r) => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
            if (!term) return true
            return `${userName(r.userId)} ${vehicleName(r.vehicleId)} ${r.comment}`
                .toLowerCase()
                .includes(term)
        })
    }, [reviews, search, statusFilter, userName, vehicleName])

    const updateField = <K extends keyof ReviewForm>(field: K, value: ReviewForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    // Picking a booking fills in the customer and the vehicle (both can still be changed)
    const selectBooking = (bookingId: string) => {
        const booking = bookings.find((b) => b._id === bookingId)
        setForm((current) => ({
            ...current,
            bookingId,
            ...(booking
                ? { userId: idOf(booking.userId), vehicleId: idOf(booking.vehicleId) }
                : {}),
        }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(emptyForm())
        setError('')
    }

    const saveReview = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const rating = Number(form.rating)

        if (
            !form.bookingId ||
            !form.userId ||
            !form.vehicleId ||
            !form.comment.trim() ||
            !form.reviewDate
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            setError('Rating must be a whole number from 1 to 5.')
            return
        }

        const payload: ReviewData = {
            bookingId: form.bookingId,
            userId: form.userId,
            vehicleId: form.vehicleId,
            rating,
            comment: form.comment.trim(),
            reviewDate: new Date(form.reviewDate).toISOString(),
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await reviewApi.update(selectedId, payload)
                setSuccess('Review updated successfully.')
            } else {
                await reviewApi.create(payload)
                setSuccess('Review saved successfully.')
            }

            clearForm()
            await loadReviews()
        } catch (err) {
            console.error('Failed to save review:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save review. Check the entered details and try again.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editReview = (review: Review) => {
        setSelectedId(review._id)
        setForm({
            bookingId: idOf(review.bookingId),
            userId: idOf(review.userId),
            vehicleId: idOf(review.vehicleId),
            rating: String(review.rating),
            comment: review.comment,
            reviewDate: toInputDate(review.reviewDate),
            status: review.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteReview = async (review: Review) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return

        try {
            setError('')
            setSuccess('')
            await reviewApi.remove(review._id)
            if (selectedId === review._id) clearForm()
            setSuccess('Review deleted successfully.')
            await loadReviews()
        } catch (err) {
            console.error('Failed to delete review:', err)
            setError('Unable to delete review. Please try again.')
        }
    }

    const missingRefs = !loading && bookings.length === 0

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Review Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}
            {missingRefs && (
                <p className={ui.hint}>
                    You need at least one booking before adding a review. Create a booking first.
                </p>
            )}

            <form className={ui.form} onSubmit={saveReview}>
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
                    <label className={ui.label} htmlFor="rating">Rating *</label>
                    <select
                        className={ui.input}
                        id="rating"
                        value={form.rating}
                        onChange={(e) => updateField('rating', e.target.value)}
                        required
                    >
                        {RATINGS.map((r) => (
                            <option key={r} value={r}>{`${stars(r)}  (${r})`}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="reviewDate">Review Date *</label>
                    <input
                        className={ui.input}
                        id="reviewDate"
                        type="datetime-local"
                        value={form.reviewDate}
                        onChange={(e) => updateField('reviewDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
                        className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as ReviewStatus)}
                        required
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="comment">Comment *</label>
                    <textarea
                        className={ui.textarea}
                        id="comment"
                        placeholder="Great vehicle, smooth ride."
                        value={form.comment}
                        onChange={(e) => updateField('comment', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Review' : 'Save Review'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Review List</h2>

            <div className={ui.toolbar}>
                <input
                    className={ui.search}
                    type="search"
                    placeholder="Search by customer, vehicle or comment"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search reviews"
                />
                <select
                    className={ui.filter}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ReviewStatus)}
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Loading reviews...</p>
            ) : (
                <>
                    <p className={ui.count}>
                        Showing {filteredReviews.length} of {reviews.length} reviews
                    </p>
                    <div className={ui.tableWrap}>
                        <table className={ui.table}>
                            <thead className={ui.thead}>
                            <tr>
                                <th className={ui.th}>Customer</th>
                                <th className={ui.th}>Vehicle</th>
                                <th className={ui.th}>Rating</th>
                                <th className={ui.th}>Comment</th>
                                <th className={ui.th}>Review Date</th>
                                <th className={ui.th}>Status</th>
                                <th className={ui.th}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredReviews.length === 0 ? (
                                <tr className={ui.tr}>
                                    <td className={ui.td} colSpan={7}>No reviews found.</td>
                                </tr>
                            ) : (
                                filteredReviews.map((r) => (
                                    <tr className={ui.tr} key={r._id}>
                                        <td className={ui.td}>{userName(r.userId)}</td>
                                        <td className={ui.td}>{vehicleName(r.vehicleId)}</td>
                                        <td className={`${ui.td} whitespace-nowrap text-amber-500`} title={`${r.rating} / 5`}>
                                            {stars(r.rating)}
                                        </td>
                                        <td className={ui.td}>{r.comment}</td>
                                        <td className={ui.td}>{formatDate(r.reviewDate)}</td>
                                        <td className={ui.td}>
                                            <span className={`${ui.badge} ${badgeTone[r.status]}`}>{label(r.status)}</span>
                                        </td>
                                        <td className={ui.td}>
                                            <button type="button" className={ui.btnEdit} onClick={() => editReview(r)}>Edit</button>
                                            <button type="button" className={ui.btnDelete} onClick={() => void deleteReview(r)}>Delete</button>
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

export default ReviewManagement