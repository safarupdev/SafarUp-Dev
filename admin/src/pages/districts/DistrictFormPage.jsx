/**
 * District create / edit — DISTRICT.domain.contract.md §2.
 *
 * The contract has 8 fields and only **two are client-editable**: `name` and
 * `slug`. `status` is system-controlled through the lifecycle panel (never a
 * form field, so publishing always passes through the confirmation step), and
 * `createdAt` / `updatedAt` / `createdBy` / `updatedBy` are system-managed.
 * Coordinates, boundaries, population, state, country, `parentDistrictId` and
 * district-level description are explicit non-goals (§2.1) and are
 * deliberately absent here.
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';

import { CONTENT_ENTITIES, createDistrict, updateDistrict } from '../../api/content.api';
import { districtFormSchema } from '../../validators/content.schema';
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

export default function DistrictFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const detail = useContentDetail({ entity: CONTENT_ENTITIES.districts, id, enabled: isEdit });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(districtFormSchema),
    defaultValues: { name: '', slug: '' },
  });

  useEffect(() => {
    if (detail.data) {
      reset({ name: detail.data.name ?? '', slug: detail.data.slug ?? '' });
    }
  }, [detail.data, reset]);

  async function onSubmit(values) {
    setServerError(null);
    try {
      const saved = isEdit ? await updateDistrict(id, values) : await createDistrict(values);
      const savedId = saved?.id ?? saved?._id;
      if (!savedId) {
        // The write succeeded but the response carried no reference; say so
        // rather than navigating to a broken URL.
        setServerError('Saved, but the server did not return the record reference. Reload the list to see it.');
        return;
      }
      // The server is authoritative for the record's reference; deep-link to
      // its edit view so a newly created district is immediately editable and
      // its lifecycle controllable.
      navigate(`/districts/${savedId}`, { replace: true });
    } catch (error) {
      const unassigned = applyServerFieldErrors(error, setError);
      applySlugConflict(error, setError);
      setServerError(formErrorMessage(error, unassigned[0] ?? 'The district could not be saved.'));
    }
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="District" backTo="/districts" backLabel="All districts" />
        <p className="text-sm text-slate-500">Loading district…</p>
      </div>
    );
  }

  if (isEdit && detail.error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="District" backTo="/districts" backLabel="All districts" />
        <ErrorState error={detail.error} onRetry={detail.refetch} title="Could not load this district" />
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        title={isEdit ? `Edit ${detail.data?.name ?? 'district'}` : 'New district'}
        backTo="/districts"
        backLabel="All districts"
        description="The slug is the stable public key used in URLs and internal links (PRD §131) and must be unique across all content entities."
        actions={
          <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
            {isEdit ? 'Save changes' : 'Create district'}
          </Button>
        }
      />

      <ContentRoleNotice />

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <FormSection id="district-identity" title="Identity" description="Public display name and URL key.">
        <FormField label="Name" id="district-name" error={errors.name?.message}>
          <Input id="district-name" placeholder="Jamui" {...register('name')} />
        </FormField>

        <FormField label="Slug" id="district-slug" error={errors.slug?.message}>
          <Input id="district-slug" placeholder="jamui" {...register('slug')} />
        </FormField>
        <SlugHint slug={detail.data?.slug} />
      </FormSection>

      {isEdit && detail.data && (
        <LifecyclePanel
          entity={CONTENT_ENTITIES.districts}
          entityLabel="District"
          id={id}
          name={detail.data.name}
          status={detail.data.status}
          publicPath={`/districts/${detail.data.slug}`}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
          {isEdit ? 'Save changes' : 'Create district'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/districts')}>
          Cancel
        </Button>
        {isEdit && isDirty && <span className="text-sm text-slate-500">Unsaved changes</span>}
      </div>
    </form>
  );
}

/** Shows the public URL the slug produces, so the editor picks it knowingly. */
function SlugHint({ slug }) {  if (!slug) return null;
  return (
    <p className="text-xs text-slate-500">
      Public URL: <code className="text-slate-600">/districts/{slug}</code>
    </p>
  );
}
