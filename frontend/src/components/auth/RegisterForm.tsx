import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    ci: '',
  });

  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone_number: formData.phoneNumber.trim(),
        ci: formData.ci.trim(),
      });
    } catch {
      // Manejado por AuthContext
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Crear Cuenta</h2>
        <p>Únete para participar u organizar grupos de pasanaku</p>
      </div>

      {(error || localError) && <div className="error-alert">{localError || error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">Nombres</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="ej. Carlos"
              value={formData.firstName}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Apellidos</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              placeholder="ej. Mamani"
              value={formData.lastName}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="ci">Cédula de Identidad (C.I.)</label>
            <input
              id="ci"
              name="ci"
              type="text"
              placeholder="ej. 8912345 LP"
              value={formData.ci}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phoneNumber">Celular / WhatsApp</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="ej. 77123456"
              value={formData.phoneNumber}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="username">Nombre de Usuario *</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="ej. carlos_bol"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo Electrónico *</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="carlos@ejemplo.com"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Contraseña *</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>

      <div className="auth-footer">
        <span>¿Ya tienes una cuenta? </span>
        <button className="link-btn" onClick={onSwitchToLogin}>
          Inicia sesión aquí
        </button>
      </div>
    </div>
  );
};
