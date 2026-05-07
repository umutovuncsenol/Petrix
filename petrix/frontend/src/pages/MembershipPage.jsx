import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { membershipAPI } from '../services/api'

function enrollBadge(s) {
  const map = { active: 'badge-green', cancelled: 'badge-red', expired: 'badge-gray' }
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>
}

export default function MembershipPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [enrollingPlanId, setEnrollingPlanId] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function refreshEnrollments() {
    const e = await membershipAPI.getByOwner(user.userId)
    setEnrollments(e.data)
  }

  useEffect(() => {
    Promise.all([
      membershipAPI.getPlans(),
      membershipAPI.getByOwner(user.userId),
    ]).then(([p, e]) => {
      setPlans(p.data)
      setEnrollments(e.data)
    }).finally(() => setLoading(false))
  }, [user])

  const visibleEnrollments = enrollments
    .filter(e => e.status === 'active')
    .sort((a, b) => parseFloat(b.monthly_fee || 0) - parseFloat(a.monthly_fee || 0))
  const activePlan = visibleEnrollments[0]
  const activeFee = parseFloat(activePlan?.monthly_fee || 0)

  async function enroll(planId) {
    setMsg('')
    setError('')
    setEnrollingPlanId(planId)
    try {
      await membershipAPI.enroll({ ownerId: user.userId, planId })
      await refreshEnrollments()
      setMsg('Successfully enrolled! Consultation discounts will be applied to new invoices.')
    } catch (err) {
      setError(err.response?.data?.error || 'Enrollment failed.')
    } finally {
      setEnrollingPlanId(null)
    }
  }

  async function cancel() {
    if (!activePlan || !confirm('Cancel your current plan?')) return
    setMsg('')
    setError('')
    setCancelling(true)
    try {
      await membershipAPI.cancel({ ownerId: user.userId, planId: activePlan.plan_id })
      await refreshEnrollments()
      setMsg('Membership cancelled.')
    } catch (err) {
      setError(err.response?.data?.error || 'Cancellation failed.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <div className="page"><div className="container"><div className="spinner" /></div></div>

  return (
    <div className="page">
      <div className="container">
        <h1 className="text-2xl font-bold mb-1">Membership Plans</h1>
        <p className="text-sm text-muted mb-4">Manage your subscription</p>

        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {activePlan && (
          <div className="card mb-4" style={{ borderLeft: '4px solid var(--green-600)' }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="badge badge-green text-sm">Current plan: {activePlan.plan_name}</span>
                <p className="text-sm text-muted mt-1">
                  Active since {new Date(activePlan.start_date).toLocaleDateString()}
                </p>
              </div>
              <button className="btn btn-danger btn-sm" onClick={cancel} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        <div className="grid-3 mb-4">
          {plans.map(plan => {
            const isCurrent = activePlan?.plan_id === plan.planId
            const isLowerOrEqual = activePlan && parseFloat(plan.monthlyFee || 0) <= activeFee
            const isEnrolling = enrollingPlanId === plan.planId
            const perks = plan.perksDescription
              ?.split(/\u2022|\u00e2\u20ac\u00a2|\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a2/)
              .filter(Boolean)
              .map(s => s.trim()) || []

            return (
              <div
                key={plan.planId}
                className="card"
                style={{
                  border: isCurrent ? '2px solid var(--green-600)' : '1.5px solid var(--gray-200)',
                  position: 'relative',
                }}>
                {isCurrent && (
                  <div className="badge badge-green text-xs" style={{ marginBottom: '.5rem' }}>Current plan</div>
                )}
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <div className="text-2xl font-bold" style={{ color: 'var(--green-600)', margin: '.25rem 0' }}>
                  TL {plan.monthlyFee}<span className="text-sm font-bold text-muted"> / month</span>
                </div>
                <ul style={{ listStyle: 'none', margin: '1rem 0', padding: 0 }}>
                  {perks.map((p, i) => (
                    <li key={i} className="text-sm flex items-center gap-2" style={{ marginBottom: '.4rem' }}>
                      <span style={{ color: 'var(--green-600)', fontWeight: 700 }}>-</span> {p}
                    </li>
                  ))}
                </ul>
                {isCurrent && <button className="btn btn-outline btn-full" disabled>Current plan</button>}
                {!isCurrent && isLowerOrEqual && (
                  <button className="btn btn-outline btn-full" disabled>Not available</button>
                )}
                {!isCurrent && !isLowerOrEqual && (
                  <button className="btn btn-primary btn-full" onClick={() => enroll(plan.planId)} disabled={isEnrolling}>
                    {isEnrolling ? 'Enrolling...' : 'Enroll'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {visibleEnrollments.length > 0 && (
          <div className="card">
            <h2 className="section-title">Active Membership</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Plan</th><th>Start Date</th><th>End Date</th><th>Status</th></tr></thead>
                <tbody>
                  {visibleEnrollments.map((e, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{e.plan_name}</td>
                      <td>{new Date(e.start_date).toLocaleDateString()}</td>
                      <td>{e.end_date ? new Date(e.end_date).toLocaleDateString() : '-'}</td>
                      <td>{enrollBadge(e.status)}</td>
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
