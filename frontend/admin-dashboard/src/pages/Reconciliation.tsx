import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ArrowLeftRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface ReconTransaction {
  id: string;
  amount: number;
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
  businessName: string;
  businessEmail: string;
}

export const Reconciliation: React.FC = () => {
  const { token } = useAdminAuth();

  const [transactions, setTransactions] = useState<ReconTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReconciliation = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/v1/admin/reconciliation', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, [token]);

  return (
    <div className="main-content">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px'
      }}>
        <div>
          <h2>Payment Webhook Reconciliation</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Cross-examine incoming PalmPay merchant webhook ledger entries against wallet top-up credits.
          </p>
        </div>

        <button onClick={fetchReconciliation} className="btn-base btn-secondary" style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ArrowLeftRight size={20} style={{ color: 'var(--primary)' }} />
          PalmPay Callback Logs Ledger
        </h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="spinner"></span>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No PalmPay top-up transactions logged yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Partner Business</th>
                  <th>Order Reference</th>
                  <th>Payment Status</th>
                  <th>Gateway Details</th>
                  <th>Deposited Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{tx.businessName}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.businessEmail}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {tx.reference}
                    </td>
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
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {tx.description}
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--success)' }}>
                      ₦{tx.amount.toFixed(2)}
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
