import { useState, useEffect } from 'react'
import { branchAPI, inventoryAPI } from '../services/api'

export default function WasteLogPage() {
  const [branches,    setBranches]    = useState([])
  const [medications, setMedications] = useState([])
  const [wasteLogs,   setWasteLogs]   = useState([])
  const [form,        setForm]        = useState({ branchId: '', medId: '', quantity: 1, reason: '' })
  const [msg,         setMsg]         = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    branchAPI.getAll().then(r => setBranches(r.data))
    inventoryAPI.getMedications().then(r => setMedications(r.data))
  }, [])

  useEffect(() => {
    if (!form.branchId) { setWasteLogs([]); return }
    inventoryAPI.getWasteLogs(form.branchId).then(r => setWasteLogs(r.data))
  }, [form.branchId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.branchId || !form.medId || !form.reason) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setMsg('')
    setError('')
    try {
      await inventoryAPI.logWaste({
        branchId: parseInt(form.branchId),
        medId:    parseInt(form.medId),
        quantity: parseInt(form.quantity),
        reason:   form.reason,
      })
      setMsg('Waste logged successfully.')
      setForm(f => ({ ...f, medId: '', quantity: 1, reason: '' }))
      const logs = await inventoryAPI.getWasteLogs(form.branchId)
      setWasteLogs(logs.data)
    } catch (e) {
      setError('Failed to log waste: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="text-2xl font-bold mb-1">Waste Log</h1>
        <p className="text-sm text-muted mb-4">Record medication waste for a branch</p>

        {msg   && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem' }}>
          {/* Form */}
          <div className="card">
            <h2 className="section-title">Log Waste</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Branch</label>
                <select value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
                  <option value="">Select branch…</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Medication</label>
                <select value={form.medId} onChange={e => setForm(f => ({ ...f, medId: e.target.value }))}>
                  <option value="">Select medication…</option>
                  {medications.map(m => <option key={m.medId} value={m.medId}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" min="1" value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea placeholder="e.g. Expired, damaged packaging…" value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                {loading ? 'Saving…' : 'Log Waste'}
              </button>
            </form>
          </div>

          {/* Waste Log Table */}
          <div className="card">
            <h2 className="section-title">
              Waste History {form.branchId && `— ${branches.find(b => b.branchId == form.branchId)?.name}`}
            </h2>
            {!form.branchId
              ? <p className="text-sm text-muted">Select a branch to view waste logs.</p>
              : wasteLogs.length === 0
              ? <p className="text-sm text-muted">No waste records found.</p>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Medication</th>
                        <th>Qty</th>
                        <th>Reason</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wasteLogs.map(w => (
                        <tr key={w.waste_id}>
                          <td>{w.medication_name}</td>
                          <td>{w.quantity_wasted}</td>
                          <td>{w.reason}</td>
                          <td className="text-xs text-muted">
                            {new Date(w.recorded_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
