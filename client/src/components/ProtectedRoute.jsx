import { Navigate, Outlet } from 'react-router-dom';
import AdminLayout from './AdminLayout';

function ProtectedRoute() {
  const token = localStorage.getItem('adminToken');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export default ProtectedRoute;
