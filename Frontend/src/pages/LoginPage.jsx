import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  X,
  ExternalLink,
  Flame
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  configurePersistence,
  formatFirebaseError
} from '../firebase';
import { api } from '../api';

// Official Google Multi-Color SVG Icon
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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

export default function LoginPage({ onLoginSuccess }) {
  // Modes: 'signin' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState('signin');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [role, setRole] = useState('Inspector');

  // Interactive Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Password Strength Calculation
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'transparent', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444', width: '25%' };
    if (score === 2 || score === 3) return { score: 2, label: 'Moderate', color: '#F59E0B', width: '50%' };
    if (score === 4) return { score: 3, label: 'Good', color: '#3B82F6', width: '75%' };
    return { score: 4, label: 'Strong', color: '#10B981', width: '100%' };
  };

  const passwordStrength = calculatePasswordStrength(password);

  const resetFields = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Helper to sync Firebase authenticated user with app session
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
  };

  // --- 1. FIREBASE SIGN IN HANDLER ---
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password');
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

  // --- 2. FIREBASE REGISTER HANDLER ---
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      return;
    }
    if (!acceptTerms) {
      setError('You must accept the Terms & Conditions and Civil Data Usage Policy');
      return;
    }

    setLoading(true);
    try {
      await configurePersistence(rememberMe);
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      
      // Update Firebase User Profile with Display Name
      await updateProfile(userCredential.user, {
        displayName: cleanName
      });

      await completeFirebaseLogin(userCredential.user, role);
    } catch (err) {
      console.error("[Firebase Registration Error]", err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FIREBASE FORGOT PASSWORD HANDLER ---
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please enter your registered email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(`Password reset link sent by Firebase to ${email.trim()}! Please check your email inbox to reset your password.`);
    } catch (err) {
      console.error("[Firebase Reset Password Error]", err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // --- 4. FIREBASE GOOGLE SIGN-IN HANDLER ---
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await configurePersistence(rememberMe);
      const userCredential = await signInWithPopup(auth, googleProvider);
      await completeFirebaseLogin(userCredential.user, 'Inspector');
    } catch (err) {
      console.error("[Firebase Google Auth Error]", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(formatFirebaseError(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(59, 130, 246, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 50%), var(--bg-main)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '750px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card), 0 0 35px rgba(59, 130, 246, 0.12)',
        padding: '2.5rem 2rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
            marginBottom: '1rem'
          }}>
            <Activity size={28} color="#FFFFFF" />
          </div>

          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text-main)',
            marginBottom: '0.35rem'
          }}>
            RoadSense <span style={{ color: '#60A5FA' }}>AI</span>
          </h1>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#FBBF24',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            fontWeight: 700,
            marginBottom: '0.65rem'
          }}>
            <Flame size={12} color="#F59E0B" />
            <span>Firebase Authentication</span>
          </div>

          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4
          }}>
            {authMode === 'register' && 'Create your account to access the civil infrastructure risk platform'}
            {authMode === 'signin' && 'Sign in to access the road risk & maintenance intelligence system'}
            {authMode === 'forgot' && 'Reset your password via verified Firebase email link'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#F87171',
            padding: '0.8rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.84rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34D399',
            padding: '0.8rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.84rem',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* --- 1. SIGN IN FORM --- */}
        {authMode === 'signin' && (
          <div>
            {/* Continue with Google Button */}
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
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.25rem 0',
              color: 'var(--text-dim)',
              fontSize: '0.78rem'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or sign in with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleSignIn} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={14} color="#60A5FA" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@roadsense.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 0 }}>
                    <Lock size={14} color="#60A5FA" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      resetFields();
                      setAuthMode('forgot');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60A5FA',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                    onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    style={{ padding: '0.75rem 2.5rem 0.75rem 1rem', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#3B82F6', cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="rememberMe" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                }}
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In with Firebase</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* --- 2. REGISTER FORM --- */}
        {authMode === 'register' && (
          <div>
            {/* Continue with Google Button */}
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
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                cursor: 'pointer'
              }}
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '1.25rem 0',
              color: 'var(--text-dim)',
              fontSize: '0.78rem'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or register with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleRegister} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} color="#60A5FA" />
                  <span>Username / Full Name</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={14} color="#60A5FA" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@roadsense.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} color="#60A5FA" />
                  <span>Password</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ padding: '0.75rem 2.5rem 0.75rem 1rem', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div style={{ marginTop: '0.45rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                      <span style={{ color: passwordStrength.color, fontWeight: 700 }}>{passwordStrength.label}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: passwordStrength.width, height: '100%', background: passwordStrength.color, transition: 'all 0.3s' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} color="#34D399" />
                  <span>Confirm Password</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    style={{ padding: '0.75rem 2.5rem 0.75rem 1rem', fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Shield size={14} color="#60A5FA" />
                  <span>Assigned Role</span>
                </label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                >
                  <option value="Inspector">Road Inspector / Field Engineer</option>
                  <option value="Admin">System Administrator / Municipal Officer</option>
                </select>
              </div>

              {/* Terms & Conditions Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ accentColor: '#3B82F6', marginTop: '2px', cursor: 'pointer' }}
                  required
                />
                <label htmlFor="acceptTerms" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.4 }}>
                  I accept the <strong style={{ color: 'var(--text-main)' }}>Terms & Conditions</strong> and the <strong style={{ color: 'var(--text-main)' }}>Civil Infrastructure Data Policy</strong>.
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)'
                }}
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <span>Create Firebase Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* --- 3. FORGOT PASSWORD FORM --- */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} autoComplete="off">
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.83rem',
              color: 'var(--text-muted)',
              marginBottom: '1.25rem',
              lineHeight: 1.5
            }}>
              Enter your registered account email. Firebase will automatically send a secure password reset link directly to your inbox.
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} color="#60A5FA" />
                <span>Registered Email Address</span>
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="name@roadsense.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              {loading ? (
                <span>Sending Reset Link...</span>
              ) : (
                <>
                  <span>Send Password Reset Email</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Navigation */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.87rem',
          color: 'var(--text-muted)'
        }}>
          {authMode === 'signin' && (
            <div>
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  resetFields();
                  setAuthMode('register');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60A5FA',
                  cursor: 'pointer',
                  fontWeight: 700,
                  marginLeft: '0.3rem'
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {authMode === 'register' && (
            <div>
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  resetFields();
                  setAuthMode('signin');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60A5FA',
                  cursor: 'pointer',
                  fontWeight: 700,
                  marginLeft: '0.3rem'
                }}
              >
                Sign In
              </button>
            </div>
          )}

          {authMode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                resetFields();
                setAuthMode('signin');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#60A5FA',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
