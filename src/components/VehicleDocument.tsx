import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { documentApi, vehicleApi } from '../services/api'
import type {
    VehicleDocument,
    VehicleDocumentData,
    DocumentType,
    DocumentStatus,
    Vehicle,
} from '../services/api'
import { ui, badgeTone } from './ui'

const TYPES: DocumentType[] = ['REGISTRATION', 'INSURANCE', 'LICENSE']
const STATUSES: DocumentStatus[] = ['VALID', 'EXPIRING', 'EXPIRED', 'INVALID']

// A document counts as "expiring" when it ends within this many days
const EXPIRING_DAYS = 30

const initialForm = {
    vehicleId: '',
    documentType: 'REGISTRATION' as DocumentType,
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    fileUrl: '',
    status: 'VALID' as DocumentStatus,
}

type DocumentForm = typeof initialForm

const idOf = (ref: string | { _id: string }) => (typeof ref === 'string' ? ref : ref?._id ?? '')

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

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

// Suggests a status from the expiry date: past -> Expired, within 30 days -> Expiring, else Valid
const statusForExpiry = (expiry: string): DocumentStatus | null => {
    if (!expiry) return null
    const end = new Date(`${expiry}T23:59:59`).getTime()
    if (Number.isNaN(end)) return null
    const now = Date.now()
    if (end < now) return 'EXPIRED'
    if (end - now <= EXPIRING_DAYS * 24 * 60 * 60 * 1000) return 'EXPIRING'
    return 'VALID'
}

