import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import ReportModal from './components/ReportModal';

// Unified Civil Infrastructure Platform Views
import Dashboard from './pages/Dashboard';
import Roads from './pages/Roads';
import Predictor from './pages/Predictor';
import LivingRoadExperience from './pages/LivingRoadExperience';
import Prioritization from './pages/Prioritization';
import Reports from './pages/Reports';
import History from './pages/History';
import MapView from './pages/MapView';
import VisionScanner from './pages/VisionScanner';
import LifecycleForecast from './pages/LifecycleForecast';
import LoginPage from './pages/LoginPage';

import { auth, signOut, onAuthStateChanged } from './firebase';
import { api } from './api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
    setToastMessage(`✨ Visual damage telemetry transferred to AI Risk Predictor for "${roadName}"!`);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleReseed = async () => {
    try {
      const res = await api.reseedDatabase();
      setToastMessage("✅ SQLite database successfully synchronized with verified real-world Indian road network!");
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      setToastMessage("❌ Failed to sync database: " + err.message);
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  const handleLoginSuccess = (user, rememberMe = true) => {
    setCurrentUser(user);
    setCurrentTab('dashboard');
    setToastMessage(`👋 Welcome to RoadSense AI, ${user.name}!`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("[Firebase SignOut Error]", e);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('roadsense_token');
      localStorage.removeItem('roadsense_user');
      sessionStorage.removeItem('roadsense_token');
      sessionStorage.removeItem('roadsense_user');
    } catch (e) {
      console.error(e);
    }
    setToastMessage("🔒 Session terminated. You have been logged out.");
    setTimeout(() => setToastMessage(''), 3500);
  };

  // 1. DEFAULT PAGE: If unauthenticated, always render the dedicated Sign In / Register / Forgot Password portal
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. AUTHENTICATED: Render full RoadSense AI platform & Dashboard
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'predictor' && currentTab !== 'predictor') {
            setPredictorInitialParams(null);
          }
          setCurrentTab(tab);
          setMobileMenuOpen(false);
        }}
        onReseed={handleReseed}
        isMobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-layout">
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
          isMobileMenuOpen={mobileMenuOpen}
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
          {currentTab === 'dashboard' && (
            <Dashboard
              onNavigate={(tab) => {
                if (tab === 'predictor') {
                  handleLaunchNewAssessment();
                } else {
                  setCurrentTab(tab);
                }
              }}
              onInspectRoad={handleOpenReport}
              onLaunchPredictor={handleLaunchNewAssessment}
            />
          )}

          {currentTab === 'map' && (
            <MapView
              onInspectRoad={handleOpenReport}
              onNavigate={(tab) => setCurrentTab(tab)}
              onRunAiTest={(roadParams) => {
                setPredictorInitialParams({ ...roadParams, autoRun: true });
                setCurrentTab('predictor');
                setToastMessage(`⚡ Loaded "${roadParams.road_name}" telemetry into AI Risk Predictor!`);
                setTimeout(() => setToastMessage(''), 4000);
              }}
            />
          )}

          {currentTab === 'vision' && (
            <VisionScanner
              onTransferToPredictor={handleVisionTransfer}
            />
          )}

          {currentTab === 'predictor' && (
            <LivingRoadExperience
              onOpenReport={handleOpenReport}
              initialParams={predictorInitialParams}
            />
          )}

          {currentTab === 'prioritization' && (
            <Prioritization onOpenReport={handleOpenReport} />
          )}

          {currentTab === 'lifecycle' && (
            <LifecycleForecast
              onNavigate={(tab) => setCurrentTab(tab)}
              onLaunchPredictor={(roadParams) => {
                setPredictorInitialParams({ ...roadParams, autoRun: true });
                setCurrentTab('predictor');
                setToastMessage(`⚡ Loaded "${roadParams.road_name}" into AI Risk Predictor from ROI Simulator!`);
                setTimeout(() => setToastMessage(''), 4000);
              }}
            />
          )}

          {currentTab === 'roads' && (
            <Roads onOpenReport={handleOpenReport} />
          )}

          {currentTab === 'reports' && (
            <Reports />
          )}

          {currentTab === 'history' && (
            <History onOpenReport={handleOpenReport} />
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Inspection & Audit Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        road={reportData}
        prediction={reportData}
      />
    </div>
  );
}
