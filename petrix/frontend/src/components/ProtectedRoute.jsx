import { Navigate } from 'react-router-dom'

function getStoredUser() {
  try {
    const raw = localStorage.getItem('vc_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function ProtectedRoute({ children, allowedRoles = [], redirectTo = '/' }) {
  const user = getStoredUser()
  const roleFromUser = user?.role || user?.roles?.[0]
  const currentRole = roleFromUser

  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return <Navigate to={redirectTo} replace />
  }

  return children
}
