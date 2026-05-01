import { useState, useEffect } from 'react'
import { branchAPI, vaccinationAPI } from '../services/api'

function ComplianceBar({ rate }) {
  const pct = parseFloat(rate) || 0
  const color = pct >= 80 ? 'var(--green-600)' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: 'var(--gray-200)', overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span className="text-sm font-semibold" style={{ minWidth: 38 }}>{pct}%</span>
    </div>
  )
}

export default function VaccinationReportsPage() {
  const [branches,    setBranches]    = useState([])
  const [branchId,    setBranchId]    = useState('')
  const [report,      setReport]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    branchAPI.getAll().then(r => setBranches(r.data))
    loadReport(null)
  }, [])

  async function loadReport(bid) {
    setLoading(true)
    setError('')
    try {
      const params = bid ? { branchId: bid } : {}
      const res = await vaccinationAPI.getReport(params)
      setReport(res.data)
    } catch (e) {
      setError('Failed to load report: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  function handleBranchChange(e) {
    const val = e.target.value
    setBranchId(val)
    loadReport(val || null)
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="text-2xl font-bold mb-1">Vaccination Reports</h1>
        <p className="text-sm text-muted mb-4">
          Compliance rates, most administered vaccines, and overdue statistics
        </p>

        <div className="form-group" style={{ maxWidth: 280, marginBottom: '1.5rem' }}>
          <label>Filter by Branch</label>
          <select value={branchId} onChange={handleBranchChange}>
            <option value="">All branches</option>
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>{b.name}</option>
            ))}
          </select>
        </div>

        {error   && <div className="alert alert-error mb-3">{error}</div>}
        {loading && <div className="spinner" />}

        {report && !loading && (
          <>
            {/* Compliance by Species */}
            <div className="card mb-4">
              <h2 className="section-title">Compliance Rate by Species</h2>
              {report.complianceBySpecies.length === 0
                ? <p className="text-sm text-muted">No data yet.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Species</th><th>Total Records</th><th>Done</th><th>Compliance</th></tr>
                      </thead>
                      <tbody>
                        {report.complianceBySpecies.map((row, i) => (
                          <tr key={i}>
                            <td className="font-semibold">{row.species}</td>
                            <td>{row.total_records}</td>
                            <td>{row.done_count}</td>
                            <td style={{ minWidth: 160 }}><ComplianceBar rate={row.compliance_rate} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* Compliance by Breed */}
            <div className="card mb-4">
              <h2 className="section-title">Compliance Rate by Breed</h2>
              {report.complianceByBreed.length === 0
                ? <p className="text-sm text-muted">No data yet.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Species</th><th>Breed</th><th>Total</th><th>Done</th><th>Compliance</th></tr>
                      </thead>
                      <tbody>
                        {report.complianceByBreed.map((row, i) => (
                          <tr key={i}>
                            <td className="text-sm">{row.species}</td>
                            <td className="font-semibold">{row.breed}</td>
                            <td>{row.total_records}</td>
                            <td>{row.done_count}</td>
                            <td style={{ minWidth: 160 }}><ComplianceBar rate={row.compliance_rate} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* Top Vaccines */}
            <div className="card mb-4">
              <h2 className="section-title">Most Administered Vaccines</h2>
              {report.topVaccines.length === 0
                ? <p className="text-sm text-muted">No vaccination records yet.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Rank</th><th>Vaccine</th><th>Times Administered</th></tr>
                      </thead>
                      <tbody>
                        {report.topVaccines.map((row, i) => (
                          <tr key={i}>
                            <td className="text-muted text-sm">#{i + 1}</td>
                            <td className="font-semibold">{row.vaccine_name}</td>
                            <td>
                              <span className="badge badge-green">{row.times_administered}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* Overdue by Branch */}
            <div className="card">
              <h2 className="section-title">Overdue Vaccinations by Branch</h2>
              {report.overdueByBranch.length === 0
                ? <p className="text-sm text-muted">No overdue vaccinations.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Branch</th><th>Overdue Count</th></tr>
                      </thead>
                      <tbody>
                        {report.overdueByBranch.map((row, i) => (
                          <tr key={i}>
                            <td className="font-semibold">{row.branch_name}</td>
                            <td>
                              <span className={`badge ${row.overdue_count > 5 ? 'badge-red' : 'badge-yellow'}`}>
                                {row.overdue_count}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          </>
        )}
      </div>
    </div>
  )
}
