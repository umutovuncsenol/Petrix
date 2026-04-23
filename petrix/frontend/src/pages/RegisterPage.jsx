import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI, branchAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const [role, setRole] = useState('OWNER')
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '', confirmPassword: '', phone: '',
    branchId: '', specialization: '', speciesExpertise: '',
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (role === 'VET') branchAPI.getAll().then(r => setBranches(r.data))
  }, [role])

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      let data
      if (role === 'OWNER') {
        ({ data } = await authAPI.register({
          fullName: form.fullName, username: form.username,
          email: form.email, password: form.password, phone: form.phone,
        }))
      } else {
        ({ data } = await authAPI.registerVet({
          fullName: form.fullName, username: form.username,
          password: form.password, branchId: parseInt(form.branchId),
          specialization: form.specialization, speciesExpertise: form.speciesExpertise,
        }))
      }
      login(data)
      navigate(role === 'VET' ? '/vet-dashboard' : '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <div className="text-center mb-4">
          <div className="avatar" style={{ margin: '0 auto .75rem', width: '3rem', height: '3rem', fontSize: '1.1rem' }}>VC</div>
          <h1 className="text-xl font-bold">Create account</h1>
        </div>

        {/* Role toggle */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem' }}>
          {['OWNER', 'VET'].map(r => (
            <button key={r} type="button"
              onClick={() => setRole(r)}
              className={`btn btn-sm ${role === r ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}>
              {r === 'OWNER' ? 'Pet Owner' : 'Veterinarian'}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>First name</label>
              <input placeholder="Jane"
                value={form.fullName.split(' ')[0] || ''}
                onChange={e => set('fullName', e.target.value + ' ' + (form.fullName.split(' ').slice(1).join(' ')))}
                required />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input placeholder="Doe"
                value={form.fullName.split(' ').slice(1).join(' ')}
                onChange={e => set('fullName', (form.fullName.split(' ')[0] || '') + ' ' + e.target.value)}
                required />
            </div>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input placeholder="janedoe" value={form.username}
              onChange={e => set('username', e.target.value)} required />
          </div>

          {role === 'OWNER' && (
            <>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="jane@email.com" value={form.email}
                  onChange={e => set('email', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Phone <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
                <input placeholder="+90 5xx xxx xx xx" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
            </>
          )}

          {role === 'VET' && (
            <>
              <div className="form-group">
                <label>Branch</label>
                <select value={form.branchId} onChange={e => set('branchId', e.target.value)} required>
                  <option value="">Select branch…</option>
                  {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Specialization</label>
                  <input placeholder="e.g. Surgery" value={form.specialization}
                    onChange={e => set('specialization', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Species Expertise</label>
                  <input placeholder="e.g. Dog, Cat" value={form.speciesExpertise}
                    onChange={e => set('speciesExpertise', e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => set('password', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Confirm password</label>
              <input type="password" placeholder="••••••••" value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-center mt-3" style={{ color: 'var(--gray-600)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--green-600)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
