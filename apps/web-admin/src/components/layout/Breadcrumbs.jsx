import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const formatLabel = (str) => {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
      <Link
        to="/dashboard"
        className="flex items-center hover:text-primary-600 dark:hover:text-primary-400"
      >
        <Home className="w-4 h-4" />
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <div key={to} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-2" />
            {isLast ? (
              <span className="text-gray-900 dark:text-white font-medium">
                {formatLabel(value)}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-primary-600 dark:hover:text-primary-400"
              >
                {formatLabel(value)}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
