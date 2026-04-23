import { useState, useEffect } from 'react'
import { branchAPI, inventoryAPI } from '../services/api'

export default function ReportsPage() {
  const [branches,  setBranches]  = useState([])
  const [branchId,  setBranchId]  = useState('')
  const [report,    setReport]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    branchAPI.getAll().then(r => setBranches(r.data))
  }, [])

  useEffect(() => {
    if (!branchId) { setReport(null); return }
    setLoading(true)
    setError('')
    inventoryAPI.getReport(branchId)
      .then(r => setReport(r.data))
      .catch(e => setError('Failed to load report: ' + (e.response?.data?.error || e.message)))
      .finally(() => setLoading(false))
  }, [branchId])

  const costs = report?.costBreakdown

  return (
    <div className="page">
      <div className="container">
        <h1 className="text-2xl font-bold mb-1">Branch Reports</h1>
        <p className="text-sm text-muted mb-4">Stock summary, waste statistics, and cost breakdown</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group" style={{ maxWidth: 320, marginBottom: '1.5rem' }}>
          <label>Select Branch</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">Choose a branch…</option>
            {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
          </select>
        </div>

        {loading && <div className="spinner" />}

        {report && (
          <>
            {/* Cost Breakdown */}
            {costs && (
              <div className="card mb-4">
                <h2 className="section-title">Cost Breakdown</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {[
                    { label: 'Consultation', value: costs.total_consultation },
                    { label: 'Treatment',    value: costs.total_treatment },
                    { label: 'Medication',   value: costs.total_medication },
                    { label: 'Grand Total',  value: costs.grand_total, highlight: true },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius)',
                      background: item.highlight ? 'var(--green-50)' : 'var(--gray-50)',
                      border: `1px solid ${item.highlight ? 'var(--green-200)' : 'var(--gray-200)'}`,
                    }}>
                      <div className="text-xs text-muted mb-1">{item.label}</div>
                      <div className="text-xl font-bold">
                        ₺{Number(item.value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Summary */}
            <div className="card mb-4">
              <h2 className="section-title">Stock Summary</h2>
              {report.stockSummary.length === 0
                ? <p className="text-sm text-muted">No stock data.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Medication</th>
                          <th>Quantity</th>
                          <th>Reorder Level</th>
                          <th>Expiry Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.stockSummary.map((row, i) => (
                          <tr key={i}>
                            <td className="font-semibold">{row.name}</td>
                            <td>{row.quantity}</td>
                            <td>{row.reorder_level}</td>
                            <td className="text-xs">{row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                            <td>
                              {row.low_stock_flagged
                                ? <span className="badge badge-red">Low Stock</span>
                                : <span className="badge badge-green">OK</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>

            {/* Waste Summary */}
            <div className="card">
              <h2 className="section-title">Waste Summary</h2>
              {report.wasteSummary.length === 0
                ? <p className="text-sm text-muted">No waste records.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Medication</th>
                          <th>Total Wasted</th>
                          <th>Waste Events</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.wasteSummary.map((row, i) => (
                          <tr key={i}>
                            <td>{row.medication_name}</td>
                            <td className="font-semibold">{row.total_wasted}</td>
                            <td>{row.waste_events}</td>
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
