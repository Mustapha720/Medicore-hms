import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const portals = [
  {
    title: 'Patient Portal',
    description: 'Check your symptoms with AI, join the queue, track wait time, and view your prescriptions.',
    role: 'patient',
    accent: '#0F6E56',
    light: '#E1F5EE',
    mid: '#1D9E75',
    icon: '🏥',
    features: ['AI Symptom Checker', 'Live Queue Tracker', 'Prescription History']
  },
  {
    title: 'Doctor Portal',
    description: 'Manage patient consultations, prescriptions, assign tasks and coordinate with your team.',
    role: 'doctor',
    accent: '#3C3489',
    light: '#EEEDFE',
    mid: '#7F77DD',
    icon: '👨‍⚕️',
    features: ['Patient Queue', 'Consultation Tools', 'Staff Coordination']
  },
  {
    title: 'Staff Portal',
    description: 'View and update assigned tasks, communicate with doctors, and manage patient care.',
    role: 'staff',
    accent: '#712B13',
    light: '#FAECE7',
    mid: '#D85A30',
    icon: '👩‍⚕️',
    features: ['Task Management', 'Secure Messaging', 'Workflow Alerts']
  },
  {
    title: 'Admin Portal',
    description: 'Manage users, view system stats, monitor activity and oversee all hospital operations.',
    role: 'admin',
    accent: '#0F6E56',
    light: '#E1F5EE',
    mid: '#e11d48',
    icon: '⚙️',
    features: ['User Management', 'System Statistics', 'Activity Monitor']
  },
]

const stats = [
  { value: '99%', label: 'Uptime' },
  { value: '<10s', label: 'Avg Response' },
  { value: '3', label: 'Role Portals' },
  { value: 'Live', label: 'Real-time Sync' },
]

