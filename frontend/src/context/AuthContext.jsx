import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser  = localStorage.getItem('labtrack_user');
    const savedToken = localStorage.getItem('labtrack_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('labtrack_token', data.token);
    localStorage.setItem('labtrack_user',  JSON.stringify(data.usuario));
    setUser(data.usuario);
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem('labtrack_token');
    localStorage.removeItem('labtrack_user');
    setUser(null);
  };

  const isAdmin     = () => user?.rol === 'admin';
  const isEncargado = () => ['admin', 'encargado'].includes(user?.rol);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isEncargado }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
