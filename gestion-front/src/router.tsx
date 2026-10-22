import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from './stores/authStore';
import { AppShell } from './components/templates/AppShell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetail } from './pages/ClientDetail';
import { Ventas } from './pages/Ventas';
import { Gastos } from './pages/Gastos';
import { Costos } from './pages/Costos';
import { Proyectos } from './pages/Proyectos';

interface ProtectedRouteProps {
    children: ReactNode;
    /** Las pantallas densas, como la planilla, ocupan todo el ancho disponible. */
    fluid?: boolean;
}

const ProtectedRoute = ({ children, fluid }: ProtectedRouteProps) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <AppShell fluid={fluid}>{children}</AppShell>;
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
                path="/costos"
                element={
                    <ProtectedRoute fluid>
                        <Costos />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/proyectos"
                element={
                    <ProtectedRoute>
                        <Proyectos />
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
            {/* El alta pasó a ser un modal dentro del listado */}
            <Route path="/clients/new" element={<Navigate to="/clients?new=true" replace />} />
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
            {/* Vista de gastos anterior: se mantiene accesible mientras migra a /costos */}
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
