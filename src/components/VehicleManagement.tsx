import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { vehicleApi, branchApi, categoryApi } from '../services/api'
import type {
  Vehicle,
  VehicleData,
  Branch,
  VehicleCategory,
  VehicleTransmission,
  FuelType,
  VehicleStatus,
} from '../services/api'
import { ui, badgeTone } from './ui'

const TRANSMISSIONS: VehicleTransmission[] = ['AUTOMATIC', 'MANUAL']
const FUEL_TYPES: FuelType[] = ['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC']
const STATUSES: VehicleStatus[] = ['AVAILABLE', 'BOOKED', 'RENTED', 'MAINTENANCE', 'INACTIVE']

const initialForm = {
  registrationNumber: '',
  brand: '',
  model: '',
  year: String(new Date().getFullYear()),
  color: '',
  transmission: 'AUTOMATIC' as VehicleTransmission,
  fuelType: 'PETROL' as FuelType,
  seatingCapacity: '4',
  dailyRate: '',
  status: 'AVAILABLE' as VehicleStatus,
  categoryId: '',
  branchId: '',
}

type VehicleForm = typeof initialForm

const idOf = (ref: Vehicle['categoryId'] | Vehicle['branchId']) =>
  typeof ref === 'string' ? ref : ref?._id ?? ''

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [categories, setCategories] = useState<VehicleCategory[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [form, setForm] = useState<VehicleForm>(initialForm)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | VehicleStatus>('ALL')

  const loadAll = async () => {
    try {
      setLoading(true)
      setError('')
      const [vehicleData, categoryData, branchData] = await Promise.all([
        vehicleApi.getAll(),
        categoryApi.getAll(),
        branchApi.getAll(),
      ])
      setVehicles(vehicleData)
      setCategories(categoryData)
      setBranches(branchData)
    } catch (err) {
      console.error('Failed to load vehicles:', err)
      setError('Unable to load data. Please check the server and try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadVehicles = async () => {
    try {
      setVehicles(await vehicleApi.getAll())
    } catch (err) {
      console.error('Failed to load vehicles:', err)
      setError('Unable to load vehicles. Please try again.')
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c._id, c.categoryName]))
    return (ref: Vehicle['categoryId']) =>
      (typeof ref === 'object' && ref?.categoryName) || map.get(idOf(ref)) || '-'
  }, [categories])

  const branchName = useMemo(() => {
    const map = new Map(branches.map((b) => [b._id, b.branchName]))
    return (ref: Vehicle['branchId']) =>
      (typeof ref === 'object' && ref?.branchName) || map.get(idOf(ref)) || '-'
  }, [branches])

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false
      if (!term) return true
      return [v.registrationNumber, v.brand, v.model, v.color]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [vehicles, search, statusFilter])

  const updateField = <K extends keyof VehicleForm>(field: K, value: VehicleForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const clearForm = () => {
    setSelectedId(null)
    setForm(initialForm)
    setError('')
  }

  const saveVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccess('')

    const year = Number(form.year)
    const seatingCapacity = Number(form.seatingCapacity)
    const dailyRate = Number(form.dailyRate)

    if (
      !form.registrationNumber.trim() ||
      !form.brand.trim() ||
      !form.model.trim() ||
      !form.color.trim() ||
      !form.categoryId ||
      !form.branchId
    ) {
      setError('Please fill in all required fields.')
      return
    }

    if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1) {
      setError('Please enter a valid manufacturing year.')
      return
    }

    if (!Number.isInteger(seatingCapacity) || seatingCapacity < 1) {
      setError('Seating capacity must be at least 1.')
      return
    }

    if (!(dailyRate > 0)) {
      setError('Daily rate must be greater than 0.')
      return
    }

    const payload: VehicleData = {
      registrationNumber: form.registrationNumber.trim().toUpperCase(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year,
      color: form.color.trim(),
      transmission: form.transmission,
      fuelType: form.fuelType,
      seatingCapacity,
      dailyRate,
      status: form.status,
      categoryId: form.categoryId,
      branchId: form.branchId,
    }

    try {
      setSaving(true)
      setError('')

      if (selectedId) {
        await vehicleApi.update(selectedId, payload)
        setSuccess('Vehicle updated successfully.')
      } else {
        await vehicleApi.create(payload)
        setSuccess('Vehicle saved successfully.')
      }

      clearForm()
      await loadVehicles()
    } catch (err) {
      console.error('Failed to save vehicle:', err)
      setError(
        err instanceof Error && err.message && err.message !== 'Request failed'
          ? err.message
          : 'Unable to save vehicle. The registration number may already exist.',
      )
    } finally {
      setSaving(false)
    }
  }

  const editVehicle = (vehicle: Vehicle) => {
    setSelectedId(vehicle._id)
    setForm({
      registrationNumber: vehicle.registrationNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      color: vehicle.color,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seatingCapacity: String(vehicle.seatingCapacity),
      dailyRate: String(vehicle.dailyRate),
      status: vehicle.status,
      categoryId: idOf(vehicle.categoryId),
      branchId: idOf(vehicle.branchId),
    })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteVehicle = async (vehicle: Vehicle) => {
    if (!window.confirm(`Delete vehicle ${vehicle.registrationNumber}?`)) return

    try {
      setError('')
      setSuccess('')
      await vehicleApi.remove(vehicle._id)
      if (selectedId === vehicle._id) clearForm()
      setSuccess('Vehicle deleted successfully.')
      await loadVehicles()
    } catch (err) {
      console.error('Failed to delete vehicle:', err)
      setError('Unable to delete vehicle. Please try again.')
    }
  }

  const missingRefs = !loading && (categories.length === 0 || branches.length === 0)

  return (
    <main className={ui.page}>
      <h1 className={ui.h1}>Vehicle Management</h1>

      {error && <p role="alert" className={ui.error}>{error}</p>}
      {success && <p role="status" className={ui.success}>{success}</p>}
      {missingRefs && (
        <p className={ui.hint}>
          You need at least one vehicle category and one branch before adding a vehicle.
          Create them first (POST /api/vehicle-categories and /api/branches).
        </p>
      )}

      <form className={ui.form} onSubmit={saveVehicle}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="registrationNumber">Registration Number *</label>
          <input
            className={ui.input}
            id="registrationNumber"
            type="text"
            placeholder="CAB-1234"
            value={form.registrationNumber}
            onChange={(e) => updateField('registrationNumber', e.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="brand">Brand *</label>
          <input
            className={ui.input}
            id="brand"
            type="text"
            placeholder="Toyota"
            value={form.brand}
            onChange={(e) => updateField('brand', e.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="model">Model *</label>
          <input
            className={ui.input}
            id="model"
            type="text"
            placeholder="Prado"
            value={form.model}
            onChange={(e) => updateField('model', e.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="year">Year *</label>
          <input
            className={ui.input}
            id="year"
            type="number"
            min={1980}
            max={new Date().getFullYear() + 1}
            value={form.year}
            onChange={(e) => updateField('year', e.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="color">Color *</label>
          <input
            className={ui.input}
            id="color"
            type="text"
            placeholder="White"
            value={form.color}
            onChange={(e) => updateField('color', e.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="seatingCapacity">Seating Capacity *</label>
          <input
            className={ui.input}
            id="seatingCapacity"
            type="number"
            min={1}
            value={form.seatingCapacity}
            onChange={(e) => updateField('seatingCapacity', e.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="transmission">Transmission *</label>
          <select
            className={ui.input}
            id="transmission"
            value={form.transmission}
            onChange={(e) => updateField('transmission', e.target.value as VehicleTransmission)}
            required
          >
            {TRANSMISSIONS.map((t) => (
              <option key={t} value={t}>{label(t)}</option>
            ))}
          </select>
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="fuelType">Fuel Type *</label>
          <select
            className={ui.input}
            id="fuelType"
            value={form.fuelType}
            onChange={(e) => updateField('fuelType', e.target.value as FuelType)}
            required
          >
            {FUEL_TYPES.map((f) => (
              <option key={f} value={f}>{label(f)}</option>
            ))}
          </select>
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="dailyRate">Daily Rate (LKR) *</label>
          <input
            className={ui.input}
            id="dailyRate"
            type="number"
            min={1}
            step="0.01"
            placeholder="18000"
            value={form.dailyRate}
            onChange={(e) => updateField('dailyRate', e.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="status">Status *</label>
          <select
            className={ui.input}
            id="status"
            value={form.status}
            onChange={(e) => updateField('status', e.target.value as VehicleStatus)}
            required
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{label(s)}</option>
            ))}
          </select>
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="categoryId">Category *</label>
          <select
            className={ui.input}
            id="categoryId"
            value={form.categoryId}
            onChange={(e) => updateField('categoryId', e.target.value)}
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.categoryName}</option>
            ))}
          </select>
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="branchId">Branch *</label>
          <select
            className={ui.input}
            id="branchId"
            value={form.branchId}
            onChange={(e) => updateField('branchId', e.target.value)}
            required
          >
            <option value="">Select branch</option>
            {branches.map((b) => (
              <option key={b._id} value={b._id}>{b.branchName}</option>
            ))}
          </select>
        </div>

        <div className={ui.actions}>
          <button type="submit" className={ui.btnPrimary} disabled={saving}>
            {saving ? 'Saving...' : selectedId ? 'Update Vehicle' : 'Save Vehicle'}
          </button>
          <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
        </div>
      </form>

      <hr className={ui.hr} />

      <h2 className={ui.h2}>Vehicle List</h2>

      <div className={ui.toolbar}>
        <input
          className={ui.search}
          type="search"
          placeholder="Search by registration, brand, model or color"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search vehicles"
        />
        <select
          className={ui.filter}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'ALL' | VehicleStatus)}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{label(s)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading vehicles...</p>
      ) : (
        <>
          <p className={ui.count}>
            Showing {filteredVehicles.length} of {vehicles.length} vehicles
          </p>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>
                  <th className={ui.th}>Registration</th>
                  <th className={ui.th}>Vehicle</th>
                  <th className={ui.th}>Year</th>
                  <th className={ui.th}>Color</th>
                  <th className={ui.th}>Transmission</th>
                  <th className={ui.th}>Fuel</th>
                  <th className={ui.th}>Seats</th>
                  <th className={ui.th}>Daily Rate</th>
                  <th className={ui.th}>Category</th>
                  <th className={ui.th}>Branch</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr className={ui.tr}>
                    <td className={ui.td} colSpan={12}>No vehicles found.</td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => (
                    <tr className={ui.tr} key={v._id}>
                      <td className={ui.td}>{v.registrationNumber}</td>
                      <td className={ui.td}>{v.brand} {v.model}</td>
                      <td className={ui.td}>{v.year}</td>
                      <td className={ui.td}>{v.color}</td>
                      <td className={ui.td}>{label(v.transmission)}</td>
                      <td className={ui.td}>{label(v.fuelType)}</td>
                      <td className={ui.td}>{v.seatingCapacity}</td>
                      <td className={ui.td}>{Number(v.dailyRate).toLocaleString()}</td>
                      <td className={ui.td}>{categoryName(v.categoryId)}</td>
                      <td className={ui.td}>{branchName(v.branchId)}</td>
                      <td className={ui.td}>
                        <span className={`${ui.badge} ${badgeTone[v.status]}`}>{label(v.status)}</span>
                      </td>
                      <td className={ui.td}>
                        <button type="button" className={ui.btnEdit} onClick={() => editVehicle(v)}>Edit</button>
                        <button type="button" className={ui.btnDelete} onClick={() => void deleteVehicle(v)}>Delete</button>
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

export default VehicleManagement
