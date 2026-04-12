import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate   = useNavigate()
  const { login }  = useAuth()
  const [form, setForm]   = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authAPI.login(form)
      login(data)
      navigate(data.role === 'VET' ? '/vet-dashboard' : '/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="avatar" style={{ margin: '0 auto .75rem', width: '3rem', height: '3rem', fontSize: '1.1rem' }}>VC</div>
          <h1 className="text-xl font-bold">Sign in</h1>
          <p className="text-sm text-muted mt-1">Veterinary Clinic System</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username or Email</label>
            <input
              type="text"
              placeholder="e.g. johndoe or john@email.com"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-center mt-3" style={{ color: 'var(--gray-600)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--green-600)', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  )
}
