import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  Users, ShieldAlert, ShieldCheck, DollarSign, RefreshCw, X,
  AlertCircle, Settings, Wallet, TrendingUp, CheckCircle2,
  Building2, Mail, Phone, Calendar, ChevronRight, Tag
} from 'lucide-react';

interface BusinessItem {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  kycStatus: string;
  suspended: boolean;
  createdAt: string;
  balance: number;
  singleVerificationPrice: number;
  bulkVerificationSurcharge: number;
}

type DrawerTab = 'wallet' | 'pricing';

const kycColor: Record<string, { bg: string; text: string; border: string }> = {
  approved: {
    bg: 'rgba(16,185,129,0.08)',
    text: '#10b981',
    border: 'rgba(16,185,129,0.25)',
  },
  pending: {
    bg: 'rgba(245,158,11,0.08)',
    text: '#f59e0b',
    border: 'rgba(245,158,11,0.25)',
  },
  rejected: {
    bg: 'rgba(239,68,68,0.08)',
    text: '#ef4444',
    border: 'rgba(239,68,68,0.25)',
  },
  none: {
    bg: 'rgba(100,116,139,0.08)',
    text: '#64748b',
    border: 'rgba(100,116,139,0.25)',
  },
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0ea5e9'],
  ['#f59e0b', '#ef4444'],
  ['#8b5cf6', '#ec4899'],
];

