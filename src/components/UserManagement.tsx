import { useEffect, useState, type FormEvent } from 'react'
import { userApi } from '../services/api'
import type { User } from '../services/api'
import { ui } from './ui'

type UserRole = 'CUSTOMER' | 'EMPLOYEE' | 'ADMIN'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

const initialForm = {
  userName: '',
  email: '',
  password: '',
  contactNumber: '',
  address: '',
  role: 'CUSTOMER' as UserRole,
  status: 'ACTIVE' as UserStatus,
}

type UserForm = typeof initialForm

function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState<UserForm>(initialForm)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await userApi.getAll()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('Unable to load users. Please check the server and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const updateField = <K extends keyof UserForm>(field: K, value: UserForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const clearForm = () => {
    setSelectedId(null)
    setForm(initialForm)
    setError('')
  }

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !form.userName.trim() ||
      !form.email.trim() ||
      (!selectedId && !form.password) ||
      !form.contactNumber.trim() ||
      !form.address.trim()
    ) {
      setError('Please fill in all required fields.')
      return
    }

    try {
      setError('')
      const payload = {
        userName: form.userName.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        address: form.address.trim(),
        role: form.role,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      }

      if (selectedId) {
        await userApi.update(selectedId, payload)
      } else {
        await userApi.create({ ...payload, password: form.password })
      }

      clearForm()
      await loadUsers()
    } catch (err) {
      console.error('Failed to save user:', err)
      setError('Unable to save user. Check the entered details and try again.')
    }
  }

  const editUser = (user: User) => {
    setSelectedId(user._id)
    setForm({
      userName: user.userName,
      email: user.email,
      password: '',
      contactNumber: user.contactNumber,
      address: user.address,
      role: user.role,
      status: user.status,
    })
    setError('')
  }

  const deleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return

    try {
      setError('')
      await userApi.remove(id)
      if (selectedId === id) clearForm()
      await loadUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
      setError('Unable to delete user. Please try again.')
    }
  }

  return (
    <main className={ui.page}>
      <h1 className={ui.h1}>User Management</h1>

      {error && <p role="alert" className={ui.error}>{error}</p>}

      <form className={ui.form} onSubmit={saveUser}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor="userName">User Name *</label>
          <input
            className={ui.input}
            id="userName"
            type="text"
            value={form.userName}
            onChange={(event) => updateField('userName', event.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="email">Email *</label>
          <input
            className={ui.input}
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="password">
            Password {selectedId ? '(leave blank to keep unchanged)' : '*'}
          </label>
          <input
            className={ui.input}
            id="password"
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            minLength={8}
            autoComplete={selectedId ? 'new-password' : 'new-password'}
            required={!selectedId}
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="contactNumber">Contact Number *</label>
          <input
            className={ui.input}
            id="contactNumber"
            type="tel"
            value={form.contactNumber}
            onChange={(event) => updateField('contactNumber', event.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="address">Address *</label>
          <textarea
            className={ui.textarea}
            id="address"
            value={form.address}
            onChange={(event) => updateField('address', event.target.value)}
            required
          />
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="role">Role *</label>
          <select
            className={ui.input}
            id="role"
            value={form.role}
            onChange={(event) => updateField('role', event.target.value as UserRole)}
            required
          >
            <option value="CUSTOMER">Customer</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="status">Status *</label>
          <select
            className={ui.input}
            id="status"
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as UserStatus)}
            required
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        <button type="submit" className={ui.btnPrimary}>{selectedId ? 'Update User' : 'Save User'}</button>
        <button type="button" className={ui.btnSecondary} onClick={clearForm}>Clear</button>
      </form>

      <hr className={ui.hr} />

      <h2 className={ui.h2}>User List</h2>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead className={ui.thead}>
              <tr>
                <th className={ui.th}>User Name</th>
                <th className={ui.th}>Email</th>
                <th className={ui.th}>Contact Number</th>
                <th className={ui.th}>Address</th>
                <th className={ui.th}>Role</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr className={ui.tr}>
                  <td className={ui.td} colSpan={7}>No users found.</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr className={ui.tr} key={user._id}>
                    <td className={ui.td}>{user.userName}</td>
                    <td className={ui.td}>{user.email}</td>
                    <td className={ui.td}>{user.contactNumber}</td>
                    <td className={ui.td}>{user.address}</td>
                    <td className={ui.td}>{user.role}</td>
                    <td className={ui.td}>{user.status}</td>
                    <td className={ui.td}>
                      <button type="button" className={ui.btnEdit} onClick={() => editUser(user)}>Edit</button>
                      <button type="button" className={ui.btnDelete} onClick={() => void deleteUser(user._id)}>Delete</button>
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

export default UserManagement