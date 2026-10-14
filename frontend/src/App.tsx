import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/layout/Navbar';
import { LoginForm } from './components/auth/LoginForm';
import { RegisterForm } from './components/auth/RegisterForm';
import { UserDashboard } from './components/dashboard/UserDashboard';
import './App.css';

const MainContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Cargando información de sesión...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <UserDashboard />;
  }

  return (
    <div className="auth-wrapper">
      {authView === 'login' ? (
        <LoginForm onSwitchToRegister={() => setAuthView('register')} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <div className="app-root">
        <Navbar />
        <main className="main-viewport">
          <MainContent />
        </main>
      </div>
    </AuthProvider>
  );
}
