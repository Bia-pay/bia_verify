import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Phone, ArrowRight, AlertCircle, CheckCircle2, KeyRound, RefreshCw, Eye, EyeOff } from 'lucide-react';

const API = 'http://localhost:5001/api/v1';

type Mode = 'login' | 'forgot' | 'reset';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot password state
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // Reset password state
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => { setError(''); setSuccess(''); };

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoginLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Forgot password — request OTP ────────────────────────────────────────
  const startResetCountdown = () => {
    setResetCountdown(60);
    const interval = setInterval(() => {
      setResetCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setForgotLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: forgotPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed.');
      setResetToken(data.resetToken || '');
      setMode('reset');
      startResetCountdown();
      setSuccess(data.message || 'A 6-digit reset code has been sent.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendResetOtp = async () => {
    if (resetCountdown > 0) return;
    clearMessages();
    setForgotLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: forgotPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed.');
      setResetToken(data.resetToken || '');
      startResetCountdown();
      setSuccess('A new reset code has been sent.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Reset password ───────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, otp: resetOtp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed.');
      setSuccess('Password reset! Redirecting to login…');
      setTimeout(() => {
        setMode('login');
        setResetOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #eff6ff 50%, #faf5ff 100%)',
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '40px', margin: '20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img src="/logo.png" alt="Bia Verify" style={{ height: '40px', objectFit: 'contain', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.25rem' }}>
            {mode === 'login' && 'Partner Login'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Enter Reset Code'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            {mode === 'login' && 'NIN Verification Gateway Access'}
            {mode === 'forgot' && 'Enter your registered phone number to receive a reset code via SMS'}
            {mode === 'reset' && 'Enter the 6-digit code sent to your phone'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.84rem', marginBottom: '18px' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '12px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.84rem', marginBottom: '18px' }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{success}</span>
          </div>
        )}

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="email" required className="form-input"
                  style={{ paddingLeft: '38px', width: '100%' }}
                  placeholder="you@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '10px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type={showPw ? 'text' : 'password'} required className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: '40px', width: '100%' }}
                  placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '22px' }}>
              <button type="button" onClick={() => { setMode('forgot'); clearMessages(); setForgotPhone(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loginLoading}
              className={`btn-base btn-primary ${loginLoading ? 'btn-disabled' : ''}`}
              style={{ width: '100%', padding: '13px' }}>
              {loginLoading ? <span className="spinner" /> : <><span>Log In</span><ArrowRight size={15} /></>}
            </button>

            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '22px' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Register
              </Link>
            </p>
          </form>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label className="form-label">Virtual Account / Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" required className="form-input"
                  style={{ paddingLeft: '38px', width: '100%' }}
                  placeholder="e.g. 1012345678 or 080XXXXXXXX" value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Enter your assigned virtual account number or registered phone number.
              </span>
            </div>

            <button type="submit" disabled={forgotLoading}
              className={`btn-base btn-primary ${forgotLoading ? 'btn-disabled' : ''}`}
              style={{ width: '100%', padding: '13px', marginBottom: '14px' }}>
              {forgotLoading ? <span className="spinner" /> : <><KeyRound size={15} /><span>Send Reset Code</span></>}
            </button>

            <button type="button" onClick={() => { setMode('login'); clearMessages(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.83rem', fontFamily: 'var(--font-sans)', display: 'block', margin: '0 auto', textDecoration: 'underline' }}>
              ← Back to login
            </button>
          </form>
        )}

        {/* ── RESET PASSWORD ── */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">6-Digit Reset Code</label>
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                required className="form-input"
                style={{ letterSpacing: '0.3em', fontSize: '1.4rem', textAlign: 'center', width: '100%', padding: '14px' }}
                placeholder="000000" value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus />
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button type="button" onClick={handleResendResetOtp} disabled={resetCountdown > 0 || forgotLoading}
                  style={{ background: 'none', border: 'none', cursor: resetCountdown > 0 ? 'default' : 'pointer', color: resetCountdown > 0 ? 'var(--text-muted)' : 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <RefreshCw size={12} />
                  {resetCountdown > 0 ? `Resend in ${resetCountdown}s` : 'Resend code'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type={showNewPw ? 'text' : 'password'} required className="form-input"
                  style={{ paddingLeft: '38px', paddingRight: '40px', width: '100%' }}
                  placeholder="Min 8 characters" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}>
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="password" required className="form-input"
                  style={{ paddingLeft: '38px', width: '100%' }}
                  placeholder="Re-enter password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <button type="submit" disabled={resetLoading || resetOtp.length < 6}
              className={`btn-base btn-primary ${(resetLoading || resetOtp.length < 6) ? 'btn-disabled' : ''}`}
              style={{ width: '100%', padding: '13px', marginBottom: '14px' }}>
              {resetLoading ? <span className="spinner" /> : <><CheckCircle2 size={15} /><span>Reset Password</span></>}
            </button>

            <button type="button" onClick={() => { setMode('forgot'); clearMessages(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.83rem', fontFamily: 'var(--font-sans)', display: 'block', margin: '0 auto', textDecoration: 'underline' }}>
              ← Change email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
