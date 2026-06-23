import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { socket } from '../../socket'
import MessagingPanel from '../../components/MessagingPanel'

interface QueuePatient {
    _id: string
    patientId: { _id: string; name: string; email: string }
    symptoms: string
    urgency: 'Low' | 'Medium' | 'High'
    status: string
    position: number
    estimatedWait: number
    possibleConditions: string[]
    createdAt: string
}

interface Task {
    _id: string
    title: string
    assignedRole: string
    priority: string
    status: string
    taskType: string
    createdAt: string
}

interface Availability {
    workingDays: string[]
    startTime: string
    endTime: string
    blockedDates: string[]
}

const urgencyColor: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' }
const urgencyBg: Record<string, string> = { High: 'rgba(239,68,68,0.1)', Medium: 'rgba(245,158,11,0.1)', Low: 'rgba(16,185,129,0.1)' }
const statusColor: Record<string, string> = { Pending: '#f59e0b', 'In Progress': '#7F77DD', Completed: '#10b981' }

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function AvailabilityTab({ isMobile }: { isMobile: boolean }) {
    const [availability, setAvailability] = useState<Availability>({
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '08:00',
        endTime: '17:00',
        blockedDates: []
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [newBlockedDate, setNewBlockedDate] = useState('')

    useEffect(() => {
        api.get('/availability/my')
            .then(r => setAvailability(r.data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const toggleDay = (day: string) => {
        setAvailability(prev => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter(d => d !== day)
                : [...prev.workingDays, day]
        }))
    }

    const addBlockedDate = () => {
        if (!newBlockedDate || availability.blockedDates.includes(newBlockedDate)) return
        setAvailability(prev => ({
            ...prev,
            blockedDates: [...prev.blockedDates, newBlockedDate].sort()
        }))
        setNewBlockedDate('')
    }

    const removeBlockedDate = (date: string) => {
        setAvailability(prev => ({
            ...prev,
            blockedDates: prev.blockedDates.filter(d => d !== date)
        }))
    }

    const saveAvailability = async () => {
        setSaving(true)
        try {
            await api.put('/availability/my', availability)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (_) { }
        finally { setSaving(false) }
    }

    const inputStyle = {
        background: '#1c2128',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '0.6rem 0.85rem',
        color: 'white',
        fontSize: '0.85rem',
        outline: 'none',
        fontFamily: 'inherit',
        colorScheme: 'dark' as const
    }

    const labelStyle = {
        display: 'block' as const,
        fontSize: '0.75rem',
        color: '#9ca3af',
        marginBottom: '0.35rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px'
    }

    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
            Loading availability...
        </div>
    )

    const today = new Date().toISOString().split('T')[0]

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 700 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>My Availability</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                Set your working days, hours, and block dates when you're unavailable
            </p>

            {saved && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.875rem' }}>
                    ✅ Availability saved successfully!
                </div>
            )}

            {/* Working Days */}
            <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginBottom: '1rem' }}>
                    📅 Working Days
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {ALL_DAYS.map(day => (
                        <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: availability.workingDays.includes(day) ? 'rgba(127,119,221,0.2)' : '#1c2128',
                                border: `1px solid ${availability.workingDays.includes(day) ? 'rgba(127,119,221,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 8,
                                color: availability.workingDays.includes(day) ? '#7F77DD' : '#9ca3af',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                fontWeight: availability.workingDays.includes(day) ? 600 : 400,
                                transition: 'all 0.15s'
                            }}
                        >
                            {day.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Working Hours */}
            <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginBottom: '1rem' }}>
                    🕐 Working Hours
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>Start Time</label>
                        <input
                            type="time"
                            value={availability.startTime}
                            onChange={e => setAvailability(prev => ({ ...prev, startTime: e.target.value }))}
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>End Time</label>
                        <input
                            type="time"
                            value={availability.endTime}
                            onChange={e => setAvailability(prev => ({ ...prev, endTime: e.target.value }))}
                            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' as const }}
                        />
                    </div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#6b7280' }}>
                    Appointment slots will be generated every 30 minutes between these hours
                </div>
            </div>

            {/* Blocked Dates */}
            <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginBottom: '1rem' }}>
                    🚫 Blocked Dates
                </div>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem' }}>
                    Add dates when you won't be available (e.g. holidays, leave days)
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <input
                        type="date"
                        value={newBlockedDate}
                        min={today}
                        onChange={e => setNewBlockedDate(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                        onClick={addBlockedDate}
                        disabled={!newBlockedDate}
                        style={{
                            padding: '0.6rem 1rem',
                            background: newBlockedDate ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${newBlockedDate ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            color: newBlockedDate ? '#ef4444' : '#6b7280',
                            borderRadius: 8,
                            cursor: newBlockedDate ? 'pointer' : 'not-allowed',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap' as const
                        }}
                    >
                        + Block Date
                    </button>
                </div>

                {availability.blockedDates.length === 0 ? (
                    <div style={{ padding: '1rem', background: '#0d1117', borderRadius: 8, textAlign: 'center', color: '#6b7280', fontSize: '0.82rem' }}>
                        No blocked dates — you're available on all working days
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {availability.blockedDates.map(date => (
                            <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '0.6rem 0.9rem' }}>
                                <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>
                                    🚫 {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                                <button
                                    onClick={() => removeBlockedDate(date)}
                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', padding: '0 0.25rem' }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={saveAvailability}
                disabled={saving}
                style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: saving ? 'rgba(127,119,221,0.3)' : '#7F77DD',
                    border: 'none',
                    borderRadius: 10,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                {saving ? 'Saving...' : '💾 Save Availability'}
            </button>
        </div>
    )
}


function ConsultationHistoryTab({ isMobile }: { isMobile: boolean }) {
    const [consultations, setConsultations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => {
        api.get('/prescriptions/my-consultations')
            .then(r => setConsultations(r.data))
            .catch(() => setConsultations([]))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
            Loading consultations...
        </div>
    )

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 800 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Consultation History</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                All patients you have consulted · {consultations.length} total
            </p>

            {consultations.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>No consultations yet</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Consultations will appear here after prescribing</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {consultations.map(c => (
                        <div key={c._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                            <div
                                onClick={() => setExpanded(expanded === c._id ? null : c._id)}
                                style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                                        {c.patientId?.name || 'Unknown Patient'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                        {c.diagnosis} · {new Date(c.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{
                                        background: c.status === 'Dispensed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                        color: c.status === 'Dispensed' ? '#10b981' : '#f59e0b',
                                        padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600
                                    }}>{c.status}</span>
                                    <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{expanded === c._id ? '▲' : '▼'}</span>
                                </div>
                            </div>

                            {expanded === c._id && (
                                <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ paddingTop: '1rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Medications</div>
                                        {c.medications?.map((med: any, i: number) => (
                                            <div key={i} style={{ background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.15)', borderRadius: 8, padding: '0.65rem 0.9rem', marginBottom: '0.4rem' }}>
                                                <div style={{ fontWeight: 600, color: '#7F77DD', fontSize: '0.85rem' }}>💊 {med.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                                                    {med.dosage} · {med.frequency} · {med.duration}
                                                </div>
                                            </div>
                                        ))}
                                        {c.consultationNotes && (
                                            <div style={{ marginTop: '0.75rem', background: '#0d1117', borderRadius: 8, padding: '0.65rem 0.9rem' }}>
                                                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</div>
                                                <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{c.consultationNotes}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


function DoctorAppointmentsTab({ isMobile }: { isMobile: boolean }) {
    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('today')

    useEffect(() => {
        api.get('/appointments/doctor-appointments')
            .then(r => setAppointments(r.data))
            .catch(() => setAppointments([]))
            .finally(() => setLoading(false))
    }, [])

    const updateStatus = async (id: string, status: string) => {
        await api.patch(`/appointments/${id}/status`, { status })
        const r = await api.get('/appointments/doctor-appointments')
        setAppointments(r.data)
    }

    const today = new Date().toDateString()
    const filtered = appointments.filter(apt => {
        if (filter === 'today') return new Date(apt.date).toDateString() === today
        if (filter === 'upcoming') return new Date(apt.date) >= new Date() && apt.status !== 'Cancelled'
        return true
    })

    const statusColor: Record<string, string> = {
        Pending: '#f59e0b', Confirmed: '#10b981', Cancelled: '#ef4444', Completed: '#7F77DD'
    }

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>Loading appointments...</div>

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 800 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Appointments</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
                Manage your scheduled appointments
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {(['today', 'upcoming', 'all'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.45rem 1rem', background: filter === f ? '#7F77DD' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: filter === f ? 'white' : '#9ca3af', cursor: 'pointer', fontSize: '0.82rem', fontWeight: filter === f ? 600 : 400, textTransform: 'capitalize' }}>
                        {f}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No {filter} appointments</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map(apt => (
                        <div key={apt._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginBottom: '0.2rem' }}>{apt.patientId?.name}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                        {new Date(apt.date).toLocaleDateString()} · <span style={{ color: '#7F77DD', fontWeight: 600 }}>{apt.timeSlot}</span>
                                    </div>
                                </div>
                                <span style={{ background: `${statusColor[apt.status]}15`, color: statusColor[apt.status], padding: '0.3rem 0.85rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                                    {apt.status}
                                </span>
                            </div>

                            {apt.reason && (
                                <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
                                    Reason: {apt.reason}
                                </div>
                            )}

                            {apt.status === 'Pending' && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => updateStatus(apt._id, 'Confirmed')} style={{ padding: '0.45rem 0.9rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                                        ✓ Confirm
                                    </button>
                                    <button onClick={() => updateStatus(apt._id, 'Cancelled')} style={{ padding: '0.45rem 0.9rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                                        ✕ Cancel
                                    </button>
                                </div>
                            )}
                            {apt.status === 'Confirmed' && (
                                <button onClick={() => updateStatus(apt._id, 'Completed')} style={{ padding: '0.45rem 0.9rem', background: 'rgba(127,119,221,0.1)', border: '1px solid rgba(127,119,221,0.2)', color: '#7F77DD', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                                    Mark Completed
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


export default function DoctorDashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'tasks' | 'messages' | 'history' | 'appointments' | 'availability'>('overview')
    const [queue, setQueue] = useState<QueuePatient[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [notifications, setNotifications] = useState<string[]>([])
    const [taskForm, setTaskForm] = useState({ title: '', assignedRole: 'nurse', priority: 'Medium', taskType: 'other', description: '' })
    const [showTaskForm, setShowTaskForm] = useState(false)
    const [consultForm, setConsultForm] = useState({ diagnosis: '', notes: '', medication: '', dosage: '', duration: '' })
    const [showConsultForm, setShowConsultForm] = useState(false)

    useEffect(() => {
        const r = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', r)
        return () => window.removeEventListener('resize', r)
    }, [])

    const fetchQueue = useCallback(async () => {
        try { const r = await api.get('/queue'); setQueue(r.data) } catch (_) { }
    }, [])

    const fetchTasks = useCallback(async () => {
        try { const r = await api.get('/tasks'); setTasks(r.data) } catch (_) { }
    }, [])

    useEffect(() => {
        void fetchQueue(); void fetchTasks()
        socket.on('queue:updated', fetchQueue)
        socket.on('notification:urgent', (data: { message: string }) => {
            setNotifications(prev => [data.message, ...prev.slice(0, 4)])
        })
        socket.on('task:updated', fetchTasks)
        return () => { socket.off('queue:updated', fetchQueue); socket.off('notification:urgent'); socket.off('task:updated', fetchTasks) }
    }, [fetchQueue, fetchTasks])

    const updateQueueStatus = async (id: string, status: string) => {
        await api.patch(`/queue/${id}/status`, { status })
        fetchQueue()
        if (status === 'Completed') setSelectedPatient(null)
    }

    const createTask = async () => {
        await api.post('/tasks', { ...taskForm, relatedPatient: selectedPatient?.patientId._id })
        setShowTaskForm(false)
        setTaskForm({ title: '', assignedRole: 'nurse', priority: 'Medium', taskType: 'other', description: '' })
        fetchTasks()
    }

    const createPrescription = async () => {
        if (!selectedPatient) return
        await api.post('/prescriptions', {
            patientId: selectedPatient.patientId._id,
            diagnosis: consultForm.diagnosis,
            consultationNotes: consultForm.notes,
            medications: [{ name: consultForm.medication, dosage: consultForm.dosage, duration: consultForm.duration }]
        })
        setShowConsultForm(false)
        setConsultForm({ diagnosis: '', notes: '', medication: '', dosage: '', duration: '' })
        updateQueueStatus(selectedPatient._id, 'Completed')
    }

    const handleLogout = () => { logout(); navigate('/?from=doctor') }

    const highPriority = queue.filter(q => q.urgency === 'High' && q.status === 'Waiting')
    const waiting = queue.filter(q => q.status === 'Waiting')
    const inConsult = queue.filter(q => q.status === 'In Consultation')

    const navItems = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'appointments', label: 'Appointments', icon: '📅' },
        { id: 'availability', label: 'Availability', icon: '🗓️' },
        { id: 'queue', label: 'Patient Queue', icon: '👥' },
        { id: 'tasks', label: 'Tasks', icon: '✅' },
        { id: 'messages', label: 'Messages', icon: '💬' },
        { id: 'history', label: 'Consultations', icon: '📋' },
    ]

    const inputStyle = { width: '100%', background: '#1c2128', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit' }
    const labelStyle = { display: 'block' as const, fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.35rem', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

    const sidebar = (
        <div style={{
            width: isMobile ? '100%' : 240, background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', gap: '0.35rem', flexShrink: 0, height: isMobile ? 'auto' : '100vh', position: isMobile ? 'fixed' : 'sticky', top: 0, left: 0, zIndex: isMobile ? 200 : 1, minHeight: '100vh', justifyContent: 'space-between', transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none', transition: 'transform 0.3s ease', boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none', overflowY: 'auto'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.5rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 36, height: 36, background: '#7F77DD', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: 'white' }}>+</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>MediCore</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Doctor Portal</div>
                </div>
            </div>

            {notifications.length > 0 && (
                <div style={{ margin: '0.75rem 0', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚨 Alerts</div>
                    {notifications.slice(0, 2).map((n, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: '0.2rem' }}>• {n}</div>
                    ))}
                </div>
            )}

            <div style={{ flex: 1, paddingTop: '0.25rem' }}>
                {navItems.map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id as typeof activeTab); setSidebarOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', borderRadius: 10, border: 'none', cursor: 'pointer', background: activeTab === item.id ? 'rgba(127,119,221,0.15)' : 'transparent', color: activeTab === item.id ? '#7F77DD' : '#9ca3af', fontSize: '0.88rem', fontWeight: activeTab === item.id ? 600 : 400, marginBottom: '0.15rem', textAlign: 'left', borderLeft: activeTab === item.id ? '2px solid #7F77DD' : '2px solid transparent', transition: 'all 0.15s' }}>
                        <span>{item.icon}</span> {item.label}
                        {item.id === 'queue' && highPriority.length > 0 && (
                            <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 10 }}>{highPriority.length}</span>
                        )}
                    </button>
                ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 34, height: 34, background: 'rgba(127,119,221,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#7F77DD' }}>{user?.name?.charAt(0)}</div>
                    <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Doctor</div>
                    </div>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', padding: '0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem' }}>Sign Out</button>
            </div>
        </div>
    )

    const overviewTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: isMobile ? '1.3rem' : '1.7rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Welcome, Dr. {user?.name?.split(' ').slice(-1)[0]} 👨‍⚕️</h1>
                <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Waiting', value: waiting.length, color: '#7F77DD', icon: '⏳' },
                    { label: 'In Consultation', value: inConsult.length, color: '#1D9E75', icon: '🩺' },
                    { label: 'High Priority', value: highPriority.length, color: '#ef4444', icon: '🚨' },
                    { label: 'Active Tasks', value: tasks.filter(t => t.status !== 'Completed').length, color: '#f59e0b', icon: '✅' },
                ].map(stat => (
                    <div key={stat.label} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {highPriority.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1rem' }}>🚨</span>
                        <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.9rem' }}>High Priority Patients</span>
                    </div>
                    {highPriority.map(p => (
                        <div key={p._id} onClick={() => { setSelectedPatient(p); setActiveTab('queue') }} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '0.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.88rem' }}>{p.patientId.name}</div>
                                <div style={{ color: '#9ca3af', fontSize: '0.78rem', marginTop: '0.15rem' }}>{p.symptoms.slice(0, 50)}...</div>
                            </div>
                            <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.25rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>URGENT</span>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div onClick={() => setActiveTab('queue')} style={{ background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 14, padding: '1.5rem', cursor: 'pointer' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👥</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.35rem' }}>Patient Queue</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>{waiting.length} waiting · {inConsult.length} in consultation</div>
                </div>
                <div onClick={() => setActiveTab('availability')} style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 14, padding: '1.5rem', cursor: 'pointer' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗓️</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.35rem' }}>My Availability</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Set working days, hours and block dates</div>
                </div>
            </div>
        </div>
    )

    const queueTab = (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            <div style={{ width: selectedPatient && !isMobile ? '45%' : '100%', overflowY: 'auto', borderRight: selectedPatient && !isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: isMobile ? '1.25rem' : '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Patient Queue</h2>
                {queue.length === 0 ? (
                    <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👥</div>
                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No patients in queue</div>
                    </div>
                ) : (
                    queue.map(patient => (
                        <div key={patient._id} onClick={() => setSelectedPatient(patient)} style={{ background: selectedPatient?._id === patient._id ? '#1c2128' : '#161b22', border: selectedPatient?._id === patient._id ? '1px solid rgba(127,119,221,0.4)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                    <span style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{patient.patientId.name}</span>
                                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>#{patient.position}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <span style={{ background: urgencyBg[patient.urgency], color: urgencyColor[patient.urgency], padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>{patient.urgency}</span>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem' }}>{patient.status}</span>
                                </div>
                            </div>
                            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0 }}>{patient.symptoms.slice(0, 70)}...</p>
                        </div>
                    ))
                )}
            </div>

            {selectedPatient && (
                <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1.25rem' : '1.5rem', position: isMobile ? 'fixed' : 'relative', inset: isMobile ? '0' : 'auto', background: '#0d1117', zIndex: isMobile ? 300 : 1 }}>
                    {isMobile && <button onClick={() => setSelectedPatient(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>← Back to queue</button>}

                    <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ color: 'white', fontWeight: 700, margin: '0 0 0.25rem', fontSize: '1rem' }}>{selectedPatient.patientId.name}</h3>
                                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{selectedPatient.patientId.email}</div>
                            </div>
                            <span style={{ background: urgencyBg[selectedPatient.urgency], color: urgencyColor[selectedPatient.urgency], padding: '0.3rem 0.85rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>{selectedPatient.urgency} Urgency</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Symptoms</div>
                        <p style={{ color: '#e5e7eb', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1rem' }}>{selectedPatient.symptoms}</p>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Possible Conditions</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {selectedPatient.possibleConditions.map(c => (
                                <span key={c} style={{ background: 'rgba(127,119,221,0.12)', color: '#7F77DD', padding: '0.25rem 0.65rem', borderRadius: 20, fontSize: '0.75rem' }}>{c}</span>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                        <button onClick={async () => {
                            await updateQueueStatus(selectedPatient._id, 'In Consultation')
                            setShowConsultForm(true)
                        }} style={{ padding: '0.7rem', background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)', color: '#1D9E75', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
                            🩺 Start Consultation
                        </button>
                        <button onClick={() => updateQueueStatus(selectedPatient._id, 'Completed')} style={{ padding: '0.7rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>✅ Mark Complete</button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button onClick={() => setShowConsultForm(true)} style={{ padding: '0.7rem', background: 'rgba(127,119,221,0.15)', border: '1px solid rgba(127,119,221,0.3)', color: '#7F77DD', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>💊 Prescribe</button>
                        <button onClick={() => setShowTaskForm(true)} style={{ padding: '0.7rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>📋 Assign Task</button>
                    </div>

                    {showConsultForm && (
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.25rem', marginTop: '1rem' }}>
                            <h4 style={{ color: 'white', margin: '0 0 1rem', fontSize: '0.9rem' }}>Write Prescription</h4>
                            {[
                                { label: 'Diagnosis', key: 'diagnosis', placeholder: 'e.g. Acute Bronchitis' },
                                { label: 'Consultation Notes', key: 'notes', placeholder: 'Clinical notes...' },
                                { label: 'Medication', key: 'medication', placeholder: 'e.g. Amoxicillin' },
                                { label: 'Dosage', key: 'dosage', placeholder: 'e.g. 500mg twice daily' },
                                { label: 'Duration', key: 'duration', placeholder: 'e.g. 7 days' },
                            ].map(f => (
                                <div key={f.key} style={{ marginBottom: '0.75rem' }}>
                                    <label style={labelStyle}>{f.label}</label>
                                    <input value={consultForm[f.key as keyof typeof consultForm]} onChange={e => setConsultForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button onClick={createPrescription} style={{ flex: 1, padding: '0.65rem', background: '#7F77DD', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Send Prescription</button>
                                <button onClick={() => setShowConsultForm(false)} style={{ padding: '0.65rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {showTaskForm && (
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.25rem', marginTop: '1rem' }}>
                            <h4 style={{ color: 'white', margin: '0 0 1rem', fontSize: '0.9rem' }}>Assign Task</h4>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={labelStyle}>Task Title</label>
                                <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Check blood pressure" style={inputStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Assign To</label>
                                    <select value={taskForm.assignedRole} onChange={e => setTaskForm(p => ({ ...p, assignedRole: e.target.value }))} style={inputStyle}>
                                        <option value="nurse">Nurse</option>
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="lab_tech">Lab Tech</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Priority</label>
                                    <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))} style={inputStyle}>
                                        <option>High</option><option>Medium</option><option>Low</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label style={labelStyle}>Task Type</label>
                                <select value={taskForm.taskType} onChange={e => setTaskForm(p => ({ ...p, taskType: e.target.value }))} style={inputStyle}>
                                    <option value="lab_test">Lab Test</option>
                                    <option value="medication">Medication</option>
                                    <option value="vital_check">Vital Check</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button onClick={createTask} style={{ flex: 1, padding: '0.65rem', background: '#f59e0b', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Assign Task</button>
                                <button onClick={() => setShowTaskForm(false)} style={{ padding: '0.65rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    const tasksTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1.5rem' }}>All Tasks</h2>
            {tasks.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>No tasks assigned yet</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tasks.map(task => (
                        <div key={task._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{task.title}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>→ {task.assignedRole.replace('_', ' ')} · {task.taskType.replace('_', ' ')}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ background: urgencyBg[task.priority] || 'rgba(255,255,255,0.05)', color: urgencyColor[task.priority] || '#9ca3af', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600 }}>{task.priority}</span>
                                <span style={{ background: 'rgba(255,255,255,0.05)', color: statusColor[task.status] || '#9ca3af', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem' }}>{task.status}</span>
                            </div>
                        </div>
                    ))}
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
                        <div style={{ width: 32, height: 32, background: 'rgba(127,119,221,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7F77DD', fontWeight: 700, fontSize: '0.85rem' }}>{user?.name?.charAt(0)}</div>
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

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'overview' && overviewTab}
                    {activeTab === 'queue' && queueTab}
                    {activeTab === 'tasks' && tasksTab}
                    {activeTab === 'appointments' && <DoctorAppointmentsTab isMobile={isMobile} />}
                    {activeTab === 'availability' && <AvailabilityTab isMobile={isMobile} />}
                    {activeTab === 'history' && <ConsultationHistoryTab isMobile={isMobile} />}
                    {activeTab === 'messages' && (
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <MessagingPanel isMobile={isMobile} accent="#7F77DD" />
                        </div>
                    )}
                </div>

                {isMobile && (
                    <div style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0' }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id as typeof activeTab)} style={{ background: 'transparent', border: 'none', color: activeTab === item.id ? '#7F77DD' : '#6b7280', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0.4rem 0.5rem', borderRadius: 8, fontSize: '0.58rem', fontWeight: activeTab === item.id ? 600 : 400, position: 'relative' }}>
                                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                                {item.label.split(' ')[0]}
                                {item.id === 'queue' && highPriority.length > 0 && <span style={{ position: 'absolute', top: 2, right: 6, width: 8, height: 8, background: '#ef4444', borderRadius: '50%' }} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}