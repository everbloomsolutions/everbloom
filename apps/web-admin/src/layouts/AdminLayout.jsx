import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';

const AdminLayout = () => {

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        
        <main id="main-content" className="flex-1 overflow-y-auto p-6" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
