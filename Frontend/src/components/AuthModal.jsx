import React, { useState, useEffect } from 'react';
import { X, Shield, User, Lock, Mail, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  getGoogleProvider,
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  configurePersistence,
  formatFirebaseError
} from '../firebase';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'register' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [role, setRole] = useState('Inspector');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setPassword('');
    setConfirmPassword('');
    setRole('Inspector');
    setError('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const completeFirebaseLogin = async (firebaseUser, userRole = role) => {
    const idToken = await firebaseUser.getIdToken();
    const displayName = firebaseUser.displayName || name.trim() || firebaseUser.email.split('@')[0];
    
    const userPayload = {
      id: firebaseUser.uid,
      name: displayName,
      email: firebaseUser.email,
      role: userRole || 'Inspector',
      photoURL: firebaseUser.photoURL || null,
      auth_provider: firebaseUser.providerData?.[0]?.providerId || 'firebase'
    };

    if (rememberMe) {
      localStorage.setItem('roadsense_token', idToken);
      localStorage.setItem('roadsense_user', JSON.stringify(userPayload));
      sessionStorage.removeItem('roadsense_token');
      sessionStorage.removeItem('roadsense_user');
    } else {
      sessionStorage.setItem('roadsense_token', idToken);
      sessionStorage.setItem('roadsense_user', JSON.stringify(userPayload));
      localStorage.removeItem('roadsense_token');
      localStorage.removeItem('roadsense_user');
    }

    onLoginSuccess(userPayload, rememberMe);
    handleClose();
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setError('Please provide email and password');
      return;
    }

    setLoading(true);
    try {
      await configurePersistence(rememberMe);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      await completeFirebaseLogin(userCredential.user);
    } catch (err) {
      console.error("[Firebase Sign In Error]", err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Please enter your full name');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await configurePersistence(rememberMe);
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(userCredential.user, { displayName: cleanName });
      await completeFirebaseLogin(userCredential.user, role);
    } catch (err) {
      console.error("[Firebase Register Error]", err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true
      };
      try {
        await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      } catch (actionErr) {
        await sendPasswordResetEmail(auth, email.trim());
      }
      setSuccessMsg('If an account exists for this email address, a password reset link has been sent. Please check your inbox.');
    } catch (err) {
      console.error("[Firebase Reset Password Error]", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setSuccessMsg('If an account exists for this email address, a password reset link has been sent. Please check your inbox.');
      } else {
        setError(formatFirebaseError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      configurePersistence(rememberMe).catch((e) => console.warn("[Persistence notice]", e));
      const provider = getGoogleProvider();
      const userCredential = await signInWithPopup(auth, provider);
      if (userCredential && userCredential.user) {
        await completeFirebaseLogin(userCredential.user, 'Inspector');
      }
    } catch (err) {
      console.error("[Firebase Google Auth Error]", err);
      if (err.code === "auth/popup-blocked" || err.code === "auth/cancelled-popup-request") {
        try {
          const provider = getGoogleProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          console.error("[Firebase Redirect Error]", redirectErr);
          setError(formatFirebaseError(redirectErr));
        }
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Google Sign-In was cancelled. Please select a Google account to continue.");
      } else {
        setError(formatFirebaseError(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={20} color="#3B82F6" />
            <h2 className="modal-title">
              {authMode === 'register' && 'Create RoadSense Account'}
              {authMode === 'signin' && 'Sign In to RoadSense AI'}
              {authMode === 'forgot' && 'Reset Password'}
            </h2>
          </div>
          <button className="btn-icon" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34D399',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem',
              marginBottom: '1rem'
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {authMode !== 'forgot' && (
            <>
              {/* Google Button */}
              <button
                type="button"
                className="btn"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  padding: '0.7rem 1rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  cursor: 'pointer'
                }}
              >
                <GoogleIcon />
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '1rem 0',
                color: 'var(--text-dim)',
                fontSize: '0.75rem'
              }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                <span style={{ padding: '0 0.6rem', textTransform: 'uppercase' }}>or with email</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              </div>
            </>
          )}

          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@roadsense.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setError(''); setSuccessMsg(''); setAuthMode('forgot'); }}
                    style={{ background: 'none', border: 'none', color: '#60A5FA', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    style={{ paddingRight: '2.2rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.6rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  id="modalRememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#3B82F6', cursor: 'pointer' }}
                />
                <label htmlFor="modalRememberMe" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.65rem' }}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => { setError(''); setSuccessMsg(''); setAuthMode('register'); }}
                  style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {authMode === 'register' && (
            <form onSubmit={handleRegister} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Er. Rajesh Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="rajesh.sharma@nhai.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="Inspector">Field Road Inspector</option>
                  <option value="Engineer">Civil Highway Engineer</option>
                  <option value="Admin">PWD / NHAI Administrator</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirm</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.65rem' }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setError(''); setSuccessMsg(''); setAuthMode('signin'); }}
                  style={{ background: 'none', border: 'none', color: '#60A5FA', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} autoComplete="off">
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
                lineHeight: 1.4
              }}>
                Enter your registered email. If an account exists, a secure password reset link will be sent to your inbox.
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Registered Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@roadsense.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.65rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <KeyRound size={15} />
                <span>{loading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setError(''); setSuccessMsg(''); setAuthMode('signin'); }}
                style={{ width: '100%', padding: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
