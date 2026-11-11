import React, { useState } from 'react';
import { useJoinGroup } from '../../hooks/useJoinGroup';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import {
  formatearPeriodicidad,
  calcularTotalEsperado,
  formatearMontoBolivianos,
} from '../../types/groups';

interface JoinGroupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * JoinGroupForm — formulario para unirse a un grupo con código de invitación.
 * Flujo: 1) Ingresar código → 2) Ver preview → 3) Confirmar unión.
 * La app registra pagos fuera de plataforma; este componente no ejecuta transferencias.
 * data-testid en botones críticos para E2E 01 y E2E 07.
 */
export const JoinGroupForm: React.FC<JoinGroupFormProps> = ({ onSuccess, onCancel }) => {
  const [codeInput, setCodeInput] = useState('');
  const {
    preview,
    isPreviewing,
    isJoining,
    error,
    previewByCode,
    confirmJoin,
    resetJoin,
    clearError,
  } = useJoinGroup(onSuccess);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await previewByCode(codeInput);
  };

  const handleJoin = async () => {
    await confirmJoin();
  };

  const handleReset = () => {
    setCodeInput('');
    resetJoin();
  };

  const totalPreview = preview
    ? calcularTotalEsperado(preview.quota_amount, preview.total_members)
    : 0;

  return (
    <div
      className="join-group-form"
      aria-label="Unirse a un grupo de pasanaku"
      data-testid="join-group-form"
    >
      <div className="join-group-form__header">
        <h2>Unirse a un grupo</h2>
        <p>Ingresa el código de invitación para ver los detalles del grupo.</p>
      </div>

      {error && <ErrorMessage message={error} onDismiss={clearError} />}

      {/* Paso 1: Formulario de búsqueda por código */}
      {!preview && (
        <form onSubmit={handleSearch} className="join-group-form__search" noValidate>
          <div className="form-group">
            <label htmlFor="invite-code-input">
              Código de invitación <span aria-hidden="true">*</span>
            </label>
            <input
              id="invite-code-input"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Ej. A1B2C3D4"
              maxLength={12}
              disabled={isPreviewing}
              aria-required="true"
              aria-describedby="invite-code-hint"
              data-testid="invite-code-input"
            />
            <span id="invite-code-hint" className="form-hint">
              Código de 8 caracteres compartido por el administrador del grupo.
            </span>
          </div>

          {isPreviewing ? (
            <LoadingSpinner message="Buscando grupo..." size="sm" />
          ) : (
            <div className="join-group-form__actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={onCancel}
                data-testid="join-cancel-btn"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={!codeInput.trim() || isPreviewing}
                aria-label="Buscar grupo con código de invitación"
                data-testid="join-search-btn"
              >
                Buscar grupo
              </button>
            </div>
          )}
        </form>
      )}

      {/* Paso 2: Preview del grupo encontrado */}
      {preview && (
        <div
          className="join-group-form__preview"
          aria-label={`Vista previa del grupo ${preview.name}`}
          data-testid="join-group-preview"
        >
          <div className="join-group-form__preview-header">
            <h3>{preview.name}</h3>
            <StatusBadge status={preview.status} />
          </div>

          {preview.description && (
            <p className="join-group-form__preview-description">{preview.description}</p>
          )}

          <dl className="join-group-form__preview-details">
            <div className="group-card__detail-row">
              <dt>Administrador:</dt>
              <dd>{preview.creator_name}</dd>
            </div>
            <div className="group-card__detail-row">
              <dt>Cuota:</dt>
              <dd>
                <CurrencyDisplay amount={preview.quota_amount} />{' '}
                {formatearPeriodicidad(preview.periodicity).toLowerCase()}
              </dd>
            </div>
            <div className="group-card__detail-row">
              <dt>Participantes:</dt>
              <dd data-testid="preview-members-count">
                {preview.current_members_count}/{preview.total_members}
                {preview.remaining_slots > 0 && (
                  <span className="group-card__slots-hint">
                    {' '}
                    ({preview.remaining_slots} cupo
                    {preview.remaining_slots !== 1 ? 's' : ''} disponible
                    {preview.remaining_slots !== 1 ? 's' : ''})
                  </span>
                )}
              </dd>
            </div>
            <div className="group-card__detail-row">
              <dt>Total por ronda:</dt>
              <dd>
                <strong data-testid="preview-total">
                  {formatearMontoBolivianos(totalPreview)}
                </strong>
              </dd>
            </div>
            <div className="group-card__detail-row">
              <dt>Inicio previsto:</dt>
              <dd>{preview.start_date}</dd>
            </div>
          </dl>

          {preview.is_full && (
            <div
              className="join-group-form__full-warning"
              role="alert"
              data-testid="preview-full-warning"
            >
              ⚠️ Este grupo ya no tiene cupos disponibles.
            </div>
          )}

          <div className="join-group-form__actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleReset}
              data-testid="join-back-btn"
            >
              ← Buscar otro
            </button>
            <button
              type="button"
              className="submit-btn"
              onClick={handleJoin}
              disabled={isJoining || preview.is_full}
              aria-label={`Unirse al grupo ${preview.name}`}
              aria-busy={isJoining}
              data-testid="join-confirm-btn"
            >
              {isJoining ? 'Uniéndose...' : 'Unirse al grupo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
