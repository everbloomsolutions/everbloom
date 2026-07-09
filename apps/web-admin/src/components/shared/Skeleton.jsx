// src/components/shared/Skeleton.jsx
const Skeleton = ({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  lines = 1,
  fullWidth = false
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';
  
  if (variant === 'text') {
    if (lines > 1) {
      return (
        <div className={fullWidth ? 'w-full' : ''}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={`${baseClasses} ${index < lines - 1 ? 'mb-2' : ''} ${className}`}
              style={{
                width: width || (index === lines - 1 ? '80%' : '100%'),
                height: height || '1rem',
              }}
            />
          ))}
        </div>
      );
    }
    return (
      <div
        className={`${baseClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={{
          width: width || '100%',
          height: height || '1rem',
        }}
      />
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={`${baseClasses} rounded-full ${className}`}
        style={{
          width: width || height || '2.5rem',
          height: height || width || '2.5rem',
        }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={`${baseClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={{
          width: width || '100%',
          height: height || '8rem',
        }}
      />
    );
  }

  if (variant === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {Array.from({ length: 5 }).map((_, index) => (
                <th key={index} className="px-6 py-3">
                  <div className={`${baseClasses} h-4 w-20`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: lines || 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 5 }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className={`${baseClasses} h-4 ${colIndex === 0 ? 'w-32' : colIndex === 4 ? 'w-20' : 'w-24'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
        <div className={`${baseClasses} h-6 w-3/4 mb-4`} />
        <div className={`${baseClasses} h-4 w-full mb-2`} />
        <div className={`${baseClasses} h-4 w-5/6`} />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  );
};

export default Skeleton;
