// src/components/shared/ErrorState.jsx
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

const ErrorState = ({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content.',
  action,
  actionLabel = 'Retry',
  onAction,
  icon: Icon = AlertCircle,
  className = '',
}) => {
  return (
    <div className={`p-12 text-center ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
          <Icon 
            className="w-12 h-12 text-red-600 dark:text-red-400" 
            aria-hidden="true"
          />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {(action || (actionLabel && onAction)) && (
        <div className="flex justify-center">
          {action || (
            <Button
              variant="primary"
              onClick={onAction}
              icon={RefreshCw}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorState;
