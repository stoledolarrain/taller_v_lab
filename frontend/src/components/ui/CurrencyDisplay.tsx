import React from 'react';
import { formatearMontoBolivianos } from '../../types/groups';

interface CurrencyDisplayProps {
  amount: string | number;
  className?: string;
  /** Si se proporciona, muestra "Bs X × N participantes = Bs Total" */
  perParticipant?: { participants: number; total: number };
}

/**
 * CurrencyDisplay — muestra montos en bolivianos de forma consistente.
 * Siempre usa "Bs" como prefijo, independientemente del campo `currency` del backend.
 * Regla de negocio: la moneda es siempre bolivianos (BOB).
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  className,
  perParticipant,
}) => {
  const formatted = formatearMontoBolivianos(amount);

  if (perParticipant) {
    const { participants, total } = perParticipant;
    return (
      <span
        className={`currency-display ${className ?? ''}`.trim()}
        data-testid="currency-display"
        aria-label={`${formatted} por participante, total ${formatearMontoBolivianos(total)}`}
      >
        {formatted}{' '}
        <span className="currency-formula">
          × {participants} = <strong>{formatearMontoBolivianos(total)}</strong>
        </span>
      </span>
    );
  }

  return (
    <span
      className={`currency-display ${className ?? ''}`.trim()}
      data-testid="currency-display"
    >
      {formatted}
    </span>
  );
};
