// src/context/UIContext.jsx
import { createContext, useContext, useState } from 'react';

export const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: '',
    title: '',
    type: 'info',
    duration: 3000
  });

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
  const showToast = (message, type = 'info', duration = 3000, title = '') => {
    setToast({ 
      show: true, 
      message, 
      type,
      duration,
      title
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  return (
    <UIContext.Provider 
      value={{ 
        sidebarOpen, 
        toggleSidebar,
        toast,
        showToast,
        hideToast
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};
