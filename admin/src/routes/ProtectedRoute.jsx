/**
 * Route guard for the admin app.
 *
 * PRD §133 (Admin URL Security): "Admin route protection must happen at:
 * 1. Authentication 2. Authorization 3. Backend operation level. Hiding
 * /admin from navigation is not security." This component implements
 * layer 1 and, optionally, a UI-level version of layer 2 (role checks) —
 * but it is explicitly a UX convenience, not the real security boundary.
 * The backend independently re-checks both on every request via the
 * `authenticate` and `authorize` middleware.
 *
 * @param {{ allowedRoles?: string[] }} props If provided, only these
 *   roles may view the wrapped route; anyone else is redirected to a
 *   "forbidden" page rather than silently shown nothing (PRD §72: clear,
 *   human-readable states over blank/broken UI).
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Spinner label="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
