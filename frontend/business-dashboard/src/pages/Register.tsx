import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Phone, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Shield } from 'lucide-react';

const API = 'https://verify.bia.com.ng/api/v1';

type Step = 'form' | 'otp' | 'done';

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234')) return '+' + digits;
  if (digits.startsWith('0')) return '+234' + digits.slice(1);
  return '+234' + digits;
}

export const Register: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('form');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setOtpSending(true);
    try {
      const res = await fetch(`${API}/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP.');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError('');
    setOtpSending(true);
    try {
      const res = await fetch(`${API}/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend OTP.');
      startCountdown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  };

  // ── Step 2: verify OTP → register ────────────────────────────────────────
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOtpVerifying(true);

    try {
      // Verify OTP
      const otpRes = await fetch(`${API}/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) throw new Error(otpData.message || 'OTP verification failed.');

      setOtpVerifying(false);
      setRegistering(true);

      // Register
      const regRes = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phoneNumber: phone, password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.message || 'Registration failed.');

      setApiKey(regData.apiKey || '');
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOtpVerifying(false);
      setRegistering(false);
    }
  };

  // ── Shared page shell ─────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 50%, #faf5ff 100%)',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '40px', margin: '20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.png" alt="Bia Verify" style={{ height: '40px', objectFit: 'contain', marginBottom: '14px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            {step === 'form' && 'Create your partner account'}
            {step === 'otp' && `Enter the code sent to ${normalisePhone(phone)}`}
            {step === 'done' && 'Account ready — save your API key'}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
          {(['form', 'otp', 'done'] as Step[]).map((s, i) => (
            <div key={s} style={{
              width: step === s ? '24px' : '8px', height: '8px', borderRadius: '4px',
              background: ['form', 'otp', 'done'].indexOf(step) >= i ? 'var(--primary)' : '#e2e8f0',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {error && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px 14px',
            borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', fontSize: '0.84rem', marginBottom: '20px',
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── STEP 1: Registration form ── */}
        {step === 'form' && (
          <form onSubmit={handleSendOtp}>
            {[
              { label: 'Full Name', type: 'text', placeholder: 'e.g. Amina Musa', value: fullName, setter: setFullName, icon: <User size={15} /> },
              { label: 'Email Address', type: 'email', placeholder: 'you@company.com', value: email, setter: setEmail, icon: <Mail size={15} /> },
              { label: 'Phone Number', type: 'tel', placeholder: '08012345678', value: phone, setter: setPhone, icon: <Phone size={15} /> },
              { label: 'Password', type: 'password', placeholder: '• • • • • • • •', value: password, setter: setPassword, icon: <Lock size={15} /> },
            ].map(({ label, type, placeholder, value, setter, icon }) => (
              <div className="form-group" key={label}>
                <label className="form-label">{label}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    {icon}
                  </span>
                  <input
                    type={type} required className="form-input"
                    style={{ paddingLeft: '38px', width: '100%' }}
                    placeholder={placeholder} value={value}
                    onChange={(e) => setter(e.target.value)}
                  />
                </div>
              </div>
            ))}

            <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
              <Shield size={13} style={{ display: 'inline', marginRight: '6px', color: 'var(--primary)' }} />
              A one-time code will be sent to your phone to verify your number.
            </div>

            <button type="submit" disabled={otpSending}
              className={`btn-base btn-primary ${otpSending ? 'btn-disabled' : ''}`}
              style={{ width: '100%', padding: '13px' }}>
              {otpSending ? <span className="spinner" /> : <><span>Send Verification Code</span><ArrowRight size={15} /></>}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP entry ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyAndRegister}>
            <div className="form-group">
              <label className="form-label">6-Digit OTP Code</label>
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                required className="form-input"
                style={{ letterSpacing: '0.3em', fontSize: '1.4rem', textAlign: 'center', width: '100%', padding: '14px' }}
                placeholder="000000" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
            </div>

            <button type="submit" disabled={otpVerifying || registering || otp.length < 6}
              className={`btn-base btn-primary ${(otpVerifying || registering) ? 'btn-disabled' : ''}`}
              style={{ width: '100%', padding: '13px', marginBottom: '14px' }}>
              {otpVerifying ? <><span className="spinner" /><span>Verifying…</span></> :
               registering   ? <><span className="spinner" /><span>Creating account…</span></> :
                               <><CheckCircle2 size={15} /><span>Verify & Create Account</span></>}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={handleResendOtp} disabled={countdown > 0 || otpSending}
                style={{ background: 'none', border: 'none', cursor: countdown > 0 ? 'default' : 'pointer', color: countdown > 0 ? 'var(--text-muted)' : 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <RefreshCw size={13} />
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
            </div>

            <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.82rem', fontFamily: 'var(--font-sans)', display: 'block', margin: '12px auto 0', textDecoration: 'underline' }}>
              ← Change details
            </button>
          </form>
        )}

        {/* ── STEP 3: Done — show API key then go to login ── */}
        {step === 'done' && (
          <div>
            <div style={{
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '12px', padding: '16px 18px', marginBottom: '20px',
              display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>Account created!</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Your phone-verified account is active. Save your API key below — it is shown only once.</p>
              </div>
            </div>

            {apiKey && (
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>Your API Key (copy now)</label>
                <div style={{
                  background: '#f8fafc', border: '1px dashed var(--border-color-light)',
                  borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
                }}>
                  <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{apiKey}</code>
                  <button onClick={() => { navigator.clipboard.writeText(apiKey); }}
                    style={{ background: 'var(--primary)', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
                    Copy
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => navigate('/login')}
              className="btn-base btn-primary"
              style={{ width: '100%', padding: '13px' }}>
              <ArrowRight size={15} /> Go to Login
            </button>
          </div>
        )}

        {step !== 'done' && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '24px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
