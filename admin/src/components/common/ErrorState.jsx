/**
 * Error state — DESIGN_SYSTEM §6, PRD §72 (clear, human-readable states over
 * blank or broken UI). Always offers a retry, because every screen that uses
 * it is backed by a re-fetchable query.
 *
 * The server's message is shown verbatim: it is already customer-safe
 * (backend/src/middleware/errorHandler.js strips internals).
 */

import Button from '../ui/Button';
import { getErrorMessage } from '../../lib/apiClient';

export default function ErrorState({ error, onRetry, title = 'Could not load this content' }) {
  return (
    <div
      className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4"
      role="alert"
    >
      <div>
        <p className="text-sm font-medium text-red-800">{title}</p>
        <p className="mt-1 text-sm text-red-700">
          {getErrorMessage(error, 'The server could not be reached. Check that the API is running.')}
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
