/**
 * Place create / edit — PLACE.domain.contract.md §2.
 *
 * Editable contract fields: `name`, `slug`, `districtId` (1:1 canonical
 * geography), `categoryIds[]` (N:M), `description`, `heroImage`, and the
 * OPTIONAL `seoTitle` / `metaDescription` / `canonicalUrl` (meaningful only
 * once a public Place page exists, PRD §200.6).
 *
 * Deliberately absent — these are explicit non-goals with no PRD support
 * (§2.1) and are not invented here: coordinates, boundary data, opening
 * hours, ticketing, entry fees, multilingual names, ratings, contact details,
 * accessibility attributes, seasonal availability and any images beyond the
 * single hero.
 *
 * `status` is not a form field: lifecycle moves through the confirmed
 * lifecycle panel.
 */

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { CONTENT_ENTITIES, createPlace, updatePlace } from '../../api/content.api';
import { placeFormSchema } from '../../validators/content.schema';
import { useCategoryOptions, useContentDetail, useDistrictOptions } from '../../hooks/useContentQueries';
import { applyServerFieldErrors, applySlugConflict, formErrorMessage } from '../../lib/formErrors';
import { getErrorMessage } from '../../lib/apiClient';
import PageHeader from '../../components/common/PageHeader';
import FormSection from '../../components/content/FormSection';
import MultiSelect from '../../components/content/MultiSelect';
import LifecyclePanel from '../../components/content/LifecyclePanel';
import ContentRoleNotice from '../../components/content/ContentRoleNotice';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import FormField from '../../components/ui/FormField';

const EMPTY = {
  name: '',
  slug: '',
  districtId: '',
  categoryIds: [],
  description: '',
  heroImage: '',
  seoTitle: '',
  metaDescription: '',
  canonicalUrl: '',
};

