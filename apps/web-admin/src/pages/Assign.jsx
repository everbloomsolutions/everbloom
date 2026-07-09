import ErrorBoundary from '../components/shared/ErrorBoundary';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserCheck, Users, DollarSign } from 'lucide-react';
import AgentAssignmentTab from '../components/assign/AgentAssignmentTab';
import LocationRatesTab from '../components/assign/LocationRatesTab';

const Assign = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse tab from URL with default
  const activeTab = useMemo(() => {
    return searchParams.get('tab') || 'agent';
  }, [searchParams]);

  // Handle tab change with URL persistence
  const handleTabChange = useCallback((tab) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      return newParams;
    });
  }, [setSearchParams]);

  const tabs = [
    {
      id: 'agent',
      label: 'Agent Assignment',
      icon: Users,
      component: AgentAssignmentTab,
    },
    {
      id: 'rates',
      label: 'Material Rate',
      icon: DollarSign,
      component: LocationRatesTab,
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AgentAssignmentTab;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-primary-600" />
            Assign
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage agent assignments and material rates
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5 transition-colors
                    ${
                      activeTab === tab.id
                        ? 'text-primary-500 dark:text-primary-400'
                        : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400'
                    }
                  `}
                  aria-hidden="true"
                />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        <ActiveComponent key={activeTab} />
      </div>
    </div>
  );
};

// Wrap component in ErrorBoundary for better error handling
const AssignWithErrorBoundary = () => {
  return (
    <ErrorBoundary
      title="Error loading Assign"
      message="Something went wrong while loading the assign page. Please try refreshing the page."
    >
      <Assign />
    </ErrorBoundary>
  );
};

export default AssignWithErrorBoundary;
