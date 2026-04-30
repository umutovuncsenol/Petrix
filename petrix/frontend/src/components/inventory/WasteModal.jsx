import { useState } from 'react'
import { expireMedication, logWaste } from '../../api/inventoryApi'

function getErrorMessage(err) {
  if (typeof err.response?.data === 'string') {
    return err.response.data
  }
  return err.response?.data?.error || err.message
}

export default function WasteModal({ item, token, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [action, setAction] = useState('expire')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (action === 'expire') {
        await expireMedication({
          branchId: item.branchId,
          medId: item.medId,
          quantityToRemove: Number(quantity),
          reason,
        }, token)
      } else {
        await logWaste({
          branchId: item.branchId,
          medId: item.medId,
          quantity: Number(quantity),
          reason,
        }, token)
      }

      setSuccess('✓ Done')
      setTimeout(onSuccess, 1000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inventory-modal-overlay">
      <div className="inventory-modal-card card">
        <button type="button" className="inventory-modal-close btn btn-ghost btn-sm" onClick={onClose}>
          ×
        </button>
        <h2 className="section-title">Expire or Waste Medication</h2>

        <form onSubmit={handleSubmit}>
          <label className="form-group">
            <span>Medication</span>
            <input type="text" value={item.name} disabled />
          </label>

          <label className="form-group">
            <span>Action</span>
            <select value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="expire">Mark as Expired/Damaged</option>
              <option value="waste">Log Waste Only</option>
            </select>
          </label>

          <label className="form-group">
            <span>Quantity</span>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>

          <label className="form-group">
            <span>Reason</span>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>

          {error && <p className="inventory-error">{error}</p>}
          {success && <p className="inventory-success">{success}</p>}

          <button type="submit" className="btn btn-danger" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