export default function PlaceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);

  const detail = useContentDetail({ entity: CONTENT_ENTITIES.places, id, enabled: isEdit });
  const districts = useDistrictOptions();
  const categories = useCategoryOptions();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(placeFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!detail.data) return;
    const place = detail.data;
    reset({
      name: place.name ?? '',
      slug: place.slug ?? '',
      districtId: place.districtId ?? '',
      categoryIds: place.categoryIds ?? [],
      description: place.description ?? '',
      heroImage: place.heroImage ?? '',
      seoTitle: place.seoTitle ?? '',
      metaDescription: place.metaDescription ?? '',
      canonicalUrl: place.canonicalUrl ?? '',
    });
  }, [detail.data, reset]);

  async function onSubmit(values) {
    setServerError(null);
    try {
      const saved = isEdit ? await updatePlace(id, values) : await createPlace(values);
      const savedId = saved?.id ?? saved?._id;
      if (!savedId) {
        setServerError('Saved, but the server did not return the record reference. Reload the list to see it.');
        return;
      }
      navigate(`/places/${savedId}`, { replace: true });
    } catch (error) {
      const unassigned = applyServerFieldErrors(error, setError);
      applySlugConflict(error, setError);
      setServerError(formErrorMessage(error, unassigned[0] ?? 'The place could not be saved.'));
    }
  }

  if (isEdit && detail.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Place" backTo="/places" backLabel="All places" />
        <p className="text-sm text-slate-500">Loading place…</p>
      </div>
    );
  }

  if (isEdit && detail.error) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Place" backTo="/places" backLabel="All places" />
        <ErrorState error={detail.error} onRetry={detail.refetch} title="Could not load this place" />
      </div>
    );
  }

  const noDistrictsYet = !districts.isLoading && (districts.data?.items ?? []).length === 0;

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <PageHeader
        title={isEdit ? `Edit ${detail.data?.name ?? 'place'}` : 'New place'}
        backTo="/places"
        backLabel="All places"
        description="A place is a canonical record with one identity (PRD §173). Destinations and trips reference it by ID; its name is never copied into them."
        actions={
          <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
            {isEdit ? 'Save changes' : 'Create place'}
          </Button>
        }
      />

      <ContentRoleNotice />

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}

      <FormSection id="place-identity" title="Identity" description="Public display name and URL key.">
        <FormField label="Name" id="place-name" error={errors.name?.message}>
          <Input id="place-name" placeholder="Maa Netula Temple" {...register('name')} />
        </FormField>

        <FormField label="Slug" id="place-slug" error={errors.slug?.message}>
          <Input id="place-slug" placeholder="maa-netula-temple" {...register('slug')} />
        </FormField>
      </FormSection>

      <FormSection
        id="place-taxonomy"
        title="District & categories"
        description="Canonical relationships by ID. Exactly one district is required; categories are N:M and may be empty."
      >
        <FormField label="District" id="place-district" error={errors.districtId?.message}>
          <select
            id="place-district"
            disabled={districts.isLoading}
            {...register('districtId')}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.districtId ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
          >
            <option value="">{districts.isLoading ? 'Loading districts…' : 'Select a district'}</option>
            {(districts.data?.items ?? []).map((district) => (
              <option key={district.id ?? district._id} value={district.id ?? district._id}>
                {district.name}
                {district.status !== 'PUBLISHED' ? ` (${district.status})` : ''}
              </option>
            ))}
          </select>
        </FormField>

        {noDistrictsYet && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No districts exist yet. A place must belong to one, so{' '}
            <Link to="/districts/new" className="font-medium underline">
              create a district
            </Link>{' '}
            first.
          </p>
        )}

        <Controller
          control={control}
          name="categoryIds"
          render={({ field }) => (
            <MultiSelect
              id="place-categories"
              label="Categories"
              description="Optional. Stored as an array of category IDs; names resolve at render time."
              options={categories.data?.items ?? []}
              value={field.value ?? []}
              onChange={field.onChange}
              error={errors.categoryIds?.message}
              isLoading={categories.isLoading}
              loadError={categories.error ? getErrorMessage(categories.error) : null}
              onRetryLoad={categories.refetch}
              emptyLabel="No categories exist yet. Categories are optional for a place."
            />
          )}
        />
      </FormSection>

      <FormSection id="place-content" title="Description & media">
        <FormField label="Description" id="place-description" error={errors.description?.message}>
          <textarea
            id="place-description"
            rows={6}
            placeholder="What makes this place worth visiting?"
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.description ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
            {...register('description')}
          />
        </FormField>

        <FormField
          label="Hero image URL"
          id="place-hero"
          error={errors.heroImage?.message}
        >
          <Input
            id="place-hero"
            type="url"
            placeholder="https://…"
            {...register('heroImage')}
          />
        </FormField>
        <p className="text-xs text-slate-500">
          Optional. The media upload endpoint is out of Phase 2 scope, so images are set as URLs
          (API.destination.contract.md §3).
        </p>
      </FormSection>

      <FormSection
        id="place-seo"
        title="SEO"        description="Optional. Only meaningful once a public Place page exists — no such route is defined yet (PRD §17, §200.6)."
      >
        <FormField label="SEO title" id="place-seo-title" error={errors.seoTitle?.message}>
          <Input id="place-seo-title" placeholder="Maa Netula Temple, Rajgir" {...register('seoTitle')} />
        </FormField>

        <FormField label="Meta description" id="place-meta-description" error={errors.metaDescription?.message}>
          <textarea
            id="place-meta-description"
            rows={3}
            {...register('metaDescription')}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
              errors.metaDescription ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
            }`}
          />
        </FormField>

        <FormField label="Canonical URL" id="place-canonical" error={errors.canonicalUrl?.message}>
          <Input id="place-canonical" type="url" placeholder="https://safarup.in/places/…" {...register('canonicalUrl')} />
        </FormField>
      </FormSection>

      {isEdit && detail.data && (
        <LifecyclePanel
          entity={CONTENT_ENTITIES.places}
          entityLabel="Place"
          id={id}
          name={detail.data.name}
          status={detail.data.status}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" isLoading={isSubmitting} disabled={isEdit && !isDirty}>
          {isEdit ? 'Save changes' : 'Create place'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/places')}>
          Cancel
        </Button>
        {isEdit && isDirty && <span className="text-sm text-slate-500">Unsaved changes</span>}
      </div>
    </form>
  );
}
