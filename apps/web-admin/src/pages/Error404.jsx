import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';

const Error404 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600 dark:text-primary-400">404</h1>
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mt-4">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-4 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default Error404;
