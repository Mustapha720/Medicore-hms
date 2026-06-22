import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
// import {
//     LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
//     XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
// } from 'recharts'

interface Analytics {
    last7Days: { date: string; patients: number; appointments: number; queue: number }[]
    urgency: { name: string; value: number; color: string }[]
    appointmentStatus: { name: string; value: number; color: string }[]
    taskCompletion: { total: number; completed: number; rate: number }
    userRoles: { name: string; value: number; color: string }[]
}

interface QueueEntry {
    _id: string
    patientId: { name: string; email: string }
    symptoms: string
    urgency: string
    status: string
    queueToken: string
    createdAt: string
}

interface AppointmentEntry {
    _id: string
    patientId: { name: string; email: string }
    doctorId: { name: string }
    date: string
    timeSlot: string
    reason: string
    status: string
}

interface Stats {
    users: {
        total: number
        patients: number
        doctors: number
        nurses: number
        pharmacists: number
        labTechs: number
        recentPatients: number
    }
    queue: { total: number; today: number; highUrgency: number }
    appointments: { total: number; recent: number }
    prescriptions: { total: number }
    tasks: { total: number; pending: number; completed: number }
}

interface User {
    _id: string
    name: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
}

const roleColor: Record<string, string> = {
    patient: '#06b6d4',
    doctor: '#7F77DD',
    nurse: '#1D9E75',
    pharmacist: '#D85A30',
    lab_tech: '#f59e0b',
    admin: '#e11d48'
}

const roleBg: Record<string, string> = {
    patient: 'rgba(6,182,212,0.1)',
    doctor: 'rgba(127,119,221,0.1)',
    nurse: 'rgba(29,158,117,0.1)',
    pharmacist: 'rgba(216,90,48,0.1)',
    lab_tech: 'rgba(245,158,11,0.1)',
    admin: 'rgba(225,29,72,0.1)'
}

const roleLabel: Record<string, string> = {
    patient: 'Patient',
    doctor: 'Doctor',
    nurse: 'Nurse',
    pharmacist: 'Pharmacist',
    lab_tech: 'Lab Tech',
    admin: 'Admin'
}

