import React, { useEffect, useState } from 'react';
import { useGroupDetail } from '../../hooks/useGroupDetail';
import { useAuth } from '../../hooks/useAuth';
import { useTurns } from '../../hooks/useTurns';
import { useCurrentRound } from '../../hooks/useCurrentRound';
import { useReminders } from '../../hooks/useReminders';
import { GroupForm } from './GroupForm';
import { MembersList } from './MembersList';
import { InviteCodeDisplay } from './InviteCodeDisplay';
import { TurnsList } from '../turnos/TurnsList';
import { CurrentRound } from '../rondas/CurrentRound';
import { RoundHistory } from '../rondas/RoundHistory';
import { SendReminderButton } from '../rondas/SendReminderButton';
import { GroupFinancialSummary } from './GroupFinancialSummary';
import { ContributionsList } from '../aportes/ContributionsList';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  formatearPeriodicidad,
  calcularTotalEsperado,
  formatearMontoBolivianos,
} from '../../types/groups';

interface GroupDetailProps {
  groupId: number;
  onBack: () => void;
  onLeft: () => void;
}

type DetailView = 'info' | 'edit';

/**
 * GroupDetail — vista principal del detalle de un grupo de pasanaku.
 * Orquesta useGroupDetail, useTurns y useCurrentRound (ViewModels).
 * No realiza llamadas HTTP directas (MVVM estricto).
 * - En BORRADOR: muestra configuración, invitación, sorteo de turnos y botón de iniciar.
 * - En INICIADO: muestra la Ronda Activa (pozo, beneficiario, cierre con bloqueo por deuda),
 *   tabla de cuotas (reportar/validar aportes) e historial de rondas completadas.
 * - En FINALIZADO: muestra estado de finalización y el historial completo.
 */
