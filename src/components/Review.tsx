
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
    reviewApi,
    bookingApi,
    userApi,
    vehicleApi,
} from '../services/api'

import type {
    Review,
    ReviewCreateData,
    ReviewUpdateData,
    ReviewStatus,
    Booking,
    User,
    Vehicle,
    UserRole,
} from '../services/api'

import { ui, badgeTone } from './ui'

const STATUSES: ReviewStatus[] = [
    'PENDING',
    'APPROVED',
    'REJECTED',
]

const RATINGS = [1, 2, 3, 4, 5]

interface LoggedUser {
    _id: string
    userName: string
    role: UserRole
}

const getLoggedUser = (): LoggedUser | null => {
    try {
        const savedUser = localStorage.getItem('user')

        if (!savedUser) return null

        return JSON.parse(savedUser) as LoggedUser
    } catch {
        return null
    }
}

const idOf = (
    ref: string | { _id: string } | null | undefined
): string => {
    if (!ref) return ''
    return typeof ref === 'string' ? ref : ref._id
}

const label = (value: string) =>
    value.charAt(0) + value.slice(1).toLowerCase()

const formatDate = (date?: string) => {
    if (!date) return '-'

    const d = new Date(date)

    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        })
}

const stars = (rating: number) =>
    '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating))

