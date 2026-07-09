import { useState } from 'react';
import { userApi } from '../../api';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';

/**
 * Custom hook for user CRUD operations
 * @param {Function} refetch - Function to refetch users list
 * @returns {Object} User action functions and loading states
 */
export const useUserActions = (refetch) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Delete a user
   * @param {string} userId - User ID to delete
   * @param {Object} userData - User data for error messages
   */
  const deleteUser = async (userId, userData = {}) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await userApi.deleteUser(userId);
      if (response.success) {
        toast.success(`User ${userData.email || userData.name || 'deleted'} deleted successfully`);
        if (refetch) {
          await refetch();
        }
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to delete user');
      }
    } catch (error) {
      logger.error('Failed to delete user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Toggle user active status
   * @param {string} userId - User ID
   * @param {boolean} currentStatus - Current active status
   * @param {Function} optimisticUpdate - Function to update UI optimistically
   */
  const toggleUserStatus = async (userId, currentStatus, optimisticUpdate = null) => {
    if (isTogglingStatus) return;
    
    const newStatus = !currentStatus;
    
    // Optimistic update if callback provided
    if (optimisticUpdate) {
      optimisticUpdate(newStatus);
    }
    
    setIsTogglingStatus(true);
    try {
      const response = await userApi.toggleUserStatus(userId, newStatus);
      if (response.success) {
        toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        if (refetch) {
          await refetch();
        }
        return { success: true, isActive: newStatus };
      } else {
        throw new Error(response.message || 'Failed to update user status');
      }
    } catch (error) {
      logger.error('Failed to toggle user status:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user status';
      toast.error(errorMessage);
      
      // Revert optimistic update if callback provided
      if (optimisticUpdate) {
        optimisticUpdate(currentStatus);
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setIsTogglingStatus(false);
    }
  };

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} userData - Updated user data
   */
  const updateUser = async (userId, userData) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const response = await userApi.updateUser(userId, userData);
      if (response.success) {
        toast.success('User updated successfully');
        if (refetch) {
          await refetch();
        }
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to update user');
      }
    } catch (error) {
      logger.error('Failed to update user:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    deleteUser,
    toggleUserStatus,
    updateUser,
    isDeleting,
    isTogglingStatus,
    isUpdating,
  };
};
