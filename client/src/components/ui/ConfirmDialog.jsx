/**
 * Confirmation Dialog Component
 *
 * Modal dialog for confirming destructive actions
 */

'use client';

import Button from './Button';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  confirmIcon = '✓',
  loading = false
}) {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm?.();
    onClose?.();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose?.();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !loading) {
      onClose?.();
    } else if (e.key === 'Enter' && !loading) {
      handleConfirm();
    }
  };

  return (
    <div
      className="confirm-dialog-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className={`confirm-dialog confirm-dialog-${variant}`}>
        <div className="confirm-dialog-icon">
          {variant === 'danger' && '🗑️'}
          {variant === 'warning' && '⚠️'}
          {variant === 'info' && 'ℹ️'}
        </div>

        <div className="confirm-dialog-content">
          <h3 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h3>
          <p className="confirm-dialog-message">
            {message}
          </p>
        </div>

        <div className="confirm-dialog-actions">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            icon={confirmIcon}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
