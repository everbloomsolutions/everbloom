import toast from 'react-hot-toast';

export const useToast = () => {
  const showSuccess = (message) => {
    toast.success(message);
  };

  const showError = (message) => {
    toast.error(message);
  };

  const showInfo = (message) => {
    toast(message);
  };

  const showWarning = (message) => {
    toast(message, {
      icon: '⚠️',
    });
  };

  const showLoading = (message) => {
    return toast.loading(message);
  };

  const dismiss = (toastId) => {
    toast.dismiss(toastId);
  };

  const dismissAll = () => {
    toast.dismiss();
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    dismiss,
    dismissAll,
  };
};

export default useToast;
