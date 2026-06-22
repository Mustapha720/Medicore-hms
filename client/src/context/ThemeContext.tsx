import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
    colors: typeof darkColors
}

export const darkColors = {
    bg: '#0d1117',
    surface: '#161b22',
    surfaceAlt: '#1c2128',
    border: 'rgba(255,255,255,0.06)',
    borderStrong: 'rgba(255,255,255,0.1)',
    text: '#ffffff',
    textMuted: '#9ca3af',
    textFaint: '#6b7280',
    textFainter: '#4b5563',
}

export const lightColors = {
    bg: '#f5f6f8',
    surface: '#ffffff',
    surfaceAlt: '#f0f1f3',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.12)',
    text: '#0f172a',
    textMuted: '#4b5563',
    textFaint: '#6b7280',
    textFainter: '#9ca3af',
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('medicore-theme')
        return (saved as Theme) || 'dark'
    })

    useEffect(() => {
        localStorage.setItem('medicore-theme', theme)
        document.body.style.background = theme === 'dark' ? darkColors.bg : lightColors.bg
    }, [theme])

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    const colors = theme === 'dark' ? darkColors : lightColors

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) throw new Error('useTheme must be used within ThemeProvider')
    return context
}