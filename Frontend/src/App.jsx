import React, { useState, useEffect, Suspense, lazy } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MobileBottomNav from './components/MobileBottomNav';

// Dynamically code-split modals so Firebase auth & heavy report trees don't block critical first paint
const AuthModal = lazy(() => import('./components/AuthModal'));
const ReportModal = lazy(() => import('./components/ReportModal'));

// Eagerly loaded default view for instantaneous first-contentful-paint
import Dashboard from './pages/Dashboard';

// Dynamically code-split secondary views for high performance & minimal bundle size on Vercel
const Roads = lazy(() => import('./pages/Roads'));
const Predictor = lazy(() => import('./pages/LivingRoadExperience'));
const Prioritization = lazy(() => import('./pages/Prioritization'));
const Reports = lazy(() => import('./pages/Reports'));
const History = lazy(() => import('./pages/History'));
const MapView = lazy(() => import('./pages/MapView'));
const VisionScanner = lazy(() => import('./pages/VisionScanner'));
const LifecycleForecast = lazy(() => import('./pages/LifecycleForecast'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

import { auth, signOut, onAuthStateChanged } from './firebase';
import { api } from './api';

function PageFallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '380px',
      gap: '1rem',
      color: 'var(--text-muted)'
    }}>
      <div className="animate-spin" style={{
        width: 36,
        height: 36,
        border: '3px solid rgba(59, 130, 246, 0.2)',
        borderTopColor: '#3B82F6',
        borderRadius: '50%'
      }} />
      <span style={{ fontSize: '0.88rem' }}>Loading view...</span>
    </div>
  );
}

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isResetFlow = urlParams.has('oobCode') || 
                          urlParams.get('mode') === 'resetPassword' || 
                          urlParams.get('mode') === 'reset' ||
                          window.location.pathname.includes('reset-password') ||
                          window.location.hash.includes('reset-password');
      if (isResetFlow) return null;

      const persistent = localStorage.getItem('roadsense_user');
      if (persistent) return JSON.parse(persistent);
      const session = sessionStorage.getItem('roadsense_user');
      if (session) return JSON.parse(session);
      return null;
    } catch {
      return null;
    }
  });
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [predictorInitialParams, setPredictorInitialParams] = useState(null);

  // Synchronize Firebase Authentication State on Mount and Lifecycle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const urlParams = new URLSearchParams(window.location.search);
      const isResetFlow = urlParams.has('oobCode') || 
                          urlParams.get('mode') === 'resetPassword' || 
                          urlParams.get('mode') === 'reset' ||
                          window.location.pathname.includes('reset-password') ||
                          window.location.hash.includes('reset-password');
      if (isResetFlow) return;

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const storedUser = localStorage.getItem('roadsense_user') || sessionStorage.getItem('roadsense_user');
          let role = 'Inspector';
          if (storedUser) {
            try {
              role = JSON.parse(storedUser).role || 'Inspector';
            } catch {}
          }

          const userObj = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Road Inspector'),
            email: firebaseUser.email || '',
            role: role,
            photoURL: firebaseUser.photoURL || null,
            auth_provider: firebaseUser.providerData?.[0]?.providerId || 'firebase'
          };

          setCurrentUser(userObj);
          
          if (localStorage.getItem('roadsense_token')) {
            localStorage.setItem('roadsense_token', idToken);
            localStorage.setItem('roadsense_user', JSON.stringify(userObj));
          } else {
            sessionStorage.setItem('roadsense_token', idToken);
            sessionStorage.setItem('roadsense_user', JSON.stringify(userObj));
          }
        } catch (e) {
          console.warn("[Firebase Token Sync Warning]", e);
        }
      } else {
        const storedUser = localStorage.getItem('roadsense_user') || sessionStorage.getItem('roadsense_user');
        if (!storedUser) {
          setCurrentUser(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOpenReport = (data) => {
    setReportData(data);
    setIsReportModalOpen(true);
  };

  const handleLaunchNewAssessment = () => {
    setPredictorInitialParams(null);
    setCurrentTab('predictor');
    setIsMobileMenuOpen(false);
  };

  const handleVisionTransfer = (telemetry, roadName, location, imageMeta) => {
    setPredictorInitialParams({
      ...telemetry,
      road_name: roadName,
      location: location,
      imageUrl: imageMeta?.imageUrl,
      detections: imageMeta?.detections,
      imageTitle: imageMeta?.title,
      sourceMode: 'image',
      autoRun: true
    });
    setCurrentTab('predictor');
    setIsMobileMenuOpen(false);
    setToastMessage(`✨ Visual damage telemetry transferred to AI Risk Predictor for "${roadName}"!`);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleReseed = async () => {
    try {
      const res = await api.reseedDatabase();
      setToastMessage("✅ SQLite database successfully synchronized with verified real-world Indian road network!");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Reseed failure:", err);
      setToastMessage("⚠️ Failed to synchronize database. Please verify backend connection.");
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    localStorage.removeItem('roadsense_token');
    localStorage.removeItem('roadsense_user');
    sessionStorage.removeItem('roadsense_token');
    sessionStorage.removeItem('roadsense_user');
    setCurrentUser(null);
    setToastMessage("Successfully signed out.");
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    setToastMessage(`Welcome back, ${user.name}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleLaunchPredictorWithParams = (roadParams) => {
    setPredictorInitialParams({ ...roadParams, autoRun: true });
    setCurrentTab('predictor');
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (roadParams?.road_name) {
      setToastMessage(`⚡ Loaded "${roadParams.road_name}" telemetry into AI Risk Predictor!`);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onReseed={handleReseed}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            borderBottom: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34D399',
            padding: '0.65rem 2rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            {toastMessage}
          </div>
        )}

        {/* Content Wrapper */}
        <main className="content-wrapper">
          <Suspense fallback={<PageFallback />}>
            {currentTab === 'dashboard' && (
              <Dashboard
                onNavigate={(tab) => {
                  if (tab === 'predictor') {
                    handleLaunchNewAssessment();
                  } else {
                    handleTabChange(tab);
                  }
                }}
                onInspectRoad={handleOpenReport}
                onLaunchPredictor={handleLaunchNewAssessment}
              />
            )}

            {currentTab === 'map' && (
              <MapView
                onInspectRoad={handleOpenReport}
                onNavigate={handleTabChange}
                onRunAiTest={handleLaunchPredictorWithParams}
              />
            )}

            {currentTab === 'vision' && (
              <VisionScanner
                onTransferToPredictor={handleVisionTransfer}
              />
            )}

            {currentTab === 'predictor' && (
              <Predictor
                onOpenReport={handleOpenReport}
                initialParams={predictorInitialParams}
              />
            )}

            {currentTab === 'prioritization' && (
              <Prioritization onOpenReport={handleOpenReport} />
            )}

            {currentTab === 'lifecycle' && (
              <LifecycleForecast
                onNavigate={handleTabChange}
                onLaunchPredictor={handleLaunchPredictorWithParams}
              />
            )}

            {currentTab === 'roads' && (
              <Roads 
                onOpenReport={handleOpenReport} 
                onNavigate={handleTabChange}
                onLaunchPredictor={handleLaunchPredictorWithParams}
              />
            )}

            {currentTab === 'reports' && (
              <Reports />
            )}

            {currentTab === 'history' && (
              <History onOpenReport={handleOpenReport} />
            )}
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile) */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </Suspense>
      )}

      {/* Inspection & Audit Report Modal */}
      {isReportModalOpen && (
        <Suspense fallback={null}>
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            road={reportData}
            prediction={reportData}
          />
        </Suspense>
      )}
    </div>
  );
}
