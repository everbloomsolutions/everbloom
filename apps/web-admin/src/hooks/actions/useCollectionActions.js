import { useState } from 'react';
import { collectionApi } from '../../api';
import { toast } from 'react-hot-toast';
import logger from '../../utils/logger';

/**
 * Custom hook for collection CRUD operations
 * @param {Function} refetch - Function to refetch collections list
 * @returns {Object} Collection action functions and loading states
 */
export const useCollectionActions = (refetch) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  /**
   * Delete a collection
   * @param {string} collectionId - Collection ID to delete
   */
  const deleteCollection = async (collectionId) => {
    if (isDeleting) {
      logger.warn('Delete already in progress, ignoring duplicate call');
      return { success: false, error: 'Delete already in progress' };
    }

    setIsDeleting(true);
    try {
      const response = await collectionApi.deleteCollection(collectionId);
      if (response.success) {
        toast.success('Collection deleted successfully');
        if (refetch) {
          await refetch();
        }
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to delete collection');
      }
    } catch (error) {
      logger.error('Failed to delete collection:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete collection';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Generate receipt for a collection
   * @param {string} collectionId - Collection ID
   * @param {string} upiTransactionId - UPI Transaction ID/UTR (12 digits)
   * @param {Object} options - Additional options
   */
  const generateReceipt = async (collectionId, upiTransactionId, _options = {}) => {
    if (isGeneratingReceipt) return { success: false, error: 'Receipt generation already in progress' };

    if (!upiTransactionId || upiTransactionId.length !== 12) {
      return { success: false, error: 'UPI Transaction ID/UTR must be exactly 12 digits' };
    }

    setIsGeneratingReceipt(true);
    try {
      const response = await collectionApi.generateReceipt(collectionId, upiTransactionId);
      if (response.success) {
        toast.success('Receipt generated successfully');
        if (refetch) {
          await refetch();
        }
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to generate receipt');
      }
    } catch (error) {
      logger.error('Failed to generate receipt:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate receipt';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  /**
   * Transfer collection ownership
   * @param {string} collectionId - Collection ID
   * @param {string} newAgentId - New agent ID
   */
  const transferCollection = async (collectionId, newAgentId) => {
    if (isTransferring) return { success: false, error: 'Transfer already in progress' };

    setIsTransferring(true);
    try {
      const response = await collectionApi.transferCollection(collectionId, newAgentId);
      if (response.success) {
        toast.success('Collection transferred successfully');
        if (refetch) {
          await refetch();
        }
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to transfer collection');
      }
    } catch (error) {
      logger.error('Failed to transfer collection:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to transfer collection';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsTransferring(false);
    }
  };

  /**
   * Update collection
   * @param {string} collectionId - Collection ID
   * @param {Object} collectionData - Updated collection data
   */
  const updateCollection = async (collectionId, collectionData) => {
    if (isUpdating) return { success: false, error: 'Update already in progress' };

    setIsUpdating(true);
    try {
      const response = await collectionApi.updateCollection(collectionId, collectionData);
      if (response.success) {
        toast.success('Collection updated successfully');
        if (refetch) {
          await refetch();
        }
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to update collection');
      }
    } catch (error) {
      logger.error('Failed to update collection:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update collection';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Create collection
   * @param {Object} collectionData - Collection data
   */
  const createCollection = async (collectionData) => {
    if (isCreating) return { success: false, error: 'Create already in progress' };

    setIsCreating(true);
    try {
      const response = await collectionApi.createCollection(collectionData);
      if (response.success) {
        toast.success('Collection created successfully');
        if (refetch) {
          await refetch();
        }
        return { success: true, data: response.data };
      } else {
        throw new Error(response.message || 'Failed to create collection');
      }
    } catch (error) {
      logger.error('Failed to create collection:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create collection';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Print receipt PDF
   * @param {string} collectionId - Collection ID
   */
  const printReceipt = async (collectionId) => {
    if (isPrintingReceipt) return { success: false, error: 'Print already in progress' };

    setIsPrintingReceipt(true);
    try {
      const blob = await collectionApi.printReceiptPDF(collectionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${collectionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Receipt printed successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to print receipt:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to print receipt. Make sure receipt is generated first.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  /**
   * Download receipt PDF
   * @param {string} collectionId - Collection ID
   */
  const downloadReceipt = async (collectionId) => {
    if (isDownloadingReceipt) return { success: false, error: 'Download already in progress' };

    setIsDownloadingReceipt(true);
    try {
      const receiptResponse = await collectionApi.getReceiptByCollectionId(collectionId);
      if (!receiptResponse.success || !receiptResponse.data) {
        throw new Error('Receipt not found for this collection');
      }

      const receipt = receiptResponse.data;
      const receiptId = receipt._id || receipt.id;

      if (!receiptId) {
        throw new Error('Receipt ID not found');
      }

      const blob = await collectionApi.downloadReceiptPDF(receiptId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.receiptNumber || receiptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Receipt downloaded successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to download receipt:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to download receipt';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  return {
    deleteCollection,
    generateReceipt,
    transferCollection,
    updateCollection,
    createCollection,
    printReceipt,
    downloadReceipt,
    // Granular loading states
    isDeleting,
    isGeneratingReceipt,
    isTransferring,
    isCreating,
    isUpdating,
    isPrintingReceipt,
    isDownloadingReceipt,
  };
};
