// src/components/shared/Toast.jsx
import { useEffect } from 'react';
import { useUI } from '../../context/UIContext';

const Toast = () => {
  const { toast, hideToast } = useUI();

  useEffect(() => {
    // ✅ Add null check here
    if (toast?.show) {
      const timer = setTimeout(() => {
        hideToast();
      }, toast.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [toast?.show, toast?.duration, hideToast]);

  // ✅ Add null check here
  if (!toast?.show) return null;

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-primary-500'
  }[toast.type] || 'bg-gray-800';

  const icon = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  }[toast.type] || 'ℹ';

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideIn">
      <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md`}>
        <span className="text-xl font-bold">{icon}</span>
        <div className="flex-1">
          {toast.title && (
            <div className="font-semibold mb-1">{toast.title}</div>
          )}
          <div className={toast.title ? 'text-sm' : ''}>{toast.message}</div>
        </div>
        <button
          onClick={hideToast}
          className="text-white hover:text-gray-200 transition-colors ml-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;