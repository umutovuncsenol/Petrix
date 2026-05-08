import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { branchAPI, vaccinationAPI } from '../services/api'

export default function ManagerDashboardPage() {
  const { user } = useAuth()

  const [branches,   setBranches]   = useState([])
  const [branchId,   setBranchId]   = useState('')
  const [threshold,  setThreshold]  = useState(0)
  const [overdue,    setOverdue]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [queried,    setQueried]    = useState(false)

  useEffect(() => {
    branchAPI.getAll().then(r => setBranches(r.data))
  }, [])

  async function fetchOverdue() {
    setLoading(true)
    setError('')
    setQueried(true)
    try {
      const params = { threshold }
      if (branchId) params.branchId = branchId
      const res = await vaccinationAPI.getOverdue(params)
      setOverdue(res.data)
    } catch (e) {
      setError('Failed to load overdue vaccinations: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-muted mt-1">Welcome, {user?.fullName}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/boarding" className="btn btn-primary btn-sm">
              Boarding
            </Link>
            <Link to="/vaccination-reports" className="btn btn-outline btn-sm">
              Vaccination Reports →
            </Link>
          </div>
        </div>

        {/* Overdue Vaccination Alerts */}
        <div className="card">
          <h2 className="section-title">Overdue Vaccination Alerts</h2>
          <p className="text-sm text-muted mb-3">
            Filter by branch and minimum days overdue to identify pets needing follow-up.
          </p>

          <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ minWidth: 220, marginBottom: 0 }}>
              <label>Branch</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">All branches</option>
                {branches.map(b => (
                  <option key={b.branchId} value={b.branchId}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ width: 160, marginBottom: 0 }}>
              <label>Min days overdue</label>
              <input
                type="number"
                min="0"
                value={threshold}
                onChange={e => setThreshold(parseInt(e.target.value) || 0)}
              />
            </div>
            <button className="btn btn-primary" onClick={fetchOverdue} disabled={loading}>
              {loading ? 'Loading…' : 'Apply Filter'}
            </button>
          </div>

          {error && <div className="alert alert-error mb-3">{error}</div>}

          {!queried && (
            <p className="text-sm text-muted">Click "Apply Filter" to load results.</p>
          )}

          {queried && !loading && overdue.length === 0 && (
            <p className="text-sm text-muted">No overdue vaccinations match the current filter.</p>
          )}

          {queried && overdue.length > 0 && (
            <>
              <p className="text-sm text-muted mb-2">
                {overdue.length} overdue record{overdue.length !== 1 ? 's' : ''} found
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pet</th><th>Species</th><th>Owner</th><th>Owner Email</th>
                      <th>Next Due</th><th>Days Overdue</th><th>Branch</th><th>Vet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map((r, i) => (
                      <tr key={i}>
                        <td className="font-semibold">{r.pet_name}</td>
                        <td className="text-sm">{r.species}{r.breed ? ` · ${r.breed}` : ''}</td>
                        <td className="text-sm">{r.owner_name}</td>
                        <td className="text-sm text-muted">{r.email}</td>
                        <td className="text-sm">
                          {r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <span className={`badge ${r.days_overdue > 30 ? 'badge-red' : 'badge-yellow'}`}>
                            {r.days_overdue}d
                          </span>
                        </td>
                        <td className="text-sm">{r.branch_name}</td>
                        <td className="text-sm">{r.administering_vet}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
