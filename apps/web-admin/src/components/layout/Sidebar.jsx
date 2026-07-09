import { NavLink } from 'react-router-dom';
import { Home, Users, Settings, BarChart3, FileText, X, Briefcase, MapPin, Archive, UserCheck } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../hooks';
import { appConfig } from '../../config/appConfig';

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUI();
  const { user } = useAuth();

  const menuItems = [
    // Dashboard - All roles
    { path: '/dashboard', icon: Home, label: 'Dashboard', roles: ['user', 'agent', 'admin', 'super_admin'] },
    // Locations - Admin and Super Admin only
    { path: '/locations', icon: MapPin, label: 'Locations', roles: ['admin', 'super_admin'] },
    // Users - Admin and Super Admin only
    { path: '/users', icon: Users, label: 'Users', roles: ['admin', 'super_admin'] },
    // Assign - Admin and Super Admin only
    { path: '/assign', icon: UserCheck, label: 'Assign', roles: ['admin', 'super_admin'] },
    // Collections - All roles (users see only their assigned location's collections)
    { path: '/collections', icon: Briefcase, label: 'Collections', roles: ['user', 'agent', 'admin', 'super_admin'] },
    // Analytics - All roles (with different content based on role)
    { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['user', 'agent', 'admin', 'super_admin'] },
    // Archived - Admin and Super Admin only
    { path: '/archived', icon: Archive, label: 'Archived', roles: ['admin', 'super_admin'] },
    // Audit Logs - Super Admin only
    { path: '/audit-logs', icon: FileText, label: 'Audit Logs', roles: ['super_admin'] },
    // Settings - All roles
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['user', 'agent', 'admin', 'super_admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg lg:shadow-none transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-800 dark:to-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {appConfig.name}
          </h1>
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-1 transition-colors"
            aria-label="Close sidebar"
            aria-expanded={sidebarOpen}
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary navigation">
          {filteredMenuItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/50'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:translate-x-1'
                }`
              }
              style={{
                animation: `fadeInLeft 0.3s ease-out ${index * 0.05}s both`
              }}
              aria-label={`Navigate to ${item.label}`}
              aria-current={({ isActive }) => isActive ? 'page' : undefined}
            >
              <item.icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${
                sidebarOpen ? '' : ''
              }`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
