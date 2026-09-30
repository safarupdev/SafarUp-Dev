/**
 * Lifecycle controls — publish / unpublish / archive, plus the Destination
 * feature toggle.
 *
 * Why every action here is behind a confirmation: these are the only
 * operations in the CMS that change **what the public internet can see**
 * (API.destination.contract.md §3, PRD §78). The dialog names the record and
 * states the consequence in plain language before anything is sent.
 *
 * Feasibility rules enforced in the UI rather than left to a failed request:
 *   - publish is offered only from a non-PUBLISHED state, unpublish only from
 *     PUBLISHED, archive only when not already ARCHIVED
 *   - the feature toggle is DISABLED unless the destination is PUBLISHED,
 *     because the backend answers 400 for a non-published destination
 *     (DESTINATION.domain.contract.md §4: a DRAFT or ARCHIVED destination
 *     must never appear in a public featured rail)
 *
 * There is no delete control anywhere — archival is the only removal path
 * (PRD §78), and the API defines no delete endpoint.
 */

import { useState } from 'react';
import Button from '../ui/Button';
import StatusBadge from '../common/StatusBadge';
import ConfirmDialog from '../common/ConfirmDialog';
import { useLifecycle } from '../../hooks/useLifecycle';
import { getErrorMessage } from '../../lib/apiClient';

import Card from '../common/Card';
import Icon from '../common/Icon';

const STATUS_TARGET = { publish: 'PUBLISHED', unpublish: 'DRAFT', archive: 'ARCHIVED' };

/**
 * Builds the dialog copy for an action. `publicPath` is the URL the record is
 * served at, so the wording is concrete rather than abstract.
 */
function describe(action, { entityLabel, name, publicPath, featured, fromStatus }) {
  const where = publicPath ? ` at ${publicPath}` : '';
  const subject = `${entityLabel} “${name}”`;

  switch (action) {
    case 'publish':
      return {
        title: `Publish ${subject}?`,
        description: `This changes the status from ${fromStatus ?? 'DRAFT'} to ${STATUS_TARGET.publish}.`,
        consequence: `As soon as this completes, ${subject} becomes publicly visible on safarup.in${where} to anyone on the internet, and can be indexed by search engines.`,
        confirmLabel: 'Publish now',
        variant: 'primary',
      };
    case 'unpublish':
      return {
        title: `Unpublish ${subject}?`,
        description: `This changes the status from ${STATUS_TARGET.publish} to ${STATUS_TARGET.unpublish}.`,
        consequence: `As soon as this completes, ${subject} disappears from the public site${where} and the URL returns “not found”. Any existing link to it will break.`,
        confirmLabel: 'Unpublish',
        variant: 'danger',
      };
    case 'archive':
      return {
        title: `Archive ${subject}?`,
        description: `This changes the status from ${fromStatus ?? 'DRAFT'} to ${STATUS_TARGET.archive}.`,
        consequence: `${subject} will no longer appear publicly${where}. Nothing is deleted — the record, its content and its slug are kept, and it can be brought back by publishing it again (PRD §78).`,
        confirmLabel: 'Archive',
        variant: 'danger',
      };
    case 'feature':
      return {
        title: featured ? `Remove ${subject} from featured?` : `Feature ${subject}?`,
        description: featured
          ? 'The homepage “Popular Destinations” rail will no longer show it.'
          : 'The homepage “Popular Destinations” rail (PRD §18) will show it.',
        consequence: 'Featured placement changes what visitors see on the public homepage immediately.',
        confirmLabel: featured ? 'Remove from featured' : 'Feature it',
        variant: 'primary',
      };
    default:
      throw new Error(`Unknown lifecycle action: ${action}`);
  }
}

