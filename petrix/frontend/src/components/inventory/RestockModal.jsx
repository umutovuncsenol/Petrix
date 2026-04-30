import { useState } from 'react'
import { restockMedication } from '../../api/inventoryApi'

function getErrorMessage(err) {
  if (typeof err.response?.data === 'string') {
    return err.response.data
  }
  return err.response?.data?.error || err.message
}

export default function RestockModal({ item, token, onClose, onSuccess }) {
  const [quantityToAdd, setQuantityToAdd] = useState(1)
  const [expiryDate, setExpiryDate] = useState('')
  const [reorderLevel, setReorderLevel] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      await restockMedication({
        branchId: item.branchId,
        medId: item.medId,
        quantityToAdd: Number(quantityToAdd),
        expiryDate: expiryDate || null,
        reorderLevel: reorderLevel === '' ? null : Number(reorderLevel),
      }, token)
      setSuccess('✓ Restocked successfully')
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
        <h2 className="section-title">Restock Medication</h2>

        <form onSubmit={handleSubmit}>
          <label className="form-group">
            <span>Medication</span>
            <input type="text" value={item.name} disabled />
          </label>

          <label className="form-group">
            <span>Quantity to Add</span>
            <input
              type="number"
              min="1"
              value={quantityToAdd}
              onChange={(event) => setQuantityToAdd(event.target.value)}
              required
            />
          </label>

          <label className="form-group">
            <span>New Expiry Date</span>
            <input
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
            />
          </label>

          <label className="form-group">
            <span>Reorder Level</span>
            <input
              type="number"
              min="0"
              value={reorderLevel}
              onChange={(event) => setReorderLevel(event.target.value)}
            />
          </label>

          {error && <p className="inventory-error">{error}</p>}
          {success && <p className="inventory-success">{success}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Restock'}
          </button>
        </form>
      </div>
    </div>
  )
}
