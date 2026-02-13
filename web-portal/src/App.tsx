import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CondoSelection from './pages/dashboard/CondoSelection';
import CondominiumSettings from './pages/dashboard/CondominiumSettings';
import Concierge from './pages/Concierge';
import CondoRegistrationWizard from './components/CondoRegistrationWizard';
import { BugMonitor } from './components/BugMonitor';
import MainLayout from './layouts/MainLayout';

import ResidentDashboard from './pages/resident/ResidentDashboard';

// Role Based Redirect Component
function RoleBasedRedirect() {
    const { profile, memberships, selectedCondo } = useAuth();

    if (!profile) return <div>Loading...</div>;

    // 1. Platform Admin -> Condo Selection or Settings
    if (profile.is_platform_admin) {
        return <Navigate to="/condo-selection" replace />;
    }

    // 2. Check Membership for Selected Condo
    const membership = memberships.find(m => m.condominium_id === selectedCondo);

    if (!membership) {
        return <Navigate to="/condo-selection" replace />;
    }

    // 3. Redirect based on Role
    switch (membership.role) {
        case 'admin':
            return <Navigate to="/dashboard" replace />;
        case 'concierge':
            return <Navigate to="/concierge" replace />;
        case 'resident':
            return <Navigate to="/resident" replace />;
        default:
            return <Navigate to="/login" replace />;
    }
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
                                <Route path="/dashboard" element={<CondominiumSettings />} />
                                <Route path="/concierge" element={<Concierge />} />
                                <Route path="/resident" element={<ResidentDashboard />} />

                                <Route path="/condo-selection" element={<CondoSelection />} />
                                <Route path="/condo-setup" element={<AdminMap />} />
                                <Route path="/settings/:condoId" element={<CondominiumSettings />} />
                                <Route path="/condominium-settings" element={<CondominiumSettings />} />
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
