import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { connectSocket } from '../socket'

const roleAccent: Record<string, string> = {
  patient: '#1D9E75', doctor: '#7F77DD', staff: '#D85A30', admin: '#e11d48'
}

const validateEmail = (email: string): string => {
  if (!email.trim()) return 'Email is required'
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return ''
}

const validatePassword = (password: string): string => {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Password must be at least 6 characters'
  return ''
}

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') || 'patient'
  const accent = roleAccent[role] || '#1D9E75'

  const handleBlur = (field: 'email' | 'password', value: string) => {
    if (field === 'email') setErrors(prev => ({ ...prev, email: validateEmail(value) }))
    if (field === 'password') setErrors(prev => ({ ...prev, password: validatePassword(value) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const emailErr = validateEmail(email)
    const passwordErr = validatePassword(password)
    setErrors({ email: emailErr, password: passwordErr })
    if (emailErr || passwordErr) return

    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const { token, user } = res.data

      const portalRoleMap: Record<string, string[]> = {
        patient: ['patient'],
        doctor: ['doctor'],
        staff: ['nurse', 'pharmacist', 'lab_tech'],
        admin: ['admin']
      }

      const allowedRoles = portalRoleMap[role] || ['patient']
      if (!allowedRoles.includes(user.role)) {
        setError(`This is the ${role} portal. Please use the correct portal for your role.`)
        setLoading(false)
        return
      }

      login(token, user)
      connectSocket(token)
      if (user.role === 'patient') navigate('/patient/dashboard')
      else if (user.role === 'doctor') navigate('/doctor/dashboard')
      else if (user.role === 'admin') navigate('/admin/dashboard')
      else navigate('/staff/dashboard')
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 400) {
        setError('Incorrect email or password. Please try again.')
      } else if (status === 404) {
        setError('No account found with this email. Please register first.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally { setLoading(false) }
  }

  const inputStyle = (hasError: boolean) => ({
    width: '100%', padding: '0.75rem 1rem',
    background: '#0d1117',
    border: `1px solid ${hasError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 10, color: 'white', fontSize: '0.9rem',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
    transition: 'border-color 0.2s'
  })

  const labelStyle = {
    display: 'block' as const, fontSize: '0.78rem', fontWeight: 500,
    color: '#9ca3af', marginBottom: '0.5rem',
    textTransform: 'uppercase' as const, letterSpacing: '0.5px'
  }

  const errorStyle = {
    fontSize: '0.75rem', color: '#f87171',
    marginTop: '0.35rem',
    display: 'flex', alignItems: 'center', gap: '0.25rem'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter','Segoe UI',sans-serif", padding: '1rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 36, height: 36, background: accent, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, color: 'white' }}>+</div>
          <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'white' }}>MediCore HMS</span>
        </div>

        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2.5rem' }}>
          {/* Portal badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, padding: '0.35rem 1rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>
              {role} Portal
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem', textAlign: 'center' }}>
            Welcome back
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', marginBottom: '2rem' }}>
            Sign in to your account
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })) }}
                onBlur={e => handleBlur('email', e.target.value)}
                required
                placeholder="you@example.com"
                style={inputStyle(!!errors.email)}
              />
              {errors.email && <div style={errorStyle}>⚠ {errors.email}</div>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: '' })) }}
                  onBlur={e => handleBlur('password', e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ ...inputStyle(!!errors.password), paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem', padding: 0 }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <div style={errorStyle}>⚠ {errors.password}</div>}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '0.8rem', background: loading ? `${accent}60` : accent, border: 'none', borderRadius: 10, color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
            Don't have an account?{' '}
            <Link to={`/register?role=${role}`} style={{ color: accent, fontWeight: 600, textDecoration: 'none' }}>
              Register
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: '#4b5563', fontSize: '0.82rem', textDecoration: 'none' }}>
            ← Back to portal selection
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login