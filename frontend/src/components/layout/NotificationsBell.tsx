import React, { useState, useRef, useEffect } from 'react';
import { useReminders } from '../../hooks/useReminders';

/**
 * NotificationsBell — Icono de campana de notificaciones con popover accesible
 * para consultar y marcar como leídos los recordatorios internos [PDF Sec. 9].
 * data-testid="notifications-bell"
 */
export const NotificationsBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { reminders, unreadCount, markAsRead, fetchReminders } = useReminders({
    autoFetch: true,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="notifications-bell-wrapper" ref={containerRef}>
      <button
        type="button"
        className="notifications-bell-btn"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchReminders();
        }}
        aria-label={`Notificaciones internas${unreadCount > 0 ? `, ${unreadCount} pendientes` : ''}`}
        aria-expanded={isOpen}
        data-testid="notifications-bell"
      >
        <span className="bell-icon" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span className="bell-badge" data-testid="notifications-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notifications-popover"
          role="region"
          aria-label="Panel de recordatorios internos"
          data-testid="notifications-popover"
        >
          <div className="notifications-popover__header">
            <span className="notifications-popover__title">Recordatorios Recibidos</span>
            <button
              type="button"
              className="link-btn notifications-refresh-btn"
              onClick={fetchReminders}
              aria-label="Actualizar recordatorios"
            >
              ↺
            </button>
          </div>

          <div className="notifications-popover__body">
            {reminders.length === 0 ? (
              <p className="notifications-empty">No tienes recordatorios pendientes.</p>
            ) : (
              <ul className="notifications-list" role="list">
                {reminders.map((reminder) => (
                  <li
                    key={reminder.id}
                    className={`notification-item ${reminder.is_read ? 'notification-item--read' : 'notification-item--unread'}`}
                    data-testid={`notification-item-${reminder.id}`}
                  >
                    <div className="notification-item__top">
                      <strong className="notification-group">
                        {reminder.group_name}
                      </strong>
                      <span className="notification-round">
                        Ronda #{reminder.round_number}
                      </span>
                    </div>

                    <p className="notification-message">{reminder.message}</p>

                    <div className="notification-item__footer">
                      <span className="notification-date">
                        {new Date(reminder.created_at).toLocaleDateString('es-BO', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {!reminder.is_read && (
                        <button
                          type="button"
                          className="link-btn mark-read-btn"
                          onClick={() => markAsRead(reminder.id)}
                          aria-label={`Marcar como leído recordatorio de ${reminder.group_name}`}
                          data-testid={`mark-read-btn-${reminder.id}`}
                        >
                          ✓ Marcar leído
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
