import React from 'react';
import { useGroupForm } from '../../hooks/useGroupForm';
import { ErrorMessage } from '../ui/ErrorMessage';
import {
  calcularTotalEsperado,
  formatearMontoBolivianos,
  formatearPeriodicidad,
} from '../../types/groups';
import type { Periodicity } from '../../types/groups';

interface GroupFormProps {
  /** Si se proporciona, el formulario edita un grupo existente (PATCH) */
  groupId?: number;
  initialValues?: {
    name?: string;
    description?: string;
    quota_amount?: string;
    periodicity?: Periodicity;
    start_date?: string;
    total_members?: string;
  };
  /** Si false, el formulario se renderiza en modo solo lectura */
  isEditable?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const PERIODICIDADES: { value: Periodicity; label: string }[] = [
  { value: 'SEMANAL', label: formatearPeriodicidad('SEMANAL') },
  { value: 'QUINCENAL', label: formatearPeriodicidad('QUINCENAL') },
  { value: 'MENSUAL', label: formatearPeriodicidad('MENSUAL') },
];

/**
 * GroupForm — formulario para crear o editar un grupo de pasanaku.
 * En modo lectura (isEditable=false) muestra los datos como texto, no como inputs.
 * Regla de negocio: formulario bloqueado cuando el grupo está en INICIADO o FINALIZADO.
 * data-testid en el botón de submit para E2E 01.
 */
export const GroupForm: React.FC<GroupFormProps> = ({
  groupId,
  initialValues,
  isEditable = true,
  onSuccess,
  onCancel,
}) => {
  const {
    values,
    errors,
    isSubmitting,
    submitError,
    handleChange,
    handleSubmit,
    clearSubmitError,
  } = useGroupForm({
    groupId,
    initialValues,
    onSuccess,
  });

  // Preview calculado en tiempo real (función pura exportada)
  const totalPreview = calcularTotalEsperado(
    values.quota_amount,
    parseInt(values.total_members, 10) || 0
  );

  // Modo solo lectura: grupo ya iniciado o finalizado
  if (!isEditable) {
    return (
      <div
        className="group-form group-form--readonly"
        aria-label="Configuración del grupo (solo lectura)"
        data-testid="group-form-readonly"
      >
        <div className="form-group">
          <span className="form-group label">Nombre</span>
          <span className="form-readonly-value">{values.name || '-'}</span>
        </div>
        <div className="form-group">
          <span className="form-group label">Descripción</span>
          <span className="form-readonly-value">
            {values.description || 'Sin descripción'}
          </span>
        </div>
        <div className="form-group">
          <span className="form-group label">Cuota</span>
          <span className="form-readonly-value" data-testid="readonly-quota">
            {values.quota_amount ? formatearMontoBolivianos(values.quota_amount) : '-'}
          </span>
        </div>
        <div className="form-group">
          <span className="form-group label">Periodicidad</span>
          <span className="form-readonly-value">
            {values.periodicity ? formatearPeriodicidad(values.periodicity) : '-'}
          </span>
        </div>
        <div className="form-group">
          <span className="form-group label">Fecha de inicio</span>
          <span className="form-readonly-value">{values.start_date || '-'}</span>
        </div>
        <div className="form-group">
          <span className="form-group label">Participantes</span>
          <span className="form-readonly-value">{values.total_members || '-'}</span>
        </div>
        <p className="group-form__lock-notice" role="note">
          🔒 La configuración no puede modificarse una vez que el pasanaku ha iniciado.
        </p>
      </div>
    );
  }

  return (
    <form
      className="group-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={groupId ? 'Editar grupo de pasanaku' : 'Crear grupo de pasanaku'}
      data-testid="group-form"
    >
      {submitError && <ErrorMessage message={submitError} onDismiss={clearSubmitError} />}

      {/* Nombre */}
      <div className="form-group">
        <label htmlFor="group-name">
          Nombre del grupo <span aria-hidden="true">*</span>
        </label>
        <input
          id="group-name"
          type="text"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          disabled={isSubmitting}
          placeholder="Ej. Pasanaku de la oficina"
          aria-required="true"
          aria-describedby={errors.name ? 'group-name-error' : undefined}
          aria-invalid={!!errors.name}
          data-testid="group-name-input"
        />
        {errors.name && (
          <span id="group-name-error" className="form-error" role="alert">
            {errors.name}
          </span>
        )}
      </div>

      {/* Descripción */}
      <div className="form-group">
        <label htmlFor="group-description">Descripción (opcional)</label>
        <textarea
          id="group-description"
          value={values.description}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={isSubmitting}
          placeholder="Describe el propósito de este pasanaku..."
          rows={3}
          className="form-textarea"
          data-testid="group-description-input"
        />
      </div>

      <div className="form-row">
        {/* Cuota */}
        <div className="form-group">
          <label htmlFor="group-quota">
            Cuota (Bs) <span aria-hidden="true">*</span>
          </label>
          <input
            id="group-quota"
            type="number"
            min="0.01"
            step="0.01"
            value={values.quota_amount}
            onChange={(e) => handleChange('quota_amount', e.target.value)}
            disabled={isSubmitting}
            placeholder="200.00"
            aria-required="true"
            aria-describedby={errors.quota_amount ? 'group-quota-error' : undefined}
            aria-invalid={!!errors.quota_amount}
            data-testid="group-quota-input"
          />
          {errors.quota_amount && (
            <span id="group-quota-error" className="form-error" role="alert">
              {errors.quota_amount}
            </span>
          )}
        </div>

        {/* Periodicidad */}
        <div className="form-group">
          <label htmlFor="group-periodicity">
            Periodicidad <span aria-hidden="true">*</span>
          </label>
          <select
            id="group-periodicity"
            value={values.periodicity}
            onChange={(e) => handleChange('periodicity', e.target.value)}
            disabled={isSubmitting}
            aria-required="true"
            data-testid="group-periodicity-select"
          >
            {PERIODICIDADES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        {/* Fecha de inicio */}
        <div className="form-group">
          <label htmlFor="group-start-date">
            Fecha de inicio <span aria-hidden="true">*</span>
          </label>
          <input
            id="group-start-date"
            type="date"
            value={values.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
            disabled={isSubmitting}
            aria-required="true"
            aria-describedby={errors.start_date ? 'group-start-date-error' : undefined}
            aria-invalid={!!errors.start_date}
            data-testid="group-start-date-input"
          />
          {errors.start_date && (
            <span id="group-start-date-error" className="form-error" role="alert">
              {errors.start_date}
            </span>
          )}
        </div>

        {/* Participantes */}
        <div className="form-group">
          <label htmlFor="group-members">
            N° de participantes <span aria-hidden="true">*</span>
          </label>
          <input
            id="group-members"
            type="number"
            min="2"
            step="1"
            value={values.total_members}
            onChange={(e) => handleChange('total_members', e.target.value)}
            disabled={isSubmitting}
            aria-required="true"
            aria-describedby={errors.total_members ? 'group-members-error' : undefined}
            aria-invalid={!!errors.total_members}
            data-testid="group-members-input"
          />
          {errors.total_members && (
            <span id="group-members-error" className="form-error" role="alert">
              {errors.total_members}
            </span>
          )}
        </div>
      </div>

      {/* Preview total esperado — cálculo en tiempo real */}
      {totalPreview > 0 && (
        <div
          className="group-form__total-preview"
          aria-live="polite"
          data-testid="group-form-total-preview"
        >
          <span>Total por ronda:</span>
          <strong>
            {formatearMontoBolivianos(values.quota_amount)} × {values.total_members}{' '}
            participantes ={' '}
            <span data-testid="total-preview-value">
              {formatearMontoBolivianos(totalPreview)}
            </span>
          </strong>
        </div>
      )}

      <div className="group-form__footer">
        <button
          type="button"
          className="secondary-btn"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="group-form-cancel-btn"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          aria-label={groupId ? 'Guardar cambios del grupo' : 'Crear grupo de pasanaku'}
          data-testid="group-form-submit-btn"
        >
          {isSubmitting
            ? groupId
              ? 'Guardando...'
              : 'Creando...'
            : groupId
              ? 'Guardar cambios'
              : 'Crear grupo'}
        </button>
      </div>
    </form>
  );
};
