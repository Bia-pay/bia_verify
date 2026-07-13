import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Zap, RefreshCw, Key, ArrowRight, CheckCircle2,
  Lock, Terminal, Play, Check, Server, Eye, ExternalLink, MessageSquare, Phone
} from 'lucide-react';

export const Landing: React.FC = () => {
  // Demo Interactive Sandbox
  const [demoNin, setDemoNin] = useState('');
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleDemoSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (demoNin.length < 11) return;
    setDemoLoading(true);
    setDemoResult(null);

    setTimeout(() => {
      setDemoLoading(false);
      setDemoResult({
        nin: demoNin,
        firstName: 'SALMA',
        lastName: 'GAMBO',
        middleName: 'SALEH',
        dob: '1998-04-01',
        gender: 'F',
        photo: '/logo.png', // Fallback placeholder
        status: 'MATCH_SUCCESSFUL',
        authority: 'NIMC Registry'
      });
    }, 1200);
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(`curl -X POST "https://verify.bia.com.ng/api/v1/verify" \\
  -H "Authorization: Bearer bv_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"nin": "57635446044"}'`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc', // Premium Light background
      color: '#0f172a', // Dark slate text
      fontFamily: 'var(--font-sans)',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* ── Background Mesh Glows (Light version) ── */}
      <div style={{
        position: 'absolute', top: '-10%', left: '15%', width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 0, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', top: '30%', right: '-10%', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, rgba(0,0,0,0) 75%)',
        zIndex: 0, pointerEvents: 'none'
      }} />

      {/* ── Header ── */}
      <header style={{
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Bia Verify Logo" style={{ height: '32px', objectFit: 'contain' }} />
        </div>

        <nav style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          <a href="#features" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>Features</a>
          <a href="#demo" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>Live Demo</a>
          <a href="#developer" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>API Docs</a>
          <Link to="/login" style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginLeft: '12px' }}>Sign In</Link>
          <Link to="/register" className="btn-base btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem', borderRadius: '8px' }}>Get Started</Link>
        </nav>
      </header>

      {/* ── Hero Section ── */}
      <section style={{
        padding: '100px 20px 80px',
        textAlign: 'center',
        maxWidth: '1000px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Compliance Banner */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          color: '#4f46e5',
          padding: '6px 14px',
          borderRadius: '30px',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: '28px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase'
        }}>
          <Shield size={13} /> NDPR & NDPC Compliant Verification
        </div>

        <h1 style={{
          fontSize: '4.2rem',
          lineHeight: '1.08',
          fontWeight: 800,
          color: '#0f172a',
          letterSpacing: '-0.04em',
          marginBottom: '24px'
        }}>
          Automate Secure NIN Identity <br/>
          <span style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'inline-block'
          }}>Verification for Nigerian Business</span>
        </h1>

        <p style={{
          fontSize: '1.2rem',
          color: '#475569',
          maxWidth: '740px',
          margin: '0 auto 42px',
          lineHeight: '1.6',
          fontWeight: 400
        }}>
          Integrate official NIMC lookups in seconds. Safeguard user access with auditable logs, instant API access, and automatic funding via dedicated PalmPay virtual wallets.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link to="/register" className="btn-base btn-primary" style={{ padding: '14px 28px', fontSize: '0.95rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Get Free API Access <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn-base btn-secondary" style={{ padding: '14px 28px', fontSize: '0.95rem', borderRadius: '10px', border: '1px solid #cbd5e1', color: '#0f172a' }}>
            Go to Console
          </Link>
        </div>
      </section>

      {/* ── Interactive Demo Sandbox ── */}
      <section id="demo" style={{ padding: '40px 20px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>Test Identity Verification Live</h2>
            <p style={{ color: '#475569', fontSize: '0.95rem' }}>Type any 11-digit NIN below to experience the sandbox lookup response.</p>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '32px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: '32px',
            alignItems: 'stretch'
          }}>
            {/* Lookup Input form */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', fontWeight: 700 }}>Sandbox Query Input</h3>
              <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                Test the match latency and verification payload structure without using live credits.
              </p>
              
              <form onSubmit={handleDemoSearch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#475569', fontSize: '0.75rem' }}>National Identification Number (NIN)</label>
                  <input
                    type="text" required placeholder="Enter 11-digit NIN (e.g. 57635446044)"
                    className="form-input"
                    value={demoNin}
                    onChange={(e) => setDemoNin(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    style={{ background: '#fff', borderColor: '#cbd5e1', color: '#0f172a', padding: '12px 14px' }}
                  />
                </div>
                <button
                  type="submit" disabled={demoLoading || demoNin.length < 11}
                  className={`btn-base btn-primary ${demoLoading || demoNin.length < 11 ? 'btn-disabled' : ''}`}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {demoLoading ? <span className="spinner" /> : <><Play size={14} /> Verify Identity</>}
                </button>
              </form>
            </div>

            {/* Sandbox Response Output */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: '260px',
              position: 'relative'
            }}>
              {!demoLoading && !demoResult ? (
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <Terminal size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.85rem' }}>Ready. Type a NIN and click Verify to inspect payload.</p>
                </div>
              ) : demoLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
                  <span className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px', marginBottom: '12px' }} />
                  <p style={{ fontSize: '0.8rem', color: '#475569' }}>Querying NIMC database...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {demoResult.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Provider: {demoResult.authority}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>First Name</span>
                      <strong style={{ color: '#0f172a' }}>{demoResult.firstName}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Last Name</span>
                      <strong style={{ color: '#0f172a' }}>{demoResult.lastName}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>Middle Name</span>
                      <strong style={{ color: '#0f172a' }}>{demoResult.middleName}</strong>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase' }}>DOB</span>
                      <strong style={{ color: '#0f172a' }}>{demoResult.dob}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', padding: '10px', borderRadius: '6px', marginTop: '6px' }}>
                    <CheckCircle2 size={15} style={{ color: '#4f46e5', flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '0.75rem', color: '#475569', lineHeight: '1.4' }}>
                      Audit validation generated successfully in platform transaction logs.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Features ── */}
      <section id="features" style={{
        padding: '100px 40px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '12px' }}>Why Enterprises Choose Bia Verify</h2>
            <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>A unified stack combining official identity mapping, instant balance settlements, and secure RESTful pipelines.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
            {[
              {
                icon: <Zap size={22} />, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: '#e2e8f0',
                title: 'Instant Identity Registry Query',
                desc: 'Access official database verifications instantly. Match biometric identifiers, photos, and birth records dynamically inside your flow.'
              },
              {
                icon: <RefreshCw size={22} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: '#e2e8f0',
                title: 'Automated Account Funding',
                desc: 'Generate a dedicated PalmPay Virtual Funding account upon business approval. Simple bank transfers credit your available balance in seconds.'
              },
              {
                icon: <Key size={22} />, color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: '#e2e8f0',
                title: 'Clean Developer API SDKs',
                desc: 'Generate secure API keys, inspect comprehensive integration docs, and initiate programmatic queries using simple, clean JSON bodies.'
              }
            ].map((f) => (
              <div key={f.title} className="glass-panel" style={{
                padding: '32px', background: '#ffffff', border: `1px solid ${f.border}`,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)', transition: 'all 0.25s', borderRadius: '16px'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = f.color;
                  e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = f.border;
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02)';
                }}
              >
                <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '24px' }}>
                  {f.icon}
                </div>
                <h3 style={{ marginBottom: '12px', fontSize: '1.2rem', fontWeight: 700 }}>{f.title}</h3>
                <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: '1.6' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Developer Integration Code Preview ── */}
      <section id="developer" style={{ padding: '100px 40px', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '18px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>Developer-First REST Integration</h2>
            <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '28px', fontSize: '0.95rem' }}>
              Connect our endpoint using any HTTP wrapper. Authenticate using secure bearer keys and receive structured, predictable responses.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                'Standard POST endpoints with clean routing',
                'Detailed, auditable API usage log ledger logs',
                'Comprehensive HTTP response error codes'
              ].map((text) => (
                <div key={text} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                    <Check size={12} />
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Code Window (remains dark for high contrast syntax rendering) */}
          <div style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            {/* Code header bar */}
            <div style={{ background: '#1e293b', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>cURL Request</span>
              <button
                onClick={copyCurl}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '5px',
                  padding: '4px 10px', color: '#94a3b8', fontSize: '0.72rem', fontFamily: 'var(--font-sans)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
              >
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Code Body */}
            <pre style={{ margin: 0, padding: '20px', overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'monospace', color: '#f8fafc', lineHeight: '1.6', background: 'rgba(15,23,42,0.6)' }}>
<span style={{ color: '#f43f5e' }}>curl</span> -X POST "https://verify.bia.com.ng/api/v1/verify" \
  -H "Authorization: <span style={{ color: '#60a5fa' }}>Bearer bv_your_api_key</span>" \
  -H "Content-Type: <span style={{ color: '#34d399' }}>application/json</span>" \
  -d '<span style={{ color: '#fbbf24' }}>{"{"}"nin": "57635446044"{"}"}</span>'
            </pre>
          </div>
        </div>
      </section>

      {/* ── Security & Auditing Section ── */}
      <section style={{
        padding: '100px 40px', background: '#f8fafc',
        borderTop: '1px solid #e2e8f0'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '18px', lineHeight: '1.2', letterSpacing: '-0.02em' }}>NDPR Compliant Data Security</h2>
            <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '24px' }}>
              We safeguard sensitive Personally Identifiable Information (PII) using bank-grade cryptographic protocols. Every search event is strictly monitored.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: 'AES-256-GCM Encryption at Rest', desc: 'All NIMC registry data payloads, including photos and identity structures, are securely encrypted at rest.' },
                { title: 'Detailed Access Audit Trails', desc: 'We capture every query with comprehensive caller metadata (Caller ID, timestamp, and IP address) for audit logs.' },
                { title: 'Presigned S3 Document Access', desc: 'Secure company registration uploads (CAC, NDPC certificates) expire dynamically, preventing link exposure.' }
              ].map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: '14px', alignItems: 'start' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0, marginTop: '2px' }}>
                    <Lock size={13} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{item.title}</h4>
                    <p style={{ color: '#475569', fontSize: '0.8rem', lineHeight: '1.5' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} style={{ color: 'var(--primary)' }} /> Core Platform SLA
            </h4>
            {[
              { label: 'Active Service SLA', value: '99.98%', color: '#10b981' },
              { label: 'Query Matching Latency', value: '~450ms', color: '#2563eb' },
              { label: 'Cost Per Query Match', value: '₦70.00', color: '#0f172a' }
            ].map((stat) => (
              <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>{stat.label}</span>
                <strong style={{ fontSize: '1.1rem', color: stat.color }}>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '48px 40px 40px',
        textAlign: 'center',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
          <img src="/logo.png" alt="Bia Verify Logo" style={{ height: '28px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem' }}>
            <Link to="/login" style={{ color: '#475569', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>Partner Console</Link>
            <Link to="/register" style={{ color: '#475569', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>Register</Link>
            <a href="mailto:support@bia.com.ng" style={{ color: '#475569', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.color = '#475569'}>Contact Support</a>
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
          &copy; {new Date().getFullYear()} BiaVerify Identity Platform. All rights reserved. &bull; Fully compliant with NDPC Nigeria guidelines.
        </div>
      </footer>
    </div>
  );
};
