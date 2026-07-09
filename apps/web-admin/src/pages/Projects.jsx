import ErrorBoundary from '../components/shared/ErrorBoundary';
import { CheckCircle, XCircle, Clock, Wrench, FileCheck, AlertCircle, Send, Play, Check, Briefcase } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Table from '../components/data/Table';
import Pagination from '../components/shared/Pagination';
import Skeleton from '../components/shared/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { formatDate } from '../utils/formatDate';
import { formatCurrency } from '../utils/formatCurrency';
import logger from '../utils/logger';
import { toast } from 'react-hot-toast';
import { projectApi } from '../api';
import { createQueryFn } from '../utils/queryAdapter';
import { useModal, useModalWithData } from '../hooks';

/**
 * Projects Page - Displays service requests/projects from customers
 * 
 * Data Source: Projects created by customers via frontend
 * - Frontend: Customers create projects → POST /api/v1/projects
 * - Admin: View all projects → GET /api/v1/admin/collections
 * - Admin: Manage projects (quote, start, update progress, complete)
 * 
 * Note: Backend uses "collections" terminology for recycling service requests
 */
const Projects = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Parse filters from URL
  const filters = useMemo(() => ({
    page: parseInt(searchParams.get('page') || '1', 10),
    status: searchParams.get('status') || 'all',
    serviceType: searchParams.get('serviceType') || 'all',
  }), [searchParams]);

  // Modal states using useModal hooks
  const { isOpen: showQuoteModal, open: openQuoteModal, close: closeQuoteModal } = useModal();
  const { data: selectedProject, openWithData: openQuoteModalWithProject } = useModalWithData({
    onClose: () => {
      closeQuoteModal();
    },
  });
  
  // Quote form data using useModalWithData
  const { data: quoteData, openWithData: openQuoteModalWithData, close: closeQuoteModalData } = useModalWithData({
    onClose: () => {
      closeQuoteModal();
    },
  });

  // Build query params for API call
  const queryParams = useMemo(() => {
    const params = {
      page: filters.page,
      limit: 10,
    };
    
    if (filters.status !== 'all') {
      params.status = filters.status;
    }
    
    if (filters.serviceType !== 'all') {
      params.serviceType = filters.serviceType;
    }
    
    return params;
  }, [filters.page, filters.status, filters.serviceType]);

  // Use TanStack Query for data fetching
  const { data, isLoading: loading, error: _error } = useQuery({
    queryKey: ['projects', filters.page, filters.status, filters.serviceType],
    queryFn: createQueryFn(() => projectApi.getAllProjects(queryParams)),
    staleTime: 30000, // 30 seconds
  });

  // Extract data from response
  const projects = useMemo(() => {
    if (!data) return [];
    return data.projects || [];
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return data.totalPages || 1;
  }, [data]);

  // Mutations for project actions
  const sendQuoteMutation = useMutation({
    mutationFn: ({ projectId, quoteData }) => projectApi.sendQuote(projectId, quoteData),
    onSuccess: () => {
      toast.success('Quote sent successfully');
      closeQuoteModal();
      closeQuoteModalData();
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      logger.error('Failed to send quote:', error);
      toast.error(error.response?.data?.message || 'Failed to send quote');
    },
  });

  const startProjectMutation = useMutation({
    mutationFn: (projectId) => projectApi.startProject(projectId),
    onSuccess: () => {
      toast.success('Project started successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      logger.error('Failed to start project:', error);
      toast.error(error.response?.data?.message || 'Failed to start project');
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ projectId, progress }) => projectApi.updateProgress(projectId, { progress }),
    onSuccess: () => {
      toast.success('Progress updated successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      logger.error('Failed to update progress:', error);
      toast.error(error.response?.data?.message || 'Failed to update progress');
    },
  });

  const completeProjectMutation = useMutation({
    mutationFn: (projectId) => projectApi.completeProject(projectId),
    onSuccess: () => {
      toast.success('Project completed successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      logger.error('Failed to complete project:', error);
      toast.error(error.response?.data?.message || 'Failed to complete project');
    },
  });

  // Handlers
  const handleSendQuote = useCallback(() => {
    if (!selectedProject || !quoteData) return;
    sendQuoteMutation.mutate({
      projectId: selectedProject._id,
      quoteData: {
        quoteAmount: parseFloat(quoteData.quoteAmount || 0),
        quoteDetails: quoteData.quoteDetails || '',
        estimatedTimeline: quoteData.estimatedTimeline || '',
      },
    });
  }, [selectedProject, quoteData, sendQuoteMutation]);

  const handleStartProject = useCallback((projectId) => {
    startProjectMutation.mutate(projectId);
  }, [startProjectMutation]);

  const handleUpdateProgress = useCallback((projectId, progress) => {
    updateProgressMutation.mutate({ projectId, progress });
  }, [updateProgressMutation]);

  const handleCompleteProject = useCallback((projectId) => {
    completeProjectMutation.mutate(projectId);
  }, [completeProjectMutation]);

  // Filter handlers with URL persistence
  const handleFilterChange = useCallback((key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== 'all') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      newParams.set('page', '1'); // Reset to first page when filters change
      return newParams;
    });
  }, [setSearchParams]);

  const setPage = useCallback((page) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', page.toString());
      return newParams;
    });
  }, [setSearchParams]);

  const handleOpenQuoteModal = useCallback((project) => {
    openQuoteModal();
    openQuoteModalWithProject(project);
    // Initialize quote data
    openQuoteModalWithData({ quoteAmount: '', quoteDetails: '', estimatedTimeline: '' });
  }, [openQuoteModal, openQuoteModalWithProject, openQuoteModalWithData]);

  const getStatusConfig = (status) => {
    const statusMap = {
      'pending': { label: 'Pending', class: 'bg-primary-100 text-primary-800', icon: Clock },
      'quoted': { label: 'Quoted', class: 'bg-purple-100 text-purple-800', icon: AlertCircle },
      'accepted': { label: 'Accepted', class: 'bg-green-100 text-green-800', icon: CheckCircle },
      'rejected': { label: 'Rejected', class: 'bg-red-100 text-red-800', icon: XCircle },
      'in-progress': { label: 'In Progress', class: 'bg-yellow-100 text-yellow-800', icon: Wrench },
      'completed': { label: 'Completed', class: 'bg-green-100 text-green-800', icon: FileCheck },
      'cancelled': { label: 'Cancelled', class: 'bg-gray-100 text-gray-800', icon: XCircle },
    };
    return statusMap[status] || { label: status, class: 'bg-gray-100 text-gray-800', icon: Clock };
  };

  const getServiceTypeLabel = (type) => {
    const labels = {
      'cctv': 'CCTV',
      'access-control': 'Access Control',
      'fire-safety': 'Fire Safety',
      'networking': 'Networking',
      'home-automation': 'Home Automation',
      'other': 'Other',
    };
    return labels[type] || type;
  };

  const columns = [
    { key: 'title', label: 'Title' },
    {
      key: 'serviceType',
      label: 'Service Type',
      render: (type) => (
        <span className="text-gray-900 dark:text-white capitalize">
          {getServiceTypeLabel(type)}
        </span>
      ),
    },
    {
      key: 'userId',
      label: 'Customer',
      render: (user) => (
        <div>
          <div className="text-gray-900 dark:text-white">{user?.name || 'N/A'}</div>
          <div className="text-sm text-gray-500">{user?.email || ''}</div>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (location) => (
        <span className="text-gray-600 dark:text-gray-400">
          {location?.address || 'N/A'}
        </span>
      ),
    },
    {
      key: 'quoteAmount',
      label: 'Quote',
      render: (amount) => (
        <span className="text-gray-900 dark:text-white">
          {amount ? formatCurrency(amount) : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => {
        const statusInfo = getStatusConfig(status);
        const Icon = statusInfo.icon;
        return (
          <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 w-fit ${statusInfo.class}`}>
            <Icon className="w-3 h-3" />
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (progress, project) => {
        if (project.status !== 'in-progress') return '-';
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">{progress || 0}%</span>
          </div>
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
      render: (_, project) => (
        <div className="flex gap-2">
          {project.status === 'pending' && (
            <button
              onClick={() => handleOpenQuoteModal(project)}
              className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-lg transition-colors"
              title="Send Quote"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          {project.status === 'accepted' && (
            <button
              onClick={() => handleStartProject(project._id)}
              className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
              title="Start Project"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
          {project.status === 'in-progress' && (
            <>
              <button
                onClick={() => {
                  const progress = prompt('Enter progress (0-100):', project.progress || 0);
                  if (progress !== null) {
                    handleUpdateProgress(project._id, parseInt(progress));
                  }
                }}
                className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-600 rounded-lg transition-colors"
                title="Update Progress"
              >
                <Wrench className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleCompleteProject(project._id)}
                className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                title="Complete Project"
              >
                <Check className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (loading && projects.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <Skeleton variant="text" width="150px" height="2rem" className="mb-2" />
          <Skeleton variant="text" width="300px" height="1rem" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <Skeleton variant="table" lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage service requests and projects
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="quoted">Quoted</option>
          <option value="accepted">Accepted</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filters.serviceType}
          onChange={(e) => handleFilterChange('serviceType', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Services</option>
          <option value="cctv">CCTV</option>
          <option value="access-control">Access Control</option>
          <option value="fire-safety">Fire Safety</option>
          <option value="networking">Networking</option>
          <option value="home-automation">Home Automation</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {projects.length === 0 && !loading ? (
          <EmptyState
            icon={Briefcase}
            title="No projects found"
            description="Service requests from customers will appear here."
          />
        ) : (
          <Table columns={columns} data={projects} />
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={filters.page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Quote Modal */}
      {showQuoteModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Send Quote for {selectedProject.title}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quote Amount (₹)
                </label>
                <input
                  type="number"
                  value={quoteData?.quoteAmount || ''}
                  onChange={(e) => openQuoteModalWithData({ ...quoteData, quoteAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quote Details
                </label>
                <textarea
                  value={quoteData?.quoteDetails || ''}
                  onChange={(e) => openQuoteModalWithData({ ...quoteData, quoteDetails: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={4}
                  placeholder="Enter quote details"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Estimated Timeline
                </label>
                <input
                  type="text"
                  value={quoteData?.estimatedTimeline || ''}
                  onChange={(e) => openQuoteModalWithData({ ...quoteData, estimatedTimeline: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g., 2-3 weeks"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    closeQuoteModal();
                    closeQuoteModalData();
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendQuote}
                  disabled={sendQuoteMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {sendQuoteMutation.isPending ? 'Sending...' : 'Send Quote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const ProjectsWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Projects"
      message="Something went wrong while loading the projects page. Please try refreshing the page."
    >
      <Projects />
    </ErrorBoundary>
  );
};

export default ProjectsWithErrorBoundary;

