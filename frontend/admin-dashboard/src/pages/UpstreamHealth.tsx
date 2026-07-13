import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { HeartPulse, CheckCircle2, AlertOctagon, RefreshCw, Clock } from 'lucide-react';

interface HealthStats {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  successRate: number;
  avgLatencyMs: number;
}

export const UpstreamHealth: React.FC = () => {
  const { token } = useAdminAuth();

  const [health, setHealth] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/v1/admin/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealth(data.health);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
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
          <h2>Upstream Service Monitoring</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Check diagnostic latency, success rate metrics, and availability parameters of the underlying verification API.
          </p>
        </div>

        <button onClick={fetchHealth} className="btn-base btn-secondary" style={{ padding: '8px 12px' }}>
          <RefreshCw size={14} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '80px', textAlign: 'center' }}>
          <span className="spinner"></span>
        </div>
      ) : !health ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Failed to load provider health analytics.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status block banner */}
          <div className="glass-panel" style={{
            background: health.successRate > 95 ? 'rgba(16, 185, 129, 0.04)' : 'rgba(245, 158, 11, 0.04)',
            border: '1px solid',
            borderColor: health.successRate > 95 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            padding: '24px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <HeartPulse size={36} style={{ color: health.successRate > 95 ? 'var(--success)' : 'var(--warning)' }} />
            <div>
              <h3 style={{ color: 'var(--text-primary)' }}>
                Verification API System: {health.successRate > 95 ? 'OPERATIONAL' : 'DEGRADED PERFORMANCE'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                Provider metrics gathered over the last 7 days. Automatic wallet refunds are active for all upstream exceptions.
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Success rate
              </span>
              <h1 style={{ fontSize: '2.5rem', color: 'var(--success)', marginTop: '8px' }}>
                {health.successRate}%
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
                <span>{health.successCalls} ok calls</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Average Latency
              </span>
              <h1 style={{ fontSize: '2.5rem', color: 'var(--primary-hover)', marginTop: '8px' }}>
                {health.avgLatencyMs} ms
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <Clock size={12} style={{ color: 'var(--primary-hover)' }} />
                <span>API round-trip duration</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Failed Exceptions
              </span>
              <h1 style={{ fontSize: '2.5rem', color: 'var(--error)', marginTop: '8px' }}>
                {health.failedCalls}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <AlertOctagon size={12} style={{ color: 'var(--error)' }} />
                <span>Total timeouts/crashes</span>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                Total Requests (7d)
              </span>
              <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', marginTop: '8px' }}>
                {health.totalCalls}
              </h1>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Combined API volume</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
