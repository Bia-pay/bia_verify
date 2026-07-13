import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  Search, 
  History, 
  ShieldAlert, 
  CheckCircle,
  FileSearch,
  UserCheck2,
  RefreshCw
} from 'lucide-react';

interface UsageLog {
  id: string;
  status: 'success' | 'no_match' | 'failed';
  costCharged: number;
  createdAt: string;
  firstName: string;
  lastName: string;
  nin: string;
}

export const Dashboard: React.FC = () => {
  const { business, token } = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [history, setHistory] = useState<UsageLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Single NIN search state
  const [searchNin, setSearchNin] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyError, setVerifyError] = useState('');

  const fetchBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/business/usage', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, [token]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNin || searchNin.trim().length === 0) return;
    
    setVerifyError('');
    setVerifyResult(null);
    setVerifyLoading(true);

    try {
      // Let's add `/api/v1/business/verify` (POST) to `routes/index.ts` under `BUSINESS SESSION AUTH`.
      // This allows businesses to do manual verifications directly in the dashboard UI using their session cookie/token!
      // This is a standard and secure pattern. Let's update `routes/index.ts` using `replace_file_content`.
      
      // Let's fetch the session verify endpoint instead.
      const res = await fetch('http://localhost:5001/api/v1/business/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nin: searchNin })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setVerifyResult(data);
      // Refresh balance and history logs
      fetchBalance();
      fetchHistory();
    } catch (err: any) {
      setVerifyError(err.message || 'An error occurred during verification.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const kycStatus = business?.kycStatus || 'none';

  return (
    <div className="main-content">
      {/* 1. KYC Alert Banners */}
      {kycStatus === 'none' && (
        <div className="glass-panel" style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '16px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={22} style={{ color: 'var(--error)' }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)' }}>KYC Documents Required</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Your account is active, but you must complete KYC submission to activate your API Key.
              </p>
            </div>
          </div>
          <Link to="/kyc" className="btn-base btn-secondary" style={{ fontSize: '0.85rem', padding: '8px 14px' }}>
            Submit KYC
          </Link>
        </div>
      )}

      {kycStatus === 'pending' && (
        <div className="glass-panel" style={{
          background: 'rgba(245, 158, 11, 0.05)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          padding: '16px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <ShieldAlert size={22} style={{ color: 'var(--warning)' }} />
          <div>
            <h4 style={{ color: 'var(--text-primary)' }}>KYC Review Pending</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Your KYC has been submitted and is currently being reviewed by administrators.
            </p>
          </div>
        </div>
      )}

      {kycStatus === 'rejected' && (
        <div className="glass-panel" style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '16px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={22} style={{ color: 'var(--error)' }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)' }}>KYC Rejected</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Your KYC submission was rejected. Please review guidelines and submit again.
              </p>
            </div>
          </div>
          <Link to="/kyc" className="btn-base btn-primary" style={{ fontSize: '0.85rem', padding: '8px 14px' }}>
            Resubmit KYC
          </Link>
        </div>
      )}

      {/* 2. Overview Grid */}
      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
              Prepaid Wallet
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              {balanceLoading ? (
                <span className="spinner" style={{ width: '24px', height: '24px' }}></span>
              ) : (
                `₦${balance.toFixed(2)}`
              )}
            </h2>
          </div>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '12px' }}>
            <Wallet size={24} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
              NIN Queries Run
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              {history.length}
            </h2>
          </div>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
            <FileSearch size={24} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
              Verification Fee
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              ₦60.00 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ req</span>
            </h2>
          </div>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', borderRadius: '12px' }}>
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* 3. Search & Test Section */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '3fr 2fr', alignItems: 'start' }}>
        {/* Left: Quick Verification Widget */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={20} style={{ color: 'var(--primary)' }} />
            Quick NIN Identity Verify
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Run a sandbox/live search directly from the dashboard. Each search deducts ₦60.00.
          </p>

          {kycStatus !== 'approved' ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)'
            }}>
              <ShieldAlert size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Identity search is locked. Complete KYC registration to activate.
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  required
                  placeholder="Enter 11-digit National Identification Number (NIN)"
                  maxLength={11}
                  className="form-input"
                  style={{ flex: 1, padding: '14px', fontSize: '1rem' }}
                  value={searchNin}
                  onChange={(e) => setSearchNin(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className={`btn-base btn-primary ${verifyLoading ? 'btn-disabled' : ''}`}
                  style={{ padding: '14px 28px' }}
                >
                  {verifyLoading ? <span className="spinner"></span> : 'Verify'}
                </button>
              </div>
            </form>
          )}

          {verifyError && (
            <div className="badge-error" style={{ padding: '12px', borderRadius: '8px', display: 'block', width: '100%', fontSize: '0.85rem' }}>
              {verifyError}
            </div>
          )}

          {verifyResult && (
            <div className="glass-panel" style={{ padding: '20px', marginTop: '20px', background: 'rgba(16, 185, 129, 0.02)' }}>
              {!verifyResult.matched ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--error)' }}>
                  <ShieldAlert size={18} />
                  <span>No matching record found for this NIN. Check the number and try again.</span>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)', marginBottom: '16px' }}>
                    <UserCheck2 size={20} />
                    <span style={{ fontWeight: '700' }}>Identity Match Successful</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
                    {verifyResult.data.photo && (
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img 
                          src={`data:image/jpeg;base64,${verifyResult.data.photo}`}
                          alt="NIMC Match"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1, fontSize: '0.9rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>First Name</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{verifyResult.data.firstName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Last Name</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{verifyResult.data.lastName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Middle Name</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{verifyResult.data.middleName || '-'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase' }}>Date of Birth</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{verifyResult.data.dateOfBirth}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sandbox Instructions / Quick Topup Link */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ marginBottom: '16px' }}>Sandbox Environment</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '14px', lineHeight: '1.6' }}>
            We've set up simulated verification responses to make integration and testing convenient:
          </p>
          <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--success)' }}>✔</span>
              <span><strong>NIN starting with 123</strong>: Simulates a successful match return.</span>
            </li>
            <li style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--warning)' }}>✔</span>
              <span><strong>NIN starting with 456</strong>: Simulates an unmatched record response.</span>
            </li>
            <li style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--error)' }}>✔</span>
              <span><strong>NIN starting with 999</strong>: Simulates a verification provider timeout (triggering a refund).</span>
            </li>
          </ul>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <Link to="/wallet" className="btn-base btn-secondary" style={{ width: '100%' }}>
              Top Up Prepaid Wallet
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Usage History Table */}
      <div className="glass-panel" style={{ padding: '28px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={20} style={{ color: 'var(--primary)' }} />
            Recent Verification Activity
          </h3>
          <button onClick={fetchHistory} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem'
          }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {historyLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="spinner"></span>
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No verification queries run yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Query Timestamp</th>
                  <th>NIN Searched</th>
                  <th>Returned Match</th>
                  <th>Status</th>
                  <th>Charged Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(row.createdAt).toLocaleString()}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.nin}</td>
                    <td>{row.status === 'success' ? `${row.firstName} ${row.lastName}` : '-'}</td>
                    <td>
                      <span className={`badge ${
                        row.status === 'success' 
                          ? 'badge-success' 
                          : row.status === 'no_match' 
                            ? 'badge-warning' 
                            : 'badge-error'
                      }`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: '700', color: row.status === 'failed' ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                      ₦{row.costCharged.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
