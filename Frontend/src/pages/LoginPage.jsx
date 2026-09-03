import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Shield, 
  Activity,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  LockKeyhole
} from 'lucide-react';
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
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile,
  configurePersistence,
  formatFirebaseError
} from '../firebase';
import { api } from '../api';

// Official Google Multi-Color SVG Icon
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

export default function LoginPage({ onLoginSuccess }) {
  // Modes: 'signin' | 'register' | 'forgot' | 'resetPassword'
  const [authMode, setAuthMode] = useState('signin');
  
  // Standard Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Inspector');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Password Reset Specific States
  const [resetCode, setResetCode] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Status & Loading States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Clear messages when switching tabs
  const switchMode = (mode) => {
    setError('');
    setSuccessMsg('');
    setCodeError('');
    setAuthMode(mode);
  };

  // Populate form with preconfigured test credentials for rapid civil evaluation
  const setQuickCredentials = (userEmail, userPass, userRole) => {
    setEmail(userEmail);
    setPassword(userPass);
    setRole(userRole);
    setError('');
    setSuccessMsg(`Loaded credentials for ${userEmail}`);
  };

  // Helper to persist user token and role into session/local storage
  const completeFirebaseLogin = async (firebaseUser, userRole = role) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const displayName = firebaseUser.displayName || name.trim() || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Road Inspector');
      
      const userPayload = {
        id: firebaseUser.uid,
        name: displayName,
        email: firebaseUser.email || '',
        role: userRole || 'Inspector',
        photoURL: firebaseUser.photoURL || null,
        auth_provider: firebaseUser.providerData?.[0]?.providerId || 'google'
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
    } catch (err) {
      console.error("[Firebase Complete Login Error]", err);
      setError(formatFirebaseError(err));
    }
  };

  // --- Check for Password Reset Action Code or Redirect Auth on Mount ---
  useEffect(() => {
    let isMounted = true;

    // 1. Check for Password Reset oobCode in URL Query Parameters or Hash
    const urlParams = new URLSearchParams(window.location.search);
    let oobCode = urlParams.get('oobCode') || urlParams.get('code');
    let mode = urlParams.get('mode');

    // Also check hash query params if hash routing is used (e.g. /#/reset-password?oobCode=...)
    if (!oobCode && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?'));
      const hashParams = new URLSearchParams(hashQuery);
      oobCode = hashParams.get('oobCode') || hashParams.get('code');
      if (!mode) mode = hashParams.get('mode');
    }

    const isResetPath = window.location.pathname.includes('reset-password') || window.location.hash.includes('reset-password');
    const isResetMode = mode === 'resetPassword' || mode === 'reset' || isResetPath;

    if (oobCode || isResetMode) {
      setAuthMode('resetPassword');
      setError('');
      setSuccessMsg('');

      if (oobCode) {
        setResetCode(oobCode);
        setVerifyingCode(true);
        setCodeError('');

        verifyPasswordResetCode(auth, oobCode)
          .then((verifiedEmail) => {
            if (isMounted) {
              setResetEmail(verifiedEmail);
              setVerifyingCode(false);
            }
          })
          .catch((err) => {
            console.error("[Firebase Verify Reset Code Error]", err);
            if (isMounted) {
              setCodeError(formatFirebaseError(err));
              setVerifyingCode(false);
            }
          });
      } else {
        setVerifyingCode(false);
        setCodeError('No password reset code found in this link. Please use the link sent to your email or request a new reset link.');
      }
      return;
    }

    // 2. Check for Firebase Redirect Authentication result
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          await completeFirebaseLogin(result.user, 'Inspector');
        }
      } catch (err) {
        console.error("[Firebase Redirect Login Error]", err);
        if (isMounted) {
          setError(formatFirebaseError(err));
        }
      }
    };
    checkRedirect();

    return () => { isMounted = false; };
  }, []);

  // --- 1. EMAIL/PASSWORD SIGN IN ---
  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      await configurePersistence(rememberMe);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      let assignedRole = 'Inspector';
      if (email.toLowerCase().includes('admin')) assignedRole = 'Admin';
      if (email.toLowerCase().includes('pwd') || email.toLowerCase().includes('engineer')) assignedRole = 'Engineer';

      await completeFirebaseLogin(userCredential.user, assignedRole);
    } catch (err) {
      console.warn("[Firebase Login Error]", err);
      
      // Fallback: Check seeded local credentials if offline
      try {
        const localAuth = await api.login(email.trim(), password);
        if (localAuth && localAuth.token) {
          const userPayload = {
            id: localAuth.user.id || 1,
            name: localAuth.user.name || email.split('@')[0],
            email: email.trim(),
            role: localAuth.user.role || 'Inspector',
            auth_provider: 'local_database'
          };
          if (rememberMe) {
            localStorage.setItem('roadsense_token', localAuth.token);
            localStorage.setItem('roadsense_user', JSON.stringify(userPayload));
          } else {
            sessionStorage.setItem('roadsense_token', localAuth.token);
            sessionStorage.setItem('roadsense_user', JSON.stringify(userPayload));
          }
          onLoginSuccess(userPayload, rememberMe);
          return;
        }
      } catch (backendErr) {
        console.warn("[Backend Auth Notice]", backendErr);
      }

      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // --- 2. REGISTER NEW CIVIL ACCOUNT ---
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await configurePersistence(rememberMe);
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      try {
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });
      } catch (profileErr) {
        console.warn("[Firebase Profile Update Notice]", profileErr);
      }

      try {
        await api.register(name.trim(), email.trim(), password, role);
      } catch (apiErr) {
        console.warn("[Backend Sync Notice]", apiErr);
      }

      await completeFirebaseLogin(userCredential.user, role);
    } catch (err) {
      console.error("[Firebase Register Error]", err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FORGOT PASSWORD (REQUEST RESET EMAIL) ---
  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      // Build ActionCodeSettings returning to the current origin and path
      const actionCodeSettings = {
        url: window.location.origin + (window.location.pathname.startsWith('/reset-password') ? window.location.pathname : '/reset-password'),
        handleCodeInApp: true
      };

      try {
        await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      } catch (actionErr) {
        console.warn("[ActionCodeSettings notice, falling back to standard sendPasswordResetEmail]", actionErr);
        // Fallback without actionCodeSettings if continue URL is not pre-whitelisted
        await sendPasswordResetEmail(auth, email.trim());
      }

      // Secure generic confirmation (does not expose email existence)
      setSuccessMsg('If an account exists for this email address, a password reset link has been sent. Please check your inbox and spam folder.');
    } catch (err) {
      console.error("[Firebase Reset Password Error]", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setSuccessMsg('If an account exists for this email address, a password reset link has been sent. Please check your inbox and spam folder.');
      } else {
        setError(formatFirebaseError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 4. CONFIRM PASSWORD RESET (ENTER & SAVE NEW PASSWORD) ---
  const handleConfirmPasswordReset = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, resetCode, newPassword);
      setResetSuccess(true);
      setSuccessMsg('Password reset successful! You can now sign in with your new password.');
      
      // Clean up URL query parameters
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname.replace(/\/reset-password\/?$/, '/') || '/');
      }
    } catch (err) {
      console.error("[Firebase Confirm Password Reset Error]", err);
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  // --- 5. FIREBASE GOOGLE SIGN-IN HANDLER ---
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      // Set persistence non-blockingly to maintain direct user-gesture context for popup
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
            width: '58px',
            height: '58px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            marginBottom: '1rem'
          }}>
            <Activity size={30} color="#FFFFFF" />
          </div>

          <h1 style={{
            fontSize: '1.7rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #BAE6FD 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.4rem'
          }}>
            RoadSense AI
          </h1>

          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4
          }}>
            {authMode === 'register' && 'Create your account to access the civil infrastructure risk platform'}
            {authMode === 'signin' && 'Sign in to access the road risk & maintenance intelligence system'}
            {authMode === 'forgot' && 'Reset your password via verified email link'}
            {authMode === 'resetPassword' && 'Create a new secure password for your account'}
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
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                    <Lock size={14} color="#60A5FA" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#60A5FA',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 500
                    }}
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
                    autoComplete="current-password"
                    disabled={loading}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.4rem' }}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: '#3B82F6',
                    cursor: 'pointer',
                    width: '15px',
                    height: '15px'
                  }}
                />
                <label htmlFor="rememberMe" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Keep me signed in on this device
                </label>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <LogIn size={16} />
                <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              </button>
            </form>

            {/* Quick Demo Login Credentials Bar */}
            <div style={{
              marginTop: '1.5rem',
              padding: '0.85rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Sparkles size={12} color="#F59E0B" />
                <span>Civil Quick Login Presets</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQuickCredentials('inspector@roadsense.ai', 'inspector123', 'Inspector')}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', justifyContent: 'center' }}
                >
                  Inspector Portal
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQuickCredentials('admin@roadsense.ai', 'admin123', 'Admin')}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', justifyContent: 'center' }}
                >
                  Admin Console
                </button>
              </div>
            </div>

            {/* Switch to Register */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60A5FA',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Register here
              </button>
            </div>
          </div>
        )}

        {/* --- 2. REGISTER FORM --- */}
        {authMode === 'register' && (
          <div>
            {/* Continue with Google on Register */}
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
              <span>{googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
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
                  <span>Full Name</span>
                </label>
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={14} color="#60A5FA" />
                  <span>Email Address</span>
                </label>
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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Briefcase size={14} color="#60A5FA" />
                  <span>Civil Engineering Role</span>
                </label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                >
                  <option value="Inspector">Field Road Quality Inspector</option>
                  <option value="Engineer">Civil Highway Engineer</option>
                  <option value="Admin">Municipal PWD / NHAI Administrator</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      style={{ paddingRight: '2rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
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

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Confirm</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      style={{ paddingRight: '2rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <UserPlus size={16} />
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>

            {/* Switch to Sign In */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Already registered? </span>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60A5FA',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Sign In here
              </button>
            </div>
          </div>
        )}

        {/* --- 3. FORGOT PASSWORD (REQUEST RESET LINK) --- */}
        {authMode === 'forgot' && (
          <div>
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginBottom: '1.25rem',
              lineHeight: 1.5
            }}>
              Enter your registered email address below. If an account exists, a secure password reset link will be sent to your inbox.
            </div>

            <form onSubmit={handleForgotPassword} autoComplete="off">
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
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
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}
              >
                <KeyRound size={16} />
                <span>{loading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => switchMode('signin')}
                style={{ width: '100%', padding: '0.65rem', justifyContent: 'center', gap: '0.4rem' }}
              >
                <ArrowLeft size={15} />
                <span>Back to Sign In</span>
              </button>
            </form>
          </div>
        )}

        {/* --- 4. RESET PASSWORD PAGE (ENTER NEW PASSWORD FROM EMAIL LINK) --- */}
        {authMode === 'resetPassword' && (
          <div>
            {verifyingCode ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <RefreshCw size={28} color="#60A5FA" className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Verifying password reset security code...
                </p>
              </div>
            ) : codeError ? (
              <div>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#F87171',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  lineHeight: 1.5
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700 }}>
                    <AlertCircle size={17} />
                    <span>Reset Link Expired or Invalid</span>
                  </div>
                  {codeError}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => switchMode('forgot')}
                  style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}
                >
                  <KeyRound size={16} />
                  <span>Request a New Reset Link</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => switchMode('signin')}
                  style={{ width: '100%', padding: '0.65rem', justifyContent: 'center' }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : resetSuccess ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem'
                }}>
                  <CheckCircle2 size={26} />
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Password Successfully Reset!
                </h3>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Your password has been updated in Firebase Authentication. You can now access your account with your new credentials.
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => switchMode('signin')}
                  style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <LogIn size={16} />
                  <span>Proceed to Sign In</span>
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <LockKeyhole size={16} color="#60A5FA" style={{ flexShrink: 0 }} />
                  <span>
                    Setting new password for <strong style={{ color: '#93C5FD' }}>{resetEmail}</strong>
                  </span>
                </div>

                <form onSubmit={handleConfirmPasswordReset} autoComplete="off">
                  {/* New Password Field */}
                  <div className="form-group" style={{ marginBottom: '1.1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Lock size={14} color="#60A5FA" />
                      <span>New Password</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={loading}
                        required
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        aria-label="Toggle new password visibility"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password Field */}
                  <div className="form-group" style={{ marginBottom: '1.35rem' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Lock size={14} color="#60A5FA" />
                      <span>Confirm New Password</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        disabled={loading}
                        required
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{loading ? 'Updating Password...' : 'Reset Password'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => switchMode('signin')}
                    style={{ width: '100%', padding: '0.65rem', justifyContent: 'center' }}
                  >
                    Cancel & Return to Sign In
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
