import React from 'react';
import { useAuth } from '../../hooks/useAuth';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-logo">🪙</span>
        <span className="brand-title">Pasanaku Digital</span>
      </div>

      <div className="navbar-user">
        {isAuthenticated && user ? (
          <div className="user-info-badge">
            <span className="user-name">
              {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
            </span>
            <span className="user-tag">@{user.username}</span>
            <button className="logout-btn" onClick={logout}>
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <span className="guest-badge">Acceso Seguro</span>
        )}
      </div>
    </nav>
  );
};
