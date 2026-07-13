import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User, Mail, Phone, ShieldCheck, Lock, Trash2, LogOut,
  HeadphonesIcon, Eye, EyeOff, AlertCircle, CheckCircle2,
  ChevronRight, MessageSquare, ExternalLink
} from 'lucide-react';

const API = 'http://localhost:5001/api/v1';

type Section = 'main' | 'change-password' | 'delete-account';

export const Profile: React.FC = () => {
  const { business, token, logout } = useAuth();
  const navigate = useNavigate();

  const [section, setSection] = useState<Section>('main');

  // Change password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changePwLoading, setChangePwLoading] = useState(false);

  // Delete account
  const [deleteConfirmPw, setDeleteConfirmPw] = useState('');
  const [showDeletePw, setShowDeletePw] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clear = () => { setError(''); setSuccess(''); };
  const goBack = () => { setSection('main'); clear(); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setDeleteConfirmPw(''); };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
    if (newPw.length < 8)   { setError('New password must be at least 8 characters.'); return; }
    setChangePwLoading(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password.');
      setSuccess('Password changed successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChangePwLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    clear();
    if (!window.confirm('This will permanently delete your account and all data. Are you absolutely sure?')) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/auth/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deleteConfirmPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deletion failed.');
      logout();
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!business) return null;

  const kycBadge = {
    approved: { bg: 'rgba(16,185,129,0.08)', color: '#10b981', border: 'rgba(16,185,129,0.25)', label: 'KYC Approved' },
    pending:  { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)',  label: 'KYC Pending' },
    rejected: { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)',   label: 'KYC Rejected' },
    none:     { bg: 'rgba(100,116,139,0.08)', color: '#64748b', border: 'rgba(100,116,139,0.25)', label: 'Unverified' },
  }[business.kycStatus] ?? { bg: 'rgba(100,116,139,0.08)', color: '#64748b', border: 'rgba(100,116,139,0.25)', label: 'Unverified' };

  const initials = business.fullName.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.03em' }}>Account Profile</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Manage your account security, settings, and support options.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Identity card */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '24px' }}>
              <div style={{
                width: '62px', height: '62px', borderRadius: '18px', flexShrink: 0,
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em',
              }}>
                {initials}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>{business.fullName}</h3>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px',
                  borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', background: kycBadge.bg, color: kycBadge.color, border: `1px solid ${kycBadge.border}`,
                }}>
                  <ShieldCheck size={11} /> {kycBadge.label}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                  <Mail size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{business.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                  <User size={15} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account ID</div>
                  <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{business.id}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Care card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <HeadphonesIcon size={17} />
              </div>
              <h3 style={{ fontSize: '0.95rem' }}>Customer Support</h3>
            </div>

            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.6 }}>
              Need help? Our support team is available to assist you with any issues or queries.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a href="tel:08144391922" style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '12px', textDecoration: 'none',
                background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.05)')}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                  <Phone size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Call Support</div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem', marginTop: '1px' }}>08144391922</div>
                </div>
                <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
              </a>

              <a href="mailto:support@bia.com.ng" style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 16px', borderRadius: '12px', textDecoration: 'none',
                background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.05)')}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                  <MessageSquare size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Support</div>
                  <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: '0.88rem', marginTop: '1px' }}>support@bia.com.ng</div>
                </div>
                <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
              </a>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Alert area */}
          {error && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.84rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} /> <span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.84rem' }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} /> <span>{success}</span>
            </div>
          )}

          {/* ── MAIN section: action list ── */}
          {section === 'main' && (
            <div className="glass-panel" style={{ padding: '8px 0', overflow: 'hidden' }}>
              {[
                {
                  icon: <Lock size={17} />, iconBg: 'rgba(139,92,246,0.1)', iconColor: 'var(--primary)',
                  label: 'Change Password', sub: 'Update your login password', action: () => setSection('change-password'),
                },
                {
                  icon: <LogOut size={17} />, iconBg: 'rgba(59,130,246,0.1)', iconColor: '#3b82f6',
                  label: 'Log Out', sub: 'Sign out of this device', action: handleLogout,
                },
                {
                  icon: <Trash2 size={17} />, iconBg: 'rgba(239,68,68,0.1)', iconColor: '#ef4444',
                  label: 'Delete Account', sub: 'Permanently remove your account and data', action: () => setSection('delete-account'),
                  danger: true,
                },
              ].map((item) => (
                <button key={item.label} onClick={item.action}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '18px 22px', background: 'transparent', border: 'none',
                    borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                    textAlign: 'left', transition: 'background 0.15s', fontFamily: 'var(--font-sans)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.04)' : 'rgba(0,0,0,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: item.iconBg, color: item.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: item.danger ? '#ef4444' : 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '1px' }}>{item.sub}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </button>
              ))}
              {/* Remove border from last item */}
              <style>{`button:last-child { border-bottom: none !important; }`}</style>
            </div>
          )}

          {/* ── CHANGE PASSWORD ── */}
          {section === 'change-password' && (
            <div className="glass-panel" style={{ padding: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={goBack} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
                  ← Back
                </button>
                <h3 style={{ fontSize: '1rem' }}>Change Password</h3>
              </div>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { label: 'Current Password', val: currentPw, set: setCurrentPw, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                  { label: 'New Password', val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(v => !v) },
                  { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw, show: false, toggle: () => {}, noToggle: true },
                ].map(({ label, val, set, show, toggle, noToggle }) => (
                  <div className="form-group" key={label} style={{ margin: 0 }}>
                    <label className="form-label">{label}</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type={show ? 'text' : 'password'} required className="form-input"
                        style={{ paddingLeft: '36px', paddingRight: noToggle ? '12px' : '38px', width: '100%' }}
                        placeholder="••••••••" value={val}
                        onChange={(e) => set(e.target.value)} />
                      {!noToggle && (
                        <button type="button" onClick={toggle}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                          {show ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button type="submit" disabled={changePwLoading}
                  className={`btn-base btn-primary ${changePwLoading ? 'btn-disabled' : ''}`}
                  style={{ width: '100%', padding: '12px', marginTop: '4px' }}>
                  {changePwLoading ? <span className="spinner" /> : <><Lock size={14} /> Update Password</>}
                </button>
              </form>
            </div>
          )}

          {/* ── DELETE ACCOUNT ── */}
          {section === 'delete-account' && (
            <div className="glass-panel" style={{ padding: '26px', border: '1.5px solid rgba(239,68,68,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button onClick={goBack} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>
                  ← Back
                </button>
                <h3 style={{ fontSize: '1rem', color: '#ef4444' }}>Delete Account</h3>
              </div>

              <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                ⚠️ <strong style={{ color: '#ef4444' }}>This action is irreversible.</strong> Your account, wallet balance, API keys, verification history, and KYC records will be permanently deleted.
              </div>

              <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirm with your password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type={showDeletePw ? 'text' : 'password'} required className="form-input"
                      style={{ paddingLeft: '36px', paddingRight: '38px', width: '100%', borderColor: 'rgba(239,68,68,0.4)' }}
                      placeholder="Enter your password" value={deleteConfirmPw}
                      onChange={(e) => setDeleteConfirmPw(e.target.value)} />
                    <button type="button" onClick={() => setShowDeletePw(v => !v)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                      {showDeletePw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={deleteLoading}
                  className={`btn-base btn-danger ${deleteLoading ? 'btn-disabled' : ''}`}
                  style={{ width: '100%', padding: '12px' }}>
                  {deleteLoading ? <span className="spinner" /> : <><Trash2 size={14} /> Permanently Delete Account</>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
