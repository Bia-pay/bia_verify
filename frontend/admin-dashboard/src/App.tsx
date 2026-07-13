import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Revenue } from './pages/Revenue';
import { LiveFeed } from './pages/LiveFeed';
import { KycQueue } from './pages/KycQueue';
import { BusinessManager } from './pages/BusinessManager';
import { UpstreamHealth } from './pages/UpstreamHealth';
import { Reconciliation } from './pages/Reconciliation';

// Protected Admin Layout
const AdminLayout: React.FC = () => {
  const { token, loading } = useAdminAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#070a13',
        color: '#ffffff'
      }}>
        <span className="spinner" style={{ width: '40px', height: '40px' }}></span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<Login />} />

          {/* Protected admin routing */}
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Revenue />} />
            <Route path="/feed" element={<LiveFeed />} />
            <Route path="/kyc" element={<KycQueue />} />
            <Route path="/businesses" element={<BusinessManager />} />
            <Route path="/health" element={<UpstreamHealth />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
};

export default App;
