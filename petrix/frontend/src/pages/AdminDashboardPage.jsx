import { useEffect, useState } from 'react'
import { adminAPI, branchAPI, authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [branches, setBranches] = useState([])
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [regForm, setRegForm] = useState({ fullName: '', username: '', email: '', password: '', phone: '', branchId: '' })
  const [regMsg, setRegMsg] = useState('')
  const [regError, setRegError] = useState('')
  const [regBusy, setRegBusy] = useState(false)

  useEffect(() => {
    loadUsers()
    branchAPI.getAll().then(r => setBranches(r.data)).catch(() => {})
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const res = await adminAPI.getUsers()
      setUsers(res.data)
    } catch (e) {
      setError('Failed to load users: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  async function submitRegisterManager() {
    if (!regForm.fullName || !regForm.username || !regForm.email || !regForm.password || !regForm.branchId) {
      setRegError('Full name, username, email, password, and branch are required.')
      return
    }
    setRegBusy(true)
    setRegError('')
    setRegMsg('')
    try {
      await authAPI.registerManager({ ...regForm, branchId: parseInt(regForm.branchId) })
      setRegMsg('Manager registered successfully.')
      setShowRegisterForm(false)
      setRegForm({ fullName: '', username: '', email: '', password: '', phone: '', branchId: '' })
      await loadUsers()
    } catch (e) {
      setRegError(e.response?.data?.error || 'Failed to register manager.')
    } finally {
      setRegBusy(false)
    }
  }

  const managerCount = users.filter(u => (u.roles || '').includes('CLINIC_MANAGER')).length
  const adminCount = users.filter(u => (u.roles || '').includes('ADMIN')).length

  return (
    <div className="page">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted mt-1">Welcome, {user?.fullName}</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={loadUsers} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid-2 mb-4">
          <div className="card">
            <p className="text-sm text-muted">System users</p>
            <p className="text-2xl font-bold mt-1">{users.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-muted">Clinic managers</p>
            <p className="text-2xl font-bold mt-1">{managerCount}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="section-title">Admin and Manager Users</h2>
              <p className="text-sm text-muted">
                {adminCount} admin{adminCount !== 1 ? 's' : ''} and {managerCount} manager{managerCount !== 1 ? 's' : ''} registered.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowRegisterForm(v => !v); setRegMsg(''); setRegError('') }}>
              {showRegisterForm ? 'Cancel' : 'Register Manager'}
            </button>
          </div>

          {regMsg && <div className="alert alert-success mb-3">{regMsg}</div>}

          {showRegisterForm && (
            <div style={{
              border: '1.5px solid var(--green-200)', borderRadius: 'var(--radius)',
              padding: '1rem', marginBottom: '1.5rem', background: 'var(--green-50)',
            }}>
              <h3 className="font-semibold mb-3">Register New Manager</h3>
              {regError && <div className="alert alert-error mb-2">{regError}</div>}
              <div className="grid-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={regForm.fullName} onChange={e => setRegForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Jane Doe" />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input value={regForm.username} onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. jane.doe" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. jane@clinic.com" />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Phone <span className="text-muted">(optional)</span></label>
                  <input value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. +90 555 123 4567" />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select value={regForm.branchId} onChange={e => setRegForm(f => ({ ...f, branchId: e.target.value }))}>
                    <option value="">Select branch…</option>
                    {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={submitRegisterManager} disabled={regBusy}>
                  {regBusy ? 'Registering…' : 'Register Manager'}
                </button>
                <button className="btn btn-outline" onClick={() => { setShowRegisterForm(false); setRegError('') }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error mb-3">{error}</div>}
          {loading && <div className="spinner" />}

          {!loading && users.length === 0 && (
            <p className="text-sm text-muted">No system users found.</p>
          )}

          {!loading && users.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="font-semibold">{u.full_name}</td>
                      <td className="text-sm">{u.username}</td>
                      <td className="text-sm text-muted">{u.email}</td>
                      <td><span className="badge badge-green">{u.roles || 'Unassigned'}</span></td>
                      <td className="text-sm">{u.branch_name || '-'}</td>
                      <td className="text-sm">{u.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
