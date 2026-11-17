import { useCallback, useState } from 'react';
import { groupsService } from '../services/groupsService';
import { ApiError } from '../services/apiClient';
import type { CreateGroupInput, UpdateGroupInput, Periodicity } from '../types/groups';

// ─── Form shape ───────────────────────────────────────────────────────────────
export interface GroupFormValues {
  name: string;
  description: string;
  quota_amount: string;
  periodicity: Periodicity;
  start_date: string;
  total_members: string; // String for input binding; parsed on submit
}

export interface GroupFormErrors {
  name?: string;
  quota_amount?: string;
  periodicity?: string;
  start_date?: string;
  total_members?: string;
}

interface UseGroupFormOptions {
  /** When provided, the form updates an existing group (PATCH) instead of creating (POST) */
  groupId?: number;
  initialValues?: Partial<GroupFormValues>;
  onSuccess?: () => void;
}

interface UseGroupFormReturn {
  values: GroupFormValues;
  errors: GroupFormErrors;
  isSubmitting: boolean;
  submitError: string | null;
  handleChange: (field: keyof GroupFormValues, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  clearSubmitError: () => void;
}

const DEFAULT_VALUES: GroupFormValues = {
  name: '',
  description: '',
  quota_amount: '',
  periodicity: 'MENSUAL',
  start_date: '',
  total_members: '2',
};

/**
 * Valida el formulario del grupo. Función pura exportada para pruebas unitarias.
 */
export function validateGroupForm(values: GroupFormValues): GroupFormErrors {
  const errors: GroupFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'El nombre del grupo es obligatorio.';
  }

  const quota = parseFloat(values.quota_amount);
  if (!values.quota_amount || isNaN(quota) || quota <= 0) {
    errors.quota_amount = 'El monto de la cuota debe ser mayor a Bs 0.';
  }

  if (!values.periodicity) {
    errors.periodicity = 'Selecciona una periodicidad.';
  }

  if (!values.start_date) {
    errors.start_date = 'La fecha de inicio es obligatoria.';
  } else {
    const date = new Date(values.start_date);
    if (isNaN(date.getTime())) {
      errors.start_date = 'Fecha inválida.';
    }
  }

  const members = parseInt(values.total_members, 10);
  if (!values.total_members || isNaN(members) || members < 2) {
    errors.total_members = 'El número de participantes debe ser al menos 2.';
  }

  return errors;
}

export function useGroupForm({
  groupId,
  initialValues,
  onSuccess,
}: UseGroupFormOptions = {}): UseGroupFormReturn {
  const [values, setValues] = useState<GroupFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [errors, setErrors] = useState<GroupFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback((field: keyof GroupFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      const validationErrors = validateGroupForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        if (groupId !== undefined) {
          const payload: UpdateGroupInput = {
            name: values.name.trim(),
            description: values.description.trim(),
            quota_amount: parseFloat(values.quota_amount).toFixed(2),
            periodicity: values.periodicity,
            start_date: values.start_date,
            total_members: parseInt(values.total_members, 10),
          };
          await groupsService.updateGroup(groupId, payload);
        } else {
          const payload: CreateGroupInput = {
            name: values.name.trim(),
            description: values.description.trim() || undefined,
            quota_amount: parseFloat(values.quota_amount).toFixed(2),
            periodicity: values.periodicity,
            start_date: values.start_date,
            total_members: parseInt(values.total_members, 10),
          };
          await groupsService.createGroup(payload);
        }
        onSuccess?.();
      } catch (err) {
        if (err instanceof ApiError) {
          setSubmitError(err.message);
        } else {
          setSubmitError('Error inesperado. Intenta nuevamente.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, groupId, onSuccess]
  );

  const resetForm = useCallback(() => {
    setValues({ ...DEFAULT_VALUES, ...initialValues });
    setErrors({});
    setSubmitError(null);
  }, [initialValues]);

  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    handleChange,
    handleSubmit,
    resetForm,
    clearSubmitError,
  };
}
