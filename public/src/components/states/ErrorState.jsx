/**
 * Error state — DESIGN_SYSTEM.md §6 (States) and §10.
 *
 * Says what happened in the visitor's terms and offers one way out. Raw
 * internals are never surfaced: the backend's central error handler already
 * guarantees that (§72), and this component does not re-expose them.
 */

import Icon from '../common/Icon';
import Button from '../common/Button';
import { getErrorMessage, isNetworkError } from '../../lib/apiClient';

export default function ErrorState({ error, onRetry, title, className = '' }) {
  const offline = isNetworkError(error);
  const heading = title || (offline ? 'We could not reach SafarUp' : 'Something went wrong');
  const detail = getErrorMessage(
    error,
    offline
      ? 'Check your connection and try again — nothing you have done is lost.'
      : 'We could not load this content just now. Please try again.'
  );

  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-600 ring-1 ring-red-100">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <div className="max-w-md space-y-1.5">
        <p className="text-base font-semibold text-navy-900">{heading}</p>
        <p className="text-sm leading-relaxed text-navy-700">{detail}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
