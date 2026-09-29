/**
 * Lifecycle mutation for the content CMS.
 *
 * One hook for all four entities so no screen has to remember which
 * endpoint does what, and so cache invalidation is consistent: every
 * lifecycle call can change a row's `status`, which invalidates BOTH the
 * list views and the open detail view (whose key shares the same prefix).
 *
 * Consequential by design — the caller is responsible for confirming with the
 * user before calling `mutate` (see components/content/LifecyclePanel.jsx).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runLifecycleAction } from '../api/content.api';

export function useLifecycle({ entity, id, onChanged }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, featured }) => runLifecycleAction(entity, id, action, { featured }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', entity] });
      onChanged?.();
    },
  });
}
