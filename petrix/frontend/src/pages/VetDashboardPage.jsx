import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api, { vetAPI, visitAPI, petAPI, inventoryAPI, vaccinationAPI, appointmentAPI } from '../services/api'
import ReferralModal from '../components/ReferralModal'

function statusBadge(appt) {
  if (appt.visitInProgress) {
    return <span className="badge badge-yellow">in progress</span>
  }
  const s = appt.status
  const map = { scheduled: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

const emptyDiagForm = { description: '', icdCode: '', severity: 'mild', treatmentNotes: '', followUpRequired: false }
const emptyRxItems = [{ medId: '', dosage: '', durationDays: 7, quantity: 1 }]
const emptyInvoiceForm = { consultationFee: '200', treatmentCosts: '0', medicationCosts: '0' }

function draftKey(visitId) {
  return `vet_visit_draft_${visitId}`
}

function readVisitDraft(visitId) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(visitId)))
  } catch {
    return null
  }
}

export default function VetDashboardPage() {
  const { user } = useAuth()
  const [appts,    setAppts]    = useState([])
  const [selected, setSelected] = useState(null)
  const [petHistory, setPetHistory] = useState([])
  const [petAllergies, setPetAllergies] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [visitStep, setVisitStep] = useState(null) // null | 'diagnosis' | 'prescription' | 'invoice'
  const [visitId,  setVisitId]  = useState(null)
  const [visitLoading, setVisitLoading] = useState(false)
  const [branchId, setBranchId] = useState(null)
  const [overdue,  setOverdue]  = useState([])
  const [overdueLoading, setOverdueLoading] = useState(false)
  const [referralOpen, setReferralOpen] = useState(false)

  // Forms
  const [diagForm, setDiagForm] = useState(emptyDiagForm)
  const [medications, setMedications] = useState([])
  const [rxItems,  setRxItems]  = useState(emptyRxItems)
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm)
  const [msg,      setMsg]      = useState('')
  const [error,    setError]    = useState('')
  const [vaccines, setVaccines] = useState([])
  const [vaccForm, setVaccForm] = useState({
    medId: '', dosage: '', batchNumber: '',
    administeredDate: new Date().toISOString().split('T')[0],
    nextDueDate: '', bookFollowUp: true, followUpTime: '10:00',
  })
  const [vaccMsg,        setVaccMsg]        = useState('')
  const [vaccError,      setVaccError]      = useState('')
  const [vaccSubmitting, setVaccSubmitting] = useState(false)

  useEffect(() => {
    vetAPI.getAppointments(user.userId).then(r => setAppts(r.data)).finally(() => setLoading(false))
    if (user.branchId) {
      setOverdueLoading(true)
      vaccinationAPI.getOverdue({ branchId: user.branchId, threshold: 0 })
        .then(r => setOverdue(r.data))
        .finally(() => setOverdueLoading(false))
    }
  }, [user])

  useEffect(() => {
    if (!visitId || !visitStep) return
    localStorage.setItem(draftKey(visitId), JSON.stringify({ visitStep, diagForm, rxItems, invoiceForm }))
  }, [visitId, visitStep, diagForm, rxItems, invoiceForm])

  function resetVisitForms() {
    setDiagForm(emptyDiagForm)
    setRxItems(emptyRxItems)
    setInvoiceForm(emptyInvoiceForm)
  }

  async function loadVisitProgress(visit) {
    setVisitId(visit.visitId)

    const [meds, vaccs] = await Promise.all([
      inventoryAPI.getMedications().catch(() => ({ data: [] })),
      api.get('/vaccinations/vaccines').catch(() => ({ data: [] })),
    ])
    setMedications(meds.data)
    setVaccines(vaccs.data)

    const [diagnoses, prescriptions, invoice] = await Promise.all([
      visitAPI.getDiagnoses(visit.visitId).catch(() => ({ data: [] })),
      visitAPI.getPrescriptions(visit.visitId).catch(() => ({ data: [] })),
      visitAPI.getInvoice(visit.visitId).catch(() => null),
    ])

    let nextStep = 'diagnosis'
    const diagnosis = diagnoses.data?.[0]
    if (diagnosis) {
      setDiagForm({
        description: diagnosis.description || '',
        icdCode: diagnosis.icdCode || '',
        severity: diagnosis.severity || 'mild',
        treatmentNotes: diagnosis.treatmentNotes || '',
        followUpRequired: !!diagnosis.followUpRequired,
      })
      nextStep = 'prescription'
    }

    if (prescriptions.data?.length > 0) {
      setRxItems(prescriptions.data.map(item => ({
        medId: String(item.med_id),
        dosage: item.dosage || '',
        durationDays: item.duration_days || 7,
        quantity: item.quantity || 1,
      })))
      nextStep = 'invoice'
    }

    if (invoice?.data) {
      localStorage.removeItem(draftKey(visit.visitId))
      setInvoiceForm({
        consultationFee: String(invoice.data.consultationFee ?? '200'),
        treatmentCosts: String(invoice.data.treatmentCosts ?? '0'),
        medicationCosts: String(invoice.data.medicationCosts ?? '0'),
      })
      setVisitStep(null)
      return
    }

    const draft = readVisitDraft(visit.visitId)
    if (draft) {
      if (draft.diagForm) setDiagForm(draft.diagForm)
      if (draft.rxItems) setRxItems(draft.rxItems)
      if (draft.invoiceForm) setInvoiceForm(draft.invoiceForm)
      if (draft.visitStep) nextStep = draft.visitStep
    }

    setVisitStep(nextStep)
  }

  async function openAppointment(appt) {
    setSelected(appt)
    setVisitStep(null)
    setVisitId(null)
    setVisitLoading(true)
    resetVisitForms()
    setReferralOpen(false)
    setPetAllergies([])
    setMsg('')
    setError('')
    try {
      const [hist, allergies] = await Promise.all([
        petAPI.getMedicalHistory(appt.petId).catch(() => ({ data: [] })),
        petAPI.getAllergies(appt.petId).catch(() => ({ data: [] })),
      ])
      setPetHistory(hist.data)
      setPetAllergies(allergies.data)
      setBranchId(appt.branchId)

      const existingVisit = await visitAPI.getByAppt(appt.apptId).catch(() => null)
      if (existingVisit?.data) {
        setSelected(prev => prev ? { ...prev, visitInProgress: appt.status !== 'cancelled' } : prev)
        await loadVisitProgress(existingVisit.data)
      }
    } finally {
      setVisitLoading(false)
    }
  }

  async function startVisit() {
    try {
      const res = await visitAPI.create({ apptId: selected.apptId, notes: '' })
      setVisitId(res.data.visitId)
      setSelected(prev => prev ? { ...prev, visitInProgress: true } : prev)
      setAppts(prev => prev.map(a => a.apptId === selected.apptId ? { ...a, visitInProgress: true } : a))
      setVisitStep('diagnosis')
      const [medsRes, vaccsRes] = await Promise.all([
        inventoryAPI.getMedications(),
        api.get('/vaccinations/vaccines'),
      ])
      setMedications(medsRes.data)
      setVaccines(vaccsRes.data)
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
      localStorage.removeItem(draftKey(visitId))
      setAppts(prev => prev.map(a => a.apptId === selected.apptId ? { ...a, status: 'completed', visitInProgress: false } : a))
      setMsg('Visit completed and invoice generated!')
      setVisitStep(null)
      setSelected(null)
      setReferralOpen(false)
    } catch (e) {
      setError('Failed to generate invoice.')
    }
  }

  function onVaccMedChange(medId) {
    const vacc = vaccines.find(v => String(v.med_id) === medId)
    let nextDueDate = ''
    if (vacc?.frequency_months && vaccForm.administeredDate) {
      const d = new Date(vaccForm.administeredDate)
      d.setMonth(d.getMonth() + vacc.frequency_months)
      nextDueDate = d.toISOString().split('T')[0]
    }
    setVaccForm(f => ({ ...f, medId, nextDueDate }))
  }

  function onVaccAdminDateChange(date) {
    const vacc = vaccines.find(v => String(v.med_id) === vaccForm.medId)
    let nextDueDate = vaccForm.nextDueDate
    if (vacc?.frequency_months && date) {
      const d = new Date(date)
      d.setMonth(d.getMonth() + vacc.frequency_months)
      nextDueDate = d.toISOString().split('T')[0]
    }
    setVaccForm(f => ({ ...f, administeredDate: date, nextDueDate }))
  }

  async function recordVaccination() {
    if (!vaccForm.medId) { setVaccError('Please select a vaccine.'); return }
    setVaccSubmitting(true)
    setVaccError('')
    setVaccMsg('')
    try {
      const plansRes = await api.get('/vaccinations/plans', { params: { petId: selected.petId, vetId: user.userId } })
      let planId
      if (plansRes.data.length > 0) {
        planId = plansRes.data[0].plan_id
      } else {
        const planRes = await vaccinationAPI.createPlan({ petId: selected.petId, vetId: user.userId })
        planId = planRes.data.planId
      }
      await vaccinationAPI.createRecord({
        planId,
        medId: parseInt(vaccForm.medId),
        vetId: user.userId,
        visitId,
        batchNumber: vaccForm.batchNumber || null,
        administeredDate: vaccForm.administeredDate,
        nextDueDate: vaccForm.nextDueDate || null,
        status: 'done',
        notes: vaccForm.dosage || null,
      })
      if (vaccForm.bookFollowUp && vaccForm.nextDueDate) {
        const vacc = vaccines.find(v => String(v.med_id) === vaccForm.medId)
        await appointmentAPI.create({
          ownerId: selected.ownerId,
          petId: selected.petId,
          vetId: user.userId,
          branchId,
          startTime: `${vaccForm.nextDueDate}T${vaccForm.followUpTime}:00`,
          duration: 30,
          reason: `Vaccination: ${vacc?.name || ''}`,
        })
      }
      const vacc = vaccines.find(v => String(v.med_id) === vaccForm.medId)
      setVaccMsg(
        vaccForm.bookFollowUp && vaccForm.nextDueDate
          ? `Vaccination recorded. Follow-up appointment booked for ${vaccForm.nextDueDate}.`
          : 'Vaccination recorded.'
      )
      setVaccForm(f => ({ ...f, medId: '', dosage: '', batchNumber: '', nextDueDate: '' }))
    } catch (e) {
      setVaccError('Failed to record vaccination: ' + (e.response?.data?.error || e.message))
    } finally {
      setVaccSubmitting(false)
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
                      {statusBadge(a)}
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

                {visitId && (
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-muted">Visit #{visitId}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => setReferralOpen(true)}>
                      Create Referral
                    </button>
                  </div>
                )}

                {/* Pet Medical History */}
                <h3 className="font-semibold text-sm mb-2">Known allergies</h3>
                {petAllergies.length === 0
                  ? <p className="text-xs text-muted mb-3">No allergies recorded.</p>
                  : (
                    <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
                      {petAllergies.map((allergy, index) => (
                        <span key={`${allergy.allergen}-${index}`} className="badge badge-red text-xs">
                          {allergy.allergen}{allergy.severity ? ` · ${allergy.severity}` : ''}
                        </span>
                      ))}
                    </div>
                  )
                }

                <h3 className="font-semibold text-sm mb-2">Pet medical history</h3>
                {petHistory.length === 0
                  ? <p className="text-xs text-muted mb-3">No medical history found for this pet.</p>
                  : (
                    <div className="table-wrap mb-3">
                      <table>
                        <thead>
                          <tr>
                            <th>Visit Date</th>
                            <th>Diagnosis</th>
                            <th>Treatment Notes</th>
                            <th>Prescriptions</th>
                            <th>Payment Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {petHistory.slice(0,5).map((r, i) => (
                            <tr key={i}>
                              <td className="text-xs">{new Date(r.visit_date).toLocaleDateString()}</td>
                              <td className="text-xs">
                                {r.diagnosis || 'No diagnosis recorded'}
                                {r.severity ? ` — ${r.severity}` : ''}
                              </td>
                              <td className="text-xs">{r.treatment_notes || '—'}</td>
                              <td className="text-xs">{r.prescriptions || '—'}</td>
                              <td className="text-xs">{r.payment_status || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }

                {visitLoading && <div className="spinner" />}

                {/* Start Visit */}
                {selected.status === 'scheduled' && visitStep === null && !visitLoading && (
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

                {/* Record Vaccination */}
                {visitId && (
                  <>
                    <hr className="divider" />
                    <h3 className="font-semibold mb-3">Record Vaccination</h3>
                    {vaccMsg   && <div className="alert alert-success mb-3">{vaccMsg}</div>}
                    {vaccError && <div className="alert alert-error mb-3">{vaccError}</div>}
                    <div className="form-group">
                      <label>Vaccine</label>
                      <select value={vaccForm.medId} onChange={e => onVaccMedChange(e.target.value)}>
                        <option value="">Select vaccine…</option>
                        {vaccines.map(v => (
                          <option key={v.med_id} value={v.med_id}>
                            {v.name}{v.frequency_months ? ` (every ${v.frequency_months} mo)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label>Dosage</label>
                        <input placeholder="e.g. 1 ml" value={vaccForm.dosage}
                          onChange={e => setVaccForm(f => ({ ...f, dosage: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Batch Number</label>
                        <input placeholder="Batch #" value={vaccForm.batchNumber}
                          onChange={e => setVaccForm(f => ({ ...f, batchNumber: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label>Administered Date</label>
                        <input type="date" value={vaccForm.administeredDate}
                          onChange={e => onVaccAdminDateChange(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Next Due Date</label>
                        <input type="date" value={vaccForm.nextDueDate}
                          onChange={e => setVaccForm(f => ({ ...f, nextDueDate: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <input type="checkbox" id="bookFup" checked={vaccForm.bookFollowUp}
                        onChange={e => setVaccForm(f => ({ ...f, bookFollowUp: e.target.checked }))}
                        style={{ width: 'auto' }} />
                      <label htmlFor="bookFup" className="text-sm">Automatically book follow-up appointment</label>
                    </div>
                    {vaccForm.bookFollowUp && (
                      <div className="form-group" style={{ maxWidth: 200 }}>
                        <label>Follow-up Time</label>
                        <input type="time" value={vaccForm.followUpTime}
                          onChange={e => setVaccForm(f => ({ ...f, followUpTime: e.target.value }))} />
                      </div>
                    )}
                    <button className="btn btn-primary" disabled={vaccSubmitting} onClick={recordVaccination}>
                      {vaccSubmitting ? 'Recording…' : 'Record Vaccination'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {referralOpen && visitId && (
          <ReferralModal
            visitId={visitId}
            onClose={() => setReferralOpen(false)}
            onSuccess={() => setMsg('Referral created successfully.')}
          />
        )}

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
