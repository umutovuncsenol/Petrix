import { useState } from 'react'
import { addMedication } from '../../api/inventoryApi'

function getErrorMessage(err) {
  if (typeof err.response?.data === 'string') return err.response.data
  return err.response?.data?.error || err.message
}

export default function AddMedicationModal({ token, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [form, setForm] = useState('')
  const [unit, setUnit] = useState('')
  const [description, setDescription] = useState('')
  const [isVaccine, setIsVaccine] = useState(false)
  const [targetSpecies, setTargetSpecies] = useState('')
  const [frequencyMonths, setFrequencyMonths] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (isVaccine && (!targetSpecies.trim() || !frequencyMonths)) {
      setError('Target species and frequency months are required for vaccines.')
      return
    }

    setLoading(true)
    try {
      await addMedication({
        name: name.trim(),
        form: form.trim() || null,
        unit: unit.trim() || null,
        description: description.trim() || null,
        isVaccine,
        targetSpecies: isVaccine ? targetSpecies.trim() : null,
        frequencyMonths: isVaccine ? Number(frequencyMonths) : null,
      }, token)
      onSuccess()
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
        <h2 className="section-title">Add Medication / Vaccine</h2>

        <form onSubmit={handleSubmit}>
          <label className="form-group">
            <span>Name <span style={{ color: 'red' }}>*</span></span>
            <input
              type="text"
              maxLength="150"
              placeholder="e.g. Amoxicillin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label className="form-group">
            <span>Form</span>
            <input
              type="text"
              maxLength="50"
              placeholder="e.g. tablet, injection, liquid"
              value={form}
              onChange={(e) => setForm(e.target.value)}
            />
          </label>

          <label className="form-group">
            <span>Unit</span>
            <input
              type="text"
              maxLength="20"
              placeholder="e.g. mg, ml, IU"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </label>

          <label className="form-group">
            <span>Description</span>
            <textarea
              rows={2}
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </label>

          <label className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={isVaccine}
              onChange={(e) => setIsVaccine(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <span>This is a vaccine</span>
          </label>

          {isVaccine && (
            <>
              <label className="form-group">
                <span>Target Species <span style={{ color: 'red' }}>*</span></span>
                <input
                  type="text"
                  maxLength="200"
                  placeholder="e.g. Dog, Cat, Dog, Cat"
                  value={targetSpecies}
                  onChange={(e) => setTargetSpecies(e.target.value)}
                  required={isVaccine}
                />
              </label>

              <label className="form-group">
                <span>Booster Frequency (months) <span style={{ color: 'red' }}>*</span></span>
                <input
                  type="number"
                  min="1"
                  max="120"
                  placeholder="e.g. 12"
                  value={frequencyMonths}
                  onChange={(e) => setFrequencyMonths(e.target.value)}
                  required={isVaccine}
                />
              </label>
            </>
          )}

          {error && <p className="inventory-error">{error}</p>}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Add Medication'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
