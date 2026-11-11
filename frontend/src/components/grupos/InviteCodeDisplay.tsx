import React, { useState } from 'react';
import { ErrorMessage } from '../ui/ErrorMessage';

interface InviteCodeDisplayProps {
  code: string;
  isAdmin: boolean;
  onRegenerate: () => Promise<void>;
}

/**
 * InviteCodeDisplay — muestra el código de invitación con botón de copiar.
 * El admin puede regenerar el código. El texto se selecciona fácilmente.
 * data-testid en botones para E2E 01.
 */
export const InviteCodeDisplay: React.FC<InviteCodeDisplayProps> = ({
  code,
  isAdmin,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para entornos sin API de clipboard
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    try {
      await onRegenerate();
    } catch {
      setError('Error al regenerar el código. Intenta nuevamente.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="invite-code" data-testid="invite-code-display">
      <h4 className="invite-code__label">Código de invitación</h4>
      <p className="invite-code__hint">
        Comparte este código con los participantes para que se unan al grupo.
      </p>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div className="invite-code__row">
        <code
          className="invite-code__value"
          aria-label={`Código de invitación: ${code}`}
          data-testid="invite-code-value"
        >
          {code}
        </code>
        <button
          type="button"
          className="secondary-btn invite-code__copy-btn"
          onClick={handleCopy}
          aria-label={copied ? 'Código copiado' : 'Copiar código de invitación'}
          data-testid="invite-code-copy-btn"
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>

      {isAdmin && (
        <button
          type="button"
          className="link-btn invite-code__regen-btn"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          aria-label="Regenerar código de invitación (el código anterior dejará de funcionar)"
          data-testid="invite-code-regen-btn"
        >
          {isRegenerating ? 'Regenerando...' : '↺ Regenerar código'}
        </button>
      )}
    </div>
  );
};
