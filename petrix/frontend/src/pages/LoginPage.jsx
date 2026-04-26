import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await authAPI.login({
        username: form.username.trim(),
        password: form.password
      })
      login(data)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        <div className="text-center mb-4">
          <div className="avatar" style={{ margin: '0 auto .75rem', width: '3rem', height: '3rem', fontSize: '1.1rem' }}>VC</div>
          <h1 className="text-xl font-bold">Sign In</h1>
          <p className="text-sm text-muted mt-1">Use your account credentials</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-center mt-3" style={{ color: 'var(--gray-600)' }}>
          Need an account?{' '}
          <Link to="/register" style={{ color: 'var(--green-600)', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  )
}
