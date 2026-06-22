import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './pages/Landing.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import PatientDashboard from './pages/patient/Dashboard.tsx'
import DoctorDashboard from './pages/doctor/Dashboard.tsx'
import StaffDashboard from './pages/staff/Dashboard.tsx'
import AdminDashboard from './pages/admin/Dashboard.tsx'

const ProtectedRoute = ({ children, roles }: {
  children: React.ReactNode,
  roles: string[]
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  // Wait for auth state to load from localStorage before deciding
  if (isLoading) return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#1D9E75',
      fontFamily: 'Inter, sans-serif',
      fontSize: '1rem'
    }}>
      Loading...
    </div>
  )

  if (!isAuthenticated) return <Navigate to="/" />
  if (!roles.includes(user!.role)) return <Navigate to="/" />
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/patient/dashboard" element={
        <ProtectedRoute roles={['patient']}>
          <PatientDashboard />
        </ProtectedRoute>
      } />
      <Route path="/doctor/dashboard" element={
        <ProtectedRoute roles={['doctor']}>
          <DoctorDashboard />
        </ProtectedRoute>
      } />
      <Route path="/staff/dashboard" element={
        <ProtectedRoute roles={['nurse', 'pharmacist', 'lab_tech']}>
          <StaffDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/dashboard" element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App