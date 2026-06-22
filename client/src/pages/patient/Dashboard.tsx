import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { socket } from '../../socket'
import MessagingPanel from '../../components/MessagingPanel'

interface QueueEntry {
    _id: string
    position: number
    estimatedWait: number
    urgency: 'Low' | 'Medium' | 'High'
    status: 'Queued' | 'Checked In' | 'In Consultation' | 'Completed' | 'Expired'
    symptoms: string
    possibleConditions: string[]
    aiSummary: string
    queueToken: string
    checkedIn: boolean
    checkInDeadline: string
}

interface Prescription {
    _id: string
    diagnosis: string
    doctorId: { name: string }
    medications: { name: string; dosage: string; frequency: string; duration: string; notes?: string }[]
    consultationNotes: string
    status: string
    createdAt: string
}

interface Message { role: 'user' | 'bot'; text: string; time: string }

const urgencyColor: Record<string, string> = {
    High: '#ef4444', Medium: '#f59e0b', Low: '#10b981'
}
// const urgencyBg: Record<string, string> = {
//     High: 'rgba(239,68,68,0.12)', Medium: 'rgba(245,158,11,0.12)', Low: 'rgba(16,185,129,0.12)'
// }

function PrescriptionsTab({ isMobile }: { isMobile: boolean }) {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/prescriptions/my-prescriptions')
            .then(r => setPrescriptions(r.data))
            .catch(() => setPrescriptions([]))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', textAlign: 'center', color: '#6b7280', paddingTop: '4rem' }}>
            Loading prescriptions...
        </div>
    )

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 700 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Prescriptions</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Your medication history from consultations</p>

            {prescriptions.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💊</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>No prescriptions yet</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Your doctor's prescriptions will appear here after consultation</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {prescriptions.map(p => (
                        <div key={p._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem', marginBottom: '0.25rem' }}>{p.diagnosis}</div>
                                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Dr. {p.doctorId.name} · {new Date(p.createdAt).toLocaleDateString()}</div>
                                </div>
                                <span style={{
                                    background: p.status === 'Dispensed' ? 'rgba(16,185,129,0.1)' : p.status === 'Completed' ? 'rgba(127,119,221,0.1)' : 'rgba(245,158,11,0.1)',
                                    color: p.status === 'Dispensed' ? '#10b981' : p.status === 'Completed' ? '#7F77DD' : '#f59e0b',
                                    padding: '0.3rem 0.85rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600
                                }}>{p.status}</span>
                            </div>

                            {/* Medications */}
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>Medications</div>
                                {p.medications.map((med, i) => (
                                    <div key={i} style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.15)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: 600, color: '#1D9E75', fontSize: '0.875rem', marginBottom: '0.25rem' }}>💊 {med.name}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                                            {med.dosage} · {med.frequency} · {med.duration}
                                        </div>
                                        {med.notes && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Note: {med.notes}</div>}
                                    </div>
                                ))}
                            </div>

                            {/* Notes */}
                            {p.consultationNotes && (
                                <div style={{ background: '#0d1117', borderRadius: 10, padding: '0.75rem 1rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doctor's Notes</div>
                                    <div style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.5 }}>{p.consultationNotes}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


function VisitHistoryTab({ isMobile }: { isMobile: boolean }) {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/queue/history')
            .then(r => setHistory(r.data))
            .catch(() => setHistory([]))
            .finally(() => setLoading(false))
    }, [])

    const urgencyColor: Record<string, string> = {
        High: '#ef4444', Medium: '#f59e0b', Low: '#10b981'
    }
    const statusColor: Record<string, string> = {
        Waiting: '#f59e0b', 'In Consultation': '#7F77DD', Completed: '#10b981'
    }

    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#6b7280' }}>
            Loading visit history...
        </div>
    )

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 700 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Visit History</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Your past hospital visits</p>

            {history.length === 0 ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>No visits yet</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Your visit history will appear here</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {history.map((visit, i) => (
                        <div key={i} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                    {new Date(visit.createdAt).toLocaleDateString('en-US', {
                                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                    })}
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <span style={{ background: `${urgencyColor[visit.urgency]}15`, color: urgencyColor[visit.urgency], padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600 }}>
                                        {visit.urgency}
                                    </span>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', color: statusColor[visit.status] || '#9ca3af', padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.72rem' }}>
                                        {visit.status}
                                    </span>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.875rem', color: '#e5e7eb', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                                {visit.symptoms}
                            </div>

                            {visit.possibleConditions?.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {visit.possibleConditions.map((c: string) => (
                                        <span key={c} style={{ background: 'rgba(127,119,221,0.1)', color: '#7F77DD', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.72rem' }}>
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}


function AppointmentsTab({ isMobile }: { isMobile: boolean }) {
    const [doctors, setDoctors] = useState<any[]>([])
    const [appointments, setAppointments] = useState<any[]>([])
    const [selectedDoctor, setSelectedDoctor] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [slots, setSlots] = useState<string[]>([])
    const [selectedSlot, setSelectedSlot] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [bookingSuccess, setBookingSuccess] = useState(false)
    const [view, setView] = useState<'book' | 'list'>('list')
    const [loadingSlots, setLoadingSlots] = useState(false)

    useEffect(() => {
        api.get('/appointments/doctors').then(r => setDoctors(r.data)).catch(() => { })
        fetchAppointments()
    }, [])

    const fetchAppointments = async () => {
        try {
            const r = await api.get('/appointments/my-appointments')
            setAppointments(r.data)
        } catch (_) { }
    }

    const fetchSlots = async () => {
        if (!selectedDoctor || !selectedDate) return
        setLoadingSlots(true)
        try {
            const r = await api.get(`/appointments/slots/${selectedDoctor}/${selectedDate}`)
            setSlots(r.data.availableSlots)
            setSelectedSlot('')
        } catch (_) { } finally { setLoadingSlots(false) }
    }

    useEffect(() => {
        if (selectedDoctor && selectedDate) fetchSlots()
    }, [selectedDoctor, selectedDate])

    const bookAppointment = async () => {
        if (!selectedDoctor || !selectedDate || !selectedSlot) return
        setLoading(true)
        try {
            await api.post('/appointments', {
                doctorId: selectedDoctor,
                date: selectedDate,
                timeSlot: selectedSlot,
                reason
            })
            setBookingSuccess(true)
            fetchAppointments()
            setView('list')
            setSelectedDoctor('')
            setSelectedDate('')
            setSelectedSlot('')
            setReason('')
            setTimeout(() => setBookingSuccess(false), 4000)
        } catch (err: any) {
            alert(err.response?.data?.error || 'Booking failed')
        } finally { setLoading(false) }
    }

    const cancelAppointment = async (id: string) => {
        await api.patch(`/appointments/${id}/cancel`)
        fetchAppointments()
    }

    const statusColor: Record<string, string> = {
        Pending: '#f59e0b', Confirmed: '#10b981', Cancelled: '#ef4444', Completed: '#7F77DD'
    }

    const inputStyle = {
        width: '100%', background: '#1c2128',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '0.65rem 0.9rem',
        color: 'white', fontSize: '0.875rem',
        outline: 'none', boxSizing: 'border-box' as const,
        fontFamily: 'inherit'
    }

    const labelStyle = {
        display: 'block' as const,
        fontSize: '0.75rem', color: '#9ca3af',
        marginBottom: '0.4rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px'
    }

    // Min date = today
    const today = new Date().toISOString().split('T')[0]

    return (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Appointments</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>Book and manage your appointments</p>
                </div>
                <button
                    onClick={() => setView(view === 'list' ? 'book' : 'list')}
                    style={{ padding: '0.6rem 1.25rem', background: view === 'book' ? 'rgba(255,255,255,0.05)' : '#1D9E75', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                    {view === 'book' ? '← My Appointments' : '+ Book Appointment'}
                </button>
            </div>

            {bookingSuccess && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', padding: '0.85rem 1rem', borderRadius: 10, marginBottom: '1rem', fontSize: '0.875rem' }}>
                    ✅ Appointment booked! A confirmation email has been sent to you.
                </div>
            )}

            {view === 'book' ? (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
                    <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem' }}>Book New Appointment</h3>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Select Doctor</label>
                        <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} style={inputStyle}>
                            <option value="">Choose a doctor...</option>
                            {doctors.map(d => (
                                <option key={d._id} value={d._id}>Dr. {d.name} {d.specialization ? `— ${d.specialization}` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Select Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            min={today}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ ...inputStyle, colorScheme: 'dark' }}
                        />
                    </div>

                    {selectedDoctor && selectedDate && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Available Time Slots</label>
                            {loadingSlots ? (
                                <div style={{ color: '#6b7280', fontSize: '0.85rem', padding: '0.75rem 0' }}>Loading slots...</div>
                            ) : slots.length === 0 ? (
                                <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                                    No available slots for this date. Please choose another date.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                    {slots.map(slot => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedSlot(slot)}
                                            style={{ padding: '0.6rem', background: selectedSlot === slot ? '#1D9E75' : '#0d1117', border: `1px solid ${selectedSlot === slot ? '#1D9E75' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, color: selectedSlot === slot ? 'white' : '#9ca3af', cursor: 'pointer', fontSize: '0.82rem', fontWeight: selectedSlot === slot ? 600 : 400, transition: 'all 0.15s' }}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={labelStyle}>Reason for Visit</label>
                        <textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Brief description of your concern..."
                            rows={3}
                            style={{ ...inputStyle, resize: 'none' }}
                        />
                    </div>

                    <button
                        onClick={bookAppointment}
                        disabled={loading || !selectedDoctor || !selectedDate || !selectedSlot}
                        style={{ width: '100%', padding: '0.85rem', background: loading || !selectedDoctor || !selectedDate || !selectedSlot ? 'rgba(29,158,117,0.3)' : '#1D9E75', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, fontSize: '0.95rem', cursor: loading || !selectedDoctor || !selectedDate || !selectedSlot ? 'not-allowed' : 'pointer' }}
                    >
                        {loading ? 'Booking...' : '📅 Confirm Appointment'}
                    </button>
                </div>
            ) : (
                <div>
                    {appointments.length === 0 ? (
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                            <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>No appointments yet</div>
                            <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Book your first appointment with a doctor</div>
                            <button onClick={() => setView('book')} style={{ background: '#1D9E75', border: 'none', color: 'white', padding: '0.7rem 1.5rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                                Book Appointment →
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {appointments.map(apt => (
                                <div key={apt._id} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                                                Dr. {apt.doctorId?.name}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                                {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                        </div>
                                        <span style={{ background: `${statusColor[apt.status]}15`, color: statusColor[apt.status], padding: '0.3rem 0.85rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                                            {apt.status}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: apt.reason ? '0.75rem' : 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '1rem' }}>🕐</span>
                                            <span style={{ color: '#1D9E75', fontWeight: 700, fontSize: '1rem' }}>{apt.timeSlot}</span>
                                        </div>
                                    </div>

                                    {apt.reason && (
                                        <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
                                            Reason: {apt.reason}
                                        </div>
                                    )}

                                    {apt.status === 'Pending' && (
                                        <button
                                            onClick={() => cancelAppointment(apt._id)}
                                            style={{ padding: '0.45rem 0.9rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                        >
                                            Cancel Appointment
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}


export default function PatientDashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'home' | 'symptom' | 'queue' | 'prescriptions' | 'history' | 'messages' | 'appointments'>('home')
    const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'bot',
            text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm your MediCore health assistant.\n\nI'm here to help you through what you're experiencing and make sure you get the right care. Please tell me what symptoms you're feeling — don't hold back, the more detail you share, the better I can help you. 💙`,
            time: now()
        }
    ])
    const [input, setInput] = useState('')
    const [analyzing, setAnalyzing] = useState(false)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [notification, setNotification] = useState<string | null>(null)
    const [, setConversationStage] = useState<'initial' | 'awaiting_followup' | 'done'>('initial')

    function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

    function renderFormattedText(text: string) {
        const parts = text.split(/(\*\*.*?\*\*)/g)
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>
            }
            return part
        })
    }

    useEffect(() => {
        const r = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', r)
        return () => window.removeEventListener('resize', r)
    }, [])

    const fetchQueue = useCallback(async () => {
        try {
            const res = await api.get('/queue/my-position')
            setQueueEntry(res.data)
        } catch { setQueueEntry(null) }
    }, [])

    useEffect(() => {
        fetchQueue()
        socket.on('queue:updated', fetchQueue)
        socket.on('queue:checkedin', (data: { message: string }) => {
            showNotif('✅ ' + data.message)
            fetchQueue()
        })
        socket.on('queue:expired', () => {
            showNotif('⏰ Your queue position has expired')
            fetchQueue()
        })
        socket.on('queue:statusupdated', (data: { message: string }) => {
            showNotif(data.message)
            fetchQueue()
        })
        return () => {
            socket.off('queue:updated', fetchQueue)
            socket.off('queue:checkedin')
            socket.off('queue:expired')
            socket.off('queue:statusupdated')
        }
    }, [fetchQueue])

    const showNotif = (msg: string) => {
        setNotification(msg)
        setTimeout(() => setNotification(null), 3500)
    }

    const handleSend = async () => {
        if (!input.trim() || analyzing) return

        const userMsg: Message = { role: 'user', text: input, time: now() }
        const updatedMessages = [...messages, userMsg]
        setMessages(updatedMessages)
        setInput('')
        setAnalyzing(true)

        try {
            // Build conversation history (skip the initial greeting)
            const conversationHistory = updatedMessages.slice(1).map(m => ({
                role: m.role,
                text: m.text
            }))

            await new Promise(resolve => setTimeout(resolve, 1500))

            const res = await api.post('/ai/chat', { conversationHistory })
            const { message, stage, urgency, possibleConditions, urgencyReason } = res.data

            setMessages(prev => [...prev, { role: 'bot', text: message, time: now() }])

            if (stage === 'final') {
                // After showing final assessment, add to queue
                setAnalyzing(false)
                await new Promise(resolve => setTimeout(resolve, 4500))
                setAnalyzing(true)
                await new Promise(resolve => setTimeout(resolve, 1500))

                // Build a summary of the conversation for the queue entry
                const symptomsSummary = updatedMessages
                    .filter(m => m.role === 'user')
                    .map(m => m.text)
                    .join('. ')

                const joinRes = await api.post('/queue/join', {
                    symptoms: symptomsSummary,
                    aiUrgency: urgency,
                    aiPossibleConditions: possibleConditions,
                    aiUrgencyReason: urgencyReason
                })
                const { queueEntry: qe } = joinRes.data
                setQueueEntry(qe)

                const queueMsg = `✅ I've added you to the queue.\n\nYour position: **#${qe.position}**\nEstimated wait: **~${qe.estimatedWait} minutes**\nQueue token: **${qe.queueToken}**\n\n${qe.position === 1
                    ? "You're first in line! Please make your way to the clinic now."
                    : `There are ${qe.position - 1} patient${qe.position > 2 ? 's' : ''} ahead of you. Please head to the clinic and show your token to the nurse at reception.`
                    }\n\n💙 Take care of yourself and we'll see you soon.`
                setMessages(prev => [...prev, { role: 'bot', text: queueMsg, time: now() }])

                setConversationStage('done')
                showNotif('You have been added to the queue!')
            }

            setAnalyzing(false)

        } catch (err: any) {
            setAnalyzing(false)
            const serverMsg = err?.response?.data?.error
            if (serverMsg === 'You are already in the queue') {
                setMessages(prev => [...prev, {
                    role: 'bot',
                    text: `It looks like you're already in the queue from a previous visit. 💙\n\nCheck your **My Queue** tab to see your current position and token.`,
                    time: now()
                }])
            } else {
                setMessages(prev => [...prev, { role: 'bot', text: `❌ Something went wrong. Please try again.`, time: now() }])
            }
            setConversationStage('done')
        }
    }

    const handleLogout = () => { logout(); navigate('/?from=patient') }

    const navItems = [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'symptom', label: 'Symptom Checker', icon: '🔍' },
        { id: 'queue', label: 'My Queue', icon: '📋' },
        { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
        { id: 'history', label: 'Visit History', icon: '📅' },
        { id: 'messages', label: 'Messages', icon: '💬' },
        { id: 'appointments', label: 'Appointments', icon: '📅' },
    ]

    const sidebar = (
        <div style={{
            width: isMobile ? '100%' : 240,
            background: '#0d1117',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem 1rem',
            gap: '0.35rem',
            flexShrink: 0,
            height: isMobile ? 'auto' : '100vh',
            position: isMobile ? 'fixed' : 'sticky',
            top: 0, left: 0, zIndex: isMobile ? 200 : 1,
            transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
            transition: 'transform 0.3s ease',
            boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(0,0,0,0.5)' : 'none',
            overflowY: 'auto',
            minHeight: '100vh',
            justifyContent: 'space-between',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.5rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 36, height: 36, background: '#1D9E75', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>+</div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white' }}>MediCore</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Patient Portal</div>
                </div>
            </div>

            <div style={{ flex: 1, paddingTop: '0.25rem' }}>
                {navItems.map(item => (
                    <button key={item.id} onClick={() => { setActiveTab(item.id as typeof activeTab); setSidebarOpen(false) }} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.7rem 0.85rem', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: activeTab === item.id ? 'rgba(29,158,117,0.15)' : 'transparent',
                        color: activeTab === item.id ? '#1D9E75' : '#9ca3af',
                        fontSize: '0.88rem', fontWeight: activeTab === item.id ? 600 : 400,
                        marginBottom: '0.15rem', textAlign: 'left',
                        borderLeft: activeTab === item.id ? '2px solid #1D9E75' : '2px solid transparent',
                        transition: 'all 0.15s'
                    }}>
                        <span style={{ fontSize: '1rem' }}>{item.icon}</span> {item.label}
                    </button>
                ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 34, height: 34, background: 'rgba(29,158,117,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#1D9E75' }}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{user?.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'capitalize' }}>{user?.role}</div>
                    </div>
                </div>
                <button onClick={handleLogout} style={{ width: '100%', padding: '0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>
                    Sign Out
                </button>
            </div>
        </div>
    )

    const homeTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 800 }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem' }}>
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
                </h1>
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>How are you feeling today?</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Queue Status', value: queueEntry ? `#${queueEntry.position}` : 'Not in queue', color: '#1D9E75', icon: '📋' },
                    { label: 'Est. Wait', value: queueEntry ? `${queueEntry.estimatedWait} min` : '—', color: '#7F77DD', icon: '⏱️' },
                    { label: 'Urgency', value: queueEntry?.urgency || '—', color: urgencyColor[queueEntry?.urgency || 'Low'] || '#6b7280', icon: '⚠️' },
                ].map(card => (
                    <div key={card.label} style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '1.25rem' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{card.icon}</div>
                        <div style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>{card.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div onClick={() => setActiveTab('symptom')} style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 14, padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(29,158,117,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(29,158,117,0.08)')}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.35rem' }}>Check Symptoms</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>Describe how you feel and get AI-powered urgency assessment</div>
                </div>
                <div style={{ background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 14, padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(127,119,221,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(127,119,221,0.08)')}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.35rem' }}>Track Queue</div>
                    <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>See your position and estimated wait time in real-time</div>
                </div>
            </div>
        </div>
    )

    const symptomTab = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 700, width: '100%' }}>
            <div style={{ padding: isMobile ? '1.25rem 1.25rem 0.75rem' : '2rem 2rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>AI Symptom Checker</h2>
                <p style={{ color: '#6b7280', fontSize: '0.82rem' }}>Describe your symptoms in detail for the best assessment</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '1rem 1.25rem' : '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.role === 'user' ? '#1D9E75' : '#161b22', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: msg.role === 'user' ? 'white' : '#9ca3af', flexShrink: 0 }}>
                            {msg.role === 'user' ? user?.name?.charAt(0) : '🤖'}
                        </div>
                        <div style={{ maxWidth: '75%' }}>
                            <div style={{ background: msg.role === 'user' ? '#1D9E75' : '#161b22', border: msg.role === 'bot' ? '1px solid rgba(255,255,255,0.06)' : 'none', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'white', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                                {renderFormattedText(msg.text)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '0.25rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>{msg.time}</div>
                        </div>
                    </div>
                ))}
                {analyzing && (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px 16px 16px 4px', padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#1D9E75', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: isMobile ? '0.75rem 1.25rem 1.25rem' : '1rem 2rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        placeholder="Describe your symptoms... (e.g. I have chest pain and difficulty breathing)"
                        rows={2}
                        style={{ flex: 1, background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.75rem 1rem', color: 'white', fontSize: '0.875rem', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <button onClick={handleSend} disabled={analyzing || !input.trim()} style={{ padding: '0.75rem 1.25rem', background: analyzing || !input.trim() ? 'rgba(29,158,117,0.3)' : '#1D9E75', border: 'none', borderRadius: 12, color: 'white', cursor: analyzing || !input.trim() ? 'not-allowed' : 'pointer', fontSize: '1.1rem', transition: 'all 0.2s' }}>
                        {analyzing ? '⏳' : '➤'}
                    </button>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '0.5rem' }}>Press Enter to send · Shift+Enter for new line</p>
            </div>
        </div>
    )

    const queueTab = (
        <div style={{ padding: isMobile ? '1.25rem' : '2rem', maxWidth: 600 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Queue Status</h2>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Real-time updates via WebSocket</p>

            {queueEntry ? (
                <div>
                    {/* Token Card */}
                    <div style={{ background: 'rgba(29,158,117,0.08)', border: '2px dashed rgba(29,158,117,0.3)', borderRadius: 16, padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                            Your Queue Token
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1D9E75', letterSpacing: '4px', fontFamily: 'monospace' }}>
                            {queueEntry.queueToken}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.5rem' }}>
                            Show this to the nurse when you arrive at the hospital
                        </div>
                    </div>

                    {/* Status Timeline */}
                    <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.25rem', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1rem' }}>
                            Status Timeline
                        </div>
                        {['Queued', 'Checked In', 'In Consultation', 'Completed'].map((step, i) => {
                            const steps = ['Queued', 'Checked In', 'In Consultation', 'Completed']
                            const currentIndex = steps.indexOf(queueEntry.status)
                            const isCompleted = i < currentIndex
                            const isCurrent = i === currentIndex
                            const icons = ['📋', '🏥', '🩺', '✅']
                            return (
                                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 3 ? '0.75rem' : 0 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isCompleted || isCurrent ? '#1D9E75' : '#1c2128', border: `2px solid ${isCompleted || isCurrent ? '#1D9E75' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
                                        {icons[i]}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: isCurrent ? 600 : 400, color: isCurrent ? 'white' : isCompleted ? '#10b981' : '#6b7280' }}>
                                            {step}
                                        </div>
                                        {isCurrent && step === 'Queued' && queueEntry.checkInDeadline && (
                                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '0.1rem' }}>
                                                ⚠️ Check in by {new Date(queueEntry.checkInDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} or lose your position
                                            </div>
                                        )}
                                        {isCurrent && step === 'Checked In' && (
                                            <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.1rem' }}>
                                                ✓ You have arrived — waiting to be called
                                            </div>
                                        )}
                                    </div>
                                    {(isCompleted || isCurrent) && (
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isCurrent ? '#f59e0b' : '#10b981', flexShrink: 0 }} />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Expired warning */}
                    {queueEntry.status === 'Expired' && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '1rem', marginBottom: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏰</div>
                            <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.25rem' }}>Queue Position Expired</div>
                            <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>You didn't check in within 30 minutes. Please rejoin the queue when you arrive.</div>
                            <button onClick={() => setActiveTab('symptom')} style={{ marginTop: '0.75rem', background: '#ef4444', border: 'none', color: 'white', padding: '0.6rem 1.25rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                                Rejoin Queue →
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1D9E75' }}>#{queueEntry.position}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Queue Position</div>
                        </div>
                        <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7F77DD' }}>{queueEntry.estimatedWait}m</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Est. Wait</div>
                        </div>
                    </div>

                    <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '1.25rem' }}>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Possible Conditions</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {(queueEntry.possibleConditions || []).map(c => (
                                <span key={c} style={{ background: 'rgba(127,119,221,0.12)', color: '#7F77DD', padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.78rem', border: '1px solid rgba(127,119,221,0.2)' }}>{c}</span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '3rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>Not in queue</div>
                    <div style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Use the symptom checker to join the queue</div>
                    <button onClick={() => setActiveTab('symptom')} style={{ background: '#1D9E75', border: 'none', color: 'white', padding: '0.7rem 1.5rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                        Check Symptoms →
                    </button>
                </div>
            )}
        </div>
    )

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0d1117', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>

            {notification && (
                <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', background: '#1D9E75', color: 'white', padding: '0.75rem 1.25rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 500, zIndex: 1000, boxShadow: '0 4px 20px rgba(29,158,117,0.4)' }}>
                    ✅ {notification}
                </div>
            )}

            {isMobile && sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} />
            )}

            {sidebar}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {isMobile && (
                    <div style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.65rem', borderRadius: 8, cursor: 'pointer', fontSize: '1rem' }}>☰</button>
                        <span style={{ fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>MediCore</span>
                        <div style={{ width: 32, height: 32, background: 'rgba(29,158,117,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D9E75', fontWeight: 700, fontSize: '0.85rem' }}>{user?.name?.charAt(0)}</div>
                    </div>
                )}

                {!isMobile && (
                    <div style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ color: 'white', fontWeight: 600, fontSize: '1rem', margin: 0 }}>
                            {navItems.find(n => n.id === activeTab)?.label}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
                            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Connected</span>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'home' && homeTab}
                    {activeTab === 'symptom' && symptomTab}
                    {activeTab === 'queue' && queueTab}
                    {activeTab === 'appointments' && <AppointmentsTab isMobile={isMobile} />}
                    {activeTab === 'prescriptions' && (
                        <PrescriptionsTab isMobile={isMobile} />
                    )}
                    {activeTab === 'history' && <VisitHistoryTab isMobile={isMobile} />}
                    {activeTab === 'messages' && (
                        <div style={{ height: '100%' }}>
                            <MessagingPanel isMobile={isMobile} accent="#1D9E75" />
                        </div>
                    )}
                </div>

                {isMobile && (
                    <div style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0' }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setActiveTab(item.id as typeof activeTab)} style={{ background: 'transparent', border: 'none', color: activeTab === item.id ? '#1D9E75' : '#6b7280', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', padding: '0.4rem 0.75rem', borderRadius: 8, fontSize: '0.62rem', fontWeight: activeTab === item.id ? 600 : 400 }}>
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