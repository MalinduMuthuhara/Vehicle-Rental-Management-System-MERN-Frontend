import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { maintenanceApi, vehicleApi } from '../services/api'
import type {
    VehicleMaintenance,
    VehicleMaintenanceData,
    MaintenanceType,
    MaintenanceStatus,
    Vehicle,
} from '../services/api'
import { ui, badgeTone } from './ui'

const TYPES: MaintenanceType[] = ['ROUTINE', 'REPAIR', 'INSPECTION']
const STATUSES: MaintenanceStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const initialForm = {
    vehicleId: '',
    maintenanceType: 'ROUTINE' as MaintenanceType,
    description: '',
    serviceDate: '',
    cost: '',
    serviceProvider: '',
    nextServiceDate: '',
    status: 'SCHEDULED' as MaintenanceStatus,
}

type MaintenanceForm = typeof initialForm

const idOf = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id ?? '')

// "IN_PROGRESS" -> "In progress"
const label = (value: string) => {
    const text = value.replace(/_/g, ' ').toLowerCase()
    return text.charAt(0).toUpperCase() + text.slice(1)
}

// <input type="date"> needs "YYYY-MM-DD" in local time
const toInputDate = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const formatDate = (iso?: string | null) => {
    if (!iso) return '-'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function VehicleMaintenanceManagement() {
    const [records, setRecords] = useState<VehicleMaintenance[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [form, setForm] = useState<MaintenanceForm>(initialForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | MaintenanceStatus>('ALL')

    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')
            const [recordData, vehicleData] = await Promise.all([
                maintenanceApi.getAll(),
                vehicleApi.getAll(),
            ])
            setRecords(recordData)
            setVehicles(vehicleData)
        } catch (err) {
            console.error('Failed to load maintenance records:', err)
            setError('Unable to load data. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadRecords = async () => {
        try {
            setRecords(await maintenanceApi.getAll())
        } catch (err) {
            console.error('Failed to load maintenance records:', err)
            setError('Unable to load maintenance records. Please try again.')
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    const vehicleName = useMemo(() => {
        const map = new Map(vehicles.map((v) => [v._id, `${v.registrationNumber} - ${v.brand} ${v.model}`]))
        return (ref: VehicleMaintenance['vehicleId']) => map.get(idOf(ref)) || '-'
    }, [vehicles])

    const filteredRecords = useMemo(() => {
        const term = search.trim().toLowerCase()
        return records.filter((r) => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
            if (!term) return true
            return `${vehicleName(r.vehicleId)} ${r.serviceProvider} ${r.description}`
                .toLowerCase()
                .includes(term)
        })
    }, [records, search, statusFilter, vehicleName])

    const updateField = <K extends keyof MaintenanceForm>(field: K, value: MaintenanceForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(initialForm)
        setError('')
    }

    const saveRecord = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const cost = Number(form.cost)

        if (
            !form.vehicleId ||
            !form.description.trim() ||
            !form.serviceDate ||
            !form.serviceProvider.trim() ||
            form.cost.trim() === ''
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (!(cost >= 0)) {
            setError('Cost cannot be negative.')
            return
        }

        if (form.nextServiceDate && form.nextServiceDate <= form.serviceDate) {
            setError('Next service date must be after the service date.')
            return
        }

        const payload: VehicleMaintenanceData = {
            vehicleId: form.vehicleId,
            maintenanceType: form.maintenanceType,
            description: form.description.trim(),
            serviceDate: new Date(form.serviceDate).toISOString(),
            cost,
            serviceProvider: form.serviceProvider.trim(),
            nextServiceDate: form.nextServiceDate ? new Date(form.nextServiceDate).toISOString() : null,
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await maintenanceApi.update(selectedId, payload)
                setSuccess('Maintenance record updated successfully.')
            } else {
                await maintenanceApi.create(payload)
                setSuccess('Maintenance record saved successfully.')
            }

            clearForm()
            await loadRecords()
        } catch (err) {
            console.error('Failed to save maintenance record:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save maintenance record. Check the entered details and try again.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editRecord = (record: VehicleMaintenance) => {
        setSelectedId(record._id)
        setForm({
            vehicleId: idOf(record.vehicleId),
            maintenanceType: record.maintenanceType,
            description: record.description,
            serviceDate: toInputDate(record.serviceDate),
            cost: String(record.cost),
            serviceProvider: record.serviceProvider,
            nextServiceDate: toInputDate(record.nextServiceDate),
            status: record.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteRecord = async (record: VehicleMaintenance) => {
        if (!window.confirm('Are you sure you want to delete this maintenance record?')) return

        try {
            setError('')
            setSuccess('')
            await maintenanceApi.remove(record._id)
            if (selectedId === record._id) clearForm()
            setSuccess('Maintenance record deleted successfully.')
            await loadRecords()
        } catch (err) {
            console.error('Failed to delete maintenance record:', err)
            setError('Unable to delete maintenance record. Please try again.')
        }
    }

    const missingRefs = !loading && vehicles.length === 0

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Vehicle Maintenance Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}
            {missingRefs && (
                <p className={ui.hint}>
                    You need at least one vehicle before adding a maintenance record. Create a vehicle first.
                </p>
            )}

            <form className={ui.form} onSubmit={saveRecord}>
                <div className={ui.fieldFull}>
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
                    <label className={ui.label} htmlFor="maintenanceType">Maintenance Type *</label>
                    <select
                        className={ui.input}
                        id="maintenanceType"
                        value={form.maintenanceType}
                        onChange={(e) => updateField('maintenanceType', e.target.value as MaintenanceType)}
                        required
                    >
                        {TYPES.map((t) => (
                            <option key={t} value={t}>{label(t)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
                        className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as MaintenanceStatus)}
                        required
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="description">Description *</label>
                    <textarea
                        className={ui.textarea}
                        id="description"
                        placeholder="Oil change and tyre rotation"
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="serviceDate">Service Date *</label>
                    <input
                        className={ui.input}
                        id="serviceDate"
                        type="date"
                        value={form.serviceDate}
                        onChange={(e) => updateField('serviceDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="nextServiceDate">Next Service Date</label>
                    <input
                        className={ui.input}
                        id="nextServiceDate"
                        type="date"
                        min={form.serviceDate || undefined}
                        value={form.nextServiceDate}
                        onChange={(e) => updateField('nextServiceDate', e.target.value)}
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="cost">Cost (LKR) *</label>
                    <input
                        className={ui.input}
                        id="cost"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="12000"
                        value={form.cost}
                        onChange={(e) => updateField('cost', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="serviceProvider">Service Provider *</label>
                    <input
                        className={ui.input}
                        id="serviceProvider"
                        type="text"
                        placeholder="AutoCare Colombo"
                        value={form.serviceProvider}
                        onChange={(e) => updateField('serviceProvider', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Record' : 'Save Record'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Maintenance List</h2>

            <div className={ui.toolbar}>
                <input
                    className={ui.search}
                    type="search"
                    placeholder="Search by vehicle, provider or description"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search maintenance records"
                />
                <select
                    className={ui.filter}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | MaintenanceStatus)}
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Loading maintenance records...</p>
            ) : (
                <>
                    <p className={ui.count}>
                        Showing {filteredRecords.length} of {records.length} records
                    </p>
                    <div className={ui.tableWrap}>
                        <table className={ui.table}>
                            <thead className={ui.thead}>
                            <tr>
                                <th className={ui.th}>Vehicle</th>
                                <th className={ui.th}>Type</th>
                                <th className={ui.th}>Description</th>
                                <th className={ui.th}>Service Date</th>
                                <th className={ui.th}>Next Service</th>
                                <th className={ui.th}>Cost</th>
                                <th className={ui.th}>Provider</th>
                                <th className={ui.th}>Status</th>
                                <th className={ui.th}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredRecords.length === 0 ? (
                                <tr className={ui.tr}>
                                    <td className={ui.td} colSpan={9}>No maintenance records found.</td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr className={ui.tr} key={r._id}>
                                        <td className={ui.td}>{vehicleName(r.vehicleId)}</td>
                                        <td className={ui.td}>{label(r.maintenanceType)}</td>
                                        <td className={ui.td}>{r.description}</td>
                                        <td className={ui.td}>{formatDate(r.serviceDate)}</td>
                                        <td className={ui.td}>{formatDate(r.nextServiceDate)}</td>
                                        <td className={ui.td}>{Number(r.cost).toLocaleString()}</td>
                                        <td className={ui.td}>{r.serviceProvider}</td>
                                        <td className={ui.td}>
                                            <span className={`${ui.badge} ${badgeTone[r.status]}`}>{label(r.status)}</span>
                                        </td>
                                        <td className={ui.td}>
                                            <button type="button" className={ui.btnEdit} onClick={() => editRecord(r)}>Edit</button>
                                            <button type="button" className={ui.btnDelete} onClick={() => void deleteRecord(r)}>Delete</button>
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

export default VehicleMaintenanceManagement