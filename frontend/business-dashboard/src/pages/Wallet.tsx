import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet as WalletIcon, 
  Key, 
  RefreshCw, 
  AlertCircle, 
  PlusCircle, 
  Copy, 
  Check, 
  Activity,
  CreditCard 
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'topup' | 'verification' | 'refund' | 'credit' | 'debit';
  amount: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

export const Wallet: React.FC = () => {
  const { token, business } = useAuth();

  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  
  // Virtual Account Details state
  const [virtualAccountNo, setVirtualAccountNo] = useState<string | null>(null);
  const [virtualAccountName, setVirtualAccountName] = useState<string | null>(null);
  const [virtualBankName, setVirtualBankName] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  
  // API Key state
  const [hasKey, setHasKey] = useState(false);
  const [keyStatusLoading, setKeyStatusLoading] = useState(true);
  const [newApiKey, setNewApiKey] = useState('');
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Transactions logs state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const fetchBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setVirtualAccountNo(data.virtualAccountNo);
        setVirtualAccountName(data.virtualAccountName);
        setVirtualBankName(data.virtualBankName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchKeyStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/business/api-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasKey);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setKeyStatusLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/wallet/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchKeyStatus();
    fetchTransactions();
  }, [token]);



  const handleGenerateAccount = async () => {
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('http://localhost:5001/api/v1/wallet/generate-virtual-account', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate Virtual Account.');
      }
      
      // Reload balance & VA details
      await fetchBalance();
    } catch (err: any) {
      setGenerateError(err.message || 'An error occurred during account generation.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRotateKey = async () => {
    if (!window.confirm('Are you sure you want to rotate your developer API Key? Your current key will stop working immediately.')) {
      return;
    }

    setRotating(true);
    setNewApiKey('');

    try {
      const res = await fetch('http://localhost:5001/api/v1/business/api-key/rotate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Rotation failed.');
      }

      setNewApiKey(data.apiKey);
      setHasKey(true);
    } catch (err) {
      console.error(err);
      alert('Failed to rotate API Key. Verify server is online.');
    } finally {
      setRotating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kycStatus = business?.kycStatus || 'none';

  return (
    <div className="main-content">
      <div style={{ marginBottom: '28px' }}>
        <h2>Wallet & Developer Credentials</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Top up your NGN verification balance via PalmPay, and rotate secure API credentials.
        </p>
      </div>

      <div className="dashboard-grid">
        {/* 1. Wallet Balance and Top Up Form */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <WalletIcon size={20} style={{ color: 'var(--success)' }} />
              Prepaid Wallet
            </h3>
            <button onClick={fetchBalance} style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }} title="Sync Balance">
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Available NGN Balance</span>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginTop: '8px' }}>
              {balanceLoading ? <span className="spinner"></span> : `₦${balance.toFixed(2)}`}
            </h1>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={16} style={{ color: 'var(--primary)' }} />
              Wallet Funding Account
            </h4>

            {kycStatus !== 'approved' ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.03)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                padding: '16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                <strong>Virtual Account Locked:</strong> Please complete your business KYC documentation and await administrator verification to receive your dedicated PalmPay Virtual Funding Account.
              </div>
            ) : virtualAccountNo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: '#f8fafc',
                  padding: '18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bank Name</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{virtualBankName || 'PalmPay'}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Number</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ color: 'var(--primary)', fontSize: '1.05rem', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{virtualAccountNo}</strong>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(virtualAccountNo);
                          alert('Account number copied!');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '4px'
                        }}>
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Name</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{virtualAccountName}</strong>
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  💡 <strong>How to fund:</strong> Transfer any NGN amount to this account from your bank application. Payments settle automatically to your available balance in less than 60 seconds.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {generateError && (
                  <div className="badge-error" style={{ padding: '10px', borderRadius: '8px', fontSize: '0.8rem', display: 'block', width: '100%' }}>
                    {generateError}
                  </div>
                )}
                
                <div style={{
                  background: 'rgba(37, 99, 235, 0.03)',
                  border: '1px solid rgba(37, 99, 235, 0.15)',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5'
                }}>
                  <strong>KYC Approved:</strong> Your documentation is verified. Click the button below to provision your dedicated PalmPay Virtual Funding Account.
                </div>

                <button
                  onClick={handleGenerateAccount}
                  disabled={generating}
                  className={`btn-base btn-primary ${generating ? 'btn-disabled' : ''}`}
                  style={{ width: '100%', padding: '10px' }}
                >
                  {generating ? <span className="spinner"></span> : 'Generate Virtual Funding Account'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Developer API Key Management */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} style={{ color: 'var(--primary)' }} />
            Developer Credentials
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.6' }}>
            API keys allow programmatic integration of Nigerian NIN verifications. All key activities require an approved business KYC status.
          </p>

          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            fontSize: '0.9rem',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <span className={`badge ${kycStatus === 'approved' ? 'badge-success' : 'badge-warning'}`}>
              {kycStatus === 'approved' ? 'Active' : 'Inactive (KYC Pending)'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="form-label">Current API Key:</span>
              <div style={{
                fontFamily: 'monospace',
                background: '#f1f5f9',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                marginTop: '6px'
              }}>
                {keyStatusLoading 
                  ? 'checking credentials...' 
                  : hasKey 
                    ? `bv_${business?.id || 'businessid'}_••••••••••••••••••••••••` 
                    : 'No credentials configured. Rotate key to initialize.'
                }
              </div>
            </div>

            {newApiKey && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '16px',
                borderRadius: '8px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--warning)', marginBottom: '6px' }}>
                  <AlertCircle size={16} />
                  <strong style={{ fontSize: '0.85rem' }}>Plaintext API Key Copy:</strong>
                </div>
                <div style={{
                  display: 'flex',
                  background: '#f1f5f9',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                    {newApiKey}
                  </span>
                  <button 
                    onClick={handleCopy}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copied ? 'var(--success)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Keep this key secure. We cannot show it again.
                </p>
              </div>
            )}

            <button
              disabled={rotating}
              onClick={handleRotateKey}
              className={`btn-base btn-primary ${rotating ? 'btn-disabled' : ''}`}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {rotating ? <span className="spinner"></span> : 'Rotate / Generate API Key'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Transaction History log table */}
      <div className="glass-panel" style={{ padding: '28px', marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} style={{ color: 'var(--primary)' }} />
            Prepaid Wallet Ledger Transactions
          </h3>
          <button onClick={fetchTransactions} style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }} title="Sync Ledger">
            <RefreshCw size={14} />
          </button>
        </div>

        {txLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="spinner"></span>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No wallet transactions recorded yet.
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
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{tx.reference}</td>
                    <td>
                      <span className="badge" style={{
                        background: tx.type === 'topup' || tx.type === 'refund' || tx.type === 'credit'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(239, 68, 68, 0.1)',
                        color: tx.type === 'topup' || tx.type === 'refund' || tx.type === 'credit'
                          ? 'var(--success)'
                          : 'var(--error)'
                      }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>{tx.description}</td>
                    <td>
                      <span className={`badge ${
                        tx.status === 'completed'
                          ? 'badge-success'
                          : tx.status === 'pending'
                            ? 'badge-warning'
                            : 'badge-error'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{
                      fontWeight: '700',
                      color: tx.amount > 0 ? 'var(--success)' : 'var(--text-primary)'
                    }}>
                      {tx.amount > 0 ? '+' : ''}₦{tx.amount.toFixed(2)}
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
