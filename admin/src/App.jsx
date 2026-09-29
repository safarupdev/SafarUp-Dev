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

import DestinationListPage from './pages/destinations/DestinationListPage';
import DestinationFormPage from './pages/destinations/DestinationFormPage';
import DistrictListPage from './pages/districts/DistrictListPage';
import DistrictFormPage from './pages/districts/DistrictFormPage';
import CategoryListPage from './pages/categories/CategoryListPage';
import CategoryFormPage from './pages/categories/CategoryFormPage';
import PlaceListPage from './pages/places/PlaceListPage';
import PlaceFormPage from './pages/places/PlaceFormPage';

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
                <Route path="/hotels" element={<ComingSoonPage />} />
                <Route path="/transport" element={<ComingSoonPage />} />
                <Route path="/activities" element={<ComingSoonPage />} />
                <Route path="/blog" element={<ComingSoonPage />} />
                <Route path="/communications" element={<ComingSoonPage />} />
                <Route path="/reports" element={<ComingSoonPage />} />

                {/* Content CMS (PRD §38, §149). Content and above may manage
                    content — see the permission matrices in
                    docs/CONTRACTS/*.domain.contract.md §8/§5. This role gate is
                    a UX convenience only: the backend `authorize()` middleware
                    independently re-checks the role on every request. */}
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={[ROLES.CONTENT, ROLES.OPERATIONS, ROLES.ADMIN, ROLES.SUPER_ADMIN]}
                    />
                  }
                >
                  <Route path="/destinations" element={<DestinationListPage />} />
                  <Route path="/destinations/new" element={<DestinationFormPage />} />
                  <Route path="/destinations/:id" element={<DestinationFormPage />} />

                  <Route path="/districts" element={<DistrictListPage />} />
                  <Route path="/districts/new" element={<DistrictFormPage />} />
                  <Route path="/districts/:id" element={<DistrictFormPage />} />

                  <Route path="/categories" element={<CategoryListPage />} />
                  <Route path="/categories/new" element={<CategoryFormPage />} />
                  <Route path="/categories/:id" element={<CategoryFormPage />} />

                  <Route path="/places" element={<PlaceListPage />} />
                  <Route path="/places/new" element={<PlaceFormPage />} />
                  <Route path="/places/:id" element={<PlaceFormPage />} />
                </Route>

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
