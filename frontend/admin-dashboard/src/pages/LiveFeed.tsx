import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Activity, RefreshCw, Zap, ShieldAlert, CheckCircle } from 'lucide-react';

interface FeedItem {
  id: string;
  status: 'success' | 'no_match' | 'failed';
  costCharged: number;
  marginEarned: number;
  createdAt: string;
  latencyMs: number;
  businessName: string;
  businessEmail: string;
}

export const LiveFeed: React.FC = () => {
  const { token } = useAdminAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchFeed = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/admin/live-feed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeed(data.feed || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [token]);

  // Set up 5s polling interval
  useEffect(() => {
    if (!autoRefresh || !token) return;
    
    const interval = setInterval(() => {
      fetchFeed();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  return (
    <div className="main-content">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px'
      }}>
        <div>
          <h2>Real-Time API Activity Feed</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Monitor NIN lookup verifications run by partner businesses in real-time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            <span>Auto Refresh (5s)</span>
          </label>
          <button onClick={fetchFeed} className="btn-base btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={20} style={{ color: 'var(--primary)' }} />
          Live Request Stream
        </h3>

        {loading && feed.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="spinner"></span>
          </div>
        ) : feed.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No API verification activity logged.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Partner Business</th>
                  <th>Lookup Status</th>
                  <th>Upstream Latency</th>
                  <th>Revenue Split</th>
                </tr>
              </thead>
              <tbody>
                {feed.map((row) => (
                  <tr key={row.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(row.createdAt).toLocaleTimeString()} &bull; {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{row.businessName}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.businessEmail}</span>
                    </td>
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
                    <td>
                      {row.status === 'failed' ? (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                          <Zap size={12} style={{ color: row.latencyMs > 2000 ? 'var(--warning)' : 'var(--success)' }} />
                          <span>{row.latencyMs || 'N/A'} ms</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>
                      {row.status === 'failed' ? (
                        <span style={{ color: 'var(--text-secondary)' }}>₦0.00 (Refunded)</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>Charged: <strong>₦{row.costCharged.toFixed(2)}</strong></span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                            Margin: <strong>+₦{row.marginEarned.toFixed(2)}</strong>
                          </span>
                        </div>
                      )}
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
