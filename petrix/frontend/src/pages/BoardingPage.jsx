import { useEffect, useState } from 'react'
import { boardingAPI, branchAPI } from '../services/api'

const statuses = ['', 'active', 'completed', 'cancelled']
const roomStatuses = ['', 'available', 'occupied', 'maintenance']
const defaultRoomForm = {
  branchId: '',
  roomNo: '',
  capacity: 1,
  nightlyRate: 400,
  status: 'available',
}

function today(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function nowLocalMinute() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
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

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('tr-TR')} TL`
}

function nightsBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const nights = Math.round((end - start) / 86400000)
  return Number.isFinite(nights) && nights > 0 ? nights : 0
}

function statusBadge(status) {
  const map = { active: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function BoardingPage() {
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState({
    branchId: '',
    startDate: today(),
    endDate: today(1),
  })
  const [availableRooms, setAvailableRooms] = useState([])
  const [roomFilters, setRoomFilters] = useState({ branchId: '', status: '' })
  const [roomForm, setRoomForm] = useState(defaultRoomForm)
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [reservationForm, setReservationForm] = useState({ petId: '', specialNotes: '' })
  const [reservationFilters, setReservationFilters] = useState({ branchId: '', status: '', petId: '', ownerId: '' })
  const [reservations, setReservations] = useState([])
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [feedingLogs, setFeedingLogs] = useState([])
  const [feedingForm, setFeedingForm] = useState({
    feedTime: nowLocalMinute(),
    food: '',
    amount: '',
    medicationNote: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [reservationsLoading, setReservationsLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    branchAPI.getAll().then(r => setBranches(r.data)).catch(() => setError('Failed to load branches.'))
    loadRooms()
    loadReservations()
  }, [])

  async function loadRooms() {
    setRoomsLoading(true)
    setError('')
    try {
      const params = {}
      if (roomFilters.branchId) params.branchId = roomFilters.branchId
      if (roomFilters.status) params.status = roomFilters.status
      const res = await boardingAPI.getRooms(params)
      setRooms(res.data)
    } catch (err) {
      setError(apiMessage(err, 'Failed to load rooms.'))
    } finally {
      setRoomsLoading(false)
    }
  }

  function editRoom(room) {
    setEditingRoomId(room.room_id)
    setRoomForm({
      branchId: room.branch_id,
      roomNo: room.room_no,
      capacity: room.capacity || 1,
      nightlyRate: room.nightly_rate || 400,
      status: room.status || 'available',
    })
    setError('')
    setMsg('')
  }

  function resetRoomForm() {
    setEditingRoomId(null)
    setRoomForm(defaultRoomForm)
  }

  async function saveRoom(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    try {
      const payload = {
        branchId: Number(roomForm.branchId),
        roomNo: roomForm.roomNo,
        capacity: Number(roomForm.capacity),
        nightlyRate: Number(roomForm.nightlyRate),
        status: roomForm.status,
      }
      if (editingRoomId) {
        await boardingAPI.updateRoom(editingRoomId, payload)
        setMsg('Room/cage unit updated.')
      } else {
        await boardingAPI.createRoom(payload)
        setMsg('Room/cage unit added.')
      }
      resetRoomForm()
      await loadRooms()
    } catch (err) {
      setError(apiMessage(err, 'Failed to save room/cage unit.'))
    }
  }

  async function searchRooms() {
    setLoading(true)
    setError('')
    setMsg('')
    setSelectedRoom(null)
    try {
      const res = await boardingAPI.getAvailableRooms({
        branchId: search.branchId,
        startDate: search.startDate,
        endDate: search.endDate,
      })
      setAvailableRooms(res.data)
    } catch (err) {
      setAvailableRooms([])
      setError(apiMessage(err, 'Failed to search available rooms.'))
    } finally {
      setLoading(false)
    }
  }

  async function createReservation(e) {
    e.preventDefault()
    if (!selectedRoom) return
    setError('')
    setMsg('')
    try {
      await boardingAPI.createReservation({
        petId: parseInt(reservationForm.petId),
        roomId: selectedRoom.room_id,
        startDate: search.startDate,
        endDate: search.endDate,
        specialNotes: reservationForm.specialNotes,
      })
      setMsg('Boarding reservation created successfully.')
      setReservationForm({ petId: '', specialNotes: '' })
      setSelectedRoom(null)
      await searchRooms()
      await loadReservations()
    } catch (err) {
      setError(apiMessage(err, 'Failed to create boarding reservation.'))
    }
  }

  async function loadReservations() {
    setReservationsLoading(true)
    setError('')
    try {
      const params = {}
      if (reservationFilters.branchId) params.branchId = reservationFilters.branchId
      if (reservationFilters.status) params.status = reservationFilters.status
      if (reservationFilters.petId) params.petId = reservationFilters.petId
      if (reservationFilters.ownerId) params.ownerId = reservationFilters.ownerId
      const res = await boardingAPI.getReservations(params)
      setReservations(res.data)
    } catch (err) {
      setError(apiMessage(err, 'Failed to load boarding reservations.'))
    } finally {
      setReservationsLoading(false)
    }
  }

  async function updateReservation(id, action) {
    setError('')
    setMsg('')
    try {
      if (action === 'cancel') {
        await boardingAPI.cancelReservation(id)
        setMsg('Boarding reservation cancelled.')
      } else {
        await boardingAPI.completeReservation(id)
        setMsg('Boarding reservation completed.')
      }
      await loadReservations()
      if (selectedReservation?.reservation_id === id) {
        setSelectedReservation(prev => prev ? { ...prev, status: action === 'cancel' ? 'cancelled' : 'completed' } : prev)
      }
    } catch (err) {
      setError(apiMessage(err, `Failed to ${action} reservation.`))
    }
  }

  async function selectReservation(reservation) {
    setSelectedReservation(reservation)
    setLogsLoading(true)
    setError('')
    try {
      const res = await boardingAPI.getFeedingLogs(reservation.reservation_id)
      setFeedingLogs(res.data)
    } catch (err) {
      setFeedingLogs([])
      setError(apiMessage(err, 'Failed to load feeding logs.'))
    } finally {
      setLogsLoading(false)
    }
  }

  async function addFeedingLog(e) {
    e.preventDefault()
    if (!selectedReservation) return
    setError('')
    setMsg('')
    try {
      await boardingAPI.addFeedingLog(selectedReservation.reservation_id, {
        feedTime: feedingForm.feedTime,
        food: feedingForm.food,
        amount: feedingForm.amount,
        medicationNote: feedingForm.medicationNote,
        notes: feedingForm.notes,
      })
      setMsg('Feeding/care log added.')
      setFeedingForm({ feedTime: nowLocalMinute(), food: '', amount: '', medicationNote: '', notes: '' })
      const res = await boardingAPI.getFeedingLogs(selectedReservation.reservation_id)
      setFeedingLogs(res.data)
    } catch (err) {
      setError(apiMessage(err, 'Failed to add feeding log.'))
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Boarding Management</h1>
          <p className="text-sm text-muted mt-1">Manage room availability, reservations, and feeding/care logs</p>
        </div>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title" style={{ margin: 0 }}>Room/Cage Units</h2>
            <button className="btn btn-outline btn-sm" onClick={loadRooms}>Refresh</button>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Branch</label>
              <select value={roomFilters.branchId} onChange={e => setRoomFilters(f => ({ ...f, branchId: e.target.value }))}>
                <option value="">All branches</option>
                {branches.map(branch => (
                  <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={roomFilters.status} onChange={e => setRoomFilters(f => ({ ...f, status: e.target.value }))}>
                {roomStatuses.map(status => <option key={status || 'all'} value={status}>{status || 'All statuses'}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary mb-3" onClick={loadRooms} disabled={roomsLoading}>
            {roomsLoading ? 'Loading...' : 'Apply Room Filters'}
          </button>

          <form onSubmit={saveRoom} className="mb-4" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
            <h3 className="font-semibold mb-3">{editingRoomId ? 'Edit Room/Cage Unit' : 'Add Room/Cage Unit'}</h3>
            <div className="grid-3">
              <div className="form-group">
                <label>Branch</label>
                <select
                  value={roomForm.branchId}
                  onChange={e => setRoomForm(f => ({ ...f, branchId: e.target.value }))}
                  required>
                  <option value="">Select branch</option>
                  {branches.map(branch => (
                    <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Room No</label>
                <input
                  value={roomForm.roomNo}
                  onChange={e => setRoomForm(f => ({ ...f, roomNo: e.target.value }))}
                  placeholder="H-301"
                  required
                />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={roomForm.capacity}
                  onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Branch Nightly Rate</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={roomForm.nightlyRate}
                  onChange={e => setRoomForm(f => ({ ...f, nightlyRate: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted mt-1">Applies to every room in this branch.</p>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={roomForm.status} onChange={e => setRoomForm(f => ({ ...f, status: e.target.value }))}>
                  {roomStatuses.filter(Boolean).map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {editingRoomId && <button type="button" className="btn btn-outline" onClick={resetRoomForm}>Cancel Edit</button>}
              <button type="submit" className="btn btn-primary">{editingRoomId ? 'Update Room' : 'Add Room'}</button>
            </div>
          </form>

          {roomsLoading ? <div className="spinner" /> : rooms.length === 0 ? (
            <p className="text-sm text-muted">No room/cage units found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Room No</th><th>Capacity</th><th>Branch Nightly Rate</th><th>Branch</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {rooms.map(room => (
                    <tr key={room.room_id}>
                      <td className="font-semibold">{room.room_no}</td>
                      <td>{room.capacity || '-'}</td>
                      <td>{formatMoney(room.nightly_rate)}</td>
                      <td>{room.branch_name}</td>
                      <td><span className={`badge ${room.status === 'maintenance' ? 'badge-red' : room.status === 'occupied' ? 'badge-yellow' : 'badge-green'}`}>{room.status}</span></td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => editRoom(room)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card mb-4">
          <h2 className="section-title">Room Availability Search</h2>
          <div className="grid-2">
            <div className="form-group">
              <label>Branch</label>
              <select value={search.branchId} onChange={e => setSearch(s => ({ ...s, branchId: e.target.value }))}>
                <option value="">Select branch</option>
                {branches.map(branch => (
                  <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={search.startDate} onChange={e => setSearch(s => ({ ...s, startDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={search.endDate} onChange={e => setSearch(s => ({ ...s, endDate: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={searchRooms} disabled={loading || !search.branchId}>
            {loading ? 'Searching...' : 'Search Available Rooms'}
          </button>

          <div className="mt-4">
            {loading ? <div className="spinner" /> : availableRooms.length === 0 ? (
              <p className="text-sm text-muted">No available rooms loaded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Room No</th><th>Capacity</th><th>Branch Nightly Rate</th><th>Branch</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {availableRooms.map(room => (
                      <tr key={room.room_id}>
                        <td className="font-semibold">{room.room_no}</td>
                        <td>{room.capacity || '-'}</td>
                        <td>{formatMoney(room.nightly_rate)}</td>
                        <td>{room.branch_name}</td>
                        <td><span className="badge badge-green">{room.status}</span></td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelectedRoom(room)}>
                            Reserve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {selectedRoom && (
          <div className="card mb-4">
            <h2 className="section-title">Create Boarding Reservation</h2>
            <p className="text-sm text-muted mb-3">
              Room {selectedRoom.room_no} from {formatDate(search.startDate)} to {formatDate(search.endDate)}
            </p>
            <form onSubmit={createReservation}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Pet ID</label>
                  <input
                    type="number"
                    min="1"
                    value={reservationForm.petId}
                    onChange={e => setReservationForm(f => ({ ...f, petId: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Special Notes</label>
                  <textarea
                    value={reservationForm.specialNotes}
                    onChange={e => setReservationForm(f => ({ ...f, specialNotes: e.target.value }))}
                    placeholder="Needs medication after dinner"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline" onClick={() => setSelectedRoom(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Reservation</button>
              </div>
            </form>
          </div>
        )}

        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title" style={{ margin: 0 }}>Reservation List</h2>
            <button className="btn btn-outline btn-sm" onClick={loadReservations}>Refresh</button>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Branch</label>
              <select value={reservationFilters.branchId} onChange={e => setReservationFilters(f => ({ ...f, branchId: e.target.value }))}>
                <option value="">All branches</option>
                {branches.map(branch => (
                  <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={reservationFilters.status} onChange={e => setReservationFilters(f => ({ ...f, status: e.target.value }))}>
                {statuses.map(status => <option key={status || 'all'} value={status}>{status || 'All statuses'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Pet ID</label>
              <input type="number" min="1" value={reservationFilters.petId} onChange={e => setReservationFilters(f => ({ ...f, petId: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Owner ID</label>
              <input type="number" min="1" value={reservationFilters.ownerId} onChange={e => setReservationFilters(f => ({ ...f, ownerId: e.target.value }))} />
            </div>
          </div>
          <button className="btn btn-primary mb-3" onClick={loadReservations} disabled={reservationsLoading}>
            {reservationsLoading ? 'Loading...' : 'Apply Reservation Filters'}
          </button>

          {reservationsLoading ? <div className="spinner" /> : reservations.length === 0 ? (
            <p className="text-sm text-muted">No boarding reservations found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pet</th><th>Owner</th><th>Room</th><th>Branch</th>
                    <th>Start</th><th>End</th><th>Status</th><th>Estimated Fee</th><th>Notes</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(reservation => {
                    const fee = nightsBetween(reservation.start_date, reservation.end_date) * Number(reservation.nightly_rate || 0)
                    return (
                      <tr key={reservation.reservation_id}>
                        <td className="font-semibold">{reservation.pet_name} #{reservation.pet_id}</td>
                        <td>{reservation.owner_name}</td>
                        <td>{reservation.room_no}</td>
                        <td>{reservation.branch_name}</td>
                        <td>{formatDate(reservation.start_date)}</td>
                        <td>{formatDate(reservation.end_date)}</td>
                        <td>{statusBadge(reservation.status)}</td>
                        <td>{formatMoney(fee)}</td>
                        <td className="text-sm">{reservation.special_notes || '-'}</td>
                        <td>
                          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            {reservation.status === 'active' && (
                              <>
                                <button className="btn btn-danger btn-sm" onClick={() => updateReservation(reservation.reservation_id, 'cancel')}>
                                  Cancel
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => updateReservation(reservation.reservation_id, 'complete')}>
                                  Complete
                                </button>
                              </>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => selectReservation(reservation)}>
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
              Reservation #{selectedReservation.reservation_id} - {selectedReservation.pet_name}, room {selectedReservation.room_no}
            </p>

            {selectedReservation.status !== 'cancelled' && (
              <form onSubmit={addFeedingLog} className="mb-4">
                <div className="grid-2">
                  <div className="form-group">
                    <label>Feed Time</label>
                    <input type="datetime-local" value={feedingForm.feedTime} onChange={e => setFeedingForm(f => ({ ...f, feedTime: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Food</label>
                    <input value={feedingForm.food} onChange={e => setFeedingForm(f => ({ ...f, food: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input value={feedingForm.amount} onChange={e => setFeedingForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Medication Note</label>
                    <input value={feedingForm.medicationNote} onChange={e => setFeedingForm(f => ({ ...f, medicationNote: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={feedingForm.notes} onChange={e => setFeedingForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <button className="btn btn-primary" type="submit">Add Feeding/Care Log</button>
              </form>
            )}

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