function ReviewManagement() {
    const loggedUser = useMemo(() => getLoggedUser(), [])

    const role = loggedUser?.role
    const isAdmin = role === 'ADMIN'
    const isCustomer = role === 'CUSTOMER'
    const isEmployee = role === 'EMPLOYEE'

    const [reviews, setReviews] = useState<Review[]>([])
    const [bookings, setBookings] = useState<Booking[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])

    const [bookingId, setBookingId] = useState('')
    const [rating, setRating] = useState('5')
    const [comment, setComment] = useState('')
    const [status, setStatus] = useState<ReviewStatus>('PENDING')

    const [selectedId, setSelectedId] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] =
        useState<'ALL' | ReviewStatus>('ALL')

    // Load required data
    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')

            const [
                reviewData,
                bookingData,
                vehicleData,
                userData,
            ] = await Promise.all([
                reviewApi.getAll(),
                bookingApi.getAll(),
                vehicleApi.getAll(),
                isAdmin
                    ? userApi.getAll()
                    : Promise.resolve([] as User[]),
            ])

            setReviews(reviewData)
            setBookings(bookingData)
            setVehicles(vehicleData)
            setUsers(userData)

        } catch (err) {
            console.error('Failed to load review data:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load data. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    // Find vehicle name
    const vehicleName = useMemo(() => {
        const map = new Map(
            vehicles.map((v) => [
                v._id,
                `${v.registrationNumber} - ${v.brand} ${v.model}`,
            ])
        )

        return (ref: Review['vehicleId']) =>
            map.get(idOf(ref)) || '-'
    }, [vehicles])

    // Find customer name
    const userName = useMemo(() => {
        const map = new Map(
            users.map((u) => [u._id, u.userName])
        )

        return (ref: Review['userId']) => {
            if (typeof ref === 'object' && ref?.userName) {
                return ref.userName
            }

            const id = idOf(ref)

            if (id === loggedUser?._id) {
                return loggedUser.userName
            }

            return map.get(id) || 'Customer'
        }
    }, [users, loggedUser])

    // Booking dropdown options
    const reviewedBookingIds = useMemo(
        () => new Set(reviews.map((r) => idOf(r.bookingId))),
        [reviews]
    )

    const availableBookings = useMemo(() => {
        return bookings.filter((booking) => {
            if (booking.status !== 'COMPLETED') {
                return false
            }

            // Customer can select only own bookings
            if (
                isCustomer &&
                idOf(booking.userId) !== loggedUser?._id
            ) {
                return false
            }

            // Do not allow another review for the same booking
            if (
                reviewedBookingIds.has(booking._id) &&
                booking._id !== bookingId
            ) {
                return false
            }

            return true
        })
    }, [
        bookings,
        isCustomer,
        loggedUser,
        reviewedBookingIds,
        bookingId,
    ])

    // Selected booking
    const selectedBooking = useMemo(
        () => bookings.find((b) => b._id === bookingId),
        [bookings, bookingId]
    )

    const selectedVehicle = useMemo(() => {
        if (!selectedBooking) return null

        return vehicles.find(
            (v) => v._id === idOf(selectedBooking.vehicleId)
        ) || null
    }, [selectedBooking, vehicles])

    // Search and status filter
    const filteredReviews = useMemo(() => {
        const term = search.trim().toLowerCase()

        return reviews.filter((review) => {
            if (
                statusFilter !== 'ALL' &&
                review.status !== statusFilter
            ) {
                return false
            }

            if (!term) return true

            return (
                `${userName(review.userId)} ` +
                `${vehicleName(review.vehicleId)} ` +
                `${review.comment}`
            ).toLowerCase().includes(term)
        })
    }, [
        reviews,
        search,
        statusFilter,
        userName,
        vehicleName,
    ])

    // Clear form
    const clearForm = () => {
        setSelectedId(null)
        setBookingId('')
        setRating('5')
        setComment('')
        setStatus('PENDING')
        setError('')
    }

    // Save review
    const saveReview = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()

        setError('')
        setSuccess('')

        const numericRating = Number(rating)

        if (!bookingId || !comment.trim()) {
            setError('Please select a booking and enter a comment.')
            return
        }

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            setError('Rating must be between 1 and 5.')
            return
        }

        if (!selectedBooking) {
            setError('Please select a valid booking.')
            return
        }

        if (selectedBooking.status !== 'COMPLETED') {
            setError('Only completed bookings can be reviewed.')
            return
        }

        try {
            setSaving(true)

            if (selectedId) {
                const payload: ReviewUpdateData = {
                    rating: numericRating,
                    comment: comment.trim(),
                }

                // Only ADMIN can update review status
                if (isAdmin) {
                    payload.status = status
                }

                await reviewApi.update(selectedId, payload)

                setSuccess('Review updated successfully.')

            } else {
                const payload: ReviewCreateData = {
                    bookingId: selectedBooking._id,
                    vehicleId: idOf(selectedBooking.vehicleId),
                    rating: numericRating,
                    comment: comment.trim(),
                }

                await reviewApi.create(payload)

                setSuccess('Review submitted successfully.')
            }

            clearForm()
            await loadAll()

        } catch (err) {
            console.error('Failed to save review:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to save review. Please try again.'
            )
        } finally {
            setSaving(false)
        }
    }

    // Edit review
    const editReview = (review: Review) => {
        setSelectedId(review._id)
        setBookingId(idOf(review.bookingId))
        setRating(String(review.rating))
        setComment(review.comment)
        setStatus(review.status)

        setError('')
        setSuccess('')

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })
    }

    // Delete review
    const deleteReview = async (review: Review) => {
        if (
            !window.confirm(
                'Are you sure you want to delete this review?'
            )
        ) {
            return
        }

        try {
            setError('')
            setSuccess('')

            await reviewApi.remove(review._id)

            if (selectedId === review._id) {
                clearForm()
            }

            setSuccess('Review deleted successfully.')

            await loadAll()

        } catch (err) {
            console.error('Failed to delete review:', err)

            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to delete review.'
            )
        }
    }

    const canManageReview = (review: Review) => {
        if (isAdmin) return true

        if (isCustomer) {
            return idOf(review.userId) === loggedUser?._id
        }

        return false
    }

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Review Management</h1>

            {error && (
                <p role="alert" className={ui.error}>
                    {error}
                </p>
            )}

            {success && (
                <p role="status" className={ui.success}>
                    {success}
                </p>
            )}

            {/* CUSTOMER / ADMIN REVIEW FORM */}
            {(isCustomer || isAdmin) && (
                <>
                    <h2 className={ui.h2}>
                        {selectedId ? 'Update Review' : 'Add Review'}
                    </h2>

                    {!loading && !selectedId &&
                        availableBookings.length === 0 && (
                            <p className={ui.hint}>
                                {isCustomer
                                    ? 'You do not have any completed bookings available for review. Complete a booking first.'
                                    : 'There are no completed bookings available for review.'}
                            </p>
                        )}

                    <form
                        className={ui.form}
                        onSubmit={saveReview}
                    >
                        <div className={ui.fieldFull}>
                            <label
                                className={ui.label}
                                htmlFor="bookingId"
                            >
                                Booking *
                            </label>

                            <select
                                className={ui.input}
                                id="bookingId"
                                value={bookingId}
                                onChange={(e) =>
                                    setBookingId(e.target.value)
                                }
                                required
                                disabled={!!selectedId}
                            >
                                <option value="">
                                    Select completed booking
                                </option>

                                {availableBookings.map((booking) => (
                                    <option
                                        key={booking._id}
                                        value={booking._id}
                                    >
                                        {formatDate(booking.pickupDate)}
                                        {' - '}
                                        {idOf(booking.vehicleId)}
                                    </option>
                                ))}

                                {/* Keep current booking visible when editing */}
                                {selectedId &&
                                    selectedBooking &&
                                    !availableBookings.some(
                                        (b) => b._id === selectedBooking._id
                                    ) && (
                                        <option value={selectedBooking._id}>
                                            {formatDate(selectedBooking.pickupDate)}
                                        </option>
                                    )}
                            </select>
                        </div>

                        <div className={ui.fieldFull}>
                            <label className={ui.label}>
                                Vehicle
                            </label>

                            <input
                                className={ui.input}
                                value={
                                    selectedVehicle
                                        ? `${selectedVehicle.registrationNumber} - ${selectedVehicle.brand} ${selectedVehicle.model}`
                                        : selectedBooking
                                            ? 'Vehicle information unavailable'
                                            : 'Select a booking first'
                                }
                                readOnly
                            />
                        </div>

                        <div className={ui.field}>
                            <label
                                className={ui.label}
                                htmlFor="rating"
                            >
                                Rating *
                            </label>

                            <select
                                className={ui.input}
                                id="rating"
                                value={rating}
                                onChange={(e) =>
                                    setRating(e.target.value)
                                }
                                required
                            >
                                {RATINGS.map((r) => (
                                    <option key={r} value={r}>
                                        {stars(r)} ({r})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isAdmin && selectedId && (
                            <div className={ui.field}>
                                <label
                                    className={ui.label}
                                    htmlFor="status"
                                >
                                    Status
                                </label>

                                <select
                                    className={ui.input}
                                    id="status"
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(
                                            e.target.value as ReviewStatus
                                        )
                                    }
                                >
                                    {STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {label(s)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={ui.fieldFull}>
                            <label
                                className={ui.label}
                                htmlFor="comment"
                            >
                                Comment *
                            </label>

                            <textarea
                                className={ui.textarea}
                                id="comment"
                                placeholder="Write your review..."
                                value={comment}
                                onChange={(e) =>
                                    setComment(e.target.value)
                                }
                                required
                            />
                        </div>

                        <div className={ui.actions}>
                            <button
                                type="submit"
                                className={ui.btnPrimary}
                                disabled={
                                    saving ||
                                    (!selectedId &&
                                        availableBookings.length === 0)
                                }
                            >
                                {saving
                                    ? 'Saving...'
                                    : selectedId
                                        ? 'Update Review'
                                        : 'Submit Review'}
                            </button>

                            <button
                                type="button"
                                className={ui.btnSecondary}
                                onClick={clearForm}
                            >
                                Clear
                            </button>
                        </div>
                    </form>

                    <hr className={ui.hr} />
                </>
            )}

            {isEmployee && (
                <p className={ui.hint}>
                    You have permission to view reviews only.
                </p>
            )}

            {/* REVIEW LIST */}
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
                    onChange={(e) =>
                        setStatusFilter(
                            e.target.value as 'ALL' | ReviewStatus
                        )
                    }
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>

                    {STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {label(s)}
                        </option>
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
                                    <td
                                        className={ui.td}
                                        colSpan={7}
                                    >
                                        No reviews found.
                                    </td>
                                </tr>
                            ) : (
                                filteredReviews.map((review) => (
                                    <tr
                                        className={ui.tr}
                                        key={review._id}
                                    >
                                        <td className={ui.td}>
                                            {userName(review.userId)}
                                        </td>

                                        <td className={ui.td}>
                                            {vehicleName(review.vehicleId)}
                                        </td>

                                        <td
                                            className={`${ui.td} whitespace-nowrap text-amber-500`}
                                            title={`${review.rating} / 5`}
                                        >
                                            {stars(review.rating)}
                                        </td>

                                        <td className={ui.td}>
                                            {review.comment}
                                        </td>

                                        <td className={ui.td}>
                                            {formatDate(review.reviewDate)}
                                        </td>

                                        <td className={ui.td}>
                                                <span
                                                    className={`${ui.badge} ${badgeTone[review.status]}`}
                                                >
                                                    {label(review.status)}
                                                </span>
                                        </td>

                                        <td className={ui.td}>
                                            {canManageReview(review) && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className={ui.btnEdit}
                                                        onClick={() =>
                                                            editReview(review)
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={ui.btnDelete}
                                                        onClick={() =>
                                                            void deleteReview(review)
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}

                                            {isEmployee && '-'}
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
