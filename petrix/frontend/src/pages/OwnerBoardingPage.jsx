import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { boardingAPI, branchAPI } from '../services/api'

function today(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function apiMessage(err, fallback) {
  const data = err.response?.data
  if (typeof data === 'string') return data
  return data?.error || data?.message || fallback
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB') : '-'
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-'
}

function nightsBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const nights = Math.round((end - start) / 86400000)
  return Number.isFinite(nights) && nights > 0 ? nights : 0
}

function roomRate(room) {
  return Number(room?.nightly_rate ?? 400)
}

function estimatedFee(room, nights) {
  const rate = roomRate(room)
  return nights * rate
}

function money(value) {
  return `${Number(value || 0).toLocaleString('tr-TR')} TL`
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

function statusBadge(status) {
  const map = { active: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function OwnerBoardingPage() {
  const { user } = useAuth()
  const [pets, setPets] = useState([])
  const [branches, setBranches] = useState([])
  const [reservations, setReservations] = useState([])
  const [availableRooms, setAvailableRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [feedingLogs, setFeedingLogs] = useState([])
  const [form, setForm] = useState({
    petId: '',
    branchId: '',
    startDate: today(),
    endDate: today(1),
    specialNotes: '',
  })
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      boardingAPI.getOwnerPets(user.userId),
      branchAPI.getAll(),
      boardingAPI.getOwnerReservations(user.userId),
    ]).then(([petsRes, branchesRes, reservationsRes]) => {
      setPets(petsRes.data)
      setBranches(branchesRes.data)
      setReservations(reservationsRes.data)
    }).catch(err => {
      setError(apiMessage(err, 'Failed to load boarding information.'))
    }).finally(() => setLoading(false))
  }, [user])

  const selectedPet = useMemo(
    () => pets.find(p => String(p.pet_id) === String(form.petId)),
    [pets, form.petId]
  )
  const selectedBranch = useMemo(
    () => branches.find(b => String(b.branchId) === String(form.branchId)),
    [branches, form.branchId]
  )
  const nights = nightsBetween(form.startDate, form.endDate)

  function updateForm(patch) {
    setForm(prev => ({ ...prev, ...patch }))
    setError('')
    setMsg('')
    setSelectedRoom(null)
    setQuote(null)
  }

  async function selectRoom(room) {
    setSelectedRoom(room)
    setQuote(null)
    setQuoteLoading(true)
    setError('')
    setMsg('')
    try {
      const res = await boardingAPI.getOwnerQuote(user.userId, {
        roomId: room.room_id,
        startDate: form.startDate,
        endDate: form.endDate,
      })
      setQuote(res.data)
    } catch (err) {
      setError(apiMessage(err, 'Could not calculate membership pricing.'))
    } finally {
      setQuoteLoading(false)
    }
  }

  async function refreshReservations() {
    const res = await boardingAPI.getOwnerReservations(user.userId)
    setReservations(res.data)
  }

  async function searchRooms() {
    setError('')
    setMsg('')
    setSelectedRoom(null)
    setAvailableRooms([])

    if (!form.petId) {
      setError('Please select a pet.')
      return
    }
    if (!form.branchId) {
      setError('Please select a branch.')
      return
    }
    if (!form.startDate || !form.endDate || nights === 0) {
      setError('End date must be after start date.')
      return
    }

    setSearching(true)
    try {
      const res = await boardingAPI.getAvailableRooms({
        branchId: form.branchId,
        startDate: form.startDate,
        endDate: form.endDate,
      })
      setAvailableRooms(res.data)
      if (res.data.length === 0) {
        setMsg('No rooms are available for the selected date range.')
      }
    } catch (err) {
      setError(apiMessage(err, 'Could not search available rooms.'))
    } finally {
      setSearching(false)
    }
  }

  async function confirmReservation() {
    setError('')
    setMsg('')
    if (!form.petId) {
      setError('Please select a pet.')
      return
    }
    if (!selectedRoom) return
    if (nights === 0) {
      setError('End date must be after start date.')
      return
    }

    setSubmitting(true)
    try {
      await boardingAPI.createOwnerReservation(user.userId, {
        petId: Number(form.petId),
        roomId: selectedRoom.room_id,
        startDate: form.startDate,
        endDate: form.endDate,
        specialNotes: form.specialNotes,
      })
      setMsg('Boarding reservation created successfully.')
      setAvailableRooms([])
      setSelectedRoom(null)
      setQuote(null)
      setForm(prev => ({ ...prev, specialNotes: '' }))
      await refreshReservations()
    } catch (err) {
      setError(apiMessage(err, 'Could not create boarding reservation.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelReservation(id) {
    if (!confirm('Cancel this boarding reservation?')) return
    setError('')
    setMsg('')
    try {
      await boardingAPI.cancelOwnerReservation(user.userId, id)
      setMsg('Boarding reservation cancelled.')
      await refreshReservations()
    } catch (err) {
      setError(apiMessage(err, 'Could not cancel boarding reservation.'))
    }
  }

  async function viewLogs(reservation) {
    setSelectedReservation(reservation)
    setLogsLoading(true)
    setError('')
    try {
      const res = await boardingAPI.getOwnerFeedingLogs(user.userId, reservation.reservation_id)
      setFeedingLogs(res.data)
    } catch (err) {
      setFeedingLogs([])
      setError(apiMessage(err, 'Could not load feeding/care logs.'))
    } finally {
      setLogsLoading(false)
    }
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>

  return (
    <div className="page">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Pet Boarding / Pet Hotel</h1>
            <p className="text-sm text-muted mt-1">Reserve temporary accommodation for your pets while you are away.</p>
          </div>
          <Link to="/" className="btn btn-outline">Back to Dashboard</Link>
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card mb-4">
          <h2 className="section-title">Find Available Rooms</h2>
          <div className="grid-2">
            <div className="form-group">
              <label>Pet</label>
              <select value={form.petId} onChange={e => updateForm({ petId: e.target.value })}>
                <option value="">Select pet</option>
                {pets.map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.name} ({pet.species})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Branch</label>
              <select value={form.branchId} onChange={e => updateForm({ branchId: e.target.value })}>
                <option value="">Select branch</option>
                {branches.map(branch => (
                  <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.startDate} onChange={e => updateForm({ startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={form.endDate} onChange={e => updateForm({ endDate: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={searchRooms} disabled={searching}>
            {searching ? 'Searching...' : 'Search Available Rooms'}
          </button>
        </div>

        {availableRooms.length > 0 && (
          <div className="card mb-4">
            <h2 className="section-title">Available Rooms</h2>
            <div className="grid-3">
              {availableRooms.map(room => {
                const rate = roomRate(room)
                const isSelected = selectedRoom?.room_id === room.room_id
                return (
                  <div key={room.room_id}
                    style={{ border: `1.5px solid ${isSelected ? 'var(--green-600)' : 'var(--gray-200)'}`, borderRadius: 'var(--radius)', padding: '1rem' }}>
                    <div className="font-semibold">Room {room.room_no}</div>
                    <div className="text-sm text-muted">Capacity {room.capacity || '-'}</div>
                    <div className="text-sm text-muted">{room.branch_name}</div>
                    <div className="font-semibold mt-2">{money(rate)} / night</div>
                    <button className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'} btn-sm mt-3`} onClick={() => selectRoom(room)}>
                      {isSelected ? 'Selected' : 'Select Room'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {selectedRoom && (
          <div className="card mb-4">
            <h2 className="section-title">Reservation Summary</h2>
            <div className="grid-2">
              <div>
                <p><strong>Pet:</strong> {selectedPet?.name || '-'}</p>
                <p><strong>Branch:</strong> {selectedBranch?.name || selectedRoom.branch_name}</p>
                <p><strong>Room:</strong> {selectedRoom.room_no}</p>
              </div>
              <div>
                <p><strong>Dates:</strong> {formatDate(form.startDate)} - {formatDate(form.endDate)}</p>
                <p><strong>Nights:</strong> {nights}</p>
                <p><strong>Nightly rate:</strong> {money(quote?.nightlyRate ?? roomRate(selectedRoom))}</p>
              </div>
            </div>
            {quoteLoading ? (
              <div className="spinner" />
            ) : quote && (
              <div className="mt-3 mb-3" style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                <div className="grid-2">
                  <div>
                    <p><strong>Membership:</strong> {quote.planName}</p>
                    <p><strong>Monthly free nights:</strong> {quote.freeNightAllowance}</p>
                    <p><strong>Used free nights this month:</strong> {quote.usedFreeNightsThisMonth}</p>
                    <p><strong>Applied free nights:</strong> {quote.appliedFreeNights}</p>
                  </div>
                  <div>
                    <p><strong>Paid nights:</strong> {quote.paidNights}</p>
                    <p><strong>Subtotal:</strong> {money(quote.subtotal)}</p>
                    <p><strong>Membership discount:</strong> {percent(quote.discountRate)} ({money(quote.discountAmount)})</p>
                    <p className="font-semibold"><strong>Estimated boarding fee:</strong> {money(quote.total)}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="form-group">
              <label>Special Notes</label>
              <textarea
                value={form.specialNotes}
                onChange={e => setForm(prev => ({ ...prev, specialNotes: e.target.value }))}
                placeholder="Needs medication after dinner"
              />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline" onClick={() => setSelectedRoom(null)}>Choose Another Room</button>
              <button className="btn btn-primary" onClick={confirmReservation} disabled={submitting}>
                {submitting ? 'Confirming...' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        )}

        <div className="card mb-4">
          <h2 className="section-title">My Boarding Reservations</h2>
          {reservations.length === 0 ? (
            <p className="text-sm text-muted">No boarding reservations yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Pet</th><th>Branch</th><th>Room</th><th>Start</th><th>End</th><th>Status</th><th>Estimated Fee</th><th></th></tr>
                </thead>
                <tbody>
                  {reservations.map(reservation => {
                    const resFee = reservation.final_fee != null
                      ? reservation.final_fee
                      : estimatedFee(reservation, nightsBetween(reservation.start_date, reservation.end_date))
                    return (
                      <tr key={reservation.reservation_id}>
                        <td className="font-semibold">{reservation.pet_name}</td>
                        <td>{reservation.branch_name}</td>
                        <td>{reservation.room_no}</td>
                        <td>{formatDate(reservation.start_date)}</td>
                        <td>{formatDate(reservation.end_date)}</td>
                        <td>{statusBadge(reservation.status)}</td>
                        <td>{money(resFee)}</td>
                        <td>
                          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            {reservation.status === 'active' && (
                              <button className="btn btn-danger btn-sm" onClick={() => cancelReservation(reservation.reservation_id)}>
                                Cancel
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => viewLogs(reservation)}>
                              Feeding Logs
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedReservation && (
          <div className="card">
            <h2 className="section-title">Feeding/Care Logs</h2>
            <p className="text-sm text-muted mb-3">
              {selectedReservation.pet_name} · room {selectedReservation.room_no} · {formatDate(selectedReservation.start_date)} - {formatDate(selectedReservation.end_date)}
            </p>
            {logsLoading ? <div className="spinner" /> : feedingLogs.length === 0 ? (
              <p className="text-sm text-muted">No feeding/care logs recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Food</th><th>Amount</th><th>Medication</th><th>Notes</th></tr></thead>
                  <tbody>
                    {feedingLogs.map(log => (
                      <tr key={log.feed_id}>
                        <td>{formatDateTime(log.feed_time)}</td>
                        <td>{log.food || '-'}</td>
                        <td>{log.amount || '-'}</td>
                        <td>{log.medication_note || '-'}</td>
                        <td>{log.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
