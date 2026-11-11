import React, { useState } from 'react';

interface SendReminderButtonProps {
  groupId: number;
  hasDebtors: boolean;
  isAdmin: boolean;
  isSending: boolean;
  onSendReminders: (message: string) => Promise<void>;
}

/**
 * SendReminderButton — botón para que el Administrador envíe recordatorios
 * internos con un clic a los participantes con cuotas pendientes en la ronda activa [PDF Sec. 9].
 * data-testid="send-reminders-btn" para pruebas E2E.
 */
export const SendReminderButton: React.FC<SendReminderButtonProps> = ({
  groupId: _groupId,
  hasDebtors,
  isAdmin,
  isSending,
  onSendReminders,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  if (!isAdmin || !hasDebtors) {
    return null;
  }

  const handleOpen = () => {
    setCustomMsg('');
    setIsOpen(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSendReminders(customMsg.trim());
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="secondary-btn btn-send-reminder"
        onClick={handleOpen}
        disabled={isSending}
        aria-label="Enviar recordatorio interno a los deudores de la ronda actual"
        data-testid="send-reminders-btn"
      >
        {isSending ? 'Enviando recordatorios...' : '📢 Recordar a morosos'}
      </button>

      {isOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          data-testid="send-reminder-modal-overlay"
        >
          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reminder-modal-title"
            data-testid="send-reminder-modal"
          >
            <h2 id="reminder-modal-title" className="modal-title">
              Enviar Recordatorio de Pago
            </h2>

            <p className="modal-description">
              Se enviará una notificación interna a todos los participantes que aún tienen
              cuotas en estado <strong>PENDIENTE</strong> en la ronda activa.
            </p>

            <form onSubmit={handleSend}>
              <div className="form-group">
                <label htmlFor="reminder-custom-msg">
                  Mensaje personalizado (opcional):
                </label>
                <input
                  id="reminder-custom-msg"
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Ej. Recuerden realizar su aporte antes del viernes"
                  maxLength={255}
                  disabled={isSending}
                  data-testid="reminder-message-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setIsOpen(false)}
                  disabled={isSending}
                  data-testid="reminder-cancel-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSending}
                  aria-busy={isSending}
                  data-testid="reminder-submit-btn"
                >
                  {isSending ? 'Enviando...' : 'Enviar Recordatorios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
