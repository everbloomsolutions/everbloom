// src/components/shared/StatusBadge.jsx
const StatusBadge = ({ 
  status, 
  variant = 'default',
  size = 'md',
  className = '' 
}) => {
  const variants = {
    default: {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
    },
    role: {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      agent: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    },
    status: {
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      info: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
    }
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  const getVariantClass = () => {
    const variantMap = variants[variant] || variants.default;
    return variantMap[status] || variantMap.default || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  const getDisplayText = () => {
    if (typeof status === 'boolean') {
      return status ? 'Active' : 'Inactive';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span 
      className={`inline-flex items-center font-medium rounded-full ${getVariantClass()} ${sizes[size]} ${className}`}
      role="status"
      aria-label={`Status: ${getDisplayText()}`}
    >
      {getDisplayText()}
    </span>
  );
};

export default StatusBadge;
