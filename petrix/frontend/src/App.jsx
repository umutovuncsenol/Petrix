import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
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
import ManagerDashboardPage from './pages/ManagerDashboardPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import InventoryPage from './pages/InventoryPage'
import VaccinationReportsPage from './pages/VaccinationReportsPage'
import BoardingPage from './pages/BoardingPage'
import OwnerBoardingPage from './pages/OwnerBoardingPage'

function AppRoutes() {
  const { user } = useAuth()
  const currentRole = user?.role || user?.roles?.[0]
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Owner routes */}
        <Route path="/" element={
          <ProtectedRoute>
            {currentRole === 'VET' && <Navigate to="/vet-dashboard" replace />}
            {currentRole === 'ADMIN' && <Navigate to="/admin-dashboard" replace />}
            {currentRole === 'CLINIC_MANAGER' && <Navigate to="/manager-dashboard" replace />}
            {!['VET', 'ADMIN', 'CLINIC_MANAGER'].includes(currentRole) && <OwnerDashboard />}
          </ProtectedRoute>
        } />
        <Route path="/book-appointment" element={
          <ProtectedRoute allowedRoles={['OWNER']}><AppointmentBookingPage /></ProtectedRoute>
        } />
        <Route path="/pets/:petId" element={
          <ProtectedRoute><PetProfilePage /></ProtectedRoute>
        } />
        <Route path="/pets/add" element={
          <ProtectedRoute allowedRoles={['OWNER']}><AddPetPage /></ProtectedRoute>
        } />
        <Route path="/membership" element={
          <ProtectedRoute allowedRoles={['OWNER']}><MembershipPage /></ProtectedRoute>
        } />
        <Route path="/owner/boarding" element={
          <ProtectedRoute allowedRoles={['OWNER']}><OwnerBoardingPage /></ProtectedRoute>
        } />

        {/* Vet routes */}
        <Route path="/vet-dashboard" element={
          <ProtectedRoute allowedRoles={['VET']}><VetDashboardPage /></ProtectedRoute>
        } />
        <Route path="/waste-log" element={
          <ProtectedRoute allowedRoles={['CLINIC_MANAGER']}><WasteLogPage /></ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['CLINIC_MANAGER']}><ReportsPage /></ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute allowedRoles={['CLINIC_MANAGER']}><InventoryPage /></ProtectedRoute>
        } />
        <Route path="/boarding" element={
          <ProtectedRoute allowedRoles={['CLINIC_MANAGER', 'ADMIN']}><BoardingPage /></ProtectedRoute>
        } />

        {/* Vaccination reports */}
        <Route path="/vaccination-reports" element={
          <ProtectedRoute allowedRoles={['VET', 'CLINIC_MANAGER', 'ADMIN']}>
            <VaccinationReportsPage />
          </ProtectedRoute>
        } />

        {/* Role-based admin/manager routes */}
        <Route path="/manager-dashboard" element={
          <ProtectedRoute allowedRoles={['CLINIC_MANAGER']}><ManagerDashboardPage /></ProtectedRoute>
        } />
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>
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
