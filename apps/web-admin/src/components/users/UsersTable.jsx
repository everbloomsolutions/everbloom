import { memo } from 'react';
import { CheckCircle, XCircle, Trash2, Edit, MapPin } from 'lucide-react';
import Table from '../data/Table';
import { formatDate } from '../../utils/formatDate';
import { USER_ROLES } from '../../utils/constants';

/**
 * UsersTable Component
 * Displays users in a table format with actions
 */
const UsersTable = memo(({
  users,
  currentUser,
  onEdit,
  onDelete,
  onToggleStatus,
  onRoleChange,
}) => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Role',
      render: (role, user) => {
        // Check if role can be changed
        const isSuperAdmin = role === USER_ROLES.SUPER_ADMIN;
        const currentUserIsSuperAdmin = currentUser?.role === USER_ROLES.SUPER_ADMIN;
        const canChangeRole = currentUserIsSuperAdmin || !isSuperAdmin;
        const isOwnAccount = user._id === currentUser?._id;
        const isDisabled = isSuperAdmin && (!canChangeRole || isOwnAccount);

        // If user has super_admin role but current user is not super_admin, show as read-only badge
        if (isSuperAdmin && !currentUserIsSuperAdmin) {
          return (
            <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Super Admin
            </span>
          );
        }

        return (
          <select
            value={role}
            onChange={(e) => onRoleChange(user._id, e.target.value, role)}
            disabled={isDisabled}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border-0 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              isDisabled 
                ? 'cursor-not-allowed opacity-60' 
                : 'cursor-pointer hover:shadow-md'
            } ${
              role === USER_ROLES.SUPER_ADMIN 
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
              role === 'admin' 
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
              role === 'agent' 
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}
            title={isDisabled ? 'Super admin role cannot be changed' : 'Change user role'}
          >
            <option value="user">User</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
            {currentUserIsSuperAdmin && (
              <option value={USER_ROLES.SUPER_ADMIN}>Super Admin</option>
            )}
          </select>
        );
      },
    },
    {
      key: 'locations',
      label: 'Locations',
      render: (_, user) => {
        if (user.role === USER_ROLES.USER) {
          // Handle both populated object and string ID
          const defaultLocation = typeof user.defaultLocation === 'object' && user.defaultLocation !== null
            ? user.defaultLocation 
            : null;
          
          if (defaultLocation && defaultLocation.locationName) {
            return (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400" title="Manage locations in Assign page">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <span 
                  className="truncate max-w-[200px]" 
                  title={`${defaultLocation.locationName}${defaultLocation.address ? ` - ${defaultLocation.address}` : ''}`}
                >
                  {defaultLocation.locationName}
                </span>
              </div>
            );
          }
          return (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic" title="Manage locations in Assign page">None</span>
          );
        } else if (user.role === USER_ROLES.AGENT) {
          // For agents, show count of assigned locations (read-only)
          // We need to get this from the user data if available, or show placeholder
          const locationCount = user.locationCount || 0;
          return (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400" title="Manage locations in Assign page">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{locationCount} location{locationCount !== 1 ? 's' : ''}</span>
            </div>
          );
        }
        return <span className="text-sm text-gray-400 dark:text-gray-500">-</span>;
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (isActive) => (
        <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${
          isActive 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (date) => formatDate(date, 'PP'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, user) => {
        if (!user) return null;
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(user)}
              className="p-2.5 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900 dark:hover:bg-primary-800 text-primary-600 dark:text-primary-300 rounded-lg transition-all transform hover:scale-110 active:scale-95"
              title="Edit user"
              aria-label={`Edit user ${user.name || 'Unknown'}`}
            >
              <Edit className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => onToggleStatus(user._id, user.isActive)}
              className={`p-2.5 rounded-lg transition-all transform hover:scale-110 active:scale-95 ${
                user.isActive
                  ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300'
                  : 'bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-600 dark:text-green-300'
              }`}
              title={user.isActive ? 'Deactivate user' : 'Activate user'}
              aria-label={user.isActive ? `Deactivate user ${user.name || 'Unknown'}` : `Activate user ${user.name || 'Unknown'}`}
            >
              {user.isActive ? (
                <XCircle className="w-4 h-4" aria-hidden="true" />
              ) : (
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <button
              onClick={() => onDelete(user._id, user.name || 'Unknown')}
              className="p-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded-lg transition-all transform hover:scale-110 active:scale-95"
              title="Delete user"
              aria-label={`Delete user ${user.name || 'Unknown'}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      },
    },
  ];

  return <Table columns={columns} data={users} />;
});

UsersTable.displayName = 'UsersTable';

export default UsersTable;
