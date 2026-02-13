import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
    const { user, loading, selectedCondo } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!selectedCondo && location.pathname !== '/condo-selection') {
        return <Navigate to="/condo-selection" replace />;
    }

    return <Outlet />;
}
