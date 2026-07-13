import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, RefreshCw, Key, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-dark)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Navigation Header */}
      <header style={{
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}>B</div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px' }}>BiaVerify</span>
        </div>

        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>Features</a>
          <a href="#integration" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: '500', fontSize: '0.95rem' }}>Developers</a>
          <Link to="/login" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem', marginLeft: '12px' }}>Sign In</Link>
          <Link to="/register" className="btn-base btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Get Started</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '80px 40px 100px',
        textAlign: 'center',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(37, 99, 235, 0.08)',
          color: 'var(--primary)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '0.85rem',
          fontWeight: '700',
          marginBottom: '24px',
          textTransform: 'uppercase'
        }}>
          <Shield size={14} /> NDPR & NDPC Compliant Verification
        </div>

        <h1 style={{
          fontSize: '3.5rem',
          lineHeight: '1.15',
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: '24px'
        }}>
          Secure Identity Verification <br/>
          <span style={{ color: 'var(--primary)' }}>for Modern Nigerian Businesses</span>
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '680px',
          lineHeight: '1.6',
          marginBottom: '40px'
        }}>
          Integrate white-labeled NIN queries, verify business registry status dynamically, and fund transactions instantly with dedicated PalmPay Virtual Accounts.
        </p>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to="/register" className="btn-base btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            Register Your Business <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-base btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
            Enter Dashboard
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{
        padding: '80px 40px',
        background: '#ffffff',
        borderTop: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '12px' }}>Why Leading Businesses Choose BiaVerify</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Enterprise identity lookups coupled with seamless prepaid logistics.</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '30px'
          }}>
            <div className="glass-panel" style={{ padding: '30px', boxShadow: 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '20px', padding: '10px' }}>
                <Zap size={20} />
              </div>
              <h3 style={{ marginBottom: '10px', fontSize: '1.25rem' }}>Instant NIN Verification</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Query official identity registries in real time. Retrieve authenticated names, dates of birth, photos, and match compliance scores.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '30px', boxShadow: 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', marginBottom: '20px', padding: '10px' }}>
                <RefreshCw size={20} />
              </div>
              <h3 style={{ marginBottom: '10px', fontSize: '1.25rem' }}>Virtual Transfer Accounts</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Every approved business receives a dedicated PalmPay Virtual Account. Top up your balance instantly by simple bank transfer.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '30px', boxShadow: 'none' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', marginBottom: '20px', padding: '10px' }}>
                <Key size={20} />
              </div>
              <h3 style={{ marginBottom: '10px', fontSize: '1.25rem' }}>White-Labeled Developer API</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Generate developer API Keys, access full JSON documentation, and run programmatic verifications inside your own product stack.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust compliance highlights */}
      <section style={{ padding: '80px 40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px', lineHeight: '1.3' }}>Strict Security & Auditable Action Logs</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
              We guarantee PII (personally identifiable information) protection using industry-leading database structures:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success)', marginTop: '2px' }} />
                <span><strong>AES-256-GCM Encryption:</strong> Sensitive PII (NINs, names, documents) are encrypted at rest.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success)', marginTop: '2px' }} />
                <span><strong>Audit Logs:</strong> NDPR compliant trail tracks every single data access event by user and IP address.</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'start' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--success)', marginTop: '2px' }} />
                <span><strong>Access Control:</strong> Secure storage with short-lived S3 presigned URLs.</span>
              </div>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '40px', background: '#ffffff' }}>
            <h4 style={{ marginBottom: '14px' }}>API Endpoint Performance</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span>Upstream Success Rate:</span>
                <strong style={{ color: 'var(--success)' }}>99.8%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span>Average Response Time:</span>
                <strong style={{ color: 'var(--primary)' }}>~450ms</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pricing Per Match:</span>
                <strong>₦60.00 / query</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '30px 40px',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-color)',
        background: '#ffffff'
      }}>
        &copy; {new Date().getFullYear()} BiaVerify Identity Platform. All rights reserved. &bull; Compliant with NDPC Nigeria guidelines.
      </footer>
    </div>
  );
};