export default function AdminDashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'queue' | 'appointments' | 'analytics'>('overview')
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loadingAnalytics, setLoadingAnalytics] = useState(false)
    const [stats, setStats] = useState<Stats | null>(null)
    const [users, setUsers] = useState<User[]>([])
    const [queue, setQueue] = useState<QueueEntry[]>([])
    const [appointments, setAppointments] = useState<AppointmentEntry[]>([])
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [loadingStats, setLoadingStats] = useState(true)
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [newRole, setNewRole] = useState('')
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

    const fetchStats = useCallback(async () => {
        try {
            const r = await api.get('/admin/stats')
            setStats(r.data)
        } catch (_) { } finally { setLoadingStats(false) }
    }, [])

    const fetchUsers = useCallback(async () => {
        setLoadingUsers(true)
        try {
            const params = new URLSearchParams()
            if (roleFilter !== 'all') params.append('role', roleFilter)
            if (search) params.append('search', search)
            const r = await api.get(`/admin/users?${params}`)
            setUsers(r.data.users)
        } catch (_) { } finally { setLoadingUsers(false) }
    }, [roleFilter, search])

    const fetchQueue = useCallback(async () => {
        try {
            const r = await api.get('/admin/queue')
            setQueue(r.data)
        } catch (_) { }
    }, [])

    const fetchAppointments = useCallback(async () => {
        try {
            const r = await api.get('/admin/appointments')
            setAppointments(r.data)
        } catch (_) { }
    }, [])

    const fetchAnalytics = useCallback(async () => {
        setLoadingAnalytics(true)
        try {
            const r = await api.get('/admin/analytics')
            setAnalytics(r.data)
        } catch (_) { } finally { setLoadingAnalytics(false) }
    }, [])




    useEffect(() => {
        const r = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', r)
        return () => window.removeEventListener('resize', r)
    }, [])




    useEffect(() => { fetchStats() }, [fetchStats])

    useEffect(() => {
        if (activeTab === 'users') fetchUsers()
        if (activeTab === 'queue') fetchQueue()
        if (activeTab === 'appointments') fetchAppointments()
        if (activeTab === 'analytics') fetchAnalytics()
    }, [activeTab, fetchUsers, fetchQueue, fetchAppointments, fetchAnalytics])

    useEffect(() => {
        if (activeTab === 'users') fetchUsers()
    }, [search, roleFilter])

    const showNotif = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ msg, type })
        setTimeout(() => setNotification(null), 3000)
    }

    const updateRole = async (userId: string, role: string) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, { role })
            setEditingUser(null)
            fetchUsers()
            showNotif('Role updated successfully')
        } catch { showNotif('Failed to update role', 'error') }
    }

    const toggleUser = async (userId: string) => {
        try {
            await api.patch(`/admin/users/${userId}/toggle`)
            fetchUsers()
            showNotif('User status updated')
        } catch { showNotif('Failed to update user', 'error') }
    }

    const deleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to delete ${userName}?`)) return
        try {
            await api.delete(`/admin/users/${userId}`)
            fetchUsers()
            showNotif('User deleted')
        } catch { showNotif('Failed to delete user', 'error') }
    }

    const handleLogout = () => { logout(); navigate('/') }

    const navItems = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'users', label: 'Users', icon: '👥' },
        { id: 'queue', label: 'Queue Log', icon: '📋' },
        { id: 'appointments', label: 'Appointments', icon: '📅' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
    ]

    const inputStyle = {
        background: '#1c2128', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '0.6rem 0.85rem', color: 'white',
        fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit'
    }

    const sidebar = (
        <div style={{ width: isMobile ? '100%' : 240, background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', gap: 0, flexShrink: 0, height: '100vh', position: isMobile ? 'fixed' : 'sticky', top: 0, left: 0, zIndex: isMobile ? 200 : 1, transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none', transition: 'transform 0.3s ease', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.5rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '0.5rem' }}>
                <div style={{ width: 36, height: 36, background: '#e11d48', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>⚙</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>MediCore</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Admin Portal</div>
                </div>
            </div>

            <div style={{ flex: 1 }}>
                {navItems.map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id as typeof activeTab); setSidebarOpen(false) }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeTab === item.id ? 'rgba(225,29,72,0.15)' : 'transparent', color: activeTab === item.id ? '#e11d48' : '#9ca3af', fontSize: '0.88rem', fontWeight: activeTab === item.id ? 600 : 400, marginBottom: '0.15rem', textAlign: 'left', borderLeft: activeTab === item.id ? '2px solid #e11d48' : '2px solid transparent', transition: 'all 0.15s' }}>
                        <span>{item.icon}</span> {item.label}
                    </button>
                ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 34, height: 34, background: 'rgba(225,29,72,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#e11d48', flexShrink: 0 }}>{user?.name?.charAt(0)}</div>
                    <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#e11d48' }}>Administrator</div>
                    </div>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', padding: '0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem' }}>Sign Out</button>
            </div>
        </div>
    )

    const overviewTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.7rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>
                    Admin Dashboard ⚙️
                </h1>
                <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {loadingStats ? (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '3rem' }}>Loading stats...</div>
            ) : stats && (
                <>
                    {/* User stats */}
                    <h3 style={{ color: '#9ca3af', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Users</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Total Users', value: stats.users.total, color: '#e11d48', icon: '👤' },
                            { label: 'Patients', value: stats.users.patients, color: '#06b6d4', icon: '🏥' },
                            { label: 'Doctors', value: stats.users.doctors, color: '#7F77DD', icon: '👨‍⚕️' },
                            { label: 'Staff', value: stats.users.nurses + stats.users.pharmacists + stats.users.labTechs, color: '#1D9E75', icon: '👩‍⚕️' },
                        ].map(stat => (
                            <div key={stat.label} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                                <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Activity stats */}
                    <h3 style={{ color: '#9ca3af', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Activity</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Queue Today', value: stats.queue.today, color: '#f59e0b', icon: '⏳' },
                            { label: 'High Urgency', value: stats.queue.highUrgency, color: '#ef4444', icon: '🚨' },
                            { label: 'Appointments', value: stats.appointments.total, color: '#7F77DD', icon: '📅' },
                            { label: 'Prescriptions', value: stats.prescriptions.total, color: '#1D9E75', icon: '💊' },
                        ].map(stat => (
                            <div key={stat.label} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                                <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Task stats */}
                    <h3 style={{ color: '#9ca3af', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Tasks</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        {[
                            { label: 'Total Tasks', value: stats.tasks.total, color: '#9ca3af', icon: '📋' },
                            { label: 'Pending', value: stats.tasks.pending, color: '#f59e0b', icon: '⏳' },
                            { label: 'Completed', value: stats.tasks.completed, color: '#10b981', icon: '✅' },
                        ].map(stat => (
                            <div key={stat.label} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                                <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Role breakdown */}
                    <h3 style={{ color: '#9ca3af', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>Staff Breakdown</h3>
                    <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                        {[
                            { label: 'Nurses', value: stats.users.nurses, color: '#1D9E75' },
                            { label: 'Pharmacists', value: stats.users.pharmacists, color: '#D85A30' },
                            { label: 'Lab Technicians', value: stats.users.labTechs, color: '#f59e0b' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                                    <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{item.label}</span>
                                </div>
                                <span style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* New patients this week */}
                    <div style={{ marginTop: '1rem', background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 14, padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>New Patients This Week</div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>Registered in last 7 days</div>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1D9E75' }}>{stats.users.recentPatients}</div>
                    </div>
                </>
            )}
        </div>
    )

    const usersTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>User Management</h2>
                <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>Manage all registered users</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                />
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{ ...inputStyle, minWidth: 140 }}
                >
                    <option value="all">All Roles</option>
                    <option value="patient">Patients</option>
                    <option value="doctor">Doctors</option>
                    <option value="nurse">Nurses</option>
                    <option value="pharmacist">Pharmacists</option>
                    <option value="lab_tech">Lab Techs</option>
                    <option value="admin">Admins</option>
                </select>
            </div>

            {loadingUsers ? (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '3rem' }}>Loading users...</div>
            ) : users.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No users found</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {users.map(u => (
                        <div key={u._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', opacity: u.isActive ? 1 : 0.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 38, height: 38, borderRadius: '50%', background: roleBg[u.role] || 'rgba(255,255,255,0.05)', border: `1px solid ${roleColor[u.role]}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: roleColor[u.role], fontSize: '0.9rem', flexShrink: 0 }}>
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{u.email}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ background: roleBg[u.role], color: roleColor[u.role], padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                                    {roleLabel[u.role]}
                                </span>
                                <span style={{ background: u.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: u.isActive ? '#10b981' : '#ef4444', padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem' }}>
                                    {u.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {/* Edit role */}
                                {editingUser?._id === u._id ? (
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <select
                                            value={newRole}
                                            onChange={e => setNewRole(e.target.value)}
                                            style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                                        >
                                            <option value="">Select role</option>
                                            {['patient', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'admin'].map(r => (
                                                <option key={r} value={r}>{roleLabel[r]}</option>
                                            ))}
                                        </select>
                                        <button onClick={() => newRole && updateRole(u._id, newRole)}
                                            style={{ padding: '0.4rem 0.75rem', background: '#1D9E75', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                                            Save
                                        </button>
                                        <button onClick={() => setEditingUser(null)}
                                            style={{ padding: '0.4rem 0.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}>
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => { setEditingUser(u); setNewRole(u.role) }}
                                            style={{ padding: '0.4rem 0.75rem', background: 'rgba(127,119,221,0.1)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 6, color: '#7F77DD', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                                            Edit Role
                                        </button>
                                        <button onClick={() => toggleUser(u._id)}
                                            style={{ padding: '0.4rem 0.75rem', background: u.isActive ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${u.isActive ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 6, color: u.isActive ? '#f59e0b' : '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {u.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => deleteUser(u._id, u.name)}
                                            style={{ padding: '0.4rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    const queueTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Queue Log</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>All patient queue entries</p>

            {queue.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No queue entries yet</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {queue.map(entry => (
                        <div key={entry._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem', marginBottom: '0.2rem' }}>
                                    {entry.patientId?.name || 'Unknown'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.35rem' }}>
                                    {entry.patientId?.email}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                                    {entry.symptoms?.slice(0, 60)}...
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                <span style={{ background: entry.urgency === 'High' ? 'rgba(239,68,68,0.1)' : entry.urgency === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: entry.urgency === 'High' ? '#ef4444' : entry.urgency === 'Medium' ? '#f59e0b' : '#10b981', padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                                    {entry.urgency}
                                </span>
                                <span style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem' }}>
                                    {entry.status}
                                </span>
                                <span style={{ background: 'rgba(127,119,221,0.1)', color: '#7F77DD', padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontFamily: 'monospace', fontWeight: 600 }}>
                                    {entry.queueToken}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: '#4b5563', paddingTop: '0.2rem' }}>
                                    {new Date(entry.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    const appointmentsTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>All Appointments</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>System-wide appointment log</p>

            {appointments.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No appointments yet</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {appointments.map(apt => (
                        <div key={apt._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem', marginBottom: '0.2rem' }}>
                                    {apt.patientId?.name} → Dr. {apt.doctorId?.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {new Date(apt.date).toLocaleDateString()} at <span style={{ color: '#7F77DD', fontWeight: 600 }}>{apt.timeSlot}</span>
                                </div>
                                {apt.reason && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>{apt.reason}</div>}
                            </div>
                            <span style={{
                                background: apt.status === 'Confirmed' ? 'rgba(16,185,129,0.1)' : apt.status === 'Cancelled' ? 'rgba(239,68,68,0.1)' : apt.status === 'Completed' ? 'rgba(127,119,221,0.1)' : 'rgba(245,158,11,0.1)',
                                color: apt.status === 'Confirmed' ? '#10b981' : apt.status === 'Cancelled' ? '#ef4444' : apt.status === 'Completed' ? '#7F77DD' : '#f59e0b',
                                padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600
                            }}>
                                {apt.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    const analyticsTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Analytics</h2>
                <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>Visual overview of hospital activity</p>
            </div>

            {loadingAnalytics ? (
                <div style={{ color: '#6b7280', textAlign: 'center', padding: '3rem' }}>Loading analytics...</div>
            ) : analytics && (
                <>
                    {/* Last 7 days bar chart */}
                    <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.5rem' }}>Activity — Last 7 Days</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 180, padding: '0 0.5rem' }}>
                            {analytics.last7Days.map((day, i) => {
                                const max = Math.max(...analytics.last7Days.map((d: { queue: number }) => d.queue || 1))
                                const h = max > 0 ? (day.queue / max) * 140 : 4
                                return (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                                        <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{day.queue}</div>
                                        <div style={{ width: '100%', height: Math.max(h, 4), background: 'linear-gradient(180deg, #1D9E75, #0f6e56)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                                        <div style={{ fontSize: '0.6rem', color: '#4b5563', textAlign: 'center', lineHeight: 1.2 }}>{day.date.split(',')[0]}</div>
                                    </div>
                                )
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1D9E75' }} />
                                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Queue Entries</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Urgency breakdown */}
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem' }}>
                            <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>Queue Urgency</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {analytics.urgency.map((item: { name: string; value: number; color: string }) => {
                                    const total = analytics.urgency.reduce((a: number, b: { value: number }) => a + b.value, 0)
                                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                                    return (
                                        <div key={item.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                <span style={{ fontSize: '0.82rem', color: item.color, fontWeight: 600 }}>{item.name}</span>
                                                <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{item.value} ({pct}%)</span>
                                            </div>
                                            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Appointment status */}
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem' }}>
                            <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>Appointment Status</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {analytics.appointmentStatus.map((item: { name: string; value: number; color: string }) => {
                                    const total = analytics.appointmentStatus.reduce((a: number, b: { value: number }) => a + b.value, 0)
                                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                                    return (
                                        <div key={item.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                <span style={{ fontSize: '0.82rem', color: item.color, fontWeight: 600 }}>{item.name}</span>
                                                <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{item.value} ({pct}%)</span>
                                            </div>
                                            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                        {/* User role distribution */}
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem' }}>
                            <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>User Role Distribution</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {analytics.userRoles.map((item: { name: string; value: number; color: string }) => {
                                    const total = analytics.userRoles.reduce((a: number, b: { value: number }) => a + b.value, 0)
                                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                                    return (
                                        <div key={item.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                <span style={{ fontSize: '0.82rem', color: item.color, fontWeight: 600 }}>{item.name}</span>
                                                <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{item.value} ({pct}%)</span>
                                            </div>
                                            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Task completion rate */}
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.5rem' }}>
                            <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>Task Completion Rate</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180 }}>
                                <div style={{ fontSize: '4rem', fontWeight: 800, color: analytics.taskCompletion.rate >= 70 ? '#10b981' : analytics.taskCompletion.rate >= 40 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
                                    {analytics.taskCompletion.rate}%
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    {analytics.taskCompletion.completed} of {analytics.taskCompletion.total} tasks completed
                                </div>
                                <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 10, height: 10, marginTop: '1.25rem', overflow: 'hidden' }}>
                                    <div style={{ width: `${analytics.taskCompletion.rate}%`, background: analytics.taskCompletion.rate >= 70 ? '#10b981' : analytics.taskCompletion.rate >= 40 ? '#f59e0b' : '#ef4444', height: '100%', borderRadius: 10, transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0d1117', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} />}
            {sidebar}

            {notification && (
                <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', background: notification.type === 'success' ? '#1D9E75' : '#ef4444', color: 'white', padding: '0.75rem 1.25rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {isMobile && (
                    <div style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.65rem', borderRadius: 8, cursor: 'pointer' }}>☰</button>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>MediCore Admin</span>
                        <div style={{ width: 32, height: 32, background: 'rgba(225,29,72,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', fontWeight: 700, fontSize: '0.85rem' }}>{user?.name?.charAt(0)}</div>
                    </div>
                )}

                {!isMobile && (
                    <div style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ color: 'white', fontWeight: 600, fontSize: '1rem', margin: 0 }}>{navItems.find(n => n.id === activeTab)?.label}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
                            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Live · {new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, overflow: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'overview' && overviewTab}
                    {activeTab === 'users' && usersTab}
                    {activeTab === 'queue' && queueTab}
                    {activeTab === 'appointments' && appointmentsTab}
                    {activeTab === 'analytics' && analyticsTab}
                </div>

                {isMobile && (
                    <div style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0' }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id as typeof activeTab)}
                                style={{ background: 'transparent', border: 'none', color: activeTab === item.id ? '#e11d48' : '#6b7280', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.62rem', fontWeight: activeTab === item.id ? 600 : 400 }}>
                                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                                {item.label.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}