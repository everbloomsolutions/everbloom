// src/components/shared/EmptyState.jsx
import Button from './Button';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-12 text-center ${className}`}>
      {Icon && (
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
            <Icon 
              className="w-12 h-12 text-gray-400 dark:text-gray-500" 
              aria-hidden="true"
            />
          </div>
        </div>
      )}
      
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {(action || (actionLabel && onAction)) && (
        <div className="flex justify-center">
          {action || (
            <Button
              variant="primary"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