function avatarGradient(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  const [a, b] = AVATAR_COLORS[idx];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

export const BusinessManager: React.FC = () => {
  const { token } = useAdminAuth();

  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Drawer state
  const [selectedBiz, setSelectedBiz] = useState<BusinessItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('wallet');

  // Wallet adjustment
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDesc, setAdjustDesc] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');

  // Pricing
  const [singlePriceInput, setSinglePriceInput] = useState('');
  const [bulkSurchargeInput, setBulkSurchargeInput] = useState('');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState('');
  const [pricingSuccess, setPricingSuccess] = useState('');

  useEffect(() => {
    if (selectedBiz) {
      const single =
        isNaN(selectedBiz.singleVerificationPrice) || selectedBiz.singleVerificationPrice == null
          ? 70
          : selectedBiz.singleVerificationPrice;
      const surcharge =
        isNaN(selectedBiz.bulkVerificationSurcharge) || selectedBiz.bulkVerificationSurcharge == null
          ? 15
          : selectedBiz.bulkVerificationSurcharge;
      setSinglePriceInput(single.toFixed(2));
      setBulkSurchargeInput(surcharge.toFixed(2));
    } else {
      setSinglePriceInput('');
      setBulkSurchargeInput('');
    }
    setAdjustAmount('');
    setAdjustDesc('');
    setAdjustError('');
    setAdjustSuccess('');
    setPricingError('');
    setPricingSuccess('');
  }, [selectedBiz]);

  const fetchBusinesses = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/v1/admin/businesses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: BusinessItem[] = data.businesses || [];
        setBusinesses(list);
        if (selectedBiz) {
          const match = list.find((b) => b.id === selectedBiz.id);
          if (match) setSelectedBiz(match);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [token]);

  const handleToggleSuspend = async (biz: BusinessItem) => {
    if (!token) return;
    const targetStatus = !biz.suspended;
    const actionWord = targetStatus ? 'suspend' : 'unsuspend';
    if (!window.confirm(`Are you sure you want to ${actionWord} ${biz.fullName}?`)) return;

    try {
      const res = await fetch(`http://localhost:5001/api/v1/admin/businesses/${biz.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suspend: targetStatus }),
      });
      if (res.ok) fetchBusinesses();
      else alert('Failed to modify account state.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz || !token) return;
    setAdjustError('');
    setAdjustSuccess('');
    const amt = parseFloat(adjustAmount);
    if (isNaN(amt) || amt === 0) { setAdjustError('Enter a valid non-zero amount.'); return; }
    if (!adjustDesc.trim()) { setAdjustError('An audit note is required.'); return; }
    setAdjustLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/v1/admin/businesses/${selectedBiz.id}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: amt, description: adjustDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Adjustment failed.');
      setAdjustSuccess(`Balance updated. New balance: ₦${data.newBalance.toFixed(2)}`);
      setAdjustAmount('');
      setAdjustDesc('');
      fetchBusinesses();
    } catch (err: any) {
      setAdjustError(err.message || 'An error occurred.');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handlePricingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz || !token) return;
    setPricingError('');
    setPricingSuccess('');
    const sp = parseFloat(singlePriceInput);
    const bs = parseFloat(bulkSurchargeInput);
    if (isNaN(sp) || sp < 0) { setPricingError('Enter a valid single price.'); return; }
    if (isNaN(bs) || bs < 0) { setPricingError('Enter a valid bulk surcharge.'); return; }
    setPricingLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/v1/admin/businesses/${selectedBiz.id}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ singleVerificationPrice: sp, bulkVerificationSurcharge: bs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Pricing update failed.');
      setPricingSuccess('Pricing updated successfully.');
      fetchBusinesses();
    } catch (err: any) {
      setPricingError(err.message || 'An error occurred.');
    } finally {
      setPricingLoading(false);
    }
  };

  const filtered = businesses.filter((b) =>
    !search ||
    b.fullName.toLowerCase().includes(search.toLowerCase()) ||
    b.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: businesses.length,
    approved: businesses.filter((b) => b.kycStatus === 'approved').length,
    suspended: businesses.filter((b) => b.suspended).length,
    totalBalance: businesses.reduce((s, b) => s + (b.balance || 0), 0),
  };

  return (
    <div className="main-content">
      {/* ── Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.03em' }}>Partner Management</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Manage partner accounts, wallet balances, and custom verification pricing.
            </p>
          </div>
          <button onClick={fetchBusinesses} className="btn-base btn-secondary" style={{ padding: '10px 18px', gap: '6px' }}>
            <RefreshCw size={15} style={{ transition: 'transform 0.4s', transform: loading ? 'rotate(360deg)' : 'rotate(0deg)' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Partners', value: stats.total, icon: <Users size={18} />, color: 'var(--primary)', glow: 'var(--primary-glow)' },
          { label: 'KYC Approved', value: stats.approved, icon: <CheckCircle2 size={18} />, color: 'var(--success)', glow: 'rgba(16,185,129,0.12)' },
          { label: 'Suspended', value: stats.suspended, icon: <ShieldAlert size={18} />, color: '#ef4444', glow: 'rgba(239,68,68,0.10)' },
          { label: 'Total Balances', value: `₦${stats.totalBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, icon: <TrendingUp size={18} />, color: '#f59e0b', glow: 'rgba(245,158,11,0.10)' },
        ].map((s) => (
          <div key={s.label} className="glass-panel" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: s.glow, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', letterSpacing: '-0.02em' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedBiz ? '1fr 400px' : '1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── Business Cards ── */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {/* Search */}
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name or email…"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '16px' }}
            />
          </div>

          {loading && businesses.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <span className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Users size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
              <p style={{ fontWeight: 600 }}>{search ? 'No results found.' : 'No partner accounts yet.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map((biz) => {
                const kyc = kycColor[biz.kycStatus] || kycColor.none;
                const isSelected = selectedBiz?.id === biz.id;
                const single = isNaN(biz.singleVerificationPrice) || biz.singleVerificationPrice == null ? 70 : biz.singleVerificationPrice;
                const surcharge = isNaN(biz.bulkVerificationSurcharge) || biz.bulkVerificationSurcharge == null ? 15 : biz.bulkVerificationSurcharge;

                return (
                  <div
                    key={biz.id}
                    style={{
                      background: isSelected ? 'rgba(139,92,246,0.04)' : '#fff',
                      border: isSelected ? '1.5px solid rgba(139,92,246,0.35)' : '1px solid var(--border-color)',
                      borderRadius: '14px',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 0 3px rgba(139,92,246,0.08)' : 'none',
                    }}
                    onClick={() => setSelectedBiz(isSelected ? null : biz)}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '13px',
                      background: avatarGradient(biz.id),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                      letterSpacing: '-0.02em'
                    }}>
                      {getInitials(biz.fullName)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {biz.fullName}
                        </span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '2px 9px',
                          borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          background: kyc.bg, color: kyc.text, border: `1px solid ${kyc.border}`
                        }}>
                          {biz.kycStatus === 'none' ? 'Unverified' : biz.kycStatus}
                        </span>
                        {biz.suspended && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px',
                            borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                            background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)'
                          }}>
                            <ShieldAlert size={10} /> Suspended
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '14px', marginTop: '5px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={11} /> {biz.email}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={11} /> {biz.phoneNumber}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} /> {new Date(biz.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Right metrics */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        ₦{(biz.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: '#f1f5f9', padding: '2px 7px', borderRadius: '5px', fontWeight: 600 }}>
                          ₦{single.toFixed(0)} / ₦{(single + surcharge).toFixed(0)}
                        </span>
                        <ChevronRight size={15} style={{ color: 'var(--text-muted)', transform: isSelected ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detail Drawer ── */}
        {selectedBiz && (() => {
          const kyc = kycColor[selectedBiz.kycStatus] || kycColor.none;
          const single = isNaN(selectedBiz.singleVerificationPrice) || selectedBiz.singleVerificationPrice == null ? 70 : selectedBiz.singleVerificationPrice;
          const surcharge = isNaN(selectedBiz.bulkVerificationSurcharge) || selectedBiz.bulkVerificationSurcharge == null ? 15 : selectedBiz.bulkVerificationSurcharge;

          return (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '0', position: 'sticky', top: '20px' }}>
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '50px', height: '50px', borderRadius: '14px',
                    background: avatarGradient(selectedBiz.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: '1.1rem',
                  }}>
                    {getInitials(selectedBiz.fullName)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{selectedBiz.fullName}</h3>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 9px',
                      borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      background: kyc.bg, color: kyc.text, border: `1px solid ${kyc.border}`
                    }}>
                      {selectedBiz.kycStatus === 'none' ? 'Unverified' : selectedBiz.kycStatus}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBiz(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                >
                  <X size={17} />
                </button>
              </div>

              {/* Balance Card */}
              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                borderRadius: '14px', padding: '20px 22px', marginBottom: '20px',
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', right: '-20px', top: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'absolute', right: '20px', bottom: '-30px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prepaid Wallet Balance</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '6px', letterSpacing: '-0.03em' }}>
                  ₦{(selectedBiz.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
                    <span style={{ opacity: 0.7 }}>Single: </span>
                    <strong style={{ color: '#fff' }}>₦{single.toFixed(2)}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
                    <span style={{ opacity: 0.7 }}>Bulk: </span>
                    <strong style={{ color: '#fff' }}>₦{(single + surcharge).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Suspend button */}
              <button
                onClick={() => handleToggleSuspend(selectedBiz)}
                className={`btn-base ${selectedBiz.suspended ? 'btn-success' : 'btn-danger'}`}
                style={{ width: '100%', padding: '10px', fontSize: '0.85rem', marginBottom: '20px' }}
              >
                {selectedBiz.suspended ? <><ShieldCheck size={14} /> Reactivate Account</> : <><ShieldAlert size={14} /> Suspend Account</>}
              </button>

              {/* Tabs */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px', gap: '4px', marginBottom: '20px' }}>
                {([
                  { key: 'wallet', label: 'Wallet', icon: <Wallet size={14} /> },
                  { key: 'pricing', label: 'Pricing', icon: <Tag size={14} /> },
                ] as { key: DrawerTab; label: string; icon: React.ReactNode }[]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDrawerTab(tab.key)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '8px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      fontFamily: 'var(--font-sans)',
                      background: drawerTab === tab.key ? '#fff' : 'transparent',
                      color: drawerTab === tab.key ? 'var(--primary)' : 'var(--text-secondary)',
                      boxShadow: drawerTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.18s',
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Wallet Tab ── */}
              {drawerTab === 'wallet' && (
                <form onSubmit={handleWalletAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Adjustment Amount (₦)</label>
                    <input
                      type="number"
                      required
                      placeholder="5000 to credit, -500 to debit"
                      className="form-input"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Positive = credit · Negative = debit
                    </span>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Audit Note</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Reason for adjustment (e.g. manual top-up reconciliation)"
                      className="form-input"
                      value={adjustDesc}
                      onChange={(e) => setAdjustDesc(e.target.value)}
                      style={{ resize: 'none' }}
                    />
                  </div>

                  {adjustError && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.82rem' }}>
                      <AlertCircle size={14} /> {adjustError}
                    </div>
                  )}
                  {adjustSuccess && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.82rem' }}>
                      <CheckCircle2 size={14} /> {adjustSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={adjustLoading}
                    className={`btn-base btn-primary ${adjustLoading ? 'btn-disabled' : ''}`}
                    style={{ width: '100%', padding: '12px', marginTop: '2px' }}
                  >
                    {adjustLoading ? <span className="spinner" /> : <><DollarSign size={15} /> Apply Adjustment</>}
                  </button>
                </form>
              )}

              {/* ── Pricing Tab ── */}
              {drawerTab === 'pricing' && (
                <form onSubmit={handlePricingUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '10px', padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Bulk price = Single + Surcharge.</strong>
                    {' '}Defaults are ₦70 single and ₦15 surcharge (₦85 bulk).
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Single NIN Fee (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Default: 70.00"
                      className="form-input"
                      value={singlePriceInput}
                      onChange={(e) => setSinglePriceInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Bulk Surcharge (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Default: 15.00"
                      className="form-input"
                      value={bulkSurchargeInput}
                      onChange={(e) => setBulkSurchargeInput(e.target.value)}
                    />
                  </div>

                  {/* Live preview */}
                  {singlePriceInput && bulkSurchargeInput && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {[
                        { label: 'Single', value: `₦${parseFloat(singlePriceInput || '0').toFixed(2)}` },
                        { label: 'Bulk', value: `₦${(parseFloat(singlePriceInput || '0') + parseFloat(bulkSurchargeInput || '0')).toFixed(2)}` },
                      ].map((p) => (
                        <div key={p.label} style={{ flex: 1, background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '3px' }}>{p.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {pricingError && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.82rem' }}>
                      <AlertCircle size={14} /> {pricingError}
                    </div>
                  )}
                  {pricingSuccess && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.82rem' }}>
                      <CheckCircle2 size={14} /> {pricingSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pricingLoading}
                    className={`btn-base btn-primary ${pricingLoading ? 'btn-disabled' : ''}`}
                    style={{ width: '100%', padding: '12px', marginTop: '2px' }}
                  >
                    {pricingLoading ? <span className="spinner" /> : <><Settings size={15} /> Save Pricing</>}
                  </button>
                </form>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
