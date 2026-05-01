import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { vetAPI, visitAPI, petAPI, inventoryAPI, vaccinationAPI } from '../services/api'

function statusBadge(s) {
  const map = { scheduled: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function VetDashboardPage() {
  const { user } = useAuth()
  const [appts,    setAppts]    = useState([])
  const [selected, setSelected] = useState(null)
  const [petHistory, setPetHistory] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [visitStep, setVisitStep] = useState(null) // null | 'diagnosis' | 'prescription' | 'invoice'
  const [visitId,  setVisitId]  = useState(null)
  const [branchId, setBranchId] = useState(null)
  const [overdue,  setOverdue]  = useState([])
  const [overdueLoading, setOverdueLoading] = useState(false)

  // Forms
  const [diagForm, setDiagForm] = useState({ description: '', icdCode: '', severity: 'mild', treatmentNotes: '', followUpRequired: false })
  const [medications, setMedications] = useState([])
  const [rxItems,  setRxItems]  = useState([{ medId: '', dosage: '', durationDays: 7, quantity: 1 }])
  const [invoiceForm, setInvoiceForm] = useState({ consultationFee: '200', treatmentCosts: '0', medicationCosts: '0' })
  const [msg,      setMsg]      = useState('')
  const [error,    setError]    = useState('')

  useEffect(() => {
    vetAPI.getAppointments(user.userId).then(r => setAppts(r.data)).finally(() => setLoading(false))
    if (user.branchId) {
      setOverdueLoading(true)
      vaccinationAPI.getOverdue({ branchId: user.branchId, threshold: 0 })
        .then(r => setOverdue(r.data))
        .finally(() => setOverdueLoading(false))
    }
  }, [user])

  async function openAppointment(appt) {
    setSelected(appt)
    setVisitStep(null)
    setMsg('')
    setError('')
    const hist = await petAPI.getMedicalHistory(appt.petId).catch(() => ({ data: [] }))
    setPetHistory(hist.data)
    // figure out branchId
    setBranchId(appt.branchId)
  }

  async function startVisit() {
    try {
      const res = await visitAPI.create({ apptId: selected.apptId, notes: '' })
      setVisitId(res.data.visitId)
      setAppts(prev => prev.map(a => a.apptId === selected.apptId ? { ...a, status: 'completed' } : a))
      setVisitStep('diagnosis')
      const meds = await inventoryAPI.getMedications()
      setMedications(meds.data)
    } catch (e) {
      setError('Could not start visit: ' + (e.response?.data?.error || e.message))
    }
  }

  async function saveDiagnosis() {
    try {
      await visitAPI.addDiagnosis(visitId, {
        description:       diagForm.description,
        icdCode:           diagForm.icdCode,
        severity:          diagForm.severity,
        treatmentNotes:    diagForm.treatmentNotes,
        followUpRequired:  diagForm.followUpRequired,
      })
      setVisitStep('prescription')
    } catch (e) {
      setError('Failed to save diagnosis.')
    }
  }

  async function savePrescription() {
    try {
      const items = rxItems.filter(i => i.medId)
      if (items.length > 0) {
        await visitAPI.addPrescription(visitId, {
          vetId:    user.userId,
          branchId: branchId,
          items:    items.map(i => ({ ...i, medId: parseInt(i.medId), quantity: parseInt(i.quantity), durationDays: parseInt(i.durationDays) })),
        })
      }
      setVisitStep('invoice')
    } catch (e) {
      setError('Failed to save prescription: ' + (e.response?.data?.error || ''))
    }
  }

  async function saveInvoice() {
    try {
      await visitAPI.createInvoice(visitId, invoiceForm)
      setMsg('Visit completed and invoice generated!')
      setVisitStep(null)
      setSelected(null)
    } catch (e) {
      setError('Failed to generate invoice.')
    }
  }

  function addRxRow() { setRxItems(prev => [...prev, { medId: '', dosage: '', durationDays: 7, quantity: 1 }]) }
  function setRxItem(i, k, v) { setRxItems(prev => prev.map((row, idx) => idx === i ? { ...row, [k]: v } : row)) }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>

  const todayAppts = appts.filter(a => {
    const d = new Date(a.startTime).toDateString()
    return d === new Date().toDateString() && a.status === 'scheduled'
  })

  return (
    <div className="page">
      <div className="container">
        <h1 className="text-2xl font-bold mb-1">Vet Dashboard</h1>
        <p className="text-sm text-muted mb-4">Dr. {user.fullName} · Today's appointments: {todayAppts.length}</p>

        {msg   && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.4fr' : '1fr', gap: '1rem' }}>
          {/* Appointment List */}
          <div>
            <div className="card">
              <h2 className="section-title">Appointments</h2>
              {appts.length === 0
                ? <p className="text-sm text-muted">No appointments.</p>
                : appts.map(a => (
                  <div key={a.apptId}
                    onClick={() => openAppointment(a)}
                    style={{
                      padding: '.75rem', marginBottom: '.5rem',
                      border: `1.5px solid ${selected?.apptId === a.apptId ? 'var(--green-600)' : 'var(--gray-200)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer', background: '#fff',
                      transition: 'border-color .15s',
                    }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Appt #{a.apptId} — {a.petName}</div>
                        <div className="text-xs text-muted">Owner: {a.ownerName} · {formatDate(a.startTime)}</div>
                        {a.reason && <div className="text-xs text-muted">{a.reason}</div>}
                      </div>
                      {statusBadge(a.status)}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Appointment Detail */}
          {selected && (
            <div>
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="section-title" style={{ margin: 0 }}>
                    Appointment #{selected.apptId} — {selected.petName}
                  </h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
                </div>
                <div className="text-sm text-muted mb-3">
                  Owner: {selected.ownerName} · {formatDate(selected.startTime)}
                </div>

                {/* Pet Medical History */}
                <h3 className="font-semibold text-sm mb-2">Pet medical history</h3>
                {petHistory.length === 0
                  ? <p className="text-xs text-muted mb-3">No prior records.</p>
                  : (
                    <div className="table-wrap mb-3">
                      <table>
                        <thead><tr><th>Date</th><th>Type</th><th>Detail</th></tr></thead>
                        <tbody>
                          {petHistory.slice(0,5).map((r, i) => (
                            <tr key={i}>
                              <td className="text-xs">{new Date(r.visit_date).toLocaleDateString()}</td>
                              <td><span className="badge badge-gray text-xs">Diagnosis</span></td>
                              <td className="text-xs">{r.diagnosis} — {r.severity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }

                {/* Start Visit */}
                {selected.status === 'scheduled' && visitStep === null && (
                  <button className="btn btn-primary" onClick={startVisit}>Start Visit</button>
                )}

                {/* Diagnosis Form */}
                {visitStep === 'diagnosis' && (
                  <>
                    <hr className="divider" />
                    <h3 className="font-semibold mb-3">Log Diagnosis</h3>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea placeholder="Enter diagnosis…" value={diagForm.description}
                        onChange={e => setDiagForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label>ICD Code</label>
                        <input placeholder="e.g. H60.1" value={diagForm.icdCode}
                          onChange={e => setDiagForm(f => ({ ...f, icdCode: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Severity</label>
                        <select value={diagForm.severity} onChange={e => setDiagForm(f => ({ ...f, severity: e.target.value }))}>
                          <option>mild</option><option>moderate</option><option>severe</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Treatment Notes</label>
                      <textarea value={diagForm.treatmentNotes}
                        onChange={e => setDiagForm(f => ({ ...f, treatmentNotes: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <input type="checkbox" id="fup" checked={diagForm.followUpRequired}
                        onChange={e => setDiagForm(f => ({ ...f, followUpRequired: e.target.checked }))}
                        style={{ width: 'auto' }} />
                      <label htmlFor="fup" className="text-sm">Follow-up required</label>
                    </div>
                    <button className="btn btn-primary" onClick={saveDiagnosis}>Save & Add Prescription →</button>
                  </>
                )}

                {/* Prescription Form */}
                {visitStep === 'prescription' && (
                  <>
                    <hr className="divider" />
                    <h3 className="font-semibold mb-3">Add Prescription</h3>
                    {rxItems.map((item, i) => (
                      <div key={i} className="grid-3 mb-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="text-xs">Medication</label>
                          <select value={item.medId} onChange={e => setRxItem(i, 'medId', e.target.value)}>
                            <option value="">Select…</option>
                            {medications.filter(m => !m.isVaccine).map(m =>
                              <option key={m.medId} value={m.medId}>{m.name}</option>
                            )}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="text-xs">Dosage</label>
                          <input placeholder="e.g. 1 tablet" value={item.dosage} onChange={e => setRxItem(i, 'dosage', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="text-xs">Days</label>
                          <input type="number" min="1" value={item.durationDays} onChange={e => setRxItem(i, 'durationDays', e.target.value)} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="text-xs">Qty</label>
                          <input type="number" min="1" value={item.quantity} onChange={e => setRxItem(i, 'quantity', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm mb-3" onClick={addRxRow}>+ Add medication</button>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={() => setVisitStep('invoice')}>Skip</button>
                      <button className="btn btn-primary" onClick={savePrescription}>Save & Generate Invoice →</button>
                    </div>
                  </>
                )}

                {/* Invoice Form */}
                {visitStep === 'invoice' && (
                  <>
                    <hr className="divider" />
                    <h3 className="font-semibold mb-3">Generate Invoice</h3>
                    <div className="grid-3">
                      <div className="form-group">
                        <label>Consultation Fee (₺)</label>
                        <input type="number" value={invoiceForm.consultationFee}
                          onChange={e => setInvoiceForm(f => ({ ...f, consultationFee: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Treatment Costs (₺)</label>
                        <input type="number" value={invoiceForm.treatmentCosts}
                          onChange={e => setInvoiceForm(f => ({ ...f, treatmentCosts: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Medication Costs (₺)</label>
                        <input type="number" value={invoiceForm.medicationCosts}
                          onChange={e => setInvoiceForm(f => ({ ...f, medicationCosts: e.target.value }))} />
                      </div>
                    </div>
                    <p className="text-sm font-semibold mb-3">
                      Total: ₺{(parseFloat(invoiceForm.consultationFee||0) + parseFloat(invoiceForm.treatmentCosts||0) + parseFloat(invoiceForm.medicationCosts||0)).toFixed(2)}
                    </p>
                    <button className="btn btn-primary btn-full" onClick={saveInvoice}>
                      Complete visit &amp; generate invoice
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Overdue Vaccination Alerts */}
        <div className="card mt-4">
          <h2 className="section-title">Overdue Vaccination Alerts — My Branch</h2>
          {overdueLoading
            ? <div className="spinner" />
            : overdue.length === 0
            ? <p className="text-sm text-muted">No overdue vaccinations for your branch.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pet</th><th>Species</th><th>Owner</th><th>Owner Email</th>
                      <th>Last Administered</th><th>Next Due</th><th>Days Overdue</th><th>Vet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map((r, i) => (
                      <tr key={i}>
                        <td className="font-semibold">{r.pet_name}</td>
                        <td className="text-sm">{r.species}{r.breed ? ` · ${r.breed}` : ''}</td>
                        <td className="text-sm">{r.owner_name}</td>
                        <td className="text-sm text-muted">{r.email}</td>
                        <td className="text-sm">{r.administered_date ? new Date(r.administered_date).toLocaleDateString() : '—'}</td>
                        <td className="text-sm">{r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : '—'}</td>
                        <td><span className="badge badge-red">{r.days_overdue}d</span></td>
                        <td className="text-sm">{r.administering_vet}</td>
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
  )
}
