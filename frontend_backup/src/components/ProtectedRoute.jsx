import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { authAPI } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

export default function ProtectedRoute({ children, requiredPermission }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await authAPI.getMe();
        setUser(res.data);
        setIsAuthenticated(true);
        
        // Check permissions
        if (requiredPermission) {
          const userPermissions = res.data.permissions || [];
          const hasAccess = 
            userPermissions.includes('all') || // Main admin has all permissions
            res.data.is_main_admin ||
            userPermissions.includes(requiredPermission);
          setHasPermission(hasAccess);
        } else {
          // No specific permission required
          setHasPermission(true);
        }
      } catch {
        localStorage.removeItem('admin_token');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [requiredPermission]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/panelgsnadminbackend/login" replace />;
  }

  // Check if user has required permission
  if (requiredPermission && !hasPermission) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/60 mb-6">
            You don't have permission to access this page. Please contact the main administrator if you need access.
          </p>
          <a 
            href="/panelgsnadminbackend" 
            className="inline-block bg-gold-500 hover:bg-gold-600 text-black font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return children;
}
