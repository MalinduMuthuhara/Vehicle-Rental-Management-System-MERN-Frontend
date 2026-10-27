import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { categoryApi } from '../services/api'
import type { VehicleCategory } from '../services/api'
import { ui, badgeTone } from './ui'

type CategoryStatus = VehicleCategory['status']

const initialForm = {
    categoryName: '',
    description: '',
    baseDailyRate: '',
    status: 'ACTIVE' as CategoryStatus,
}

type CategoryForm = typeof initialForm

function VehicleCategoryManagement() {
    const [categories, setCategories] = useState<VehicleCategory[]>([])
    const [form, setForm] = useState<CategoryForm>(initialForm)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')

    const loadCategories = async () => {
        try {
            setLoading(true)
            setError('')
            setCategories(await categoryApi.getAll())
        } catch (err) {
            console.error('Failed to load vehicle categories:', err)
            setError('Unable to load vehicle categories. Please check the server and try again.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadCategories()
    }, [])

    const filteredCategories = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return categories
        return categories.filter((c) =>
            `${c.categoryName} ${c.description}`.toLowerCase().includes(term),
        )
    }, [categories, search])

    const updateField = <K extends keyof CategoryForm>(field: K, value: CategoryForm[K]) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const clearForm = () => {
        setSelectedId(null)
        setForm(initialForm)
        setError('')
    }

    const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setSuccess('')

        const baseDailyRate = Number(form.baseDailyRate)

        if (!form.categoryName.trim() || !form.description.trim()) {
            setError('Please fill in all required fields.')
            return
        }

        if (!(baseDailyRate > 0)) {
            setError('Base daily rate must be greater than 0.')
            return
        }

        const payload = {
            categoryName: form.categoryName.trim(),
            description: form.description.trim(),
            baseDailyRate,
            status: form.status,
        }

        try {
            setSaving(true)
            setError('')

            if (selectedId) {
                await categoryApi.update(selectedId, payload)
                setSuccess('Vehicle category updated successfully.')
            } else {
                await categoryApi.create(payload)
                setSuccess('Vehicle category saved successfully.')
            }

            clearForm()
            await loadCategories()
        } catch (err) {
            console.error('Failed to save vehicle category:', err)
            setError(
                err instanceof Error && err.message && err.message !== 'Request failed'
                    ? err.message
                    : 'Unable to save vehicle category. The category name may already exist.',
            )
        } finally {
            setSaving(false)
        }
    }

    const editCategory = (category: VehicleCategory) => {
        setSelectedId(category._id)
        setForm({
            categoryName: category.categoryName,
            description: category.description,
            baseDailyRate: String(category.baseDailyRate),
            status: category.status,
        })
        setError('')
        setSuccess('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const deleteCategory = async (category: VehicleCategory) => {
        if (!window.confirm(`Delete category "${category.categoryName}"?`)) return

        try {
            setError('')
            setSuccess('')
            await categoryApi.remove(category._id)
            if (selectedId === category._id) clearForm()
            setSuccess('Vehicle category deleted successfully.')
            await loadCategories()
        } catch (err) {
            console.error('Failed to delete vehicle category:', err)
            setError('Unable to delete vehicle category. Please try again.')
        }
    }

    return (
        <main className={ui.page}>
            <h1 className={ui.h1}>Vehicle Category Management</h1>

            {error && <p role="alert" className={ui.error}>{error}</p>}
            {success && <p role="status" className={ui.success}>{success}</p>}

            <form className={ui.form} onSubmit={saveCategory}>
                <div className={ui.field}>
                    <label className={ui.label} htmlFor="categoryName">Category Name *</label>
                    <input
            className={ui.input}
                        id="categoryName"
                        type="text"
                        placeholder="SUV"
                        value={form.categoryName}
                        onChange={(e) => updateField('categoryName', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="baseDailyRate">Base Daily Rate (LKR) *</label>
                    <input
            className={ui.input}
                        id="baseDailyRate"
                        type="number"
                        min={1}
                        step="0.01"
                        placeholder="15000"
                        value={form.baseDailyRate}
                        onChange={(e) => updateField('baseDailyRate', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.fieldFull}>
                    <label className={ui.label} htmlFor="description">Description *</label>
                    <textarea
            className={ui.textarea}
                        id="description"
                        placeholder="Sport utility vehicles"
                        value={form.description}
                        onChange={(e) => updateField('description', e.target.value)}
                        required
                    />
                </div>

                <div className={ui.field}>
                    <label className={ui.label} htmlFor="status">Status *</label>
                    <select
            className={ui.input}
                        id="status"
                        value={form.status}
                        onChange={(e) => updateField('status', e.target.value as CategoryStatus)}
                        required
                    >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>

                <div className={ui.actions}>
                    <button type="submit" className={ui.btnPrimary} disabled={saving}>
                        {saving ? 'Saving...' : selectedId ? 'Update Category' : 'Save Category'}
                    </button>
                    <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
                </div>
            </form>

            <hr className={ui.hr} />

            <h2 className={ui.h2}>Vehicle Category List</h2>

            <div className={ui.toolbar}>
                <input
          className={ui.search}
                    type="search"
                    placeholder="Search by name or description"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search vehicle categories"
                />
            </div>

            {loading ? (
                <p>Loading vehicle categories...</p>
            ) : (
                <div className={ui.tableWrap}>
                    <table className={ui.table}>
                        <thead className={ui.thead}>
                        <tr>
                            <th className={ui.th}>Category Name</th>
                            <th className={ui.th}>Description</th>
                            <th className={ui.th}>Base Daily Rate</th>
                            <th className={ui.th}>Status</th>
                            <th className={ui.th}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredCategories.length === 0 ? (
                            <tr className={ui.tr}>
                                <td className={ui.td} colSpan={5}>No vehicle categories found.</td>
                            </tr>
                        ) : (
                            filteredCategories.map((category) => (
                                <tr className={ui.tr} key={category._id}>
                                    <td className={ui.td}>{category.categoryName}</td>
                                    <td className={ui.td}>{category.description}</td>
                                    <td className={ui.td}>{Number(category.baseDailyRate).toLocaleString()}</td>
                                    <td className={ui.td}>
                      <span className={`${ui.badge} ${badgeTone[category.status]}`}>
                        {category.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                                    </td>
                                    <td className={ui.td}>
                                        <button type="button" className={ui.btnEdit} onClick={() => editCategory(category)}>Edit</button>
                                        <button type="button" className={ui.btnDelete} onClick={() => void deleteCategory(category)}>Delete</button>
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

export default VehicleCategoryManagement