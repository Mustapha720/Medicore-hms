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
    patient: '#1D9E75', doctor: '#7F77DD', staff: '#D85A30'
}

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', role: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const portalRole = searchParams.get('role') || 'patient'
    const availableRoles = roleOptions[portalRole] || ['patient']
    const accent = roleAccent[portalRole] || '#1D9E75'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
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
        } catch {
            setError('Registration failed. Email may already be in use.')
        } finally { setLoading(false) }
    }

    const inputStyle = {
        width: '100%', padding: '0.75rem 1rem',
        background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, color: 'white', fontSize: '0.9rem',
        outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit'
    }

    const labelStyle = {
        display: 'block' as const, fontSize: '0.78rem', fontWeight: 500,
        color: '#9ca3af', marginBottom: '0.5rem',
        textTransform: 'uppercase' as const, letterSpacing: '0.5px'
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

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Full Name</label>
                            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" style={inputStyle} />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Email</label>
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="you@example.com" style={inputStyle} />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Password</label>
                            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Min. 6 characters" style={inputStyle} />
                        </div>

                        {availableRoles.length > 1 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={labelStyle}>Role</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} required style={{ ...inputStyle, cursor: 'pointer' }}>
                                    <option value="">Select your role</option>
                                    {availableRoles.map(r => (
                                        <option key={r} value={r}>{r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                    ))}
                                </select>
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