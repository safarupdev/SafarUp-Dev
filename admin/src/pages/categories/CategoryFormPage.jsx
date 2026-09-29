/**
 * Category create / edit — CATEGORY.domain.contract.md §2.
 *
 * Editable contract fields: `name`, `slug` and the OPTIONAL `sortOrder`.
 * `sortOrder` exists only to order Categories inside Explore (PRD §115), so
 * leaving it blank is a valid state, not an error. `parentCategoryId`, icon,
 * colour, description and per-category SEO are explicit non-goals (§2.1) and
 * are deliberately absent.
 *
 * `status` is not a form field: lifecycle moves through the confirmed
 * lifecycle panel.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';

import { CONTENT_ENTITIES, createCategory, updateCategory } from '../../api/content.api';
import { categoryFormSchema } from '../../validators/content.schema';
import { useContentDetail } from '../../hooks/useContentQueries';
import { applyServerFieldErrors, applySlugConflict, formErrorMessage } from '../../lib/formErrors';
import PageHeader from '../../components/common/PageHeader';
import FormSection from '../../components/content/FormSection';
import LifecyclePanel from '../../components/content/LifecyclePanel';
import ContentRoleNotice from '../../components/content/ContentRoleNotice';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormField from '../../components/ui/FormField';

export default function CategoryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const detail = useContentDetail({ entity: CONTENT_ENTITIES.categories, id, enabled: isEdit });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', slug: '', sortOrder: '' },
  });

  useEffect(() => {
    if (detail.data) {
      reset({
        name: detail.data.name ?? '',
        slug: detail.data.slug ?? '',
        sortOrder: detail.data.sortOrder ?? '',
      });
    }
  }, [detail.data, reset]);

  async function onSubmit(values) {
    setServerError(null);
    try {
      const saved = isEdit ? await updateCategory(id, values) : await createCategory(values);
      const savedId = saved?.id ?? saved?._id;
      if (!savedId) {
        setServerError('Saved, but the server did not return the record reference. Reload the list to see it.');
        return;
      }
      navigate(`/categories/${savedId}`, { replace: true });
    } catch (error) {
      const unassigned = applyServerFieldErrors(error, setError);
      applySlugConflict(error, setError);
      setServerError(formErrorMessage(error, unassigned[0] ?? 'The category could not be saved.'));
    }
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Category" backTo="/categories" backLabel="All categories" />
        <p className="text-sm text-slate-500">Loading category…</p>
      </div>
    );
  }

  if (isEdit && detail.error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Category" backTo="/categories" backLabel="All categories" />
        <ErrorState error={detail.error} onRetry={detail.refetch} title="Could not load this category" />
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        title={isEdit ? `Edit ${detail.data?.name ?? 'category'}` : 'New category'}
        backTo="/categories"
        backLabel="All categories"
        description="The taxonomy is deliberately flat. Categories are referenced by ID from destinations and places, never copied into them."
        actions={
          <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        }
      />

      <ContentRoleNotice />

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <FormSection id="category-identity" title="Identity" description="Display name and the stable public key.">
        <FormField label="Name" id="category-name" error={errors.name?.message}>
          <Input id="category-name" placeholder="Heritage" {...register('name')} />
        </FormField>

        <FormField label="Slug" id="category-slug" error={errors.slug?.message}>
          <Input id="category-slug" placeholder="heritage" {...register('slug')} />
        </FormField>
      </FormSection>

      <FormSection
        id="category-ordering"
        title="Explore ordering"
        description="OPTIONAL. Only used to order categories inside Explore (PRD §115). Leave blank for no explicit ordering."
      >
        <FormField label="Sort order" id="category-sort-order" error={errors.sortOrder?.message}>
          <Input
            id="category-sort-order"
            type="number"
            min="0"
            max="9999"
            step="1"
            placeholder="e.g. 10"
            {...register('sortOrder')}
          />
        </FormField>
      </FormSection>

      {isEdit && detail.data && (
        <LifecyclePanel
          entity={CONTENT_ENTITIES.categories}
          entityLabel="Category"
          id={id}
          name={detail.data.name}
          status={detail.data.status}
          publicPath={`/categories/${detail.data.slug}`}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
          {isEdit ? 'Save changes' : 'Create category'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/categories')}>
          Cancel
        </Button>
        {isEdit && isDirty && <span className="text-sm text-slate-500">Unsaved changes</span>}
      </div>
    </form>
  );
}
