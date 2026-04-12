import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { petAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Fish', 'Reptile', 'Other']

export default function AddPetPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [form, setForm] = useState({ name: '', species: '', breed: '', birthDate: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await petAPI.create({
        ownerId:   user.userId,
        name:      form.name,
        species:   form.species,
        breed:     form.breed,
        birthDate: form.birthDate || null,
      })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add pet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '500px' }}>
        <h1 className="text-2xl font-bold mb-4">Add a New Pet</h1>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Pet Name</label>
              <input placeholder="e.g. Pamuk" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Species</label>
              <select value={form.species} onChange={e => set('species', e.target.value)} required>
                <option value="">Select species</option>
                {SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Breed <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
              <input placeholder="e.g. Golden Retriever" value={form.breed} onChange={e => set('breed', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Date of Birth <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
              <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} />
            </div>
            <div className="flex gap-3 mt-2">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Add Pet'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
