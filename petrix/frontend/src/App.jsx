import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OwnerDashboard from './pages/OwnerDashboard'
import AppointmentBookingPage from './pages/AppointmentBookingPage'
import PetProfilePage from './pages/PetProfilePage'
import VetDashboardPage from './pages/VetDashboardPage'
import MembershipPage from './pages/MembershipPage'
import AddPetPage from './pages/AddPetPage'
import WasteLogPage from './pages/WasteLogPage'
import ReportsPage from './pages/ReportsPage'

function ProtectedRoute({ children, allowedRole }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Owner routes */}
        <Route path="/" element={
          <ProtectedRoute>
            {user?.role === 'VET'
              ? <Navigate to="/vet-dashboard" replace />
              : <OwnerDashboard />}
          </ProtectedRoute>
        } />
        <Route path="/book-appointment" element={
          <ProtectedRoute allowedRole="OWNER"><AppointmentBookingPage /></ProtectedRoute>
        } />
        <Route path="/pets/:petId" element={
          <ProtectedRoute><PetProfilePage /></ProtectedRoute>
        } />
        <Route path="/pets/add" element={
          <ProtectedRoute allowedRole="OWNER"><AddPetPage /></ProtectedRoute>
        } />
        <Route path="/membership" element={
          <ProtectedRoute allowedRole="OWNER"><MembershipPage /></ProtectedRoute>
        } />

        {/* Vet routes */}
        <Route path="/vet-dashboard" element={
          <ProtectedRoute allowedRole="VET"><VetDashboardPage /></ProtectedRoute>
        } />
        <Route path="/waste-log" element={
          <ProtectedRoute allowedRole="VET"><WasteLogPage /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRole="VET"><ReportsPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
