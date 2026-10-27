import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { branchApi } from '../services/api'
import type { Branch } from '../services/api'
import { ui, badgeTone } from './ui'

type BranchStatus = Branch['status']

const initialForm = {
    branchName: '',
    address: '',
    city: '',
    contactNumber: '',
    email: '',
    status: 'ACTIVE' as BranchStatus,
}

type BranchForm = typeof initialForm

function BranchManagement() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [form, setForm] = useState<BranchForm>(initialForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')

    const loadBranches = async () => {
        try {
            setLoading(true)
            setError('')
            setBranches(await branchApi.getAll())
        } catch (err) {
            console.error('Failed to load branches:', err)
            setError('Unable to load branches. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadBranches()
    }, [])

    const filteredBranches = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return branches
        return branches.filter((b) =>
            `${b.branchName} ${b.city} ${b.address} ${b.email}`.toLowerCase().includes(term),
        )
    }, [branches, search])

    const updateField = <K extends keyof BranchForm>(field: K, value: BranchForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(initialForm)
        setError('')
    }

    const saveBranch = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        if (
            !form.branchName.trim() ||
            !form.address.trim() ||
            !form.city.trim() ||
            !form.contactNumber.trim() ||
            !form.email.trim()
        ) {
            setError('Please fill in all required fields.')
            return
        }

        const payload = {
            branchName: form.branchName.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            contactNumber: form.contactNumber.trim(),
            email: form.email.trim().toLowerCase(),
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await branchApi.update(selectedId, payload)
                setSuccess('Branch updated successfully.')
            } else {
                await branchApi.create(payload)
                setSuccess('Branch saved successfully.')
            }

            clearForm()
            await loadBranches()
        } catch (err) {
            console.error('Failed to save branch:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save branch. The branch name or email may already exist.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editBranch = (branch: Branch) => {
        setSelectedId(branch._id)
        setForm({
            branchName: branch.branchName,
            address: branch.address,
            city: branch.city,
            contactNumber: branch.contactNumber,
            email: branch.email,
            status: branch.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteBranch = async (branch: Branch) => {
        if (!window.confirm(`Delete branch "${branch.branchName}"?`)) return

        try {
            setError('')
            setSuccess('')
            await branchApi.remove(branch._id)
            if (selectedId === branch._id) clearForm()
            setSuccess('Branch deleted successfully.')
            await loadBranches()
        } catch (err) {
            console.error('Failed to delete branch:', err)
            setError('Unable to delete branch. Please try again.')
        }
    }

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Branch Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}

            <form className={ui.form} onSubmit={saveBranch}>
                <div className={ui.field}>
                    <label className={ui.label} htmlFor="branchName">Branch Name *</label>
                    <input
            className={ui.input}
                        id="branchName"
                        type="text"
                        placeholder="Colombo Main"
                        value={form.branchName}
                        onChange={(e) => updateField('branchName', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="city">City *</label>
                    <input
            className={ui.input}
                        id="city"
                        type="text"
                        placeholder="Colombo"
                        value={form.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="address">Address *</label>
                    <textarea
            className={ui.textarea}
                        id="address"
                        placeholder="123 Galle Road"
                        value={form.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="contactNumber">Contact Number *</label>
                    <input
            className={ui.input}
                        id="contactNumber"
                        type="tel"
                        placeholder="0112345678"
                        value={form.contactNumber}
                        onChange={(e) => updateField('contactNumber', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="email">Email *</label>
                    <input
            className={ui.input}
                        id="email"
                        type="email"
                        placeholder="colombo@rental.lk"
                        value={form.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
            className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as BranchStatus)}
                        required
                    >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Branch' : 'Save Branch'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Branch List</h2>

            <div className={ui.toolbar}>
                <input
          className={ui.search}
                    type="search"
                    placeholder="Search by name, city, address or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search branches"
                />
            </div>

            {loading ? (
                <p>Loading branches...</p>
            ) : (
                <div className={ui.tableWrap}>
                    <table className={ui.table}>
                        <thead className={ui.thead}>
                        <tr>
                            <th className={ui.th}>Branch Name</th>
                            <th className={ui.th}>City</th>
                            <th className={ui.th}>Address</th>
                            <th className={ui.th}>Contact Number</th>
                            <th className={ui.th}>Email</th>
                            <th className={ui.th}>Status</th>
                            <th className={ui.th}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredBranches.length === 0 ? (
                            <tr className={ui.tr}>
                                <td className={ui.td} colSpan={7}>No branches found.</td>
                            </tr>
                        ) : (
                            filteredBranches.map((branch) => (
                                <tr className={ui.tr} key={branch._id}>
                                    <td className={ui.td}>{branch.branchName}</td>
                                    <td className={ui.td}>{branch.city}</td>
                                    <td className={ui.td}>{branch.address}</td>
                                    <td className={ui.td}>{branch.contactNumber}</td>
                                    <td className={ui.td}>{branch.email}</td>
                                    <td className={ui.td}>
                      <span className={`${ui.badge} ${badgeTone[branch.status]}`}>
                        {branch.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                                    </td>
                                    <td className={ui.td}>
                                        <button type="button" className={ui.btnEdit} onClick={() => editBranch(branch)}>Edit</button>
                                        <button type="button" className={ui.btnDelete} onClick={() => void deleteBranch(branch)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    )
}

export default BranchManagement