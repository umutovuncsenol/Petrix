import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { petAPI, appointmentAPI, visitAPI, boardingAPI } from '../services/api'

function statusBadge(status) {
  const map = { scheduled: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

function severityBadge(severity) {
  const map = { mild: 'badge-green', moderate: 'badge-yellow', severe: 'badge-red' }
  return severity
    ? <span className={`badge ${map[severity] || 'badge-gray'}`}>{severity}</span>
    : <span className="text-sm text-muted">-</span>
}

function paymentBadge(status) {
  const map = { paid: 'badge-green', unpaid: 'badge-yellow', cancelled: 'badge-red' }
  return status
    ? <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
    : <span className="text-sm text-muted">-</span>
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatMoney(value) {
  if (value === null || value === undefined) return '-'
  return `₺${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function boardingNights(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const nights = Math.round((end - start) / 86400000)
  return Number.isFinite(nights) && nights > 0 ? nights : 0
}

function boardingFee(reservation, nights) {
  return nights * Number(reservation?.nightly_rate ?? 400)
}

function boardingStatusBadge(status) {
  const map = { active: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [pets, setPets]   = useState([])
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [visitSummaries, setVisitSummaries] = useState([])
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [summariesError, setSummariesError] = useState('')
  const [payingInvoice, setPayingInvoice] = useState({})
  const [ratings, setRatings] = useState({})
  const [ratingForm, setRatingForm] = useState({})
  const [ratingSubmitting, setRatingSubmitting] = useState({})
  const [boardingReservations, setBoardingReservations] = useState([])
  const [boardingError, setBoardingError] = useState('')
  const [boardingLogs, setBoardingLogs] = useState([])
  const [selectedBoarding, setSelectedBoarding] = useState(null)
  const [boardingLogsLoading, setBoardingLogsLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setSummariesLoading(true)
    setSummariesError('')

    Promise.all([
      petAPI.getByOwner(user.userId),
      appointmentAPI.getByOwner(user.userId),
      boardingAPI.getOwnerReservations(user.userId),
    ]).then(([pRes, aRes, bRes]) => {
      setPets(pRes.data)
      setAppts(aRes.data)
      setBoardingReservations(bRes.data)
    }).catch(err => {
      setBoardingError(err.response?.data?.error || 'Failed to load boarding reservations.')
    }).finally(() => setLoading(false))

    appointmentAPI.getVisitSummaries(user.userId)
      .then(async res => {
        const summaries = res.data
        setVisitSummaries(summaries)

        const visitIds = summaries.map(s => s.visit_id).filter(Boolean)
        const results = await Promise.all(
          visitIds.map(id =>
            visitAPI.getRating(id)
              .then(r => ({ visitId: id, rating: r.data }))
              .catch(() => null)
          )
        )

        const preloaded = {}
        for (const r of results) {
          if (r) preloaded[r.visitId] = { score: r.rating.score, comment: r.rating.comment || '' }
        }
        setRatings(preloaded)
      })
      .catch(err => setSummariesError(err.response?.data?.error || 'Failed to load visit summaries.'))
      .finally(() => setSummariesLoading(false))
  }, [user])

  async function refreshBoardingReservations() {
    const res = await boardingAPI.getOwnerReservations(user.userId)
    setBoardingReservations(res.data)
  }

  async function cancelBoardingReservation(id) {
    if (!confirm('Cancel this boarding reservation?')) return
    try {
      await boardingAPI.cancelOwnerReservation(user.userId, id)
      await refreshBoardingReservations()
    } catch (err) {
      setBoardingError(err.response?.data?.error || 'Failed to cancel boarding reservation.')
    }
  }

  async function viewBoardingLogs(reservation) {
    setSelectedBoarding(reservation)
    setBoardingLogsLoading(true)
    setBoardingError('')
    try {
      const res = await boardingAPI.getOwnerFeedingLogs(user.userId, reservation.reservation_id)
      setBoardingLogs(res.data)
    } catch (err) {
      setBoardingLogs([])
      setBoardingError(err.response?.data?.error || 'Failed to load feeding/care logs.')
    } finally {
      setBoardingLogsLoading(false)
    }
  }

  async function payInvoice(visitId) {
    setPayingInvoice(prev => ({ ...prev, [visitId]: true }))
    try {
      await visitAPI.payInvoice(visitId, { paymentMethod: 'cash' })
      setVisitSummaries(prev =>
        prev.map(s => s.visit_id === visitId ? { ...s, payment_status: 'paid' } : s)
      )
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to pay invoice.')
    } finally {
      setPayingInvoice(prev => ({ ...prev, [visitId]: false }))
    }
  }

  async function submitRating(visitId, vetId) {
    const form = ratingForm[visitId] || {}
    if (!form.score) return
    setRatingSubmitting(prev => ({ ...prev, [visitId]: true }))
    try {
      await visitAPI.rate(visitId, {
        ownerId: user.userId,
        vetId,
        score: form.score,
        comment: form.comment || '',
      })
      setRatings(prev => ({ ...prev, [visitId]: { score: form.score, comment: form.comment || '' } }))
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit rating.')
    } finally {
      setRatingSubmitting(prev => ({ ...prev, [visitId]: false }))
    }
  }

  async function cancelAppt(id) {
    if (!confirm('Cancel this appointment?')) return
    await appointmentAPI.cancel(id)
    setAppts(prev => prev.map(a => a.apptId === id ? { ...a, status: 'cancelled' } : a))
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>

  const upcoming = appts.filter(a => a.status === 'scheduled')
  const past     = appts.filter(a => a.status !== 'scheduled')

  return (
    <div className="page">
      <div className="container">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user.fullName.split(' ')[0]}</h1>
            <p className="text-sm text-muted mt-1">Manage your pets and appointments</p>
          </div>
          <div className="flex gap-2">
            <Link to="/owner/boarding" className="btn btn-outline">Pet Hotel</Link>
            <Link to="/book-appointment" className="btn btn-primary">+ Book Appointment</Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid-3 mb-4">
          <div className="card text-center">
            <div className="text-2xl font-bold text-green">{pets.length}</div>
            <div className="text-sm text-muted">Registered Pets</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green">{upcoming.length}</div>
            <div className="text-sm text-muted">Upcoming Appointments</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold" style={{ color: 'var(--gray-600)' }}>{past.length}</div>
            <div className="text-sm text-muted">Past Visits</div>
          </div>
        </div>

        {/* Pets */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title" style={{ margin: 0 }}>My Pets</h2>
            <Link to="/pets/add" className="btn btn-outline btn-sm">+ Add Pet</Link>
          </div>
          {pets.length === 0
            ? <p className="text-sm text-muted">No pets registered yet. <Link to="/pets/add" style={{ color: 'var(--green-600)' }}>Add your first pet</Link>.</p>
            : (
              <div className="grid-3">
                {pets.map(pet => (
                  <Link to={`/pets/${pet.petId}`} key={pet.petId}
                    style={{ display: 'block', padding: '1rem', border: '1.5px solid var(--gray-200)',
                             borderRadius: 'var(--radius)', transition: 'border-color .15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green-600)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}>
                    <div className="font-semibold">{pet.name}</div>
                    <div className="text-sm text-muted">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</div>
                    {pet.birthDate && (
                      <div className="text-xs text-muted mt-1">Born: {new Date(pet.birthDate).toLocaleDateString()}</div>
                    )}
                  </Link>
                ))}
              </div>
            )
          }
        </div>

        {/* Pet Boarding */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title" style={{ margin: 0 }}>Pet Boarding / Pet Hotel</h2>
            <Link to="/owner/boarding" className="btn btn-primary btn-sm">Reserve a Room</Link>
          </div>
          {boardingError && <div className="alert alert-error">{boardingError}</div>}
          {boardingReservations.length === 0
            ? <p className="text-sm text-muted">No boarding reservations yet.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Pet</th><th>Branch</th><th>Room</th><th>Start</th><th>End</th><th>Status</th><th>Estimated Fee</th><th></th></tr>
                  </thead>
                  <tbody>
                    {boardingReservations.map(reservation => {
                      const nights = boardingNights(reservation.start_date, reservation.end_date)
                      const fee = boardingFee(reservation, nights)
                      return (
                        <tr key={reservation.reservation_id}>
                          <td className="font-semibold">{reservation.pet_name}</td>
                          <td>{reservation.branch_name}</td>
                          <td>{reservation.room_no}</td>
                          <td>{formatDate(reservation.start_date)}</td>
                          <td>{formatDate(reservation.end_date)}</td>
                          <td>{boardingStatusBadge(reservation.status)}</td>
                          <td>{formatMoney(fee)}</td>
                          <td>
                            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                              {reservation.status === 'active' && (
                                <button className="btn btn-danger btn-sm" onClick={() => cancelBoardingReservation(reservation.reservation_id)}>
                                  Cancel
                                </button>
                              )}
                              <button className="btn btn-ghost btn-sm" onClick={() => viewBoardingLogs(reservation)}>
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
            )
          }

          {selectedBoarding && (
            <div className="mt-4" style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
              <h3 className="font-semibold mb-2">Feeding/Care Logs for {selectedBoarding.pet_name}</h3>
              {boardingLogsLoading
                ? <div className="spinner" />
                : boardingLogs.length === 0
                ? <p className="text-sm text-muted">No feeding/care logs recorded yet.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Time</th><th>Food</th><th>Amount</th><th>Medication</th><th>Notes</th></tr></thead>
                      <tbody>
                        {boardingLogs.map(log => (
                          <tr key={log.feed_id}>
                            <td>{formatDate(log.feed_time)}</td>
                            <td>{log.food || '-'}</td>
                            <td>{log.amount || '-'}</td>
                            <td>{log.medication_note || '-'}</td>
                            <td>{log.notes || '-'}</td>
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

        {/* Upcoming Appointments */}
        <div className="card mb-4">
          <h2 className="section-title">Upcoming Appointments</h2>
          {upcoming.length === 0
            ? <p className="text-sm text-muted">No upcoming appointments.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Pet</th><th>Veterinarian</th><th>Branch</th><th>Date & Time</th><th>Reason</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {upcoming.map(a => (
                      <tr key={a.apptId}>
                        <td className="font-semibold">{a.petName}</td>
                        <td>{a.vetName}</td>
                        <td>{a.branchName}</td>
                        <td>{formatDate(a.startTime)}</td>
                        <td className="text-sm">{a.reason || '—'}</td>
                        <td>{statusBadge(a.status)}</td>
                        <td>
                          <button className="btn btn-danger btn-sm"
                            onClick={() => cancelAppt(a.apptId)}>Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* Completed Visit Summaries */}
        <div className="card mb-4">
          <h2 className="section-title">Completed Visit Summaries</h2>
          {summariesLoading
            ? <div className="spinner" />
            : summariesError
            ? <div className="alert alert-error">{summariesError}</div>
            : visitSummaries.length === 0
            ? <p className="text-sm text-muted">No completed visit summaries yet.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Reason</th>
                      <th>Veterinarian</th>
                      <th>Branch</th>
                      <th>Diagnosis</th>
                      <th>Severity</th>
                      <th>Treatment Notes</th>
                      <th>Follow-up</th>
                      <th>Invoice Total</th>
                      <th>Payment</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitSummaries.map(summary => {
                      const vetId = appts.find(a => a.apptId === summary.appt_id)?.vetId
                      const submittedRating = ratings[summary.visit_id]
                      const form = ratingForm[summary.visit_id] || { score: 0, comment: '' }
                      return (
                        <tr key={`${summary.appt_id}-${summary.visit_id}`}>
                          <td className="text-sm">{formatDate(summary.start_time)}</td>
                          <td className="text-sm">{summary.reason || '-'}</td>
                          <td className="text-sm">{summary.veterinarian}</td>
                          <td className="text-sm">{summary.branch}</td>
                          <td className="text-sm">{summary.diagnosis || 'No diagnosis recorded'}</td>
                          <td>{severityBadge(summary.severity)}</td>
                          <td className="text-sm">{summary.treatment_notes || '-'}</td>
                          <td className="text-sm">{summary.follow_up_required ? 'Yes' : 'No'}</td>
                          <td className="font-semibold">{formatMoney(summary.total_bill)}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                              {paymentBadge(summary.payment_status)}
                              {summary.payment_status === 'unpaid' && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={!!payingInvoice[summary.visit_id]}
                                  onClick={() => payInvoice(summary.visit_id)}>
                                  {payingInvoice[summary.visit_id] ? '...' : 'Pay Invoice'}
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            {submittedRating
                              ? (
                                <div>
                                  <span style={{ color: 'var(--green-600)', fontSize: '1rem', letterSpacing: 1 }}>
                                    {'★'.repeat(submittedRating.score)}{'☆'.repeat(5 - submittedRating.score)}
                                  </span>
                                  {submittedRating.comment && (
                                    <div className="text-sm text-muted" style={{ marginTop: 2 }}>
                                      {submittedRating.comment}
                                    </div>
                                  )}
                                </div>
                              )
                              : (
                                <div style={{ minWidth: 160 }}>
                                  <div style={{ display: 'flex', gap: 1, marginBottom: 4 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <button key={s}
                                        onClick={() => setRatingForm(prev => ({
                                          ...prev,
                                          [summary.visit_id]: { ...(prev[summary.visit_id] || { comment: '' }), score: s }
                                        }))}
                                        style={{
                                          background: 'none', border: 'none', cursor: 'pointer',
                                          fontSize: '1.25rem', padding: '0 1px', lineHeight: 1,
                                          color: s <= form.score ? 'var(--green-600)' : 'var(--gray-300)'
                                        }}>
                                        ★
                                      </button>
                                    ))}
                                  </div>
                                  <textarea
                                    rows={2}
                                    placeholder="Optional comment..."
                                    value={form.comment}
                                    onChange={e => setRatingForm(prev => ({
                                      ...prev,
                                      [summary.visit_id]: { ...(prev[summary.visit_id] || { score: 0 }), comment: e.target.value }
                                    }))}
                                    style={{
                                      width: '100%', fontSize: '0.75rem', resize: 'vertical',
                                      padding: '4px', borderRadius: 'var(--radius)',
                                      border: '1px solid var(--gray-200)', marginBottom: 4,
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  <button
                                    className="btn btn-primary btn-sm"
                                    disabled={!form.score || !!ratingSubmitting[summary.visit_id]}
                                    onClick={() => submitRating(summary.visit_id, vetId)}>
                                    {ratingSubmitting[summary.visit_id] ? '...' : 'Submit'}
                                  </button>
                                </div>
                              )
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* Past Visits */}
        {past.length > 0 && (
          <div className="card">
            <h2 className="section-title">Past Visits</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Pet</th><th>Veterinarian</th><th>Branch</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {past.slice(0, 10).map(a => (
                    <tr key={a.apptId}>
                      <td>{a.petName}</td>
                      <td>{a.vetName}</td>
                      <td>{a.branchName}</td>
                      <td>{formatDate(a.startTime)}</td>
                      <td>{statusBadge(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