export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onBack, onLeft }) => {
  const { user } = useAuth();
  const {
    group,
    isLoading,
    error,
    isAdmin,
    isEditable,
    fetchGroup,
    leaveGroup,
    removeMember,
    regenerateCode,
    clearError,
  } = useGroupDetail(groupId);

  const {
    turns,
    isRaffling,
    isStarting: isStartingTurns,
    error: turnsError,
    successMessage: turnsSuccess,
    raffle,
    start: startWithTurns,
    clearError: clearTurnsError,
    clearSuccess: clearTurnsSuccess,
  } = useTurns({
    groupId,
    initialTurns: group?.turns ?? [],
    onTurnsUpdated: () => {
      fetchGroup();
    },
    onGroupStarted: () => {
      fetchGroup();
    },
  });

  const {
    round: currentRound,
    contributions,
    history: roundHistory,
    isLoading: isRoundLoading,
    isLoadingHistory,
    isClosing: isClosingRound,
    actionContributionId,
    error: roundError,
    successMessage: roundSuccess,
    canClose: canCloseRound,
    fetchCurrentRound,
    fetchHistory,
    closeCurrentRound,
    reportPayment,
    validatePayment,
    clearError: clearRoundError,
    clearSuccess: clearRoundSuccess,
  } = useCurrentRound({
    groupId,
    onRoundClosed: () => {
      fetchGroup();
      fetchSummary(groupId);
    },
    onPaymentUpdated: () => {
      fetchGroup();
      fetchSummary(groupId);
    },
  });

  const {
    summary: financialSummary,
    isLoadingSummary,
    isSending: isSendingReminders,
    error: reminderError,
    successMessage: reminderSuccess,
    fetchSummary,
    sendRemindersToDebtors,
    clearError: clearReminderError,
    clearSuccess: clearReminderSuccess,
  } = useReminders();

  const [view, setView] = useState<DetailView>('info');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isStarted = group?.status === 'INICIADO';
  const isFinished = group?.status === 'FINALIZADO';
  const isRunning = isStarted || isFinished;

  // Cargar métricas financieras consolidadas cuando el pasanaku esté iniciado o finalizado
  useEffect(() => {
    if (isRunning) {
      fetchSummary(groupId);
    }
  }, [isRunning, groupId, fetchSummary]);

  if (isLoading) {
    return <LoadingSpinner message="Cargando grupo..." />;
  }

  if (error) {
    return (
      <div className="group-detail__error-state">
        <ErrorMessage message={error} onDismiss={clearError} />
        <button
          type="button"
          className="secondary-btn"
          onClick={onBack}
          data-testid="group-detail-back-on-error"
        >
          ← Volver a mis grupos
        </button>
      </div>
    );
  }

  if (!group) return null;

  // Resolución blindada de participantes (memberships del backend mapeado a members)
  const members =
    group.members && group.members.length > 0 ? group.members : (group.memberships ?? []);

  const totalEsperado = calcularTotalEsperado(group.quota_amount, group.total_members);

  const currentTurns = turns.length > 0 ? turns : (group.turns ?? []);
  const hasAllTurns =
    currentTurns.length === group.total_members && group.total_members > 0;
  const canStart = isEditable && group.is_full && (group.can_start || hasAllTurns);

  const handleLeaveConfirm = async () => {
    setIsLeaving(true);
    setShowLeaveConfirm(false);
    try {
      await leaveGroup();
      onLeft();
    } catch {
      setActionError('Error al abandonar el grupo. Intenta nuevamente.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleStartConfirm = async () => {
    setIsStarting(true);
    setShowStartConfirm(false);
    setActionError(null);
    try {
      await startWithTurns();
      await fetchGroup();
      await fetchCurrentRound();
      await fetchHistory();
      await fetchSummary(groupId);
    } catch {
      setActionError(
        'Error al iniciar el pasanaku. Verifica que todos los cupos estén llenos y los turnos asignados.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleRefreshAll = async () => {
    await fetchGroup();
    if (isRunning) {
      await fetchCurrentRound();
      await fetchHistory();
      await fetchSummary(groupId);
    }
  };

  return (
    <div
      className="group-detail"
      data-testid="group-detail"
      aria-label={`Detalle del grupo ${group.name}`}
    >
      {/* Cabecera */}
      <div className="group-detail__header">
        <button
          type="button"
          className="link-btn group-detail__back-btn"
          onClick={onBack}
          aria-label="Volver al listado de grupos"
          data-testid="group-detail-back-btn"
        >
          ← Mis grupos
        </button>
        <div className="group-detail__title-row">
          <h2 className="group-detail__name">{group.name}</h2>
          <StatusBadge status={group.status} />
        </div>
        {group.description && (
          <p className="group-detail__description">{group.description}</p>
        )}
      </div>

      {/* Alertas de errores */}
      {(actionError || error || turnsError || roundError || reminderError) && (
        <ErrorMessage
          message={
            actionError ?? turnsError ?? roundError ?? reminderError ?? error ?? ''
          }
          onDismiss={() => {
            setActionError(null);
            clearError();
            clearTurnsError();
            clearRoundError();
            clearReminderError();
          }}
        />
      )}

      {/* Alertas de éxito */}
      {(turnsSuccess || roundSuccess || reminderSuccess) && (
        <div
          className="success-alert"
          role="status"
          data-testid="group-detail-success-alert"
        >
          <span>{turnsSuccess || roundSuccess || reminderSuccess}</span>
          <button
            type="button"
            className="error-alert__dismiss"
            onClick={() => {
              clearTurnsSuccess();
              clearRoundSuccess();
              clearReminderSuccess();
            }}
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* Resumen financiero global */}
      <section className="group-detail__summary" aria-label="Resumen del pasanaku">
        <dl className="group-detail__summary-grid">
          <div className="group-detail__summary-item">
            <dt>Cuota Acordada</dt>
            <dd>
              <CurrencyDisplay amount={group.quota_amount} />
              {' · '}
              {formatearPeriodicidad(group.periodicity)}
            </dd>
          </div>
          <div className="group-detail__summary-item">
            <dt>Participantes</dt>
            <dd data-testid="group-detail-members">
              {group.current_members_count}/{group.total_members}
            </dd>
          </div>
          <div className="group-detail__summary-item">
            <dt>Total por Ronda (Pozo)</dt>
            <dd>
              <strong data-testid="group-detail-total">
                {formatearMontoBolivianos(totalEsperado)}
              </strong>
            </dd>
          </div>
          <div className="group-detail__summary-item">
            <dt>Fecha de Inicio</dt>
            <dd>{group.start_date}</dd>
          </div>
        </dl>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MÓDULO 5: Balance Financiero Consolidado y Deudores (PDF Sec. 8)
          Visible cuando el pasanaku está en curso (INICIADO o FINALIZADO)
          ───────────────────────────────────────────────────────────────────────────── */}
      {isRunning && (
        <section aria-label="Balance financiero y control de deudores">
          <GroupFinancialSummary
            summary={financialSummary}
            isLoading={isLoadingSummary}
            onRefresh={() => fetchSummary(groupId)}
          />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          PASANAKU FINALIZADO: Banner de felicitación e historial
          ───────────────────────────────────────────────────────────────────────────── */}
      {group.status === 'FINALIZADO' && (
        <>
          <div
            className="pasanaku-finished-banner"
            role="status"
            data-testid="pasanaku-finished-banner"
          >
            <span className="celebration-icon" aria-hidden="true">
              🎉
            </span>
            <div>
              <h3>¡Pasanaku Finalizado con Éxito!</h3>
              <p>
                Se han completado todas las rondas previstas ({group.total_members}{' '}
                rondas) y cada participante ha recibido su pozo correspondiente.
              </p>
            </div>
          </div>
          <RoundHistory history={roundHistory} isLoading={isLoadingHistory} />
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MÓDULO 3, 4 & 5: Si el pasanaku está INICIADO, mostrar Ronda Activa, Recordatorios y Cuotas
          ───────────────────────────────────────────────────────────────────────────── */}
      {group.status === 'INICIADO' && (
        <>
          {isRoundLoading ? (
            <LoadingSpinner message="Cargando ronda activa..." size="sm" />
          ) : (
            currentRound && (
              <div className="current-round-wrapper">
                <CurrentRound
                  round={currentRound}
                  totalMembers={group.total_members}
                  isAdmin={isAdmin}
                  canClose={canCloseRound}
                  isClosing={isClosingRound}
                  onCloseRound={async () => {
                    await closeCurrentRound();
                    await fetchSummary(groupId);
                  }}
                />
                {isAdmin && currentRound.has_pending_contributions && (
                  <div className="round-reminders-bar" data-testid="round-reminders-bar">
                    <SendReminderButton
                      groupId={groupId}
                      hasDebtors={currentRound.has_pending_contributions}
                      isAdmin={isAdmin}
                      isSending={isSendingReminders}
                      onSendReminders={async (msg) => {
                        await sendRemindersToDebtors(groupId, msg);
                        await fetchSummary(groupId);
                      }}
                    />
                  </div>
                )}
              </div>
            )
          )}

          {/* Tabla de aportes / cuotas de la ronda actual */}
          {user && currentRound && (
            <ContributionsList
              contributions={contributions}
              currentUserId={user.id}
              isAdmin={isAdmin}
              actionContributionId={actionContributionId}
              onReportPayment={reportPayment}
              onValidatePayment={validatePayment}
            />
          )}

          {/* Historial de rondas completadas */}
          <RoundHistory history={roundHistory} isLoading={isLoadingHistory} />
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MÓDULO 2: Orden de turnos (visible siempre para verificar beneficiarios)
          ───────────────────────────────────────────────────────────────────────────── */}
      <TurnsList
        turns={currentTurns}
        totalMembers={group.total_members}
        isAdmin={isAdmin}
        isEditable={isEditable}
        isFull={group.is_full}
        isRaffling={isRaffling}
        onRaffle={raffle}
      />

      {/* Código de invitación — visible solo en BORRADOR */}
      {isEditable && (
        <section className="group-detail__invite" aria-label="Código de invitación">
          <InviteCodeDisplay
            code={group.invite_code}
            isAdmin={isAdmin}
            onRegenerate={regenerateCode}
          />
        </section>
      )}

      {/* Lista de miembros */}
      {user && (
        <section aria-label="Participantes del grupo">
          <MembersList
            members={members}
            isAdmin={isAdmin}
            isEditable={isEditable}
            currentUserId={user.id}
            onRemoveMember={removeMember}
          />
        </section>
      )}

      {/* Panel de acciones para estado BORRADOR */}
      {isEditable && (
        <div className="group-detail__actions" data-testid="group-detail-actions">
          {/* Editar configuración — solo en BORRADOR para el admin */}
          {isAdmin && view === 'info' && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setView('edit')}
              aria-label="Editar configuración del grupo"
              data-testid="group-detail-edit-btn"
            >
              ✏️ Editar configuración
            </button>
          )}

          {/* Iniciar pasanaku — visible para el admin en BORRADOR, deshabilitado hasta canStart */}
          {isAdmin && (
            <button
              type="button"
              className="submit-btn"
              onClick={() => setShowStartConfirm(true)}
              disabled={!canStart || isStarting || isStartingTurns}
              aria-label="Iniciar el pasanaku"
              aria-busy={isStarting || isStartingTurns}
              data-testid="start-pasanaku-btn"
            >
              {isStarting || isStartingTurns ? 'Iniciando...' : '🚀 Iniciar pasanaku'}
            </button>
          )}

          {/* Requisitos para poder iniciar */}
          {isAdmin && !canStart && (
            <div
              className="group-detail__start-requirements"
              role="status"
              data-testid="start-requirements"
            >
              <p className="group-detail__requirements-title">
                Para iniciar el pasanaku se requiere:
              </p>
              <ul>
                <li
                  className={group.is_full ? 'req-met' : 'req-pending'}
                  data-testid="req-full-capacity"
                >
                  {group.is_full ? '✅' : '⬜'} Cupos llenos (
                  {group.current_members_count}/{group.total_members})
                </li>
                <li
                  className={hasAllTurns ? 'req-met' : 'req-pending'}
                  data-testid="req-turns-assigned"
                >
                  {hasAllTurns ? '✅' : '⬜'} Turnos asignados ({currentTurns.length}/
                  {group.total_members})
                </li>
              </ul>
            </div>
          )}

          {/* Abandonar grupo — solo en BORRADOR para participantes */}
          {!isAdmin && (
            <button
              type="button"
              className="danger-btn"
              onClick={() => setShowLeaveConfirm(true)}
              disabled={isLeaving}
              aria-label="Abandonar este grupo de pasanaku"
              data-testid="leave-group-btn"
            >
              {isLeaving ? 'Abandonando...' : 'Abandonar grupo'}
            </button>
          )}

          {/* Recargar datos */}
          <button
            type="button"
            className="link-btn"
            onClick={handleRefreshAll}
            aria-label="Recargar información del grupo"
            data-testid="group-detail-refresh-btn"
          >
            ↺ Actualizar
          </button>
        </div>
      )}

      {/* En estado INICIADO / FINALIZADO: barra simple para actualizar */}
      {!isEditable && (
        <div className="group-detail__refresh-bar">
          <button
            type="button"
            className="link-btn"
            onClick={handleRefreshAll}
            aria-label="Recargar información del grupo y rondas"
            data-testid="group-detail-refresh-btn"
          >
            ↺ Actualizar estado de rondas y cuotas
          </button>
        </div>
      )}

      {/* Panel de edición inline en BORRADOR */}
      {view === 'edit' && isAdmin && isEditable && (
        <section
          className="group-detail__edit-panel"
          aria-label="Editar configuración del grupo"
        >
          <h3>Editar configuración</h3>
          <GroupForm
            groupId={groupId}
            initialValues={{
              name: group.name,
              description: group.description,
              quota_amount: group.quota_amount,
              periodicity: group.periodicity,
              start_date: group.start_date,
              total_members: String(group.total_members),
            }}
            isEditable
            onSuccess={() => {
              setView('info');
              handleRefreshAll();
            }}
            onCancel={() => setView('info')}
          />
        </section>
      )}

      {/* Modal: Confirmar inicio del pasanaku */}
      <ConfirmModal
        isOpen={showStartConfirm}
        title="¿Iniciar el pasanaku?"
        description={`Se iniciará el pasanaku "${group.name}" con ${group.total_members} participantes. Total por ronda: ${formatearMontoBolivianos(totalEsperado)}. Esta acción no se puede revertir y habilitará la Ronda 1.`}
        confirmLabel="Sí, iniciar pasanaku"
        isLoading={isStarting || isStartingTurns}
        onConfirm={handleStartConfirm}
        onCancel={() => setShowStartConfirm(false)}
      />

      {/* Modal: Confirmar abandono del grupo */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        title="¿Abandonar el grupo?"
        description={`¿Estás seguro de que deseas abandonar "${group.name}"? Solo puedes hacerlo mientras el pasanaku esté en borrador.`}
        confirmLabel="Sí, abandonar"
        isDanger
        isLoading={isLeaving}
        onConfirm={handleLeaveConfirm}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
};
