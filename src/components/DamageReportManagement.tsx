import { useEffect, useMemo, useState, type FormEvent } from 'react'

import {
    damageReportApi,
    rentalApi,
    vehicleApi,
    userApi,
} from '../services/api'

import type {
    DamageReport,
    DamageReportData,
    DamageReportStatus,
    Rental,
    Vehicle,
    User,
} from '../services/api'

import { ui, badgeTone } from './ui'

const STATUSES: DamageReportStatus[] = [
    'REPORTED',
    'ASSESSED',
    'REPAIRED',
    'CLOSED',
]

const initialForm = {
    rentalId: '',
    vehicleId: '',
    reportedBy: '',
    damageType: '',
    description: '',
    damageDate: new Date().toISOString().slice(0, 10),
    estimatedCost: '',
    repairCost: '',
    photoUrls: '',
    status: 'REPORTED' as DamageReportStatus,
}

type DamageForm = typeof initialForm

const idOf = (ref: string | { _id: string }) =>
    typeof ref === 'string' ? ref : ref?._id ?? ''

const label = (value: string) => {
    const text = value.replace(/_/g, ' ').toLowerCase()
    return text.charAt(0).toUpperCase() + text.slice(1)
}

const formatDate = (date?: string) => {
    if (!date) return '-'
    const d = new Date(date)
    return Number.isNaN(d.getTime())
        ? '-'
        : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

const toInputDate = (date?: string) => {
    if (!date) return ''
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function DamageReportManagement() {
    const [reports, setReports] = useState<DamageReport[]>([])
    const [rentals, setRentals] = useState<Rental[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [users, setUsers] = useState<User[]>([])

    const [form, setForm] = useState<DamageForm>(initialForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] =
        useState<'ALL' | DamageReportStatus>('ALL')

    // Load all required data
    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')

            const [
                reportData,
                rentalData,
                vehicleData,
                userData,
            ] = await Promise.all([
                damageReportApi.getAll(),
                rentalApi.getAll(),
                vehicleApi.getAll(),
                userApi.getAll(),
            ])

            setReports(reportData)
            setRentals(rentalData)
            setVehicles(vehicleData)
            setUsers(userData)

        } catch (err) {
            console.error('Failed to load damage reports:', err)
            setError('Unable to load data. Please check the server.')
        } finally {
            setLoading(false)
        }
    }

    const loadReports = async () => {
        try {
            setReports(await damageReportApi.getAll())
        } catch (err) {
            console.error(err)
            setError('Unable to refresh damage reports.')
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    // Dropdown labels
    const vehicleName = useMemo(() => {
        const map = new Map(
            vehicles.map(v => [
                v._id,
                `${v.registrationNumber} - ${v.brand} ${v.model}`,
            ])
        )

        return (ref: DamageReport['vehicleId']) =>
            (typeof ref === 'object' && ref?.registrationNumber)
                ? `${ref.registrationNumber}`
                : map.get(idOf(ref)) || '-'
    }, [vehicles])

    const userName = useMemo(() => {
        const map = new Map(
            users.map(u => [u._id, u.userName])
        )

        return (ref: DamageReport['reportedBy']) =>
            (typeof ref === 'object' && ref?.userName)
            || map.get(idOf(ref))
            || '-'
    }, [users])

    const rentalName = useMemo(() => {
        const map = new Map(
            rentals.map(r => [r._id, r])
        )

        return (ref: DamageReport['rentalId']) => {
            const rental = map.get(idOf(ref))
            return rental
                ? `Rental ${rental._id.slice(-6)}`
                : `Rental ${idOf(ref).slice(-6)}`
        }
    }, [rentals])

    // Search and status filter
    const filteredReports = useMemo(() => {
        const term = search.trim().toLowerCase()

        return reports.filter(report => {
            if (
                statusFilter !== 'ALL' &&
                report.status !== statusFilter
            ) return false

            if (!term) return true

            return (
                `${report.damageType} ${report.description} ` +
                `${vehicleName(report.vehicleId)} ` +
                `${userName(report.reportedBy)}`
            ).toLowerCase().includes(term)
        })
    }, [
        reports,
        search,
        statusFilter,
        vehicleName,
        userName,
    ])

    const updateField = <K extends keyof DamageForm>(
        field: K,
        value: DamageForm[K]
    ) => {
        setForm(current => ({
            ...current,
            [field]: value,
        }))
    }

    // Selecting rental automatically fills vehicle and user
    const selectRental = (rentalId: string) => {
        const rental = rentals.find(r => r._id === rentalId)

        setForm(current => ({
            ...current,
            rentalId,
            vehicleId: rental ? idOf(rental.vehicleId) : '',
            reportedBy: rental ? idOf(rental.userId) : '',
        }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm({
            ...initialForm,
            damageDate: new Date().toISOString().slice(0, 10),
        })
        setError('')
    }

    // Create / Update
    const saveReport = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const estimatedCost = Number(form.estimatedCost)
        const repairCost =
            form.repairCost.trim() === ''
                ? undefined
                : Number(form.repairCost)

        if (
            !form.rentalId ||
            !form.vehicleId ||
            !form.reportedBy ||
            !form.damageType.trim() ||
            !form.description.trim() ||
            !form.damageDate ||
            form.estimatedCost.trim() === ''
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (
            !Number.isFinite(estimatedCost) ||
            estimatedCost < 0
        ) {
            setError('Estimated cost cannot be negative.')
            return
        }

        if (
            repairCost !== undefined &&
            (!Number.isFinite(repairCost) || repairCost < 0)
        ) {
            setError('Repair cost cannot be negative.')
            return
        }

        const payload: DamageReportData = {
            rentalId: form.rentalId,
            vehicleId: form.vehicleId,
            reportedBy: form.reportedBy,
            damageType: form.damageType.trim(),
            description: form.description.trim(),
            damageDate: new Date(form.damageDate).toISOString(),
            estimatedCost,
            repairCost,
            photoUrls: form.photoUrls
                .split('\n')
                .map(url => url.trim())
                .filter(Boolean),
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await damageReportApi.update(selectedId, payload)
                setSuccess('Damage report updated successfully.')
            } else {
                await damageReportApi.create(payload)
                setSuccess('Damage report created successfully.')
            }

            clearForm()
            await loadReports()

        } catch (err) {
            console.error('Failed to save damage report:', err)
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to save damage report.'
            )
        } finally {
            setSaving(false)
        }
    }

    // Edit
    const editReport = (report: DamageReport) => {
        setSelectedId(report._id)

        setForm({
            rentalId: idOf(report.rentalId),
            vehicleId: idOf(report.vehicleId),
            reportedBy: idOf(report.reportedBy),
            damageType: report.damageType,
            description: report.description,
            damageDate: toInputDate(report.damageDate),
            estimatedCost: String(report.estimatedCost),
            repairCost:
                report.repairCost !== undefined
                    ? String(report.repairCost)
                    : '',
            photoUrls: (report.photoUrls || []).join('\n'),
            status: report.status,
        })

        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Delete
    const deleteReport = async (report: DamageReport) => {
        if (
            !window.confirm(
                'Are you sure you want to delete this damage report?'
            )
        ) return

        try {
            setError('')
            setSuccess('')

            await damageReportApi.remove(report._id)

            if (selectedId === report._id) {
                clearForm()
            }

            setSuccess('Damage report deleted successfully.')
            await loadReports()

        } catch (err) {
            console.error(err)
            setError('Unable to delete damage report.')
        }
    }

    const missingRefs =
        !loading &&
        (rentals.length === 0 ||
            vehicles.length === 0 ||
            users.length === 0)

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Damage Report Management</h1>

            {error && (
                <p role="alert" className={ui.error}>{error}</p>
            )}

            {success && (
                <p role="status" className={ui.success}>{success}</p>
            )}

            {missingRefs && (
                <p className={ui.hint}>
                    Create at least one rental, vehicle and user
                    before adding a damage report.
                </p>
            )}

            {/* Damage Report Form */}
            <form className={ui.form} onSubmit={saveReport}>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="rentalId">
                        Rental *
                    </label>

                    <select
                        className={ui.input}
                        id="rentalId"
                        value={form.rentalId}
                        onChange={e => selectRental(e.target.value)}
                        required
                    >
                        <option value="">Select Rental</option>

                        {rentals.map(r => (
                            <option key={r._id} value={r._id}>
                                Rental {r._id.slice(-6)} - {label(r.status)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="vehicleId">
                        Vehicle *
                    </label>

                    <select
                        className={ui.input}
                        id="vehicleId"
                        value={form.vehicleId}
                        onChange={e => updateField('vehicleId', e.target.value)}
                        required
                    >
                        <option value="">Select Vehicle</option>

                        {vehicles.map(v => (
                            <option key={v._id} value={v._id}>
                                {v.registrationNumber} - {v.brand} {v.model}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="reportedBy">
                        Reported By *
                    </label>

                    <select
                        className={ui.input}
                        id="reportedBy"
                        value={form.reportedBy}
                        onChange={e => updateField('reportedBy', e.target.value)}
                        required
                    >
                        <option value="">Select User</option>

                        {users.map(u => (
                            <option key={u._id} value={u._id}>
                                {u.userName}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="damageType">
                        Damage Type *
                    </label>

                    <input
                        className={ui.input}
                        id="damageType"
                        placeholder="e.g. Body Damage, Broken Glass"
                        value={form.damageType}
                        onChange={e => updateField('damageType', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="damageDate">
                        Damage Date *
                    </label>

                    <input
                        className={ui.input}
                        id="damageDate"
                        type="date"
                        value={form.damageDate}
                        onChange={e => updateField('damageDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">
                        Status *
                    </label>

                    <select
                        className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={e =>
                            updateField('status', e.target.value as DamageReportStatus)
                        }
                    >
                        {STATUSES.map(s => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="description">
                        Damage Description *
                    </label>

                    <textarea
                        className={ui.textarea}
                        id="description"
                        placeholder="Describe the vehicle damage..."
                        value={form.description}
                        onChange={e => updateField('description', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="estimatedCost">
                        Estimated Cost (LKR) *
                    </label>

                    <input
                        className={ui.input}
                        id="estimatedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.estimatedCost}
                        onChange={e => updateField('estimatedCost', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="repairCost">
                        Repair Cost (LKR)
                    </label>

                    <input
                        className={ui.input}
                        id="repairCost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={form.repairCost}
                        onChange={e => updateField('repairCost', e.target.value)}
                    />
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="photoUrls">
                        Photo URLs
                    </label>

                    <textarea
                        className={ui.textarea}
                        id="photoUrls"
                        placeholder={'Enter one photo URL per line'}
                        value={form.photoUrls}
                        onChange={e => updateField('photoUrls', e.target.value)}
                    />

                    <p className="text-xs text-gray-500">
                        Add one image URL per line. This field stores URLs,
                        not uploaded image files.
                    </p>
                </div>

                <div className={ui.actions}>
                    <button
                        className={ui.btnPrimary}
                        type="submit"
                        disabled={saving}
                    >
                        {saving
                            ? 'Saving...'
                            : selectedId
                                ? 'Update Damage Report'
                                : 'Save Damage Report'}
                    </button>

                    <button
                        className={ui.btnSecondary}
                        type="button"
                        onClick={clearForm}
                    >
                        Clear
                    </button>
                </div>
            </form>

            {/* Damage Report List */}
            <h2 className={ui.h2}>Damage Report Records</h2>

            <div className={ui.toolbar}>
                <input
                    className={ui.search}
                    type="text"
                    placeholder="Search damage reports..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                <select
                    className={ui.filter}
                    value={statusFilter}
                    onChange={e =>
                        setStatusFilter(e.target.value as 'ALL' | DamageReportStatus)
                    }
                >
                    <option value="ALL">All Statuses</option>
                    {STATUSES.map(s => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            <p className={ui.count}>
                Showing {filteredReports.length} of {reports.length} damage reports
            </p>

            {loading ? (
                <p className="py-6 text-center text-gray-500">
                    Loading damage reports...
                </p>
            ) : (
                <div className={ui.tableWrap}>
                    <table className={ui.table}>
                        <thead className={ui.thead}>
                        <tr>
                            <th className={ui.th}>Vehicle</th>
                            <th className={ui.th}>Rental</th>
                            <th className={ui.th}>Reported By</th>
                            <th className={ui.th}>Damage Type</th>
                            <th className={ui.th}>Damage Date</th>
                            <th className={ui.th}>Estimated Cost</th>
                            <th className={ui.th}>Repair Cost</th>
                            <th className={ui.th}>Status</th>
                            <th className={ui.th}>Actions</th>
                        </tr>
                        </thead>

                        <tbody>
                        {filteredReports.map(report => (
                            <tr className={ui.tr} key={report._id}>
                                <td className={ui.td}>
                                    {vehicleName(report.vehicleId)}
                                </td>

                                <td className={ui.td}>
                                    {rentalName(report.rentalId)}
                                </td>

                                <td className={ui.td}>
                                    {userName(report.reportedBy)}
                                </td>

                                <td className={ui.td}>
                                    {report.damageType}
                                </td>

                                <td className={ui.td}>
                                    {formatDate(report.damageDate)}
                                </td>

                                <td className={ui.td}>
                                    {report.estimatedCost.toLocaleString()}
                                </td>

                                <td className={ui.td}>
                                    {report.repairCost !== undefined
                                        ? report.repairCost.toLocaleString()
                                        : '-'}
                                </td>

                                <td className={ui.td}>
                                        <span className={`${ui.badge} ${badgeTone[report.status] || 'bg-gray-100 text-gray-700'}`}>
                                            {label(report.status)}
                                        </span>
                                </td>

                                <td className={ui.td}>
                                    <button
                                        className={ui.btnEdit}
                                        type="button"
                                        onClick={() => editReport(report)}
                                    >
                                        Edit
                                    </button>

                                    <button
                                        className={ui.btnDelete}
                                        type="button"
                                        onClick={() => deleteReport(report)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {filteredReports.length === 0 && (
                            <tr>
                                <td
                                    className={`${ui.td} py-8 text-center text-gray-500`}
                                    colSpan={9}
                                >
                                    No damage reports found.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    )
}

export default DamageReportManagement
