import { useEffect, useCallback } from 'react';
import { UserPlus, Users as UsersIcon } from 'lucide-react';
import Pagination from '../components/shared/Pagination';
import Skeleton from '../components/shared/Skeleton';
import Button from '../components/shared/Button';
import CreateUserModal from '../components/users/CreateUserModal';
import EditUserModal from '../components/users/EditUserModal';
import UsersFilters from '../components/users/UsersFilters';
import UsersTable from '../components/users/UsersTable';
import EmptyState from '../components/shared/EmptyState';
import ConfirmationModal from '../components/shared/ConfirmationModal';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { toast } from 'react-hot-toast';
import { USER_ROLES } from '../utils/constants';
import { useAuth, useUsers, useUserActions, useUserFilters, useModal, useModalWithData, useLoadingStates } from '../hooks';
import { userApi } from '../api';

const Users = () => {
  const { user: currentUser } = useAuth();
  
  // Use custom hooks for filters with URL persistence
  const { filters, updateFilter, clearFilters, setPage } = useUserFilters({
    limit: 10,
  });

  // Modal states using useModal hook
  const { isOpen: isCreateModalOpen, open: openCreateModal, close: closeCreateModal } = useModal();
  const { isOpen: isEditModalOpen, data: editingUser, openWithData: openEditModal, close: closeEditModal } = useModalWithData();
  const { isOpen: showDeleteConfirm, open: openDeleteConfirm, close: closeDeleteConfirm } = useModal();
  const { isOpen: showRoleChangeConfirm, open: openRoleChangeConfirm, close: closeRoleChangeConfirm } = useModal();
  const { isOpen: showArchiveDuplicatesConfirm, open: openArchiveDuplicatesConfirm, close: closeArchiveDuplicatesConfirm } = useModal();
  const { isOpen: showArchiveDuplicatesApplyConfirm, open: openArchiveDuplicatesApplyConfirm, close: closeArchiveDuplicatesApplyConfirm } = useModal();
  
  // Modal data states using useModalWithData hooks
  const { data: deleteUserData, openWithData: openDeleteConfirmWithData, close: closeDeleteConfirmData } = useModalWithData({
    onClose: () => {
      closeDeleteConfirm();
    },
  });
  const { data: roleChangeData, openWithData: openRoleChangeConfirmWithData, close: closeRoleChangeConfirmData } = useModalWithData({
    onClose: () => {
      closeRoleChangeConfirm();
    },
  });

  // Use granular loading states
  const { isLoading: _isLoading, setLoading } = useLoadingStates(['deleting', 'toggling', 'updating']);

  // Use custom hooks for data fetching and actions
  const { users, totalPages, loading, error, refetch } = useUsers({
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    role: filters.role,
    isActive: filters.isActive,
  });

  const { deleteUser, toggleUserStatus, updateUser, isDeleting, isTogglingStatus } = useUserActions(refetch);

  // Update loading states
  useEffect(() => {
    setLoading('deleting', isDeleting);
  }, [isDeleting, setLoading]);

  useEffect(() => {
    setLoading('toggling', isTogglingStatus);
  }, [isTogglingStatus, setLoading]);

  const handleSearch = useCallback((searchTerm) => {
    // Prevent redundant dispatch loops when SearchBar calls onSearch with the same value
    if ((searchTerm || '') === (filters.search || '')) return;
    updateFilter('search', searchTerm);
  }, [filters.search, updateFilter]);

  const handleUserCreated = (newUser) => {
    // Refresh user list
    refetch();
    toast.success(`User ${newUser.email} created successfully`);
  };

  const handleEditUser = (user) => {
    openEditModal(user);
  };

  const handleUserUpdated = (_updatedUser) => {
    refetch();
    toast.success('User updated successfully');
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    await toggleUserStatus(userId, currentStatus);
  };

  const runArchiveDuplicateUsers = useCallback(async (mode) => {
    try {
      const response = await userApi.archiveDuplicateUsers({ mode });
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to archive duplicate users');
      }

      const totals = response?.data?.totals;
      if (totals) {
        toast.success(
          `Duplicate users: ${mode}. Groups: ${totals.groups}, Candidates: ${totals.candidates}, Archived: ${totals.archived}, Skipped: ${totals.skipped}`,
          { duration: 7000 },
        );
      } else {
        toast.success(`Duplicate users: ${mode} completed`);
      }

      // Refresh list since some users may have been soft-deleted
      refetch();
      return response;
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to archive duplicate users';
      toast.error(errorMessage);
      throw error;
    }
  }, [refetch]);

  const handleDeleteUser = (userId, userName) => {
    openDeleteConfirmWithData({ userId, userName });
    openDeleteConfirm();
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserData) return;
    const { userId, userName } = deleteUserData;

    const result = await deleteUser(userId, { name: userName });
    if (result.success) {
      toast.success('User deleted successfully. You can restore them from the Archived section.');
    }
    
    closeDeleteConfirm();
    closeDeleteConfirmData();
  };

  const handleRoleChange = (userId, newRole, currentRole) => {
    if (newRole === currentRole) return;

    // Prevent changing super_admin role unless current user is super_admin
    if (currentRole === USER_ROLES.SUPER_ADMIN && currentUser?.role !== USER_ROLES.SUPER_ADMIN) {
      toast.error('Only super admins can modify super admin roles');
      return;
    }

    // Prevent super_admin from changing their own role
    if (userId === currentUser?._id && currentRole === USER_ROLES.SUPER_ADMIN) {
      toast.error('You cannot change your own super admin role');
      return;
    }

    // Prevent changing to super_admin unless current user is super_admin
    if (newRole === USER_ROLES.SUPER_ADMIN && currentUser?.role !== USER_ROLES.SUPER_ADMIN) {
      toast.error('Only super admins can assign super admin role');
      return;
    }

    // Prevent changing to admin unless current user is super_admin
    if (newRole === USER_ROLES.ADMIN && currentUser?.role !== USER_ROLES.SUPER_ADMIN) {
      toast.error('Only super admins can assign admin role');
      return;
    }

    openRoleChangeConfirmWithData({ userId, newRole, currentRole });
    openRoleChangeConfirm();
  };

  const confirmRoleChange = async () => {
    if (!roleChangeData) return;
    const { userId, newRole, currentRole: _currentRole } = roleChangeData;

    const result = await updateUser(userId, { role: newRole });
    if (result.success) {
      toast.success(`User role updated to ${newRole} successfully`);
    } else {
      // Error already handled in hook
    }
    
    closeRoleChangeConfirm();
    closeRoleChangeConfirmData();
  };


  if (loading) {
    return (
      <div>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
            <Skeleton variant="text" width="250px" height="1rem" />
          </div>
          <Skeleton variant="rectangular" width="120px" height="40px" />
        </div>
        <div className="mb-6">
          <Skeleton variant="rectangular" width="100%" height="40px" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Users</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage all registered users and their permissions
            </p>
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error loading users
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error?.message || 'Failed to load users. Please try again.'}
          </p>
          <Button
            variant="primary"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Users</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage all registered users and their permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(currentUser?.role === USER_ROLES.ADMIN || currentUser?.role === USER_ROLES.SUPER_ADMIN) && (
            <Button
              variant="secondary"
              onClick={openArchiveDuplicatesConfirm}
            >
              Archive Duplicate Users
            </Button>
          )}
          <Button
            variant="primary"
            onClick={openCreateModal}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      <UsersFilters
        filters={filters}
        updateFilter={updateFilter}
        clearFilters={clearFilters}
        onSearch={handleSearch}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Get started by creating your first user account."
            actionLabel="Create User"
            onAction={openCreateModal}
          />
        ) : (
          <UsersTable
            users={users}
            currentUser={currentUser}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onToggleStatus={handleToggleStatus}
            onRoleChange={handleRoleChange}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={filters.page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSuccess={handleUserCreated}
      />
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        user={editingUser}
        onSuccess={handleUserUpdated}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          closeDeleteConfirm();
          closeDeleteConfirm();
          closeDeleteConfirmData();
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message={deleteUserData ? `Are you sure you want to delete user "${deleteUserData.userName}"? This action cannot be undone.\n\nThe user will be moved to the Archived section and can be restored later.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={showRoleChangeConfirm}
        onClose={() => {
          closeRoleChangeConfirm();
          closeRoleChangeConfirm();
          closeRoleChangeConfirmData();
        }}
        onConfirm={confirmRoleChange}
        title="Change User Role"
        message={roleChangeData ? `Are you sure you want to change this user's role to ${roleChangeData.newRole}?` : ''}
        confirmText="Confirm"
        cancelText="Cancel"
        variant="warning"
      />

      <ConfirmationModal
        isOpen={showArchiveDuplicatesConfirm}
        onClose={closeArchiveDuplicatesConfirm}
        onConfirm={async () => {
          try {
            await runArchiveDuplicateUsers('dry-run');
            // After a successful dry-run, offer apply.
            closeArchiveDuplicatesConfirm();
            openArchiveDuplicatesApplyConfirm();
          } catch (_error) {
            // Errors are already toasted inside runArchiveDuplicateUsers.
            // Keep the modal open so the user can retry or cancel.
          }
        }}
        title="Archive Duplicate Users (Dry Run)"
        message="This will analyze duplicate users (by normalized email) and report which users would be archived. No changes will be applied in dry-run mode."
        confirmText="Run Dry Run"
        cancelText="Cancel"
        variant="info"
      />

      <ConfirmationModal
        isOpen={showArchiveDuplicatesApplyConfirm}
        onClose={closeArchiveDuplicatesApplyConfirm}
        onConfirm={async () => {
          try {
            await runArchiveDuplicateUsers('apply');
            closeArchiveDuplicatesApplyConfirm();
          } catch (_error) {
            // Errors are already toasted inside runArchiveDuplicateUsers.
            // Keep the modal open so the user can retry or cancel.
          }
        }}
        title="Archive Duplicate Users (Apply)"
        message="This will soft-delete duplicate user accounts that have zero active collections. This action can be reverted from the Archived page."
        confirmText="Apply"
        cancelText="Cancel"
        variant="warning"
      />
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const UsersWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Users page"
      message="Something went wrong while loading the users page. Please try refreshing."
    >
      <Users />
    </ErrorBoundary>
  );
};

export default UsersWithErrorBoundary;
