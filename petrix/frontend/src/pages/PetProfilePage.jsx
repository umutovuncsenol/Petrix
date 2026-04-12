import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { petAPI } from '../services/api'

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

const TABS = ['Medical History', 'Vaccinations', 'Allergies']

export default function PetProfilePage() {
  const { petId } = useParams()
  const navigate  = useNavigate()
  const [pet,       setPet]       = useState(null)
  const [timeline,  setTimeline]  = useState([])
  const [vaccins,   setVaccins]   = useState([])
  const [allergies, setAllergies] = useState([])
  const [tab,       setTab]       = useState(0)
  const [loading,   setLoading]   = useState(true)

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

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>
  if (!pet) return <div className="page"><div className="container"><p>Pet not found.</p></div></div>

  const age = pet.birthDate
    ? Math.floor((Date.now() - new Date(pet.birthDate)) / (365.25 * 86400000))
    : null

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
            <h2 className="section-title">Vaccination Records</h2>
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
