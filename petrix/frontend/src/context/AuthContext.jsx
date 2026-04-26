import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vc_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback((userData) => {
    const normalizedRole = userData?.role || userData?.roles?.[0] || null
    const normalizedUser = normalizedRole
      ? { ...userData, role: normalizedRole }
      : userData

    localStorage.setItem('vc_user', JSON.stringify(normalizedUser))
    localStorage.setItem('vc_token', userData.token)
    setUser(normalizedUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('vc_user')
    localStorage.removeItem('vc_token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
