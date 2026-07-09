import { Menu, Moon, Sun, LogOut, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../hooks';
import { useTheme } from '../../hooks';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import NotificationBell from '../shared/NotificationBell';

const Navbar = () => {
  const { toggleSidebar } = useUI();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all transform hover:scale-110 active:scale-95"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Logo href="/" size="md" variant="auto" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Search Bar - Optional, can be added later */}
        
        <button
          onClick={toggleTheme}
          className="p-2.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all transform hover:scale-110 active:scale-95 relative group"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        </button>

        <NotificationBell />

        <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all transform hover:scale-105 active:scale-95 group"
            aria-label="User menu"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-semibold shadow-md ring-2 ring-primary-200 dark:ring-primary-800 group-hover:ring-primary-400 dark:group-hover:ring-primary-600 transition-all">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 block">
                {user?.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block truncate max-w-[100px]">
                {user?.role}
              </span>
            </div>
          </button>

          {dropdownOpen && (
            <>
              <div className="absolute right-0 z-20 w-64 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-semibold shadow-lg ring-2 ring-primary-200 dark:ring-primary-800">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                        {user?.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:translate-x-1 group"
                  >
                    <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900 group-hover:bg-primary-200 dark:group-hover:bg-primary-800 transition-colors mr-3">
                      <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <span className="font-medium">Profile Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 hover:translate-x-1 group"
                  >
                    <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors mr-3">
                      <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
