import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileCheck, ShieldAlert, CheckCircle, FileUp, Building2, Smartphone, Mail, MapPin, Hash } from 'lucide-react';

export const KycSubmit: React.FC = () => {
  const { token, business, refreshUser } = useAuth();

  const [kycStatus, setKycStatus] = useState<string>('none');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [ndpcNumber, setNdpcNumber] = useState('');

  // Upload Files
  const [cacDoc, setCacDoc] = useState<File | null>(null);
  const [ndpcDoc, setNdpcDoc] = useState<File | null>(null);
  const [companyPhoto, setCompanyPhoto] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const fetchKycStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5001/api/v1/kyc/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKycStatus(data.status);
        setRejectionReason(data.rejectionReason || '');
        setDetails(data.details);

        // Prepopulate text fields if they exist
        if (data.details) {
          setBusinessName(data.details.businessName || '');
          setBusinessEmail(data.details.businessEmail || '');
          setBusinessPhone(data.details.businessPhone || '');
          setBusinessAddress(data.details.businessAddress || '');
          setCacNumber(data.details.cacNumber || '');
          setNdpcNumber(data.details.ndpcNumber || '');
        }
      }
    } catch (err) {
      console.error('Error fetching KYC status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitting(true);

    if (!cacDoc || !ndpcDoc || !companyPhoto) {
      setSubmitError('All three upload documents are required to process KYC.');
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('businessName', businessName);
      formData.append('businessEmail', businessEmail);
      formData.append('businessPhone', businessPhone);
      formData.append('businessAddress', businessAddress);
      formData.append('cacNumber', cacNumber);
      formData.append('ndpcNumber', ndpcNumber);

      formData.append('cacDocument', cacDoc);
      formData.append('ndpcDocument', ndpcDoc);
      formData.append('companyPhoto', companyPhoto);

      const res = await fetch('http://localhost:5001/api/v1/kyc/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'KYC submission failed.');
      }

      setSubmitSuccess(data.message);
      // Reload KYC info
      await fetchKycStatus();
      await refreshUser();
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <span className="spinner"></span>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: '28px' }}>
        <h2>Business KYC Verification</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Data Controller and Processor verification. Submit CAC & NDPC compliance to activate developer keys.
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
        {/* Left Form */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={20} style={{ color: 'var(--primary)' }} />
            Business KYC Registration Form
          </h3>

          {submitError && (
            <div className="badge-error" style={{ padding: '12px', borderRadius: '8px', display: 'block', width: '100%', fontSize: '0.85rem', marginBottom: '20px' }}>
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="badge-success" style={{ padding: '12px', borderRadius: '8px', display: 'block', width: '100%', fontSize: '0.85rem', marginBottom: '20px', textTransform: 'none' }}>
              {submitSuccess}
            </div>
          )}

          {/* Form isDisabled if already approved or pending review */}
          {kycStatus === 'approved' && (
            <div className="badge-success" style={{ padding: '20px', borderRadius: '12px', display: 'block', textTransform: 'none', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 'bold' }}>
                <CheckCircle size={20} />
                <span>KYC Approved & Active</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#a7f3d0', marginTop: '8px' }}>
                Your business has been verified as a registered Data Controller. Your API Key is fully active.
              </p>
            </div>
          )}

          {kycStatus === 'pending' && (
            <div className="badge-warning" style={{ padding: '20px', borderRadius: '12px', display: 'block', textTransform: 'none', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', fontWeight: 'bold' }}>
                <FileCheck size={20} />
                <span>KYC Awaiting Review</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#fef3c7', marginTop: '8px' }}>
                An administrator is currently reviewing your documentation. Modifications are locked during processing.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Registered Business Name</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    disabled={kycStatus === 'pending' || kycStatus === 'approved'}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder="Bia Technologies Ltd"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Business Contact Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    required
                    disabled={kycStatus === 'pending' || kycStatus === 'approved'}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder="ops@biatech.com"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Business Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    required
                    disabled={kycStatus === 'pending' || kycStatus === 'approved'}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder="+234 1 234 5678"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Business Office Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    disabled={kycStatus === 'pending' || kycStatus === 'approved'}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder="12 Herbert Macaulay Way, Yaba, Lagos"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '10px' }}>
              <div className="form-group">
                <label className="form-label">CAC RC Number</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    disabled={kycStatus === 'pending' || kycStatus === 'approved'}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder="RC-1234567"
                    value={cacNumber}
                    onChange={(e) => setCacNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">NDPC Registration Number</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    disabled={kycStatus === 'pending' || kycStatus === 'approved'}
                    className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder="NDPC/RC/CTRL/00123"
                    value={ndpcNumber}
                    onChange={(e) => setNdpcNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Document Upload Fields */}
            {kycStatus !== 'pending' && kycStatus !== 'approved' && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label className="form-label">CAC Certificate (PDF or Image)</label>
                    <div style={{
                      border: '1px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.01)',
                      position: 'relative'
                    }}>
                      <input
                        type="file"
                        required
                        accept=".pdf,image/png,image/jpeg"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        onChange={(e) => setCacDoc(e.target.files?.[0] || null)}
                      />
                      <FileUp size={20} style={{ color: 'var(--text-secondary)', marginBottom: '4px' }} />
                      <span style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-secondary)' }}>
                        {cacDoc ? cacDoc.name : 'Upload CAC PDF/Image'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">NDPC Compliance Proof (PDF/Image)</label>
                    <div style={{
                      border: '1px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.01)',
                      position: 'relative'
                    }}>
                      <input
                        type="file"
                        required
                        accept=".pdf,image/png,image/jpeg"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                        onChange={(e) => setNdpcDoc(e.target.files?.[0] || null)}
                      />
                      <FileUp size={20} style={{ color: 'var(--text-secondary)', marginBottom: '4px' }} />
                      <span style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-secondary)' }}>
                        {ndpcDoc ? ndpcDoc.name : 'Upload NDPC Certificate'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label">Company Office/Storefront Photo (Image)</label>
                  <div style={{
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.01)',
                    position: 'relative'
                  }}>
                    <input
                      type="file"
                      required
                      accept="image/png,image/jpeg,image/jpg"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      onChange={(e) => setCompanyPhoto(e.target.files?.[0] || null)}
                    />
                    <FileUp size={22} style={{ color: 'var(--text-secondary)', marginBottom: '4px' }} />
                    <span style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-secondary)' }}>
                      {companyPhoto ? companyPhoto.name : 'Select JPG/PNG Storefront Photo'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {kycStatus !== 'pending' && kycStatus !== 'approved' && (
              <button
                type="submit"
                disabled={submitting}
                className={`btn-base btn-primary ${submitting ? 'btn-disabled' : ''}`}
                style={{ width: '100%', marginTop: '24px', padding: '12px' }}
              >
                {submitting ? <span className="spinner"></span> : 'Submit KYC Documentation'}
              </button>
            )}
          </form>
        </div>

        {/* Right Status Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '12px' }}>Review Status Panel</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>KYC Status:</span>
              <span className={`badge ${
                kycStatus === 'approved' 
                  ? 'badge-success' 
                  : kycStatus === 'pending'
                    ? 'badge-warning'
                    : 'badge-error'
              }`}>
                {kycStatus === 'none' ? 'Not Submitted' : kycStatus}
              </span>
            </div>

            {kycStatus === 'rejected' && rejectionReason && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <span style={{ color: 'var(--error)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Rejection Reason:</span>
                <p style={{ color: 'var(--text-primary)', marginTop: '4px', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  {rejectionReason}
                </p>
              </div>
            )}

            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>Submission Guidelines:</p>
              <ul style={{ paddingLeft: '14px' }}>
                <li>CAC certificate must show registration number matching RC number entered.</li>
                <li>NDPC data privacy registration details must be verified.</li>
                <li>Files must be clear and under 5MB in size.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
