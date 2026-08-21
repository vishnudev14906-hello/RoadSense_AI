import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, ShieldCheck, Clock, User, Sparkles } from 'lucide-react';
import { formatDateTime, formatTime, formatDate } from '../utils/dateUtils';

export default function Navbar({ currentUser, onOpenAuth, onLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          padding: '0.28rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.78rem',
          color: 'var(--text-main)',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          <Clock size={13} color="#60A5FA" />
          <span style={{ color: 'var(--text-muted)' }}>{formatDate(currentTime)}</span>
          <span style={{ color: '#93C5FD', fontWeight: 700 }}>{formatTime(currentTime, true)}</span>
        </div>
      </div>

      <div className="navbar-right">
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)'
              }}
              title={currentUser.email ? `Signed in as ${currentUser.email}` : undefined}
            >
              {currentUser.auth_provider === 'google' ? (
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#4285F4',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 800
                }}>
                  G
                </div>
              ) : (
                <ShieldCheck size={16} color={currentUser.role === 'Admin' ? '#60A5FA' : '#34D399'} />
              )}
              
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{currentUser.name}</span>
              
              <span style={{
                fontSize: '0.68rem',
                background: currentUser.role === 'Admin' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: currentUser.role === 'Admin' ? '#60A5FA' : '#34D399',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {currentUser.role}
              </span>
            </div>

            <button 
              className="btn btn-secondary btn-sm" 
              onClick={onLogout} 
              title="Sign Out of Session"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button 
            className="btn btn-primary btn-sm" 
            onClick={onOpenAuth}
            style={{ gap: '0.4rem' }}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
