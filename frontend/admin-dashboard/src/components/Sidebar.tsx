import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { 
  BarChart3, 
  Activity, 
  UserCheck, 
  Users, 
  HeartPulse, 
  LogOut,
  ArrowLeftRight
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { admin, logout } = useAdminAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">A</div>
        <span className="brand-name">Bia Admin</span>
      </div>

      <nav style={{ flex: 1 }}>
        <ul className="sidebar-menu">
          <li>
            <NavLink to="/" end className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <BarChart3 size={18} />
              <span>Revenue Summary</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/feed" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <Activity size={18} />
              <span>Live API Feed</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/kyc" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <UserCheck size={18} />
              <span>KYC Queue</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/businesses" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>Businesses</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/health" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <HeartPulse size={18} />
              <span>Upstream Health</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/reconciliation" className={({ isActive }) => `menu-item-link ${isActive ? 'active' : ''}`}>
              <ArrowLeftRight size={18} />
              <span>Reconciliation</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {admin && (
        <div className="sidebar-profile">
          <div className="profile-info">
            <p className="profile-name">{admin.fullName}</p>
            <p className="profile-role">Administrator</p>
          </div>
          <button onClick={logout} className="logout-btn" title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
};
