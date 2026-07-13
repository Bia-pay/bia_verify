import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { UserCheck, FileText, Check, X, AlertCircle, ExternalLink } from 'lucide-react';

interface KycItem {
  id: string;
  businessId: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  cacNumber: string;
  ndpcNumber: string;
  submittedAt: string;
  kycStatus: string;
  documents: {
    cacUrl: string;
    ndpcUrl: string;
    photoUrl: string;
  };
}

export const KycQueue: React.FC = () => {
  const { token } = useAdminAuth();

  const [queue, setQueue] = useState<KycItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected review item state
  const [selectedItem, setSelectedItem] = useState<KycItem | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Authenticated photo blob URL
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);

  const fetchQueue = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/v1/admin/kyc/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue || []);
        setSelectedItem(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  // Fetch photo with auth header whenever selection changes
  useEffect(() => {
    if (photoBlobUrl) {
      URL.revokeObjectURL(photoBlobUrl);
      setPhotoBlobUrl(null);
    }
    if (!selectedItem?.documents?.photoUrl || selectedItem.documents.photoUrl === '#') return;
    
    const fetchPhoto = async () => {
      try {
        const res = await fetch(selectedItem.documents.photoUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          setPhotoBlobUrl(URL.createObjectURL(blob));
        }
      } catch (e) {
        console.warn('Photo fetch failed:', e);
      }
    };
    fetchPhoto();
  }, [selectedItem, token]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedItem || !token) return;
    
    setActionError('');
    
    if (action === 'reject' && !reviewNote.trim()) {
      setActionError('A rejection explanation note is required to reject KYC.');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('http://localhost:5001/api/v1/admin/kyc/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: selectedItem.businessId,
          action,
          note: reviewNote
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'KYC review failed.');
      }

      alert(`KYC registration successfully ${action === 'approve' ? 'approved' : 'rejected'}.`);
      setReviewNote('');
      fetchQueue(); // Reload queue
    } catch (err: any) {
      setActionError(err.message || 'An error occurred during submission.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div style={{ marginBottom: '28px' }}>
        <h2>KYC Registration Review Queue</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Evaluate pending registrations, verify CAC documents, and approve active developer API access.
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: selectedItem ? '1.5fr 2fr' : '1fr', alignItems: 'stretch' }}>
        {/* Left: Pending submissions list */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={20} style={{ color: 'var(--primary)' }} />
            Review Queue ({queue.length})
          </h3>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <span className="spinner"></span>
            </div>
          ) : queue.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No business registrations awaiting review.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queue.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setReviewNote(''); setActionError(''); }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: selectedItem?.id === item.id ? 'var(--primary)' : 'var(--border-color)',
                    background: selectedItem?.id === item.id ? 'rgba(139, 92, 246, 0.06)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>{item.businessName}</strong>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.businessEmail}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(item.submittedAt).toLocaleString()}
                    </span>
                    <span className={`badge ${item.kycStatus === 'rejected' ? 'badge-error' : 'badge-warning'}`}
                      style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                      {item.kycStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Review Details Workspace */}
        {selectedItem && (
          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3>KYC Submission Details</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Evaluating partner account parameters.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Business Name</span>
                <strong>{selectedItem.businessName}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Contact Email</span>
                <strong>{selectedItem.businessEmail}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Phone Number</span>
                <strong>{selectedItem.businessPhone}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Office Address</span>
                <strong>{selectedItem.businessAddress}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CAC RC Number</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedItem.cacNumber}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>NDPC registration</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedItem.ndpcNumber}</strong>
              </div>
            </div>

            {/* Document viewing boxes */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h4 style={{ marginBottom: '12px' }}>Uploaded Verification Files</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <a
                  href={selectedItem.documents.cacUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-base btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '10px' }}
                >
                  <FileText size={14} />
                  <span>View CAC Cert</span>
                  <ExternalLink size={12} />
                </a>

                <a
                  href={selectedItem.documents.ndpcUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-base btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '10px' }}
                >
                  <FileText size={14} />
                  <span>View NDPC Compliance</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {photoBlobUrl && (
                <div style={{ marginTop: '16px' }}>
                  <span className="form-label">Storefront/Office Photo:</span>
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '6px'
                  }}>
                    <img
                      src={photoBlobUrl}
                      alt="Storefront"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Review actions control panel */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Review note (Reason for rejection or approval note)</label>
                <textarea
                  rows={3}
                  placeholder="Enter evaluation remarks..."
                  className="form-input"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>

              {actionError && (
                <div className="badge-error" style={{ padding: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <X size={14} /> <span>{actionError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleReview('approve')}
                  disabled={actionLoading}
                  className="btn-base btn-success"
                  style={{ flex: 1, padding: '12px' }}
                >
                  <Check size={16} /> <span>Approve Registration</span>
                </button>
                
                <button
                  onClick={() => handleReview('reject')}
                  disabled={actionLoading}
                  className="btn-base btn-danger"
                  style={{ flex: 1, padding: '12px' }}
                >
                  <X size={16} /> <span>Reject Registration</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
