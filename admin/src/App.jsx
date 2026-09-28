/**
 * Admin app router — PRD §36 (Admin Navigation).
 *
 * Route protection layers (PRD §133):
 *  1. ProtectedRoute (no allowedRoles) — any authenticated staff user.
 *  2. ProtectedRoute allowedRoles=[...] — role-restricted sections
 *     (Payments, Settings, Audit Logs — matching §36's role notes).
 * Both are UI-level convenience; the backend enforces the same rules
 * independently on every request.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { ROLES } from './constants/roles';

import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ComingSoonPage from './pages/ComingSoonPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public (unauthenticated) routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />

            {/* Authenticated routes (any staff role) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />

                <Route path="/trips/templates" element={<ComingSoonPage />} />
                <Route path="/trips/departures" element={<ComingSoonPage />} />
                <Route path="/trips/itineraries" element={<ComingSoonPage />} />
                <Route path="/trips/availability" element={<ComingSoonPage />} />

                <Route path="/private-trips/requests" element={<ComingSoonPage />} />
                <Route path="/private-trips/proposals" element={<ComingSoonPage />} />
                <Route path="/private-trips/active" element={<ComingSoonPage />} />

                <Route path="/bookings" element={<ComingSoonPage />} />
                <Route path="/bookings/pending" element={<ComingSoonPage />} />
                <Route path="/bookings/confirmed" element={<ComingSoonPage />} />
                <Route path="/bookings/cancelled" element={<ComingSoonPage />} />
                <Route path="/bookings/completed" element={<ComingSoonPage />} />

                <Route path="/customers" element={<ComingSoonPage />} />
                <Route path="/destinations" element={<ComingSoonPage />} />
                <Route path="/hotels" element={<ComingSoonPage />} />
                <Route path="/transport" element={<ComingSoonPage />} />
                <Route path="/activities" element={<ComingSoonPage />} />
                <Route path="/blog" element={<ComingSoonPage />} />
                <Route path="/communications" element={<ComingSoonPage />} />
                <Route path="/reports" element={<ComingSoonPage />} />

                {/* Role-restricted sections (PRD §36, §100) */}
                <Route
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.FINANCE, ROLES.ADMIN, ROLES.SUPER_ADMIN]} />
                  }
                >
                  <Route path="/payments/transactions" element={<ComingSoonPage />} />
                  <Route path="/payments/refunds" element={<ComingSoonPage />} />
                  <Route path="/payments/reconciliation" element={<ComingSoonPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPER_ADMIN]} />}>
                  <Route path="/settings" element={<ComingSoonPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]} />}>
                  <Route path="/audit-logs" element={<ComingSoonPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
