import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CondoSelection from './pages/dashboard/CondoSelection';
import CondominiumSettings from './pages/dashboard/CondominiumSettings';
import DashboardHome from './pages/dashboard/DashboardHome';
import IntegrationsHub from './pages/dashboard/IntegrationsHub';
import Concierge from './pages/Concierge';
import CondoRegistrationWizard from './components/CondoRegistrationWizard';
import { BugMonitor } from './components/BugMonitor';
import MainLayout from './layouts/MainLayout';

import ResidentDashboard from './pages/resident/ResidentDashboard';

// Role Based Redirect Component
function RoleBasedRedirect() {
    const { loading, profile, memberships, selectedCondo } = useAuth();

    // Wait until auth data is fully loaded
    if (loading || !profile) return <div>Loading...</div>;

    // 1. Check Membership for Selected Condo
    const membership = selectedCondo
        ? memberships.find(m => m.condominium_id === selectedCondo)
        : null;

    // 2. If we have a valid membership, redirect based on Role
    if (membership) {
        switch (membership.role) {
            case 'admin':
                return <Navigate to="/dashboard" replace />;
            case 'concierge':
                return <Navigate to="/concierge" replace />;
            case 'resident':
                return <Navigate to="/resident" replace />;
        }
    }

    // 3. Platform admin with a selected condo → Dashboard (even without explicit membership)
    if (profile.is_platform_admin && selectedCondo) {
        return <Navigate to="/dashboard" replace />;
    }

    // 4. No condo selected or no membership → Condo Selection
    return <Navigate to="/condo-selection" replace />;
}

function AdminMap() {
    return (
        <CondoRegistrationWizard
            onComplete={() => window.location.href = '/'}
            onCancel={() => window.location.href = '/'}
        />
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <ToastProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        <Route element={<ProtectedRoute />}>
                            <Route element={<MainLayout />}>
                                <Route path="/" element={<RoleBasedRedirect />} />
                                <Route path="/dashboard" element={<DashboardHome />} />
                                <Route path="/concierge" element={<Concierge />} />
                                <Route path="/resident" element={<ResidentDashboard />} />

                                <Route path="/condo-selection" element={<CondoSelection />} />
                                <Route path="/condo-setup" element={<AdminMap />} />
                                <Route path="/settings/:condoId" element={<CondominiumSettings />} />
                                <Route path="/condominium-settings" element={<CondominiumSettings />} />
                                <Route path="/integrations" element={<IntegrationsHub />} />
                            </Route>
                        </Route>

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    <BugMonitor />
                </ToastProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
