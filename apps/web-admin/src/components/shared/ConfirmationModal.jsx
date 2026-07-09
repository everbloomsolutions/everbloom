/**
 * ConfirmationModal Component
 * A styled, accessible confirmation modal to replace window.confirm()
 */

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger', 'warning', 'info'
  icon: Icon = AlertTriangle,
}) {
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus cancel button by default (safer option)
      cancelButtonRef.current?.focus();
      
      // Trap focus within modal
      const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;
        
        const focusableElements = [
          cancelButtonRef.current,
          confirmButtonRef.current,
        ].filter(Boolean);
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      // Handle Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleTabKey);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleTabKey);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      icon: 'text-primary-600 dark:text-primary-400',
      bg: 'bg-primary-100 dark:bg-primary-900/30',
      button: 'bg-primary-600 hover:bg-primary-700 text-white',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    // Call onConfirm first (may be async)
    const result = onConfirm();
    // If it's a promise, wait for it before closing
    if (result instanceof Promise) {
      try {
        await result;
      } catch (_error) {
        // Error handling is done in the calling component
        // Don't close modal on error so user can see the error message
        return;
      }
    }
    // Close modal only after successful completion
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      aria-describedby="confirmation-modal-message"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 p-3 rounded-full ${styles.bg}`}>
            <Icon className={`w-6 h-6 ${styles.icon}`} aria-hidden="true" />
          </div>
          
          <div className="flex-1">
            <h2
              id="confirmation-modal-title"
              className="text-xl font-bold text-gray-900 dark:text-white mb-2"
            >
              {title}
            </h2>
            <p
              id="confirmation-modal-message"
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            className={`px-4 py-2 ${styles.button} rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${variant}-500`}
            aria-label={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
