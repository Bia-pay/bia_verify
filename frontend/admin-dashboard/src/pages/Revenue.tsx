import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { BarChart3, TrendingUp, DollarSign, Filter, RefreshCw } from 'lucide-react';

interface RevenueTotals {
  collected: number;
  upstream: number;
  margin: number;
  count: number;
}

interface RevenueBreakdown {
  date: string;
  totalCollected: number;
  totalUpstream: number;
  totalMargin: number;
  count: number;
}

interface BusinessListItem {
  id: string;
  email: string;
  fullName: string;
}

export const Revenue: React.FC = () => {
  const { token } = useAdminAuth();

  const [totals, setTotals] = useState<RevenueTotals>({ collected: 0, upstream: 0, margin: 0, count: 0 });
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([]);
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  
  // Filters state
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = async () => {
    if (!token) return;
    try {
      const res = await fetch('https://verify.bia.com.ng/api/v1/admin/businesses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBusinesses(data.businesses || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRevenue = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const url = `https://verify.bia.com.ng/api/v1/admin/revenue?period=${selectedPeriod}&businessId=${selectedBusiness}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTotals(data.totals);
        setBreakdown(data.breakdown || []);
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

  useEffect(() => {
    fetchRevenue();
  }, [token, selectedBusiness, selectedPeriod]);

  return (
    <div className="main-content">
      {/* Header & Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <h2>Revenue Summary Dashboard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Track platform collections, verification provider costs (₦30/req), and net margins (₦20/req).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Business filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              <option value="">All Partner Businesses</option>
              {businesses.map((biz) => (
                <option key={biz.id} value={biz.id}>{biz.fullName}</option>
              ))}
            </select>
          </div>

          {/* Time breakdown filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="form-input"
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <option value="day">Daily Groupings</option>
            <option value="week">Weekly Groupings</option>
            <option value="month">Monthly Groupings</option>
          </select>

          <button onClick={fetchRevenue} className="btn-base btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* 3 Overview Cards */}
      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
              Total Collections (₦50)
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '6px', color: 'var(--text-primary)' }}>
              ₦{totals.collected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From {totals.count} successful verifications</span>
          </div>
          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
              Upstream Costs Paid (₦30)
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '6px', color: 'var(--error)' }}>
              ₦{totals.upstream.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cost forwarded to upstream provider</span>
          </div>
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '12px' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
              Net Platform Margin (₦20)
            </span>
            <h2 style={{ fontSize: '2rem', marginTop: '6px', color: 'var(--success)' }}>
              ₦{totals.margin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Net platform profit margin earned</span>
          </div>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '12px' }}>
            <BarChart3 size={24} />
          </div>
        </div>
      </div>

      {/* Breakdown ledger table */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ marginBottom: '20px' }}>Periodic Revenue Ledger</h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <span className="spinner"></span>
          </div>
        ) : breakdown.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No records found matching filters.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period Starting</th>
                  <th>Successful Lookups</th>
                  <th>Gross Charged (₦50/ea)</th>
                  <th>Upstream Cost (₦30/ea)</th>
                  <th>Net Margin (₦20/ea)</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600' }}>
                      {new Date(row.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: selectedPeriod === 'day' ? 'numeric' : undefined
                      })}
                    </td>
                    <td>{row.count}</td>
                    <td style={{ color: 'var(--text-primary)' }}>₦{row.totalCollected.toFixed(2)}</td>
                    <td style={{ color: 'var(--error)' }}>₦{row.totalUpstream.toFixed(2)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: '700' }}>₦{row.totalMargin.toFixed(2)}</td>
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
