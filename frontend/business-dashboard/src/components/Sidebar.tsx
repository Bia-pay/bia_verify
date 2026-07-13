import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Layers,
  FileCheck2,
  Wallet,
  BookOpen,
  LogOut,
  UserCircle2,
  History,
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { business, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="Bia Verify" style={{ height: '32px', objectFit: 'contain' }} />
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="sidebar-menu">
          <li>
            <NavLink to="/dashboard" end className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/batch" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <Layers size={18} />
              <span>Batch Verify</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/kyc" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <FileCheck2 size={18} />
              <span>KYC Submissions</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/wallet" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <Wallet size={18} />
              <span>Wallet & Keys</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/transactions" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <History size={18} />
              <span>Transactions</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/docs" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <BookOpen size={18} />
              <span>API Integration</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <UserCircle2 size={18} />
              <span>Profile</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {business && (
        <div className="sidebar-profile">
          <div className="profile-info">
            <p className="profile-name">{business.fullName}</p>
            <p className="profile-role">
              {business.kycStatus === 'approved' ? 'Verified Partner' : 'KYC Pending'}
            </p>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
};
