import { useEffect, useState } from 'react'
import { adminAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
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
          </div>

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
