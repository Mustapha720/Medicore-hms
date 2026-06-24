import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { connectSocket } from '../socket'

const roleOptions: Record<string, string[]> = {
    patient: ['patient'],
    doctor: ['doctor'],
    staff: ['nurse', 'pharmacist', 'lab_tech'],
    admin: ['admin']
}

const roleAccent: Record<string, string> = {
    patient: '#1D9E75', doctor: '#7F77DD', staff: '#D85A30', admin: '#e11d48'
}

const validateEmail = (email: string): string => {
    if (!email) return 'Email is required'
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(email)) return 'Please enter a valid email address'
    // Common valid domains check (not exhaustive but catches obvious typos)
    const domain = email.split('@')[1]?.toLowerCase()
    const suspiciousDomains = ['hms.com', 'hospital.com', 'test.com', 'example.com', 'fake.com']
    if (suspiciousDomains.includes(domain)) return 'Please use a real working email address'
    return ''
}

const validatePassword = (password: string): string => {
    if (!password) return 'Password is required'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    return ''
}

const validateName = (name: string): string => {
    if (!name.trim()) return 'Full name is required'
    if (name.trim().length < 2) return 'Name must be at least 2 characters'
    if (!/^[a-zA-Z\s'-]+$/.test(name)) return 'Name can only contain letters, spaces, hyphens, and apostrophes'
    return ''
}

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: '' })
    const [errors, setErrors] = useState({ name: '', email: '', password: '', role: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const portalRole = searchParams.get('role') || 'patient'
    const availableRoles = roleOptions[portalRole] || ['patient']
    const accent = roleAccent[portalRole] || '#1D9E75'

    const validateField = (field: string, value: string): string => {
        if (field === 'name') return validateName(value)
        if (field === 'email') return validateEmail(value)
        if (field === 'password') return validatePassword(value)
        if (field === 'role' && availableRoles.length > 1 && !value) return 'Please select your role'
        return ''
    }

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
        // Clear error on change, validate on blur
        if (errors[field as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const handleBlur = (field: string, value: string) => {
        const err = validateField(field, value)
        setErrors(prev => ({ ...prev, [field]: err }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Validate all fields
        const nameErr = validateName(form.name)
        const emailErr = validateEmail(form.email)
        const passwordErr = validatePassword(form.password)
        const roleErr = availableRoles.length > 1 && !form.role ? 'Please select your role' : ''

        setErrors({ name: nameErr, email: emailErr, password: passwordErr, role: roleErr })

        if (nameErr || emailErr || passwordErr || roleErr) return

        setLoading(true)
        try {
            const role = form.role || availableRoles[0]
            const res = await api.post('/auth/register', { ...form, role })
            const { token, user } = res.data
            login(token, user)
            connectSocket(token)
            if (user.role === 'patient') navigate('/patient/dashboard')
            else if (user.role === 'doctor') navigate('/doctor/dashboard')
            else if (user.role === 'admin') navigate('/admin/dashboard')
            else navigate('/staff/dashboard')
        } catch (err: any) {
            const msg = err?.response?.data?.error || err?.response?.data?.message || ''
            if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
                setError('An account with this email already exists. Please sign in instead.')
            } else {
                setError('Registration failed. Please check your details and try again.')
            }
        } finally { setLoading(false) }
    }

    // Password strength indicator
    const getPasswordStrength = (password: string) => {
        if (!password) return { strength: 0, label: '', color: '' }
        let score = 0
        if (password.length >= 8) score++
        if (password.length >= 12) score++
        if (/[A-Z]/.test(password)) score++
        if (/[a-z]/.test(password)) score++
        if (/[0-9]/.test(password)) score++
        if (/[^A-Za-z0-9]/.test(password)) score++

        if (score <= 2) return { strength: score, label: 'Weak', color: '#ef4444' }
        if (score <= 4) return { strength: score, label: 'Fair', color: '#f59e0b' }
        return { strength: score, label: 'Strong', color: '#10b981' }
    }

    const passwordStrength = getPasswordStrength(form.password)

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
        fontSize: '0.75rem', color: '#f87171', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem'
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
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, padding: '0.35rem 1rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize' }}>
                            {portalRole} Portal
                        </div>
                    </div>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem', textAlign: 'center' }}>
                        Create account
                    </h2>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', marginBottom: '2rem' }}>
                        Join MediCore HMS today
                    </p>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Full Name */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Full Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => handleChange('name', e.target.value)}
                                onBlur={e => handleBlur('name', e.target.value)}
                                placeholder="John Doe"
                                style={inputStyle(!!errors.name)}
                            />
                            {errors.name && <div style={errorStyle}>⚠ {errors.name}</div>}
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => handleChange('email', e.target.value)}
                                onBlur={e => handleBlur('email', e.target.value)}
                                placeholder="you@gmail.com"
                                style={inputStyle(!!errors.email)}
                            />
                            {errors.email && <div style={errorStyle}>⚠ {errors.email}</div>}
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => handleChange('password', e.target.value)}
                                    onBlur={e => handleBlur('password', e.target.value)}
                                    placeholder="Min. 8 chars, uppercase, number"
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

                            {/* Password strength bar */}
                            {form.password && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.25rem' }}>
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} style={{
                                                flex: 1, height: 3, borderRadius: 2,
                                                background: i <= passwordStrength.strength ? passwordStrength.color : 'rgba(255,255,255,0.1)',
                                                transition: 'background 0.2s'
                                            }} />
                                        ))}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: passwordStrength.color }}>
                                        {passwordStrength.label} password
                                    </div>
                                </div>
                            )}

                            {errors.password && <div style={errorStyle}>⚠ {errors.password}</div>}

                            {/* Password requirements hint */}
                            {!errors.password && form.password && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#6b7280' }}>
                                    {[
                                        { label: '8+ characters', met: form.password.length >= 8 },
                                        { label: 'Uppercase letter', met: /[A-Z]/.test(form.password) },
                                        { label: 'Lowercase letter', met: /[a-z]/.test(form.password) },
                                        { label: 'Number', met: /[0-9]/.test(form.password) },
                                    ].map(req => (
                                        <span key={req.label} style={{ marginRight: '0.75rem', color: req.met ? '#10b981' : '#6b7280' }}>
                                            {req.met ? '✓' : '○'} {req.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Role selector (staff portal only) */}
                        {availableRoles.length > 1 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>Role</label>
                                <select
                                    value={form.role}
                                    onChange={e => handleChange('role', e.target.value)}
                                    onBlur={e => handleBlur('role', e.target.value)}
                                    style={{ ...inputStyle(!!errors.role), cursor: 'pointer' }}
                                >
                                    <option value="">Select your role</option>
                                    {availableRoles.map(r => (
                                        <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                    ))}
                                </select>
                                {errors.role && <div style={errorStyle}>⚠ {errors.role}</div>}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', padding: '0.8rem', background: loading ? `${accent}60` : accent, border: 'none', borderRadius: 10, color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.75rem', transition: 'all 0.2s' }}
                        >
                            {loading ? 'Creating account...' : 'Create Account →'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                        Already have an account?{' '}
                        <Link to={`/login?role=${portalRole}`} style={{ color: accent, fontWeight: 600, textDecoration: 'none' }}>
                            Sign In
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

export default Register