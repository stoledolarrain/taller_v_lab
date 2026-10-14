import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const UserDashboard: React.FC = () => {
  const { user, updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [ci, setCi] = useState(user?.ci || '');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!user) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    try {
      await updateProfile({
        phone_number: phone,
        ci: ci,
      });
      setSuccessMsg('Perfil actualizado correctamente.');
      setIsEditing(false);
    } catch {
      // Error manejado en AuthContext
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>¡Bienvenido, {user.first_name || user.username}! 👋</h2>
        <p>Tu sesión se encuentra activa en Pasanaku Digital.</p>
      </header>

      {successMsg && <div className="success-alert">{successMsg}</div>}

      <div className="dashboard-grid">
        <div className="dashboard-card user-card">
          <div className="card-header">
            <h3>Tu Perfil de Participante</h3>
            <button className="secondary-btn" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancelar' : 'Editar Datos'}
            </button>
          </div>

          {!isEditing ? (
            <div className="user-details">
              <div className="detail-row">
                <span className="label">Usuario:</span>
                <span className="val">@{user.username}</span>
              </div>
              <div className="detail-row">
                <span className="label">Correo:</span>
                <span className="val">{user.email}</span>
              </div>
              <div className="detail-row">
                <span className="label">Nombre Completo:</span>
                <span className="val">{user.full_name || 'No especificado'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Cédula de Identidad (C.I.):</span>
                <span className="val">{user.ci || 'Sin registrar'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Celular / WhatsApp:</span>
                <span className="val">{user.phone_number || 'Sin registrar'}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="edit-form">
              <div className="form-group">
                <label>Cédula de Identidad</label>
                <input
                  type="text"
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                  placeholder="ej. 8912345 LP"
                />
              </div>
              <div className="form-group">
                <label>Celular / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ej. 77123456"
                />
              </div>
              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          )}
        </div>

        <div className="dashboard-card next-steps-card">
          <h3>Módulos del Sistema</h3>
          <ul className="status-checklist">
            <li className="checked">
              <span className="icon">✅</span>
              <span>
                <strong>Autenticación & Autorización:</strong> Registro, Login JWT, perfil
                seguro y persistencia.
              </span>
            </li>
            <li className="pending">
              <span className="icon">⏳</span>
              <span>
                <strong>Grupos de Pasanaku:</strong> Creación de grupos, código de
                invitación y cupos. (Siguiente fase)
              </span>
            </li>
            <li className="pending">
              <span className="icon">⏳</span>
              <span>
                <strong>Turnos y Beneficiarios:</strong> Asignación manual o sorteo
                automático.
              </span>
            </li>
            <li className="pending">
              <span className="icon">⏳</span>
              <span>
                <strong>Control de Rondas y Cuotas:</strong> Registro de aportes,
                validación y bloqueo por deuda.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
