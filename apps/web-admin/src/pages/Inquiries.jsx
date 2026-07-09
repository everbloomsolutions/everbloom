import ErrorBoundary from '../components/shared/ErrorBoundary';
import { inquiryApi } from '../api';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Table from '../components/data/Table';
import Pagination from '../components/shared/Pagination';
import Skeleton from '../components/shared/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { formatDate } from '../utils/formatDate';
import logger from '../utils/logger';
import { toast } from 'react-hot-toast';
import { createQueryFn } from '../utils/queryAdapter';

/**
 * Inquiries Page - Displays contact form submissions from the frontend contact page
 * 
 * Data Source: Contact form submissions from /contact page
 * - Frontend: Users submit contact forms → POST /api/v1/contact
 * - Admin: View all submissions → GET /api/v1/admin/contacts
 * - Both use the same Contact model/database
 */
const Inquiries = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Parse pagination from URL
  const currentPage = useMemo(() => {
    return parseInt(searchParams.get('page') || '1', 10);
  }, [searchParams]);

  // Build query params for API call
  const queryParams = useMemo(() => ({
    page: currentPage,
    limit: 10,
  }), [currentPage]);

  // Use TanStack Query for data fetching
  const { data, isLoading: loading, error: _error } = useQuery({
    queryKey: ['inquiries', currentPage],
    queryFn: createQueryFn(() => inquiryApi.getAllInquiries(queryParams)),
    staleTime: 30000, // 30 seconds
  });

  // Extract data from response
  const inquiries = useMemo(() => {
    if (!data) return [];
    return data.contacts || data.inquiries || [];
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return data.totalPages || 1;
  }, [data]);

  // Mutation for updating inquiry status
  const updateStatusMutation = useMutation({
    mutationFn: ({ inquiryId, status }) => {
      // Map frontend status to backend status
      const statusMap = {
        'pending': 'read',
        'completed': 'replied',
        'cancelled': 'archived',
      };
      const backendStatus = statusMap[status] || status;
      return inquiryApi.updateInquiry(inquiryId, { status: backendStatus });
    },
    onSuccess: (_, variables) => {
      const statusMap = {
        'pending': 'read',
        'completed': 'replied',
        'cancelled': 'archived',
      };
      const displayStatus = Object.keys(statusMap).find(key => statusMap[key] === variables.status) || variables.status;
      toast.success(`Inquiry marked as ${displayStatus}`);
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
    onError: (error) => {
      logger.error('Failed to update inquiry status:', error);
      toast.error(error.response?.data?.message || 'Failed to update inquiry status');
    },
  });

  const handleUpdateStatus = useCallback((inquiryId, newStatus) => {
    updateStatusMutation.mutate({ inquiryId, status: newStatus });
  }, [updateStatusMutation]);

  const setPage = useCallback((page) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', page.toString());
      return newParams;
    });
  }, [setSearchParams]);

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    {
      key: 'subject',
      label: 'Subject',
      render: (subject) => (
        <span className="text-gray-900 dark:text-white">{subject || 'No subject'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => {
        // Map backend status to display
        const statusMap = {
          'new': { label: 'New', class: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200' },
          'read': { label: 'Read', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
          'replied': { label: 'Replied', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
          'archived': { label: 'Archived', class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
        };
        const statusInfo = statusMap[status] || { label: status, class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' };
        return (
          <span className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize ${statusInfo.class}`}>
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (date) => formatDate(date, 'PP'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, inquiry) => (
        <div className="flex gap-2">
          {inquiry.status !== 'read' && inquiry.status !== 'new' && (
            <button
              onClick={() => handleUpdateStatus(inquiry._id, 'pending')}
              className="p-2.5 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300 rounded-lg transition-all transform hover:scale-110 active:scale-95"
              title="Mark as read"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
          {inquiry.status !== 'replied' && (
            <button
              onClick={() => handleUpdateStatus(inquiry._id, 'completed')}
              className="p-2.5 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-600 dark:text-green-300 rounded-lg transition-all transform hover:scale-110 active:scale-95"
              title="Mark as replied"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {inquiry.status !== 'archived' && (
            <button
              onClick={() => handleUpdateStatus(inquiry._id, 'cancelled')}
              className="p-2.5 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded-lg transition-all transform hover:scale-110 active:scale-95"
              title="Archive"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Inquiries</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage customer inquiries and contact form submissions
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {inquiries.length === 0 && !loading ? (
          <EmptyState
            icon={MessageSquare}
            title="No inquiries found"
            description="Contact form submissions from the frontend will appear here."
          />
        ) : (
          <Table columns={columns} data={inquiries} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const InquiriesWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Inquiries"
      message="Something went wrong while loading the inquiries page. Please try refreshing the page."
    >
      <Inquiries />
    </ErrorBoundary>
  );
};

export default InquiriesWithErrorBoundary;
