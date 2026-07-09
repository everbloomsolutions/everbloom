const ChartCard = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
