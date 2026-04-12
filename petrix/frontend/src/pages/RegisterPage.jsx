import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    fullName: '', username: '', email: '', password: '', confirmPassword: '', phone: ''
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { data } = await authAPI.register({
        fullName: form.fullName,
        username: form.username,
        email:    form.email,
        password: form.password,
        phone:    form.phone,
      })
      login(data)
      navigate('/')
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
          <p className="text-sm text-muted mt-1">Pet Owner registration</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>First name</label>
              <input placeholder="Jane" value={form.fullName.split(' ')[0] || ''}
                onChange={e => set('fullName', e.target.value + ' ' + (form.fullName.split(' ')[1] || ''))}
                required />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input placeholder="Doe" value={form.fullName.split(' ').slice(1).join(' ')}
                onChange={e => set('fullName', (form.fullName.split(' ')[0] || '') + ' ' + e.target.value)}
                required />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="jane@email.com" value={form.email}
              onChange={e => set('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input placeholder="janedoe" value={form.username}
              onChange={e => set('username', e.target.value)} required />
          </div>

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

          <div className="form-group">
            <label>Phone <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
            <input placeholder="+90 5xx xxx xx xx" value={form.phone}
              onChange={e => set('phone', e.target.value)} />
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
