import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { branchAPI, vetAPI, petAPI, appointmentAPI } from '../services/api'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const SLOTS = []
for (let h = 9; h <= 18; h++) {
  SLOTS.push(`${String(h).padStart(2,'0')}:00`)
  SLOTS.push(`${String(h).padStart(2,'0')}:30`)
}

const SPECS = ['Any','Cardiology','Surgery','Dermatology','Orthopedics','Internal Medicine','Dentistry','Neurology']

function getBookingError(err) {
  const backendMessage = err.response?.data?.message || err.response?.data?.error || ''

  if (backendMessage.includes('outstanding unpaid bills')) {
    return {
      type: 'blocking',
      message: 'This pet has outstanding unpaid bills. Please pay them before booking a new appointment.',
    }
  }

  if (backendMessage.includes('maximum number of appointments')) {
    return {
      type: 'blocking',
      message: 'This veterinarian has reached the maximum number of appointments for the selected day. Please choose another date or veterinarian.',
    }
  }

  return {
    type: 'unexpected',
    message: 'Could not book the appointment. Please try again.',
  }
}

export default function AppointmentBookingPage() {
  const { user }     = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()

  const [step, setStep] = useState(1) // 1=filter vets, 2=pick time, 3=confirm

  // Step 1
  const [branches,        setBranches]        = useState([])
  const [vets,            setVets]            = useState([])
  const [pets,            setPets]            = useState([])
  const [filterBranch,    setFilterBranch]    = useState('')
  const [filterSpec,      setFilterSpec]      = useState('')
  const [filterSpecies,   setFilterSpecies]   = useState('')
  const [filterDate,      setFilterDate]      = useState(() => new Date().toISOString().slice(0,10))
  const [searched,        setSearched]        = useState(false)

  // Step 2
  const [selectedVet,     setSelectedVet]     = useState(null)
  const [busySlots,       setBusySlots]       = useState([])
  const [selectedSlot,    setSelectedSlot]    = useState(null)

  // Step 3
  const [selectedPet,     setSelectedPet]     = useState('')
  const [reason,          setReason]          = useState(location.state?.reason || '')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [success,         setSuccess]         = useState(false)

  useEffect(() => {
    branchAPI.getAll().then(r => setBranches(r.data))
    petAPI.getByOwner(user.userId).then(r => setPets(r.data))
  }, [user])

  async function searchVets() {
    setError(null)
    setSearched(true)
    const params = {}
    if (filterBranch) params.branchId = filterBranch
    if (filterSpec && filterSpec !== 'Any') params.specialization = filterSpec
    if (filterSpecies) params.species = filterSpecies
    const { data } = await vetAPI.search(params)
    setVets(data)
  }

  async function selectVet(vet) {
    setError(null)
    setSelectedVet(vet)
    setStep(2)
    const { data } = await vetAPI.getAvailability(vet.vetId, filterDate)
    setBusySlots(data.map(s => new Date(s.start_time).toTimeString().slice(0,5)))
  }

  async function confirmBooking() {
    if (!selectedPet) { setError({ type: 'unexpected', message: 'Please select a pet.' }); return }
    if (!selectedSlot) { setError({ type: 'unexpected', message: 'Please select a time slot.' }); return }
    setError(null)
    setLoading(true)
    try {
      const startTime = `${filterDate}T${selectedSlot}:00`
      await appointmentAPI.create({
        ownerId:   user.userId,
        petId:     parseInt(selectedPet),
        vetId:     selectedVet.vetId,
        branchId:  selectedVet.branchId,
        startTime,
        duration:  30,
        reason,
      })
      setSuccess(true)
      setTimeout(() => navigate('/'), 1800)
    } catch (err) {
      setError(getBookingError(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="page">
      <div className="container" style={{ maxWidth: '480px' }}>
        <div className="card text-center">
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>✓</div>
          <h2 className="text-xl font-bold text-green">Appointment Booked!</h2>
          <p className="text-sm text-muted mt-2">Redirecting to dashboard…</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="container">
        <h1 className="text-2xl font-bold mb-1">Book an Appointment</h1>
        <p className="text-sm text-muted mb-4">Find a veterinarian</p>

        {/* Step tabs */}
        <div className="flex gap-2 mb-4">
          {['Find Vet', 'Select Time', 'Confirm'].map((label, i) => (
            <div key={i} style={{
              padding: '.4rem 1rem', borderRadius: 'var(--radius)',
              background: step === i+1 ? 'var(--green-600)' : 'var(--gray-100)',
              color:      step === i+1 ? '#fff' : 'var(--gray-600)',
              fontWeight: 600, fontSize: '.85rem',
            }}>{i+1}. {label}</div>
          ))}
        </div>

        {/* ── Step 1: Filter & Browse Vets ── */}
        {step === 1 && (
          <div className="card">
            <h2 className="section-title">Filter</h2>
            <div className="grid-3 mb-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Branch / Location</label>
                <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                  <option value="">All branches</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Specialization</label>
                <select value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
                  {SPECS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Species expertise</label>
                <input placeholder="e.g. Dog, Cat" value={filterSpecies}
                  onChange={e => setFilterSpecies(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                <label>Date</label>
                <input type="date" value={filterDate}
                  min={new Date().toISOString().slice(0,10)}
                  onChange={e => {
                    setError(null)
                    setSelectedSlot(null)
                    setFilterDate(e.target.value)
                  }} />
              </div>
              <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={searchVets}>Search</button>
            </div>

            {searched && (
              <div className="mt-4">
                <p className="text-sm text-muted mb-3">Results ({vets.length} veterinarian{vets.length !== 1 ? 's' : ''} found)</p>
                {vets.length === 0
                  ? <p className="text-sm text-muted">No veterinarians match these filters.</p>
                  : vets.map(v => (
                    <div key={v.vetId} className="flex items-center justify-between"
                      style={{ padding: '.75rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', marginBottom: '.5rem' }}>
                      <div className="flex items-center gap-3">
                        <div className="avatar">{v.fullName.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                        <div>
                          <div className="font-semibold">{v.fullName}</div>
                          <div className="text-xs text-muted">
                            {[v.specialization, v.speciesExpertise, v.branchName].filter(Boolean).join(' · ')}
                          </div>
                          {v.avgRating && (
                            <div className="text-xs" style={{ color: '#f59e0b' }}>★ {v.avgRating}/5</div>
                          )}
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => selectVet(v)}>Select</button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Pick Time Slot ── */}
        {step === 2 && selectedVet && (
          <div className="card">
            <button className="btn btn-ghost btn-sm mb-3" onClick={() => setStep(1)}>← Back</button>
            <div className="flex items-center gap-3 mb-4">
              <div className="avatar">{selectedVet.fullName.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
              <div>
                <div className="font-semibold">{selectedVet.fullName}</div>
                <div className="text-sm text-muted">{selectedVet.branchName} · {filterDate}</div>
              </div>
            </div>

            <h2 className="section-title">Available time slots</h2>
            <div className="slots">
              {SLOTS.map(slot => {
                const busy = busySlots.includes(slot)
                return (
                  <button key={slot}
                    className={`slot ${busy ? 'unavailable' : ''} ${selectedSlot === slot ? 'selected' : ''}`}
                    onClick={() => {
                      if (!busy) {
                        setError(null)
                        setSelectedSlot(slot)
                      }
                    }}
                    disabled={busy}>
                    {slot}
                  </button>
                )
              })}
            </div>

            {selectedSlot && (
              <div className="alert alert-success mt-3">
                {selectedSlot} slot is available. No unpaid invoices found.
              </div>
            )}

            <button className="btn btn-primary mt-4" disabled={!selectedSlot} onClick={() => setStep(3)}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div className="card">
            <button className="btn btn-ghost btn-sm mb-3" onClick={() => {
              setError(null)
              setStep(2)
            }}>← Back</button>
            <h2 className="section-title">Confirm Appointment</h2>

            <div className="grid-3 mb-4">
              <div><div className="text-xs text-muted">Veterinarian</div><div className="font-semibold">{selectedVet?.fullName}</div></div>
              <div><div className="text-xs text-muted">Branch</div><div className="font-semibold">{selectedVet?.branchName}</div></div>
              <div><div className="text-xs text-muted">Date & Time</div><div className="font-semibold">{filterDate} {selectedSlot}</div></div>
            </div>

            {error && (
              <div className="alert alert-error">
                {error.type === 'blocking' && <div className="font-semibold mb-1">Booking blocked</div>}
                <div>{error.message}</div>
              </div>
            )}

            <div className="form-group">
              <label>Select Pet</label>
              <select value={selectedPet} onChange={e => {
                setError(null)
                setSelectedPet(e.target.value)
              }} required>
                <option value="">Choose a pet</option>
                {pets.map(p => <option key={p.petId} value={p.petId}>{p.name} ({p.species})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Reason for visit</label>
              <input placeholder="e.g. Annual checkup, limping, skin rash…"
                value={reason} onChange={e => setReason(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full mt-2" onClick={confirmBooking} disabled={loading}>
              {loading ? 'Booking…' : 'Confirm appointment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
