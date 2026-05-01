import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { petAPI, vetAPI, inventoryAPI, vaccinationAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

function severityBadge(s) {
  const map = { mild: 'badge-green', moderate: 'badge-yellow', severe: 'badge-red' }
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
}

function vaccStatusBadge(s) {
  const map = { done: 'badge-green', upcoming: 'badge-yellow', overdue: 'badge-red' }
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
}

function payBadge(s) {
  const map = { paid: 'badge-green', unpaid: 'badge-yellow', cancelled: 'badge-red' }
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s || '—'}</span>
}

const today = () => new Date().toISOString().slice(0, 10)

const TABS = ['Medical History', 'Vaccinations', 'Allergies']

export default function PetProfilePage() {
  const { petId }  = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [pet,       setPet]       = useState(null)
  const [timeline,  setTimeline]  = useState([])
  const [vaccins,   setVaccins]   = useState([])
  const [allergies, setAllergies] = useState([])
  const [tab,       setTab]       = useState(0)
  const [loading,   setLoading]   = useState(true)

  // Book vaccination state
  const [showBookForm, setShowBookForm] = useState(false)
  const [vaccines,     setVaccines]     = useState([])
  const [vets,         setVets]         = useState([])
  const [bookForm,     setBookForm]     = useState({
    medId: '', vetId: '', administeredDate: today(),
    nextDueDate: '', batchNumber: '', notes: '',
  })
  const [bookMsg,   setBookMsg]   = useState('')
  const [bookError, setBookError] = useState('')
  const [bookBusy,  setBookBusy]  = useState(false)

  useEffect(() => {
    Promise.all([
      petAPI.getById(petId),
      petAPI.getMedicalHistory(petId),
      petAPI.getVaccinations(petId),
      petAPI.getAllergies(petId),
    ]).then(([p, tl, vc, al]) => {
      setPet(p.data)
      setTimeline(tl.data)
      setVaccins(vc.data)
      setAllergies(al.data)
    }).finally(() => setLoading(false))
  }, [petId])

  async function openBookForm() {
    setBookMsg('')
    setBookError('')
    setShowBookForm(true)
    if (vaccines.length === 0) {
      const [mRes, vRes] = await Promise.all([
        inventoryAPI.getMedications(),
        vetAPI.search({}),
      ])
      const vacList = mRes.data.filter(m => m.vaccine)
      setVaccines(vacList)
      setVets(vRes.data)
      if (vacList.length > 0)
        setBookForm(f => ({ ...f, medId: String(vacList[0].medId) }))
      if (vRes.data.length > 0)
        setBookForm(f => ({ ...f, vetId: String(vRes.data[0].vetId) }))
    }
  }

  async function submitBooking() {
    if (!bookForm.medId || !bookForm.vetId || !bookForm.administeredDate) {
      setBookError('Vaccine, vet, and administered date are required.')
      return
    }
    setBookBusy(true)
    setBookError('')
    try {
      const planRes = await vaccinationAPI.createPlan({
        petId: parseInt(petId),
        vetId: parseInt(bookForm.vetId),
      })
      await vaccinationAPI.createRecord({
        planId:           planRes.data.planId,
        medId:            parseInt(bookForm.medId),
        vetId:            parseInt(bookForm.vetId),
        administeredDate: bookForm.administeredDate,
        nextDueDate:      bookForm.nextDueDate || null,
        batchNumber:      bookForm.batchNumber || null,
        notes:            bookForm.notes || null,
        status:           'done',
      })
      const updated = await petAPI.getVaccinations(petId)
      setVaccins(updated.data)
      setBookMsg('Vaccination recorded successfully.')
      setShowBookForm(false)
      setBookForm({ medId: '', vetId: '', administeredDate: today(), nextDueDate: '', batchNumber: '', notes: '' })
    } catch (e) {
      setBookError(e.response?.data?.error || 'Failed to record vaccination.')
    } finally {
      setBookBusy(false)
    }
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>
  if (!pet)    return <div className="page"><div className="container"><p>Pet not found.</p></div></div>

  const age = pet.birthDate
    ? Math.floor((Date.now() - new Date(pet.birthDate)) / (365.25 * 86400000))
    : null

  const role = user?.role || user?.roles?.[0]
  const isVet = role === 'VET'
  const isOwner = role === 'OWNER'

  return (
    <div className="page">
      <div className="container">
        <button className="btn btn-ghost btn-sm mb-3" onClick={() => navigate(-1)}>← Back</button>

        {/* Pet header */}
        <div className="card mb-4">
          <div className="flex items-center gap-4">
            <div className="avatar" style={{ width: '4rem', height: '4rem', fontSize: '1.5rem' }}>
              {pet.species === 'Cat' ? '🐱' : pet.species === 'Dog' ? '🐶' : pet.species === 'Bird' ? '🐦' : '🐾'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{pet.name}</h1>
              <div className="text-sm text-muted">
                {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                {age !== null ? ` · ${age} year${age !== 1 ? 's' : ''} old` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {TABS.map((t, i) => (
            <button key={i} className={`btn btn-sm ${tab === i ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* Medical History */}
        {tab === 0 && (
          <div className="card">
            <h2 className="section-title">Medical Timeline</h2>
            {timeline.length === 0
              ? <p className="text-sm text-muted">No medical records yet.</p>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Date</th><th>Reason</th><th>Diagnosis</th><th>Severity</th><th>Vet</th><th>Branch</th><th>Payment</th></tr>
                    </thead>
                    <tbody>
                      {timeline.map((row, i) => (
                        <tr key={i}>
                          <td className="text-sm">{new Date(row.visit_date).toLocaleDateString()}</td>
                          <td className="text-sm">{row.reason || '—'}</td>
                          <td className="text-sm">{row.diagnosis}</td>
                          <td>{severityBadge(row.severity)}</td>
                          <td className="text-sm">{row.veterinarian_name}</td>
                          <td className="text-sm">{row.branch_name}</td>
                          <td>{payBadge(row.payment_status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* Vaccinations */}
        {tab === 1 && (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title" style={{ margin: 0 }}>Vaccination Records</h2>
              <div className="flex gap-2">
                {isVet && !showBookForm && (
                  <button className="btn btn-primary btn-sm" onClick={openBookForm}>
                    + Record Vaccination
                  </button>
                )}
                {isOwner && (
                  <button className="btn btn-outline btn-sm"
                    onClick={() => navigate('/book-appointment', { state: { reason: 'Vaccination' } })}>
                    Book Vaccination Appointment
                  </button>
                )}
              </div>
            </div>

            {bookMsg   && <div className="alert alert-success mb-3">{bookMsg}</div>}

            {/* Book Vaccination Form */}
            {showBookForm && (
              <div style={{
                border: '1.5px solid var(--green-200)', borderRadius: 'var(--radius)',
                padding: '1rem', marginBottom: '1.5rem', background: 'var(--green-50)',
              }}>
                <h3 className="font-semibold mb-3">Record Vaccination</h3>
                {bookError && <div className="alert alert-error mb-2">{bookError}</div>}

                <div className="grid-2">
                  <div className="form-group">
                    <label>Vaccine</label>
                    <select value={bookForm.medId} onChange={e => setBookForm(f => ({ ...f, medId: e.target.value }))}>
                      <option value="">Select vaccine…</option>
                      {vaccines.map(v => (
                        <option key={v.medId} value={v.medId}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Veterinarian</label>
                    <select value={bookForm.vetId} onChange={e => setBookForm(f => ({ ...f, vetId: e.target.value }))}>
                      <option value="">Select vet…</option>
                      {vets.map(v => (
                        <option key={v.vetId} value={v.vetId}>{v.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Administered Date</label>
                    <input type="date" value={bookForm.administeredDate}
                      onChange={e => setBookForm(f => ({ ...f, administeredDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Next Due Date <span className="text-muted">(optional)</span></label>
                    <input type="date" value={bookForm.nextDueDate}
                      onChange={e => setBookForm(f => ({ ...f, nextDueDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>Batch Number <span className="text-muted">(optional)</span></label>
                    <input placeholder="e.g. BATCH-2024-01" value={bookForm.batchNumber}
                      onChange={e => setBookForm(f => ({ ...f, batchNumber: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Notes <span className="text-muted">(optional)</span></label>
                    <input placeholder="Any notes…" value={bookForm.notes}
                      onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={submitBooking} disabled={bookBusy}>
                    {bookBusy ? 'Saving…' : 'Save Record'}
                  </button>
                  <button className="btn btn-outline" onClick={() => { setShowBookForm(false); setBookError('') }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {vaccins.length === 0
              ? <p className="text-sm text-muted">No vaccination records.</p>
              : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Vaccine</th><th>Administered</th><th>Batch</th><th>Next Due</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {vaccins.map(v => (
                        <tr key={v.vaccId}>
                          <td className="font-semibold">{v.vaccineName}</td>
                          <td className="text-sm">{v.administeredDate ? new Date(v.administeredDate).toLocaleDateString() : '—'}</td>
                          <td className="text-sm text-muted">{v.batchNumber || '—'}</td>
                          <td className="text-sm">{v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString() : '—'}</td>
                          <td>{vaccStatusBadge(v.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* Allergies */}
        {tab === 2 && (
          <div className="card">
            <h2 className="section-title">Known Allergies</h2>
            {allergies.length === 0
              ? <p className="text-sm text-muted">No known allergies recorded.</p>
              : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Allergen</th><th>Reaction</th><th>Severity</th></tr></thead>
                    <tbody>
                      {allergies.map((a, i) => (
                        <tr key={i}>
                          <td className="font-semibold">{a.allergen}</td>
                          <td className="text-sm">{a.reaction || '—'}</td>
                          <td>{severityBadge(a.severity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  )
}
