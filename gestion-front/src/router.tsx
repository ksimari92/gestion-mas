import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { MobileLayout } from './components/templates/MobileLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { Ventas } from './pages/Ventas';
import { Gastos } from './pages/Gastos';
import CreateClient from './pages/CreateClient';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <MobileLayout>{children}</MobileLayout>;
};

export const AppRouter = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
            />

            {/* Protected Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/clients"
                element={
                    <ProtectedRoute>
                        <Clients />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/clients/new"
                element={
                    <ProtectedRoute>
                        <CreateClient />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/clients/:id"
                element={
                    <ProtectedRoute>
                        <ClientDetail />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/income"
                element={
                    <ProtectedRoute>
                        <Ventas />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/expenses"
                element={
                    <ProtectedRoute>
                        <Gastos />
                    </ProtectedRoute>
                }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