const Landing = () => {
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isTablet, setIsTablet] = useState(window.innerWidth < 1024)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const { theme, toggleTheme, colors } = useTheme()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      // background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)',
      background: colors.bg, color: colors.text, transition: 'background 0.3s ease, color 0.3s ease',
      // color: 'white',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflowX: 'hidden'
    }}>

      {/* Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '1rem 1.25rem' : '1.25rem 3rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10,10,10,0.9)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: '#1D9E75',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, flexShrink: 0
          }}>+</div>
          <span style={{ fontWeight: 700, fontSize: isMobile ? '1rem' : '1.1rem', letterSpacing: '-0.3px' }}>
            MediCore HMS
          </span>
        </div>

        {/* Desktop nav buttons */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.1rem',
                color: 'white'
              }}
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>Sign In</button>
            <button onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })} style={{
              background: '#1D9E75',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1.25rem',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>Get Started</button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.4rem 0.75rem',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        )}
      </nav>

      {/* Mobile menu dropdown */}
      {isMobile && menuOpen && (
        <div style={{
          background: 'rgba(17,24,39,0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          position: 'sticky',
          top: 65,
          zIndex: 99
        }}>
          <button onClick={() => { navigate('/login'); setMenuOpen(false) }} style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            padding: '0.65rem',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 500
          }}>Sign In</button>
          <button onClick={() => { navigate('/register'); setMenuOpen(false) }} style={{
            background: '#1D9E75',
            border: 'none',
            color: 'white',
            padding: '0.65rem',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: 600
          }}>Get Started</button>
        </div>
      )}

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: isMobile ? '3rem 1.25rem 2rem' : '5rem 2rem 3rem',
        maxWidth: 800,
        margin: '0 auto'
      }}>
        <div style={{
          display: 'inline-block',
          background: 'rgba(29,158,117,0.15)',
          border: '1px solid rgba(29,158,117,0.3)',
          color: '#1D9E75',
          padding: '0.35rem 1rem',
          borderRadius: 20,
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.5px',
          marginBottom: '1.5rem',
          textTransform: 'uppercase'
        }}>
          AI-Powered Hospital Management
        </div>

        <h1 style={{
          fontSize: isMobile ? '2rem' : isTablet ? '2.8rem' : '3.5rem',
          fontWeight: 800,
          lineHeight: 1.15,
          marginBottom: '1.25rem',
          letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #ffffff 0%, #9ca3af 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Healthcare Coordination,{' '}
          <span style={{
            background: 'linear-gradient(135deg, #1D9E75, #7F77DD)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Reimagined
          </span>
        </h1>

        <p style={{
          color: '#9ca3af',
          fontSize: isMobile ? '0.95rem' : '1.1rem',
          lineHeight: 1.7,
          maxWidth: 560,
          margin: '0 auto 2rem'
        }}>
          A unified platform connecting patients, doctors, and staff with real-time updates,
          AI symptom analysis, and seamless workflow automation.
        </p>

        {/* CTA buttons on mobile */}
        {isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '2rem',
            maxWidth: 320,
            margin: '0 auto 2rem'
          }}>
            <button onClick={() => navigate('/register')} style={{
              background: '#1D9E75',
              border: 'none',
              color: 'white',
              padding: '0.85rem',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600
            }}>Get Started Free</button>
            <button onClick={() => navigate('/login')} style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              padding: '0.85rem',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 500
            }}>Sign In</button>
          </div>
        )}

        {/* Stats bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: isMobile ? '1.5rem' : '2.5rem',
          flexWrap: 'wrap',
          padding: isMobile ? '1rem' : '1.25rem 2rem',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          maxWidth: 500,
          margin: '0 auto 3rem'
        }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 700, color: '#1D9E75' }}>
                {s.value}
              </div>
              <div style={{
                fontSize: '0.7rem',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section label */}
      <p id="portals" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '1.5rem'
      }}>
        Choose your portal
      </p>

      {/* Portal Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
        maxWidth: 700,
        gap: '1.25rem',
        padding: isMobile ? '0 1.25rem 4rem' : '0 3rem 5rem',
        margin: '0 auto',
      }}>
        {portals.map((portal) => (
          <div
            key={portal.role}
            style={{
              background: hoveredCard === portal.role ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: hoveredCard === portal.role
                ? `1px solid ${portal.mid}60`
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: isMobile ? '1.5rem' : '2rem',
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              transform: hoveredCard === portal.role ? 'translateY(-6px)' : 'translateY(0)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={() => setHoveredCard(portal.role)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Top accent line */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${portal.mid}, transparent)`,
              borderRadius: '20px 20px 0 0'
            }} />

            {/* Icon */}
            <div style={{
              width: 52, height: 52,
              background: `${portal.mid}20`,
              border: `1px solid ${portal.mid}40`,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              marginBottom: '1.25rem'
            }}>
              {portal.icon}
            </div>

            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'white',
              marginBottom: '0.6rem',
              letterSpacing: '-0.3px'
            }}>
              {portal.title}
            </h2>

            <p style={{
              color: '#9ca3af',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem'
            }}>
              {portal.description}
            </p>

            {/* Feature list */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginBottom: '1.75rem'
            }}>
              {portal.features.map(f => (
                <div key={f} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  color: '#d1d5db'
                }}>
                  <div style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: portal.mid,
                    flexShrink: 0
                  }} />
                  {f}
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate(`/login?role=${portal.role}`)}
              style={{
                width: '100%',
                padding: '0.7rem',
                background: `linear-gradient(135deg, ${portal.mid}, ${portal.accent})`,
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.2px'
              }}
            >
              Enter {portal.title.split(' ')[0]} Portal →
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: isMobile ? '1.25rem' : '1.5rem 3rem',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#4b5563',
        fontSize: '0.8rem',
        gap: '0.5rem',
        textAlign: isMobile ? 'center' : 'left'
      }}>
        <span>© 2026 MediCore HMS. All rights reserved.</span>
        <span>Built with React · Node.js · MongoDB · Socket.io</span>
      </div>
    </div>
  )
}

export default Landing