import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationsBell } from './NotificationsBell';
import { formatearReputacion } from '../../types/groups';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const rep = user?.reputation ?? 'MEDIA';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-logo" aria-hidden="true">
          P
        </span>
        <span className="brand-title">Pasanaku Digital</span>
      </div>

      <div className="navbar-user">
        {isAuthenticated && user ? (
          <div className="user-info-badge">
            <NotificationsBell />
            <span className="user-name">
              {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
            </span>
            <span className="user-tag">@{user.username}</span>
            <span
              className={`reputation-badge reputation-badge--${rep.toLowerCase()}`}
              data-testid="navbar-reputation-badge"
              aria-label={`Reputación: ${formatearReputacion(rep)}`}
            >
              Reputación: {formatearReputacion(rep)}
            </span>
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