function VehicleDocumentManagement() {
    const [documents, setDocuments] = useState<VehicleDocument[]>([])
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [form, setForm] = useState<DocumentForm>(initialForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL')

    const loadAll = async () => {
        try {
            setLoading(true)
            setError('')
            const [documentData, vehicleData] = await Promise.all([
                documentApi.getAll(),
                vehicleApi.getAll(),
            ])
            setDocuments(documentData)
            setVehicles(vehicleData)
        } catch (err) {
            console.error('Failed to load vehicle documents:', err)
            setError('Unable to load data. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    const loadDocuments = async () => {
        try {
            setDocuments(await documentApi.getAll())
        } catch (err) {
            console.error('Failed to load vehicle documents:', err)
            setError('Unable to load vehicle documents. Please try again.')
        }
    }

    useEffect(() => {
        void loadAll()
    }, [])

    const vehicleName = useMemo(() => {
        const map = new Map(vehicles.map((v) => [v._id, `${v.registrationNumber} - ${v.brand} ${v.model}`]))
        return (ref: VehicleDocument['vehicleId']) => map.get(idOf(ref)) || '-'
    }, [vehicles])

    const filteredDocuments = useMemo(() => {
        const term = search.trim().toLowerCase()
        return documents.filter((d) => {
            if (statusFilter !== 'ALL' && d.status !== statusFilter) return false
            if (!term) return true
            return `${vehicleName(d.vehicleId)} ${d.documentNumber} ${d.documentType}`
                .toLowerCase()
                .includes(term)
        })
    }, [documents, search, statusFilter, vehicleName])

    const updateField = <K extends keyof DocumentForm>(field: K, value: DocumentForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    // Changing the expiry date suggests a status (it can still be changed by hand)
    const changeExpiry = (expiryDate: string) => {
        setForm((current) => ({
            ...current,
            expiryDate,
            status: statusForExpiry(expiryDate) ?? current.status,
        }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(initialForm)
        setError('')
    }

    const saveDocument = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        if (
            !form.vehicleId ||
            !form.documentNumber.trim() ||
            !form.issueDate ||
            !form.fileUrl.trim()
        ) {
            setError('Please fill in all required fields.')
            return
        }

        if (form.expiryDate && form.expiryDate <= form.issueDate) {
            setError('Expiry date must be after the issue date.')
            return
        }

        const payload: VehicleDocumentData = {
            vehicleId: form.vehicleId,
            documentType: form.documentType,
            documentNumber: form.documentNumber.trim(),
            issueDate: new Date(form.issueDate).toISOString(),
            expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
            fileUrl: form.fileUrl.trim(),
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await documentApi.update(selectedId, payload)
                setSuccess('Vehicle document updated successfully.')
            } else {
                await documentApi.create(payload)
                setSuccess('Vehicle document saved successfully.')
            }

            clearForm()
            await loadDocuments()
        } catch (err) {
            console.error('Failed to save vehicle document:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save vehicle document. The document number may already exist.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editDocument = (document: VehicleDocument) => {
        setSelectedId(document._id)
        setForm({
            vehicleId: idOf(document.vehicleId),
            documentType: document.documentType,
            documentNumber: document.documentNumber,
            issueDate: toInputDate(document.issueDate),
            expiryDate: toInputDate(document.expiryDate),
            fileUrl: document.fileUrl,
            status: document.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteDocument = async (document: VehicleDocument) => {
        if (!window.confirm(`Delete document ${document.documentNumber}?`)) return

        try {
            setError('')
            setSuccess('')
            await documentApi.remove(document._id)
            if (selectedId === document._id) clearForm()
            setSuccess('Vehicle document deleted successfully.')
            await loadDocuments()
        } catch (err) {
            console.error('Failed to delete vehicle document:', err)
            setError('Unable to delete vehicle document. Please try again.')
        }
    }

    const missingRefs = !loading && vehicles.length === 0

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Vehicle Document Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}
            {missingRefs && (
                <p className={ui.hint}>
                    You need at least one vehicle before adding a document. Create a vehicle first.
                </p>
            )}

            <form className={ui.form} onSubmit={saveDocument}>
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
                    <label className={ui.label} htmlFor="documentType">Document Type *</label>
                    <select
                        className={ui.input}
                        id="documentType"
                        value={form.documentType}
                        onChange={(e) => updateField('documentType', e.target.value as DocumentType)}
                        required
                    >
                        {TYPES.map((t) => (
                            <option key={t} value={t}>{label(t)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="documentNumber">Document Number *</label>
                    <input
                        className={ui.input}
                        id="documentNumber"
                        type="text"
                        placeholder="INS-998877"
                        value={form.documentNumber}
                        onChange={(e) => updateField('documentNumber', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="issueDate">Issue Date *</label>
                    <input
                        className={ui.input}
                        id="issueDate"
                        type="date"
                        value={form.issueDate}
                        onChange={(e) => updateField('issueDate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="expiryDate">Expiry Date</label>
                    <input
                        className={ui.input}
                        id="expiryDate"
                        type="date"
                        min={form.issueDate || undefined}
                        value={form.expiryDate}
                        onChange={(e) => changeExpiry(e.target.value)}
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="fileUrl">File URL *</label>
                    <input
                        className={ui.input}
                        id="fileUrl"
                        type="text"
                        placeholder="https://example.com/insurance.pdf"
                        value={form.fileUrl}
                        onChange={(e) => updateField('fileUrl', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
                        className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as DocumentStatus)}
                        required
                    >
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>{label(s)}</option>
                        ))}
                    </select>
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Document' : 'Save Document'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Vehicle Document List</h2>

            <div className={ui.toolbar}>
                <input
                    className={ui.search}
                    type="search"
                    placeholder="Search by vehicle, document number or type"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search vehicle documents"
                />
                <select
                    className={ui.filter}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | DocumentStatus)}
                    aria-label="Filter by status"
                >
                    <option value="ALL">All statuses</option>
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{label(s)}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p>Loading vehicle documents...</p>
            ) : (
                <>
                    <p className={ui.count}>
                        Showing {filteredDocuments.length} of {documents.length} documents
                    </p>
                    <div className={ui.tableWrap}>
                        <table className={ui.table}>
                            <thead className={ui.thead}>
                            <tr>
                                <th className={ui.th}>Vehicle</th>
                                <th className={ui.th}>Type</th>
                                <th className={ui.th}>Document No.</th>
                                <th className={ui.th}>Issue Date</th>
                                <th className={ui.th}>Expiry Date</th>
                                <th className={ui.th}>File</th>
                                <th className={ui.th}>Status</th>
                                <th className={ui.th}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredDocuments.length === 0 ? (
                                <tr className={ui.tr}>
                                    <td className={ui.td} colSpan={8}>No vehicle documents found.</td>
                                </tr>
                            ) : (
                                filteredDocuments.map((d) => (
                                    <tr className={ui.tr} key={d._id}>
                                        <td className={ui.td}>{vehicleName(d.vehicleId)}</td>
                                        <td className={ui.td}>{label(d.documentType)}</td>
                                        <td className={ui.td}>{d.documentNumber}</td>
                                        <td className={ui.td}>{formatDate(d.issueDate)}</td>
                                        <td className={ui.td}>{formatDate(d.expiryDate)}</td>
                                        <td className={ui.td}>
                                            <a
                                                className="font-semibold text-teal-700 hover:underline"
                                                href={d.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                View
                                            </a>
                                        </td>
                                        <td className={ui.td}>
                                            <span className={`${ui.badge} ${badgeTone[d.status]}`}>{label(d.status)}</span>
                                        </td>
                                        <td className={ui.td}>
                                            <button type="button" className={ui.btnEdit} onClick={() => editDocument(d)}>Edit</button>
                                            <button type="button" className={ui.btnDelete} onClick={() => void deleteDocument(d)}>Delete</button>
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

export default VehicleDocumentManagement