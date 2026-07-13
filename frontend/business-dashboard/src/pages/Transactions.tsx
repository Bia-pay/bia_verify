import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet, RefreshCw, AlertCircle, Activity,
  Search, ShieldCheck, HelpCircle, FileText, ArrowDownLeft, ArrowUpRight
} from 'lucide-react';

interface WalletTx {
  id: string;
  type: 'topup' | 'verification' | 'refund' | 'credit' | 'debit';
  amount: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

interface VerificationTx {
  id: string;
  status: 'success' | 'no_match' | 'failed';
  costCharged: number;
  createdAt: string;
  firstName: string;
  lastName: string;
  nin: string;
}

type Tab = 'wallet' | 'verifications';

export const Transactions: React.FC = () => {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('wallet');

  // Wallet Tx state
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);

  // Verification Tx state
  const [verifyTxs, setVerifyTxs] = useState<VerificationTx[]>([]);
  const [verifyLoading, setVerifyLoading] = useState(true);

  // Search filter
  const [search, setSearch] = useState('');

  const fetchWalletTxs = async () => {
    if (!token) return;
    setWalletLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/v1/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWalletTxs(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchVerifyTxs = async () => {
    if (!token) return;
    setVerifyLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/v1/business/usage', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVerifyTxs(data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletTxs();
    fetchVerifyTxs();
  }, [token]);

  const handleSync = () => {
    if (activeTab === 'wallet') fetchWalletTxs();
    else fetchVerifyTxs();
  };

  // Filter lists based on search
  const filteredWallet = walletTxs.filter((tx) =>
    !search ||
    tx.reference.toLowerCase().includes(search.toLowerCase()) ||
    tx.description.toLowerCase().includes(search.toLowerCase()) ||
    tx.type.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVerify = verifyTxs.filter((tx) =>
    !search ||
    tx.nin.includes(search) ||
    tx.firstName.toLowerCase().includes(search.toLowerCase()) ||
    tx.lastName.toLowerCase().includes(search.toLowerCase()) ||
    tx.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', letterSpacing: '-0.03em' }}>Transaction History</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Audit wallet funding ledgers and search your NIN verification logs.
            </p>
          </div>
          <button onClick={handleSync} className="btn-base btn-secondary" style={{ padding: '8px 14px', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '12px', padding: '4px', gap: '4px', maxWidth: '400px', marginBottom: '24px' }}>
        {([
          { key: 'wallet', label: 'Wallet funding & debits', icon: <Wallet size={15} /> },
          { key: 'verifications', label: 'NIN query logs', icon: <FileText size={15} /> }
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSearch(''); }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === t.key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder={activeTab === 'wallet' ? "Search reference, description, or type..." : "Search NIN, first name, last name, status..."}
          className="form-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: '40px' }}
        />
      </div>

      {/* ── Tab: Wallet Ledger ── */}
      {activeTab === 'wallet' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {walletLoading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <span className="spinner" style={{ width: '30px', height: '30px' }}></span>
            </div>
          ) : filteredWallet.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Activity size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p>{search ? 'No matching wallet transactions found.' : 'No wallet funding transactions yet.'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWallet.map((tx) => {
                    const isCredit = tx.type === 'topup' || tx.type === 'refund' || tx.type === 'credit';
                    return (
                      <tr key={tx.id}>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{tx.reference}</td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                            background: isCredit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            color: isCredit ? 'var(--success)' : 'var(--error)'
                          }}>
                            {isCredit ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.88rem' }}>{tx.description}</td>
                        <td>
                          <span className={`badge ${
                            tx.status === 'completed' ? 'badge-success' :
                            tx.status === 'pending' ? 'badge-warning' : 'badge-error'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: '800', color: isCredit ? 'var(--success)' : 'var(--text-primary)' }}>
                          {isCredit ? '+' : '-'}₦{tx.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: NIN Query Logs ── */}
      {activeTab === 'verifications' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          {verifyLoading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <span className="spinner" style={{ width: '30px', height: '30px' }}></span>
            </div>
          ) : filteredVerify.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Activity size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p>{search ? 'No matching NIN verifications found.' : 'No NIN verification logs yet.'}</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>NIN</th>
                    <th>Cardholder Name</th>
                    <th>Result Status</th>
                    <th>Charged Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVerify.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ color: 'var(--text-secondary)' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>
                        {tx.nin.slice(0, 4)}••••{tx.nin.slice(-3)}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {tx.firstName ? `${tx.firstName} ${tx.lastName}` : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>N/A</span>}
                      </td>
                      <td>
                        <span className={`badge ${
                          tx.status === 'success' ? 'badge-success' :
                          tx.status === 'no_match' ? 'badge-warning' : 'badge-error'
                        }`}>
                          {tx.status === 'success' ? 'Match Successful' :
                           tx.status === 'no_match' ? 'No Identity Match' : 'Upstream Error'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '800' }}>
                        ₦{tx.costCharged.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
