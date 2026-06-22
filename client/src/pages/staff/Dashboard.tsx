import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { socket } from '../../socket'
import MessagingPanel from '../../components/MessagingPanel'

interface Task {
    _id: string
    title: string
    description?: string
    assignedRole: string
    priority: 'Low' | 'Medium' | 'High'
    status: 'Pending' | 'In Progress' | 'Completed'
    taskType: string
    createdBy: { name: string; role: string }
    relatedPatient?: { name: string }
    createdAt: string
}

const priorityColor: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' }
const priorityBg: Record<string, string> = { High: 'rgba(239,68,68,0.1)', Medium: 'rgba(245,158,11,0.1)', Low: 'rgba(16,185,129,0.1)' }
const statusColor: Record<string, string> = { Pending: '#f59e0b', 'In Progress': '#7F77DD', Completed: '#10b981' }
const statusBg: Record<string, string> = { Pending: 'rgba(245,158,11,0.1)', 'In Progress': 'rgba(127,119,221,0.1)', Completed: 'rgba(16,185,129,0.1)' }
const roleLabel: Record<string, string> = { nurse: 'Nurse', pharmacist: 'Pharmacist', lab_tech: 'Lab Technician' }
const roleColor: Record<string, string> = { nurse: '#1D9E75', pharmacist: '#7F77DD', lab_tech: '#D85A30' }

