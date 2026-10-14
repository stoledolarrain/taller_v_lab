import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!identifier.trim() || !password) {
      setLocalError('Por favor ingresa tu usuario o correo y contraseña.');
      return;
    }

    try {
      await login({
        username_or_email: identifier.trim(),
        password,
      });
    } catch {
      // El error se gestiona en AuthContext
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Iniciar Sesión</h2>
        <p>Ingresa a tu cuenta para gestionar tus grupos de pasanaku</p>
      </div>

      {(error || localError) && <div className="error-alert">{localError || error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="identifier">Usuario o Correo Electrónico</label>
          <input
            id="identifier"
            type="text"
            placeholder="ej. carlos123 o carlos@ejemplo.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? 'Iniciando sesión...' : 'Ingresar'}
        </button>
      </form>

      <div className="auth-footer">
        <span>¿No tienes una cuenta? </span>
        <button className="link-btn" onClick={onSwitchToRegister}>
          Regístrate aquí
        </button>
      </div>
    </div>
  );
};
