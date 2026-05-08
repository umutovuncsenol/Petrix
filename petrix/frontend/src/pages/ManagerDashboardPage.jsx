import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { branchAPI, managerAPI, vaccinationAPI } from '../services/api'

export default function ManagerDashboardPage() {
  const { user } = useAuth()

  const [branches,   setBranches]   = useState([])
  const [branchId,   setBranchId]   = useState(user?.branchId ? String(user.branchId) : '')
  const [threshold,  setThreshold]  = useState(0)
  const [stats,      setStats]      = useState(null)
  const [vets,       setVets]       = useState([])
  const [overdue,    setOverdue]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    branchAPI.getAll()
      .then(r => {
        setBranches(r.data)
        if (!branchId && r.data.length > 0) {
          setBranchId(user?.branchId ? String(user.branchId) : String(r.data[0].branchId))
        }
      })
      .catch(e => setError('Failed to load branches: ' + (e.response?.data?.error || e.message)))
  }, [user?.branchId])

  useEffect(() => {
    if (!branchId) return
    loadDashboard(branchId)
  }, [branchId, threshold])

  async function loadDashboard(selectedBranchId) {
    setLoading(true)
    setError('')
    try {
      const [statsRes, vetsRes, overdueRes] = await Promise.all([
        managerAPI.getBranchStats(selectedBranchId),
        managerAPI.getBranchVets(selectedBranchId),
        vaccinationAPI.getOverdue({ branchId: selectedBranchId, threshold }),
      ])
      setStats(statsRes.data)
      setVets(vetsRes.data)
      setOverdue(overdueRes.data)
    } catch (e) {
      setError('Failed to load manager dashboard: ' + (e.response?.data?.error || e.message))
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
            <Link to="/inventory" className="btn btn-primary btn-sm">Inventory</Link>
            <Link to="/reports" className="btn btn-outline btn-sm">Reports</Link>
            <Link to="/waste-log" className="btn btn-outline btn-sm">Waste Log</Link>
            <Link to="/vaccination-reports" className="btn btn-outline btn-sm">
              Vaccination Reports →
            </Link>
          </div>
        </div>

        <div className="card mb-4">
          <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ minWidth: 260, marginBottom: 0 }}>
              <label>Branch</label>
              <select value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">Select branch…</option>
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
            <button className="btn btn-outline" onClick={() => loadDashboard(branchId)} disabled={!branchId || loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error mb-3">{error}</div>}

        {branchId && (
          <div className="grid-3 mb-4">
            {[
              { label: 'Total Stock Items', value: stats?.totalStockItems ?? 0 },
              { label: 'Low Stock Items', value: stats?.lowStockItems ?? 0 },
              { label: 'Expired Stock Items', value: stats?.expiredStockItems ?? 0 },
              { label: 'Overdue Vaccinations', value: stats?.overdueVaccinations ?? 0 },
              { label: 'Waste Entries', value: stats?.wasteEntries ?? 0 },
            ].map(card => (
              <div key={card.label} className="card text-center">
                <div className="text-sm text-muted">{card.label}</div>
                <div className="text-2xl font-bold mt-1">{card.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card mb-4">
          <h2 className="section-title">Veterinarians in Branch</h2>
          {!branchId
            ? <p className="text-sm text-muted">Select a branch to view veterinarians.</p>
            : loading && vets.length === 0
            ? <div className="spinner" />
            : vets.length === 0
            ? <p className="text-sm text-muted">No veterinarians found for this branch.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Specialization</th>
                      <th>Species Expertise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vets.map(vet => (
                      <tr key={vet.vet_id}>
                        <td className="font-semibold">{vet.full_name}</td>
                        <td>{vet.specialization || '-'}</td>
                        <td>{vet.species_expertise || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* Overdue Vaccination Alerts */}
        <div className="card">
          <h2 className="section-title">Overdue Vaccination Alerts</h2>
          <p className="text-sm text-muted mb-3">
            Pets in the selected branch that need follow-up.
          </p>
          {!branchId && (
            <p className="text-sm text-muted">Select a branch to load overdue vaccinations.</p>
          )}
          {branchId && loading && overdue.length === 0 && <div className="spinner" />}
          {branchId && !loading && overdue.length === 0 && (
            <p className="text-sm text-muted">No overdue vaccinations match the current filter.</p>
          )}
          {branchId && overdue.length > 0 && (
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
