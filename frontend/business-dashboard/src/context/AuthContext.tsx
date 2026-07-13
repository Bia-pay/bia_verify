import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BusinessUser {
  id: string;
  email: string;
  fullName: string;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  token: string | null;
  business: BusinessUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<{ verificationLink?: string; apiKey?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('bv_biz_token'));
  const [business, setBusiness] = useState<BusinessUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentToken: string) => {
    try {
      const response = await fetch('https://verify.bia.com.ng/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setBusiness(data.business);
      } else {
        // Token expired or invalid
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch business profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await fetch('https://verify.bia.com.ng/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('bv_biz_token', data.token);
    setToken(data.token);
    setBusiness(data.business);
  };

  const register = async (fullName: string, email: string, phoneNumber: string, password: string) => {
    const response = await fetch('https://verify.bia.com.ng/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, phoneNumber, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return {
      verificationLink: data.verificationLink,
      apiKey: data.apiKey
    };
  };

  const logout = () => {
    localStorage.removeItem('bv_biz_token');
    setToken(null);
    setBusiness(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ token, business, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
