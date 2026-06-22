import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import { socket } from '../socket'
import { useAuth } from '../context/AuthContext'

interface User {
    _id: string
    name: string
    role: string
}

interface Message {
    _id: string
    senderId: { _id: string; name: string; role: string }
    receiverId: { _id: string; name: string; role: string }
    content: string
    createdAt: string
    readAt: string | null
    conversationId: string
}

const roleColor: Record<string, string> = {
    doctor: '#7F77DD',
    nurse: '#1D9E75',
    pharmacist: '#D85A30',
    lab_tech: '#f59e0b',
    patient: '#06b6d4'
}

const roleLabel: Record<string, string> = {
    doctor: 'Doctor',
    nurse: 'Nurse',
    pharmacist: 'Pharmacist',
    lab_tech: 'Lab Tech',
    patient: 'Patient'
}

interface Props {
    isMobile: boolean
    accent: string
}

export default function MessagingPanel({ isMobile, accent }: Props) {
    const { user } = useAuth()
    const [users, setUsers] = useState<User[]>([])
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState('')
    const [unread, setUnread] = useState<Record<string, number>>({})
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => { scrollToBottom() }, [messages])

    // Fetch all users
    const fetchUsers = useCallback(async () => {
        try {
            const r = await api.get('/messages/users')
            setUsers(r.data)
        } catch (_) { }
    }, [])

    // Fetch messages for selected conversation
    const fetchMessages = useCallback(async () => {
        if (!selectedUser) return
        try {
            const r = await api.get(`/messages/conversation/${selectedUser._id}`)
            setMessages(r.data)
            // Clear unread for this conversation
            setUnread(prev => ({ ...prev, [selectedUser._id]: 0 }))
        } catch (_) { }
    }, [selectedUser])

    // Fetch messages when component mounts if user already selected
    useEffect(() => {
        fetchMessages()
    }, [fetchMessages])

    useEffect(() => { fetchUsers() }, [fetchUsers])

    // Auto-select last conversation if available
    useEffect(() => {
        if (users.length > 0 && !selectedUser) {
            api.get('/messages/conversations')
                .then(r => {
                    if (r.data.length > 0) {
                        const lastMsg = r.data[0]
                        const otherId = lastMsg.senderId._id === user?.id
                            ? lastMsg.receiverId
                            : lastMsg.senderId
                        if (otherId && otherId._id) {
                            const contact = users.find(u => u._id === otherId._id)
                            if (contact) setSelectedUser(contact)
                        }
                    }
                })
                .catch(() => { })
        }
    }, [users, user?.id])

    useEffect(() => {
        if (selectedUser) fetchMessages()
    }, [selectedUser, fetchMessages])

    // Listen for new messages
    useEffect(() => {
        const handleNewMessage = (data: { message: Message }) => {
            const msg = data.message
            const senderId = msg.senderId._id || msg.senderId

            if (selectedUser && senderId === selectedUser._id) {
                setMessages(prev => [...prev, msg])
                // Mark as read immediately
                api.get(`/messages/conversation/${selectedUser._id}`).catch(() => { })
            } else {
                // Increment unread count
                setUnread(prev => ({
                    ...prev,
                    [senderId as string]: (prev[senderId as string] || 0) + 1
                }))
            }
        }

        socket.on('message:new', handleNewMessage)
        return () => { socket.off('message:new', handleNewMessage) }
    }, [selectedUser])

    const sendMessage = async () => {
        if (!input.trim() || !selectedUser || sending) return
        setSending(true)
        try {
            const r = await api.post('/messages/send', {
                receiverId: selectedUser._id,
                content: input.trim()
            })
            setMessages(prev => [...prev, r.data])
            setInput('')
        } catch (_) { } finally { setSending(false) }
    }

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    )

    const inputStyle = {
        background: '#1c2128',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '0.65rem 1rem',
        color: 'white',
        fontSize: '0.875rem',
        outline: 'none',
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box' as const
    }

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

            {/* Users sidebar */}
            <div style={{
                width: isMobile ? (selectedUser ? '0' : '100%') : 260,
                minWidth: isMobile ? (selectedUser ? '0' : '100%') : 260,
                borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all 0.2s'
            }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h3 style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', margin: '0 0 0.75rem' }}>
                        Messages
                    </h3>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or role..."
                        style={{ ...inputStyle, padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredUsers.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.82rem' }}>
                            No users found
                        </div>
                    ) : (
                        filteredUsers.map(u => (
                            <div
                                key={u._id}
                                onClick={() => setSelectedUser(u)}
                                style={{
                                    padding: '0.85rem 1rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    background: selectedUser?._id === u._id ? 'rgba(255,255,255,0.06)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    transition: 'background 0.15s',
                                    borderLeft: selectedUser?._id === u._id ? `2px solid ${accent}` : '2px solid transparent'
                                }}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%',
                                    background: `${roleColor[u.role] || accent}25`,
                                    border: `1px solid ${roleColor[u.role] || accent}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: roleColor[u.role] || accent, fontWeight: 700, fontSize: '0.9rem',
                                    flexShrink: 0, position: 'relative'
                                }}>
                                    {u.name.charAt(0).toUpperCase()}
                                    {/* Unread badge */}
                                    {unread[u._id] > 0 && (
                                        <div style={{
                                            position: 'absolute', top: -2, right: -2,
                                            width: 16, height: 16, borderRadius: '50%',
                                            background: '#ef4444', fontSize: '0.6rem',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700
                                        }}>
                                            {unread[u._id]}
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem', marginBottom: '0.15rem' }}>
                                        {u.name}
                                    </div>
                                    <div style={{
                                        fontSize: '0.72rem',
                                        color: roleColor[u.role] || '#6b7280',
                                        fontWeight: 500
                                    }}>
                                        {roleLabel[u.role] || u.role}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                width: isMobile && !selectedUser ? '0' : 'auto'
            }}>
                {selectedUser ? (
                    <>
                        {/* Chat header */}
                        <div style={{
                            padding: '0.85rem 1.25rem',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            background: '#0d1117'
                        }}>
                            {isMobile && (
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.1rem', padding: 0, marginRight: '0.25rem' }}
                                >
                                    ←
                                </button>
                            )}
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: `${roleColor[selectedUser.role] || accent}25`,
                                border: `1px solid ${roleColor[selectedUser.role] || accent}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: roleColor[selectedUser.role] || accent, fontWeight: 700, fontSize: '0.85rem'
                            }}>
                                {selectedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>{selectedUser.name}</div>
                                <div style={{ fontSize: '0.72rem', color: roleColor[selectedUser.role] || '#6b7280', fontWeight: 500 }}>
                                    {roleLabel[selectedUser.role] || selectedUser.role}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{
                            flex: 1, overflowY: 'auto',
                            padding: '1rem 1.25rem',
                            display: 'flex', flexDirection: 'column', gap: '0.75rem'
                        }}>
                            {messages.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💬</div>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        Start a conversation with {selectedUser.name}
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, i) => {
                                    const isMe = msg.senderId._id === user?.id
                                    const showDate = i === 0 || new Date(msg.createdAt).toDateString() !==
                                        new Date(messages[i - 1].createdAt).toDateString()

                                    return (
                                        <div key={msg._id || i}>
                                            {showDate && (
                                                <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                                                    <span style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', padding: '0.2rem 0.75rem', borderRadius: 20, fontSize: '0.72rem' }}>
                                                        {new Date(msg.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            )}
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: isMe ? 'row-reverse' : 'row',
                                                gap: '0.5rem',
                                                alignItems: 'flex-end'
                                            }}>
                                                {!isMe && (
                                                    <div style={{
                                                        width: 28, height: 28, borderRadius: '50%',
                                                        background: `${roleColor[msg.senderId.role] || accent}25`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: roleColor[msg.senderId.role] || accent,
                                                        fontWeight: 700, fontSize: '0.7rem', flexShrink: 0
                                                    }}>
                                                        {msg.senderId.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div style={{ maxWidth: '70%' }}>
                                                    <div style={{
                                                        background: isMe ? accent : '#1c2128',
                                                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                        padding: '0.65rem 0.9rem',
                                                        fontSize: '0.875rem', color: 'white', lineHeight: 1.5
                                                    }}>
                                                        {msg.content}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.65rem', color: '#4b5563',
                                                        marginTop: '0.2rem',
                                                        textAlign: isMe ? 'right' : 'left',
                                                        display: 'flex', gap: '0.35rem',
                                                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                        alignItems: 'center'
                                                    }}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isMe && (
                                                            <span style={{ color: msg.readAt ? accent : '#4b5563' }}>
                                                                {msg.readAt ? '✓✓' : '✓'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{
                            padding: '0.75rem 1.25rem',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-end'
                        }}>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        sendMessage()
                                    }
                                }}
                                placeholder={`Message ${selectedUser.name}...`}
                                rows={1}
                                style={{
                                    ...inputStyle,
                                    resize: 'none',
                                    flex: 1,
                                    maxHeight: 100
                                }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={sending || !input.trim()}
                                style={{
                                    padding: '0.65rem 1.1rem',
                                    background: sending || !input.trim() ? `${accent}40` : accent,
                                    border: 'none', borderRadius: 10, color: 'white',
                                    cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                                    fontSize: '1rem', flexShrink: 0, transition: 'all 0.2s'
                                }}
                            >
                                {sending ? '⏳' : '➤'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexDirection: 'column',
                        gap: '0.75rem', color: '#6b7280'
                    }}>
                        <div style={{ fontSize: '3.5rem' }}>💬</div>
                        <div style={{ fontWeight: 600, color: '#9ca3af', fontSize: '0.95rem' }}>
                            Select a conversation
                        </div>
                        <div style={{ fontSize: '0.82rem' }}>
                            Choose someone from the list to start messaging
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}