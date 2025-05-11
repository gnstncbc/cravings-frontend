import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Optional: Show a loading spinner while checking auth status
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="ml-4 text-lg">Yetki Kontrol Ediliyor...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role-based access control
    // If allowedRoles is provided, check if the user has at least one of the allowed roles.
    // Assumes user.roles is an array of role strings, e.g., ['USER', 'ADMIN']
    if (allowedRoles && allowedRoles.length > 0) {
        const hasRequiredRole = user?.roles?.some(role => allowedRoles.includes(role));
        if (!hasRequiredRole) {
            // User is authenticated but does not have the required role.
            // Navigate to an unauthorized page or back to home, or show a message.
            // For simplicity, redirecting to home or a generic "unauthorized" page.
            toast.warn("Bu sayfaya erişim yetkiniz yok."); // Consider a more prominent unauthorized component/page
            return <Navigate to="/" state={{ from: location }} replace />;
        }
    }

    return children;
};

export default ProtectedRoute; 