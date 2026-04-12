import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { petAPI, appointmentAPI } from '../services/api'

function statusBadge(status) {
  const map = { scheduled: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function OwnerDashboard() {
  const { user } = useAuth()
  const [pets, setPets]   = useState([])
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      petAPI.getByOwner(user.userId),
      appointmentAPI.getByOwner(user.userId),
    ]).then(([pRes, aRes]) => {
      setPets(pRes.data)
      setAppts(aRes.data)
    }).finally(() => setLoading(false))
  }, [user])

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
          <Link to="/book-appointment" className="btn btn-primary">+ Book Appointment</Link>
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
