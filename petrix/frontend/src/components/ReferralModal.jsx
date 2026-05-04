import { useEffect, useState } from 'react'
import { branchAPI, vetAPI, visitAPI } from '../services/api'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(31,41,55,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
  zIndex: 50,
}

const modalStyle = {
  width: '100%',
  maxWidth: '520px',
  maxHeight: '90vh',
  overflowY: 'auto',
}

export default function ReferralModal({ visitId, onClose, onSuccess }) {
  const [branches, setBranches] = useState([])
  const [vets, setVets] = useState([])
  const [targetBranchId, setTargetBranchId] = useState('')
  const [targetVetId, setTargetVetId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    branchAPI.getAll()
      .then(res => setBranches(res.data))
      .catch(() => setError('Failed to load branches.'))
  }, [])

  useEffect(() => {
    setTargetVetId('')
    setVets([])

    if (!targetBranchId) return

    vetAPI.search({ branchId: targetBranchId })
      .then(res => setVets(res.data))
      .catch(() => setError('Failed to load veterinarians.'))
  }, [targetBranchId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!targetBranchId || !targetVetId) {
      setError('Please select a branch and veterinarian.')
      return
    }

    setLoading(true)
    try {
      await visitAPI.refer(visitId, {
        targetVetId: parseInt(targetVetId),
        targetBranchId: parseInt(targetBranchId),
        reason,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create referral.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div className="card" style={modalStyle}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title" style={{ margin: 0 }}>Create Referral</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>X</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Branch</label>
            <select value={targetBranchId} onChange={e => setTargetBranchId(e.target.value)} required>
              <option value="">Select branch...</option>
              {branches.map(branch => (
                <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Veterinarian</label>
            <select
              value={targetVetId}
              onChange={e => setTargetVetId(e.target.value)}
              disabled={!targetBranchId}
              required
            >
              <option value="">{targetBranchId ? 'Select veterinarian...' : 'Select a branch first'}</option>
              {vets.map(vet => (
                <option key={vet.vetId} value={vet.vetId}>
                  {[vet.fullName, vet.specialization].filter(Boolean).join(' - ')}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Reason</label>
            <textarea
              placeholder="Reason for referral..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
