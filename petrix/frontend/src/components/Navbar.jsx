import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const canViewInventory = user?.role === 'CLINIC_MANAGER'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'VC'

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid var(--gray-200)',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow)',
    }}>
      <div className="container flex items-center justify-between w-full">
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <div className="avatar" style={{ width: '2.1rem', height: '2.1rem', fontSize: '.85rem' }}>VC</div>
          <span className="font-bold" style={{ fontSize: '1.05rem' }}>VetClinic</span>
        </Link>

        {/* Nav links */}
        {user && (
          <div className="flex items-center gap-4">
            {user.role === 'OWNER' && (
              <>
                <Link to="/" className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Dashboard</Link>
                <Link to="/dashboard" className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>My Pets</Link>
                <Link to="/book-appointment" className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Book Appointment</Link>
                <Link to="/owner/boarding" className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Pet Hotel</Link>
                <Link to="/membership" className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Membership</Link>
              </>
            )}
            {user.role === 'VET' && (
              <>
                <Link to="/vet-dashboard" className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Dashboard</Link>
                <Link to="/waste-log"     className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Waste Log</Link>
              </>
            )}
            {user.role === 'CLINIC_MANAGER' && (
              <>
                <Link to="/manager-dashboard"    className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Manager Dashboard</Link>
                <Link to="/inventory"            className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Inventory</Link>
                <Link to="/reports"              className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Reports</Link>
                <Link to="/waste-log"            className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Waste Log</Link>
                <Link to="/vaccination-reports"  className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Vaccination Reports</Link>
              </>
            )}
            {user.role === 'ADMIN' && (
              <Link to="/admin-dashboard" className="text-sm font-semibold" style={{ color: 'var(--gray-600)' }}>Admin Dashboard</Link>
            )}
          </div>
        )}

        {/* User section */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <div className="avatar avatar-sm">{initials}</div>
                <span className="text-sm font-semibold">{user.fullName}</span>
                <span className="badge badge-green text-xs">{user.role}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
