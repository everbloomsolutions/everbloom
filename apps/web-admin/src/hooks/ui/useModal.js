import { useState, useCallback } from 'react';

/**
 * Custom hook for modal state management
 * 
 * @param {Object} options - Options object
 * @param {boolean} options.initialOpen - Initial open state (default: false)
 * @param {Function} options.onOpen - Callback when modal opens
 * @param {Function} options.onClose - Callback when modal closes
 * @returns {Object} { isOpen, open, close, toggle }
 */
export const useModal = (options = {}) => {
  const {
    initialOpen = false,
    onOpen = null,
    onClose = null,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => {
    setIsOpen(true);
    if (onOpen) {
      onOpen();
    }
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
};

/**
 * Hook for managing modal with data
 * Useful when modal needs to display/edit specific item
 * 
 * @param {Object} options - Options object
 * @returns {Object} { isOpen, data, open, close, openWithData }
 */
export const useModalWithData = (options = {}) => {
  const {
    initialOpen = false,
    onOpen = null,
    onClose = null,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState(null);

  const open = useCallback(() => {
    setIsOpen(true);
    if (onOpen) {
      onOpen();
    }
  }, [onOpen]);

  const openWithData = useCallback((modalData) => {
    setData(modalData);
    setIsOpen(true);
    if (onOpen) {
      onOpen(modalData);
    }
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    // Clear data after a short delay to allow exit animation
    setTimeout(() => {
      setData(null);
    }, 200);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  return {
    isOpen,
    data,
    open,
    openWithData,
    close,
  };
};

export default useModal;