export default function LifecyclePanel({
  entity,
  entityLabel,
  id,
  name,
  status,
  publicPath,
  featured,
  supportsFeature = false,
  onChanged,
}) {
  const [pending, setPending] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const lifecycle = useLifecycle({ entity, id, onChanged });

  const canPublish = status !== 'PUBLISHED';
  const canUnpublish = status === 'PUBLISHED';
  const canArchive = status !== 'ARCHIVED';

  // Featuring a non-PUBLISHED destination is rejected by the backend, so the
  // control is disabled with the reason shown rather than left to fail.
  const featureBlocked = supportsFeature && !featured && status !== 'PUBLISHED';

  function request(action, nextFeatured) {
    setPending({ action, featured: nextFeatured });
  }

  function closeDialog() {
    setPending(null);
  }

  async function confirm() {
    if (!pending) return;
    setFeedback(null);
    try {
      await lifecycle.mutateAsync({ action: pending.action, featured: pending.featured });
      setFeedback({ tone: 'success', message: successMessage(pending.action, entityLabel, name) });
      setPending(null);
    } catch (error) {
      setPending(null);
      setFeedback({
        tone: 'error',
        message: getErrorMessage(error, 'The lifecycle change could not be applied.'),
      });
    }
  }

  const copy = pending
    ? describe(pending.action, { entityLabel, name, publicPath, featured: pending.featured, fromStatus: status })
    : null;

  return (
    <Card as="section" variant="surface" pad="md" aria-labelledby="lifecycle-heading">
      <h2 id="lifecycle-heading" className="text-xs font-bold uppercase tracking-wider text-navy-950">
        Lifecycle &amp; visibility
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-600 font-medium">Current status:</span>
        <StatusBadge status={status} />
        {supportsFeature && (
          <span className="text-xs text-slate-600 ml-2">
            Homepage featured:{' '}
            <span className="font-semibold text-navy-900">{featured ? 'Yes' : 'No'}</span>
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Only <span className="font-medium text-slate-700">PUBLISHED</span> content is readable without
        authentication (PRD §63). These actions change what the public internet can see, so each one asks
        for confirmation first.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="accent"
          size="sm"
          disabled={!canPublish || lifecycle.isPending}
          onClick={() => request('publish')}
        >
          <Icon name="check" className="h-3.5 w-3.5" />
          <span>Publish</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canUnpublish || lifecycle.isPending}
          onClick={() => request('unpublish')}
        >
          Unpublish
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={!canArchive || lifecycle.isPending}
          onClick={() => request('archive')}
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
          <span>Archive</span>
        </Button>

        {supportsFeature && (
          <Button
            variant="secondary"
            size="sm"
            disabled={featureBlocked || lifecycle.isPending}
            onClick={() => request('feature', !featured)}
            aria-describedby="feature-help"
          >
            <Icon name="star" className={`h-3.5 w-3.5 ${featured ? 'text-amber-500 fill-amber-500' : ''}`} />
            <span>{featured ? 'Remove from featured' : 'Feature on homepage'}</span>
          </Button>
        )}
      </div>

      {featureBlocked && (
        <p id="feature-help" className="mt-2 text-xs text-amber-800">
          Featuring is only available while this {entityLabel} is PUBLISHED — a draft or archived{' '}
          {entityLabel} must never appear in a public featured rail (PRD §22). Publish it first.
        </p>
      )}
      {supportsFeature && !featureBlocked && (
        <p id="feature-help" className="mt-2 text-xs text-slate-500">
          Featured {entityLabel}s appear in the homepage “Popular Destinations” rail (PRD §18).
        </p>
      )}

      {feedback && (
        <div
          role="status"
          className={`mt-3 flex items-center gap-2 rounded-md p-2.5 text-xs ${
            feedback.tone === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
          }`}
        >
          <Icon name={feedback.tone === 'success' ? 'check' : 'alert'} className="h-4 w-4 flex-none" />
          <span>{feedback.message}</span>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={copy?.title}
        description={copy?.description}
        consequence={copy?.consequence}
        confirmLabel={copy?.confirmLabel}
        confirmVariant={copy?.variant}
        isConfirming={lifecycle.isPending}
        onConfirm={confirm}
        onCancel={closeDialog}
      />
    </Card>
  );
}

function successMessage(action, entityLabel, name) {
  switch (action) {
    case 'publish':
      return `${entityLabel} “${name}” is now published and publicly visible.`;
    case 'unpublish':
      return `${entityLabel} “${name}” is now a draft and no longer publicly visible.`;
    case 'archive':
      return `${entityLabel} “${name}” is archived. Its content and slug are retained (PRD §78).`;
    case 'feature':
      return `Featured state updated for “${name}”.`;
    default:
      return 'Done.';
  }
}
