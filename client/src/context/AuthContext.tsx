import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { connectSocket, disconnectSocket } from '../socket'

interface User {
  id: string;
  _id?: string
  name: string;
  role: 'patient' | 'doctor' | 'nurse' | 'pharmacist' | 'lab_tech' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) connectSocket(savedToken)
    setIsLoading(false)
  }, [])

  const login = (token: string, user: User) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    connectSocket(token)
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket()
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) connectSocket(savedToken)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
export default AuthContext;