function LabHistoryTab({ isMobile }: { isMobile: boolean }) {
    const [labTasks, setLabTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/tasks/lab-history')
            .then(r => setLabTasks(r.data))
            .catch(() => setLabTasks([]))
            .finally(() => setLoading(false))
    }, [])

    const sColor: Record<string, string> = { Pending: '#f59e0b', 'In Progress': '#7F77DD', Completed: '#10b981' }

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading lab history...</div>

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 700 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Lab History</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>All lab tests processed · {labTasks.length} total</p>
            {labTasks.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧪</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>No lab tests yet</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Lab tests assigned by doctors will appear here</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {labTasks.map(task => (
                        <div key={task._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{task.title}</div>
                                <span style={{ background: `${sColor[task.status]}15`, color: sColor[task.status], padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>{task.status}</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                Requested by: {task.createdBy?.name}{task.relatedPatient && ` · Patient: ${task.relatedPatient.name}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                                {new Date(task.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                {task.completedAt && ` · Completed: ${new Date(task.completedAt).toLocaleDateString()}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function CheckInTab({ isMobile }: { isMobile: boolean }) {
    const [token, setToken] = useState('')
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const lookupToken = async () => {
        if (!token.trim()) return
        setLoading(true)
        setError('')
        setResult(null)
        setSuccess(false)
        try {
            const r = await api.get(`/queue/lookup/${token.trim()}`)
            setResult(r.data)
        } catch {
            setError('Token not found. Please check and try again.')
        } finally { setLoading(false) }
    }

    const confirmCheckIn = async () => {
        setLoading(true)
        try {
            await api.post('/queue/checkin', { token: token.trim() })
            setSuccess(true)
            setError('')
            setResult(null)
        } catch (err: any) {
            setError(err.response?.data?.error || 'Check-in failed. Try again.')
        } finally { setLoading(false) }
    }

    const urgencyColor: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' }
    const urgencyBg: Record<string, string> = { High: 'rgba(239,68,68,0.1)', Medium: 'rgba(245,158,11,0.1)', Low: 'rgba(16,185,129,0.1)' }

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 520 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Patient Check-In</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                Enter the patient's queue token to confirm their arrival at the hospital
            </p>

            {/* Token input */}
            <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Queue Token
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        value={token}
                        onChange={e => {
                            setToken(e.target.value.toUpperCase())
                            setResult(null)
                            setError('')
                            setSuccess(false)
                        }}
                        onKeyDown={e => e.key === 'Enter' && lookupToken()}
                        placeholder="e.g. MED-4829"
                        maxLength={8}
                        style={{ flex: 1, background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.75rem 1rem', color: 'white', fontSize: '1.2rem', outline: 'none', fontFamily: 'monospace', letterSpacing: '3px', textTransform: 'uppercase' }}
                    />
                    <button
                        onClick={lookupToken}
                        disabled={loading || !token.trim()}
                        style={{ padding: '0.75rem 1.25rem', background: loading || !token.trim() ? 'rgba(29,158,117,0.3)' : '#1D9E75', border: 'none', borderRadius: 8, color: 'white', cursor: loading || !token.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                    >
                        {loading ? '...' : 'Look Up'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.875rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Success */}
            {success && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '1.5rem', borderRadius: 12, marginBottom: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>Patient Checked In!</div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>Doctor has been notified. Patient is now in the queue.</div>
                    <button
                        onClick={() => { setToken(''); setSuccess(false) }}
                        style={{ marginTop: '1rem', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.5rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        Check In Another Patient
                    </button>
                </div>
            )}

            {/* Patient info */}
            {result && !success && (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                            <div style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem', marginBottom: '0.2rem' }}>{result.patientId?.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{result.patientId?.email}</div>
                        </div>
                        <span style={{ background: urgencyBg[result.urgency], color: urgencyColor[result.urgency], padding: '0.3rem 0.85rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                            {result.urgency} Urgency
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ background: '#0d1117', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1D9E75' }}>#{result.position}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Queue Position</div>
                        </div>
                        <div style={{ background: '#0d1117', borderRadius: 8, padding: '0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#7F77DD' }}>{result.estimatedWait}m</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Est. Wait</div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Symptoms</div>
                        <div style={{ fontSize: '0.85rem', color: '#e5e7eb', lineHeight: 1.5 }}>{result.symptoms}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.65rem 0.9rem', background: '#0d1117', borderRadius: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: result.checkedIn ? '#10b981' : '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: result.checkedIn ? '#10b981' : '#f59e0b' }}>
                            {result.checkedIn ? 'Already checked in' : 'Not yet checked in — waiting for arrival confirmation'}
                        </span>
                    </div>

                    {result.checkedIn ? (
                        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '0.75rem', textAlign: 'center', color: '#10b981', fontSize: '0.85rem' }}>
                            ✓ This patient has already been checked in
                        </div>
                    ) : (
                        <button
                            onClick={confirmCheckIn}
                            disabled={loading}
                            style={{ width: '100%', padding: '0.9rem', background: '#1D9E75', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Checking in...' : '🏥 Confirm Patient Arrival'}
                        </button>
                    )}
                </div>
            )}

            {/* Info box */}
            <div style={{ background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.15)', borderRadius: 12, padding: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#7F77DD', fontWeight: 600, marginBottom: '0.5rem' }}>💡 No ID card needed</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.6 }}>
                    Patients receive a unique token when they join the queue via the AI symptom checker. They can show this token on their phone instead of a physical ID card. Each token is unique per visit and expires after the appointment.
                </div>
            </div>
        </div>
    )
}

export default function StaffDashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'messages' | 'lab-history' | 'checkin'>('overview')
    const [tasks, setTasks] = useState<Task[]>([])
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [notifications, setNotifications] = useState<string[]>([])

    useEffect(() => {
        const r = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', r)
        return () => window.removeEventListener('resize', r)
    }, [])

    const fetchTasks = useCallback(async () => {
        try { const r = await api.get('/tasks/my-tasks'); setTasks(r.data) } catch (_) { }
    }, [])

    useEffect(() => {
        fetchTasks()
        socket.on('task:assigned', (data: { message: string }) => {
            setNotifications(prev => [data.message, ...prev.slice(0, 4)])
            fetchTasks()
        })
        socket.on('notification:lab_test', (data: { message: string }) => {
            if (user?.role === 'lab_tech') setNotifications(prev => [data.message, ...prev.slice(0, 4)])
        })
        socket.on('notification:medication', (data: { message: string }) => {
            if (user?.role === 'pharmacist') setNotifications(prev => [data.message, ...prev.slice(0, 4)])
        })
        return () => {
            socket.off('task:assigned')
            socket.off('notification:lab_test')
            socket.off('notification:medication')
        }
    }, [fetchTasks, user?.role])

    const updateTaskStatus = async (id: string, status: string) => {
        await api.patch(`/tasks/${id}/status`, { status })
        fetchTasks()
    }

    const handleLogout = () => { logout(); navigate('/?from=staff') }

    const pendingTasks = tasks.filter(t => t.status === 'Pending')
    const inProgressTasks = tasks.filter(t => t.status === 'In Progress')
    const completedTasks = tasks.filter(t => t.status === 'Completed')

    const accent = roleColor[user?.role || 'nurse'] || '#1D9E75'

    const navItems = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'tasks', label: 'My Tasks', icon: '✅' },
        { id: 'messages', label: 'Messages', icon: '💬' },
        ...(user?.role === 'nurse' ? [{ id: 'checkin', label: 'Check In', icon: '🏥' }] : []),
        ...(user?.role === 'lab_tech' ? [{ id: 'lab-history', label: 'Lab History', icon: '🧪' }] : []),
    ]

    const TaskCard = ({ task }: { task: Task }) => (
        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{task.title}</div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <span style={{ background: priorityBg[task.priority], color: priorityColor[task.priority], padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600 }}>{task.priority}</span>
                    <span style={{ background: statusBg[task.status], color: statusColor[task.status], padding: '0.2rem 0.55rem', borderRadius: 20, fontSize: '0.68rem' }}>{task.status}</span>
                </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                From: {task.createdBy?.name} · {task.taskType.replace('_', ' ')}
                {task.relatedPatient && ` · Patient: ${task.relatedPatient.name}`}
            </div>
            {task.status !== 'Completed' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {task.status === 'Pending' && (
                        <button onClick={() => updateTaskStatus(task._id, 'In Progress')}
                            style={{ padding: '0.45rem 0.9rem', background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                            Start Task
                        </button>
                    )}
                    {task.status === 'In Progress' && (
                        <button onClick={() => updateTaskStatus(task._id, 'Completed')}
                            style={{ padding: '0.45rem 0.9rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                            Mark Complete ✓
                        </button>
                    )}
                </div>
            )}
        </div>
    )

    const sidebar = (
        <div style={{ width: isMobile ? '100%' : 240, background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', gap: 0, flexShrink: 0, height: '100vh', position: isMobile ? 'fixed' : 'sticky', top: 0, left: 0, zIndex: isMobile ? 200 : 1, transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none', transition: 'transform 0.3s ease', boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.5rem' }}>
                <div style={{ width: 36, height: 36, background: accent, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>+</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>MediCore</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{roleLabel[user?.role || 'nurse']} Portal</div>
                </div>
            </div>

            {notifications.length > 0 && (
                <div style={{ margin: '0 0 0.75rem', background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: accent, fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🔔 New Alerts</div>
                    {notifications.slice(0, 2).map((n, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: '#d1d5db', marginBottom: '0.2rem' }}>• {n}</div>
                    ))}
                </div>
            )}

            <div style={{ flex: 1 }}>
                {navItems.map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id as typeof activeTab); setSidebarOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeTab === item.id ? `${accent}20` : 'transparent', color: activeTab === item.id ? accent : '#9ca3af', fontSize: '0.88rem', fontWeight: activeTab === item.id ? 600 : 400, marginBottom: '0.15rem', textAlign: 'left', borderLeft: activeTab === item.id ? `2px solid ${accent}` : '2px solid transparent', transition: 'all 0.15s' }}>
                        <span>{item.icon}</span> {item.label}
                        {item.id === 'tasks' && pendingTasks.length > 0 && (
                            <span style={{ marginLeft: 'auto', background: accent, color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 10 }}>{pendingTasks.length}</span>
                        )}
                    </button>
                ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <div style={{ background: `${accent}15`, border: `1px solid ${accent}25`, borderRadius: 10, padding: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, background: `${accent}30`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: accent, flexShrink: 0 }}>{user?.name?.charAt(0)}</div>
                        <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.7rem', color: accent }}>{roleLabel[user?.role || 'nurse']}</div>
                        </div>
                    </div>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', padding: '0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem' }}>Sign Out</button>
            </div>
        </div>
    )

    const overviewTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.7rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Welcome, {user?.name?.split(' ')[0]} 👋</h1>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 20, padding: '0.3rem 0.75rem' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
                    <span style={{ fontSize: '0.75rem', color: accent, fontWeight: 600 }}>{roleLabel[user?.role || 'nurse']}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Pending', value: pendingTasks.length, color: '#f59e0b', icon: '⏳', bg: 'rgba(245,158,11,0.1)' },
                    { label: 'In Progress', value: inProgressTasks.length, color: '#7F77DD', icon: '🔄', bg: 'rgba(127,119,221,0.1)' },
                    { label: 'Completed', value: completedTasks.length, color: '#10b981', icon: '✅', bg: 'rgba(16,185,129,0.1)' },
                ].map(stat => (
                    <div key={stat.label} style={{ background: stat.bg, border: `1px solid ${stat.color}25`, borderRadius: 14, padding: '1.25rem' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{stat.label} Tasks</div>
                    </div>
                ))}
            </div>

            {pendingTasks.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>Pending Tasks</h3>
                        <button onClick={() => setActiveTab('tasks')} style={{ background: 'transparent', border: 'none', color: accent, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>View all →</button>
                    </div>
                    {pendingTasks.slice(0, 3).map(task => <TaskCard key={task._id} task={task} />)}
                </div>
            )}

            {inProgressTasks.length > 0 && (
                <div>
                    <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', margin: '0 0 0.75rem' }}>In Progress</h3>
                    {inProgressTasks.slice(0, 2).map(task => <TaskCard key={task._id} task={task} />)}
                </div>
            )}

            {tasks.length === 0 && (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>All clear!</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No tasks assigned yet. Check back soon.</div>
                </div>
            )}
        </div>
    )

    const tasksTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1.5rem' }}>My Tasks</h2>
            {['Pending', 'In Progress', 'Completed'].map(section => {
                const sectionTasks = tasks.filter(t => t.status === section)
                if (sectionTasks.length === 0) return null
                return (
                    <div key={section} style={{ marginBottom: '1.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor[section], textTransform: 'uppercase', letterSpacing: '0.5px' }}>{section}</span>
                            <span style={{ background: statusBg[section], color: statusColor[section], padding: '0.1rem 0.5rem', borderRadius: 10, fontSize: '0.68rem', fontWeight: 700 }}>{sectionTasks.length}</span>
                        </div>
                        {sectionTasks.map(task => <TaskCard key={task._id} task={task} />)}
                    </div>
                )
            })}
            {tasks.length === 0 && (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No tasks assigned yet</div>
                </div>
            )}
        </div>
    )

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0d1117', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} />}
            {sidebar}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {isMobile && (
                    <div style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.65rem', borderRadius: 8, cursor: 'pointer' }}>☰</button>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>MediCore</span>
                        <div style={{ width: 32, height: 32, background: `${accent}25`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontWeight: 700, fontSize: '0.85rem' }}>{user?.name?.charAt(0)}</div>
                    </div>
                )}

                {!isMobile && (
                    <div style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ color: 'white', fontWeight: 600, fontSize: '1rem', margin: 0 }}>{navItems.find(n => n.id === activeTab)?.label}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                                <span style={{ fontSize: '0.75rem', color: accent, fontWeight: 600 }}>{roleLabel[user?.role || 'nurse']}</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#4b5563' }}>·</span>
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'overview' && overviewTab}
                    {activeTab === 'tasks' && tasksTab}
                    {activeTab === 'checkin' && <CheckInTab isMobile={isMobile} />}
                    {activeTab === 'lab-history' && <LabHistoryTab isMobile={isMobile} />}
                    {activeTab === 'messages' && (
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <MessagingPanel isMobile={isMobile} accent={accent} />
                        </div>
                    )}
                </div>

                {isMobile && (
                    <div style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0' }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id as typeof activeTab)}
                                style={{ background: 'transparent', border: 'none', color: activeTab === item.id ? accent : '#6b7280', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.62rem', fontWeight: activeTab === item.id ? 600 : 400, position: 'relative' }}>
                                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                {item.label.split(' ')[0]}
                                {item.id === 'tasks' && pendingTasks.length > 0 && <span style={{ position: 'absolute', top: 2, right: 6, width: 8, height: 8, background: '#f59e0b', borderRadius: '50%' }} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}