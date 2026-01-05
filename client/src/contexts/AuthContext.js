import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Configurar baseURL do axios de forma dinâmica
  useEffect(() => {
    const base = process.env.REACT_APP_API_URL || '';
    if (base) {
      axios.defaults.baseURL = base;
      try { console.debug(`Axios baseURL: ${base}`); } catch (_) {}
    }
  }, []);

  useEffect(() => {
    if (process.env.REACT_APP_AUTH_BYPASS === 'true') {
      setUser({ id: 0, username: 'dev', email: 'dev@example.com', role: 'admin' });
      setLoading(false);
    }
  }, []);

  // Configurar interceptor do axios para incluir token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const reqInterceptor = axios.interceptors.request.use((config) => {
      try {
        const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (t) {
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${t}`;
          console.debug('AuthInterceptor: Authorization attached');
        }
      } catch (_) {}
      return config;
    });

    // Interceptor para lidar com erros de autenticação
    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
          toast.error('Sessão expirada. Faça login novamente.');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(resInterceptor);
      axios.interceptors.request.eject(reqInterceptor);
    };
  }, []);

  // Verificar se há um token válido ao carregar a aplicação
  useEffect(() => {
    if (process.env.REACT_APP_AUTH_BYPASS === 'true') {
      return; // em modo bypass não verificamos token
    }
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await axios.get('/api/auth/verify');
      setUser(response.data.user);
    } catch (error) {
      console.error('Token inválido:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });

      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      toast.success(`Bem-vindo, ${userData.username}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao fazer login';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password
      });

      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      toast.success(`Conta criada com sucesso! Bem-vindo, ${userData.username}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao criar conta';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logout realizado com sucesso!');
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    verifyToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
